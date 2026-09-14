import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const scanRfidSchema = z.object({
  uid: z.string().min(1, "UID kartu wajib diisi").max(50),
  kelasId: z.string().uuid().optional(), // Required for GURU role
});

async function getActiveJadwal(kelasId: string | null | undefined) {
  if (!kelasId) {
    return prisma.jadwalAbsensi.findFirst({ where: { aktif: true } });
  }
  return prisma.jadwalAbsensi.findFirst({
    where: { kelasId, aktif: true },
  });
}

function determineStatusFromTime(
  waktuStr: string,
  jadwal: { jamMulaiMasuk: string; jamSelesaiMasuk: string } | null
): "HADIR" | "TELAT" {
  if (!jadwal) return "HADIR";
  if (waktuStr < jadwal.jamMulaiMasuk) return "HADIR";
  if (waktuStr <= jadwal.jamSelesaiMasuk) return "HADIR";
  return "TELAT";
}

async function createAbsensiLog(
  absensiId: string,
  actorId: string,
  actorRole: "ADMIN" | "GURU" | "SISWA",
  action: string,
  oldData: unknown,
  newData: unknown
) {
  await prisma.absensiLog.create({
    data: {
      absensiId,
      actorId,
      actorRole,
      action,
      oldData: oldData as any,
      newData: newData as any,
    },
  });
}

// POST /api/rfid/scan — Process RFID scan for attendance
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "SISWA" && role !== "GURU" && role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = scanRfidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { uid, kelasId } = validation.data;
    const normalizedUid = uid.toUpperCase();

    // Find RFID card
    const rfidCard = await prisma.rfidCard.findUnique({
      where: { uid: normalizedUid },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nis: true,
            email: true,
            role: true,
            kelas: { select: { id: true, namaKelas: true } },
            isActive: true,
          },
        },
      },
    });

    if (!rfidCard) {
      return NextResponse.json(
        { message: "Kartu RFID tidak terdaftar", match: false },
        { status: 200 }
      );
    }

    if (!rfidCard.isActive) {
      return NextResponse.json(
        { message: "Kartu RFID sudah dicabut/nonaktif", match: false },
        { status: 200 }
      );
    }

    const user = rfidCard.user;

    if (user.role !== "SISWA") {
      return NextResponse.json(
        { message: "Kartu RFID bukan milik siswa", match: false },
        { status: 200 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Akun siswa sudah nonaktif", match: false },
        { status: 200 }
      );
    }

    // For GURU role, validate they are wali kelas or guru mapel for this class
    let targetKelasId = kelasId;
    if (role === "GURU") {
      if (!kelasId) {
        return NextResponse.json(
          { message: "Guru harus memilih kelas" },
          { status: 400 }
        );
      }

      // Check if guru is wali kelas
      const guruKelas = await prisma.guruKelas.findUnique({
        where: { guruId_kelasId: { guruId: session.user.id, kelasId } },
      });

      // Check if guru is guru mapel
      const guruMapel = await prisma.guruMapel.findFirst({
        where: { guruId: session.user.id, kelasId },
      });

      if (!guruKelas && !guruMapel) {
        return NextResponse.json(
          { message: "Anda tidak diampu di kelas ini" },
          { status: 403 }
        );
      }

      // Verify student is in this class
      if (user.kelas?.id !== kelasId) {
        return NextResponse.json(
          { message: "Siswa tidak berada di kelas ini", match: false },
          { status: 200 }
        );
      }

      targetKelasId = kelasId;
    } else if (role === "ADMIN") {
      if (!kelasId) {
        return NextResponse.json(
          { message: "Admin harus memilih kelas" },
          { status: 400 }
        );
      }
      targetKelasId = kelasId;
    } else {
      // SISWA role - use their own class
      targetKelasId = user.kelas?.id || undefined;
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const jam = now.getHours().toString().padStart(2, "0");
    const menit = now.getMinutes().toString().padStart(2, "0");
    const waktuStr = `${jam}:${menit}`;

    // Check if already has attendance today
    const existingAbsensi = await prisma.absensi.findUnique({
      where: { userId_tanggal: { userId: user.id, tanggal: today } },
      include: { rfidCard: true },
    });

    if (existingAbsensi) {
      return NextResponse.json(
        {
          message: `${user.nama} sudah absen hari ini pukul ${existingAbsensi.waktuMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
          match: true,
          alreadyAbsen: true,
          absensi: existingAbsensi,
        },
        { status: 200 }
      );
    }

    // Validate scan time against schedule
    const jadwal = await getActiveJadwal(targetKelasId);
    if (jadwal) {
      if (waktuStr < jadwal.jamMulaiMasuk) {
        // Early scan allowed
      } else {
        const toleranceMinutes = 60;
        const [selesaiJam, selesaiMenit] = jadwal.jamSelesaiMasuk.split(":").map(Number);
        const selesaiDate = new Date();
        selesaiDate.setHours(selesaiJam, selesaiMenit + toleranceMinutes, 0, 0);
        const selesaiStr = `${selesaiDate.getHours().toString().padStart(2, "0")}:${selesaiDate.getMinutes().toString().padStart(2, "0")}`;

        if (waktuStr > selesaiStr) {
          return NextResponse.json(
            { message: `Di luar batas waktu absen (selesai ${jadwal.jamSelesaiMasuk} + ${toleranceMinutes} menit toleransi)`, match: false },
            { status: 200 }
          );
        }
      }
    }

    // Determine status
    const status = determineStatusFromTime(waktuStr, jadwal);

    // Create attendance record
    const absensi = await prisma.absensi.create({
      data: {
        userId: user.id,
        tanggal: today,
        waktuMasuk: now,
        status,
        method: "RFID",
        rfidCardId: rfidCard.id,
      },
      include: {
        user: { select: { id: true, nama: true, nis: true, kelas: { select: { namaKelas: true } } } },
      },
    });

    await createAbsensiLog(
      absensi.id,
      session.user.id,
      role as "ADMIN" | "GURU" | "SISWA",
      "SCAN_RFID",
      null,
      absensi
    );

    return NextResponse.json(
      {
        message: `Absen RFID berhasil! ${user.nama} — ${status === "HADIR" ? "Hadir" : "Terlambat"}`,
        match: true,
        distance: 0,
        alreadyAbsen: false,
        absensi: {
          id: absensi.id,
          status: absensi.status,
          waktuMasuk: absensi.waktuMasuk,
          fotoWajah: absensi.fotoWajah,
          nama: user.nama,
          kelas: user.kelas?.namaKelas || null,
          method: "RFID",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error RFID scan:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}