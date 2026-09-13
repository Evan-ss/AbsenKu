import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

const MATCH_THRESHOLD = 0.45;

async function saveFacePhoto(
  fotoWajah: string,
  userId: string
): Promise<string | null> {
  try {
    const matches = fotoWajah.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];

    const uploadDir = path.join(process.cwd(), "public", "upload", "face");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${userId}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    const buffer = Buffer.from(base64Data, "base64");
    await writeFile(filepath, buffer);

    return `/upload/face/${filename}`;
  } catch (err) {
    console.error("Error saving face photo:", err);
    return null;
  }
}

async function getActiveJadwal(kelasId: string | null) {
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

async function validateScanTime(kelasId: string | null): Promise<{ allowed: boolean; message?: string }> {
  const jadwal = await getActiveJadwal(kelasId);
  if (!jadwal) return { allowed: true };

  const now = new Date();
  const jam = now.getHours().toString().padStart(2, "0");
  const menit = now.getMinutes().toString().padStart(2, "0");
  const waktuStr = `${jam}:${menit}`;

  if (waktuStr < jadwal.jamMulaiMasuk) {
    return { allowed: true };
  }

  const toleranceMinutes = 60;
  const [selesaiJam, selesaiMenit] = jadwal.jamSelesaiMasuk.split(":").map(Number);
  const selesaiDate = new Date();
  selesaiDate.setHours(selesaiJam, selesaiMenit + toleranceMinutes, 0, 0);
  const selesaiStr = `${selesaiDate.getHours().toString().padStart(2, "0")}:${selesaiDate.getMinutes().toString().padStart(2, "0")}`;

  if (waktuStr > selesaiStr) {
    return { allowed: false, message: `Di luar batas waktu absen (selesai ${jadwal.jamSelesaiMasuk} + ${toleranceMinutes} menit toleransi)` };
  }

  return { allowed: true };
}

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
    const { faceDescriptor, kelasId, fotoWajah } = body;

    if (
      !faceDescriptor ||
      !Array.isArray(faceDescriptor) ||
      faceDescriptor.length < 100
    ) {
      return NextResponse.json(
        { message: "Face descriptor tidak valid" },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const jam = now.getHours().toString().padStart(2, "0");
    const menit = now.getMinutes().toString().padStart(2, "0");
    const waktuStr = `${jam}:${menit}`;

    if (role === "SISWA") {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          nama: true,
          faceDescriptor: true,
          kelas: { select: { id: true, namaKelas: true } },
        },
      });

      if (!currentUser) {
        return NextResponse.json(
          { message: "Data user tidak ditemukan" },
          { status: 404 }
        );
      }

      const storedDescriptor = currentUser.faceDescriptor as number[] | null;

      if (!storedDescriptor || !Array.isArray(storedDescriptor) || storedDescriptor.length < 100) {
        return NextResponse.json(
          {
            message: "Wajah kamu belum direkam. Silakan hubungi admin untuk merekam wajah terlebih dahulu.",
            match: false,
            noFaceData: true,
          },
          { status: 200 }
        );
      }

      const distance = euclideanDistance(faceDescriptor, storedDescriptor);
      const isMatch = distance < MATCH_THRESHOLD;

      if (!isMatch) {
        return NextResponse.json(
          {
            message: `Wajah tidak cocok (skor: ${distance.toFixed(2)}). Silakan coba lagi dengan posisi yang benar.`,
            match: false,
            distance,
          },
          { status: 200 }
        );
      }

      const timeValidation = await validateScanTime(currentUser.kelas?.id ?? null);
      if (!timeValidation.allowed) {
        return NextResponse.json(
          { message: timeValidation.message, match: false, distance },
          { status: 200 }
        );
      }

      const status = determineStatusFromTime(waktuStr, await getActiveJadwal(currentUser.kelas?.id ?? null));

      const existingAbsensi = await prisma.absensi.findUnique({
        where: { userId_tanggal: { userId: currentUser.id, tanggal: today } },
      });

      if (existingAbsensi) {
        return NextResponse.json(
          {
            message: `${currentUser.nama} sudah absen hari ini pukul ${existingAbsensi.waktuMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
            match: true,
            alreadyAbsen: true,
            absensi: existingAbsensi,
          },
          { status: 200 }
        );
      }

      let fotoWajahPath: string | null = null;
      if (fotoWajah) {
        fotoWajahPath = await saveFacePhoto(fotoWajah, currentUser.id);
      }

      let absensi;
      try {
        absensi = await prisma.absensi.create({
          data: {
            userId: currentUser.id,
            tanggal: today,
            waktuMasuk: now,
            status,
            fotoWajah: fotoWajahPath,
          },
        });
      } catch (e: unknown) {
        if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
          const existing = await prisma.absensi.findUnique({
            where: { userId_tanggal: { userId: currentUser.id, tanggal: today } },
          });
          return NextResponse.json(
            {
              message: `${currentUser.nama} sudah absen hari ini pukul ${existing?.waktuMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
              match: true,
              alreadyAbsen: true,
              absensi: existing,
            },
            { status: 200 }
          );
        }
        throw e;
      }

      await createAbsensiLog(absensi.id, session.user.id, "SISWA", "SCAN_AUTO_FACE", null, absensi);

      return NextResponse.json(
        {
          message: `Absen berhasil! Selamat datang, ${currentUser.nama}`,
          match: true,
          distance,
          alreadyAbsen: false,
          absensi: {
            id: absensi.id,
            status: absensi.status,
            waktuMasuk: absensi.waktuMasuk,
            fotoWajah: absensi.fotoWajah,
            nama: currentUser.nama,
            kelas: currentUser.kelas?.namaKelas || null,
            distance,
          },
        },
        { status: 200 }
      );
    }

    let targetKelasId = kelasId;

    if (role === "GURU") {
      const guruKelasList = await prisma.guruKelas.findMany({
        where: { guruId: session.user.id },
        select: { kelasId: true },
      });

      const kelasIds = guruKelasList.map((gk) => gk.kelasId);

      if (kelasIds.length === 0) {
        return NextResponse.json(
          { message: "Anda belum ditugaskan di kelas mana pun" },
          { status: 403 }
        );
      }

      if (kelasId) {
        if (!kelasIds.includes(kelasId)) {
          return NextResponse.json(
            { message: "Anda tidak ditugaskan di kelas ini" },
            { status: 403 }
          );
        }
        targetKelasId = kelasId;
      } else {
        return NextResponse.json(
          { message: "Silakan pilih kelas terlebih dahulu" },
          { status: 400 }
        );
      }
    } else if (role === "ADMIN") {
      if (!kelasId) {
        return NextResponse.json(
          { message: "Admin harus memilih kelas" },
          { status: 400 }
        );
      }
      targetKelasId = kelasId;
    }

    const timeValidation = await validateScanTime(targetKelasId);
    if (!timeValidation.allowed) {
      return NextResponse.json(
        { message: timeValidation.message, match: false },
        { status: 200 }
      );
    }

    const siswaWhere: Record<string, unknown> = {
      role: "SISWA",
      isActive: true,
      kelasId: targetKelasId,
    };

    const allSiswa = await prisma.user.findMany({
      where: siswaWhere,
      select: {
        id: true,
        nama: true,
        faceDescriptor: true,
        kelas: { select: { namaKelas: true } },
      },
    });

    const siswaList = allSiswa.filter((s) => {
      const fd = s.faceDescriptor;
      return fd !== null && fd !== undefined && Array.isArray(fd) && (fd as number[]).length >= 100;
    });

    if (siswaList.length === 0) {
      return NextResponse.json(
        {
          message: "Tidak ada siswa dengan data wajah yang terdaftar di kelas ini",
          match: false,
          noFaceData: true,
        },
        { status: 200 }
      );
    }

    let bestDistance = Infinity;
    let bestSiswa: (typeof siswaList)[number] | null = null;

    for (const siswa of siswaList) {
      const storedDescriptor = siswa.faceDescriptor as number[];
      if (!Array.isArray(storedDescriptor) || storedDescriptor.length < 100) continue;

      const distance = euclideanDistance(faceDescriptor, storedDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSiswa = siswa;
      }
    }

    if (!bestSiswa || bestDistance >= MATCH_THRESHOLD) {
      return NextResponse.json(
        {
          message: `Wajah tidak dikenali (skor terbaik: ${bestDistance === Infinity ? "∞" : bestDistance.toFixed(2)}). Silakan coba lagi.`,
          match: false,
          distance: bestDistance === Infinity ? null : bestDistance,
        },
        { status: 200 }
      );
    }

    const existingAbsensi = await prisma.absensi.findUnique({
      where: { userId_tanggal: { userId: bestSiswa.id, tanggal: today } },
    });

    if (existingAbsensi) {
      return NextResponse.json(
        {
          message: `${bestSiswa.nama} sudah absen hari ini pukul ${existingAbsensi.waktuMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
          match: true,
          alreadyAbsen: true,
          distance: bestDistance,
          absensi: {
            ...existingAbsensi,
            nama: bestSiswa.nama,
            kelas: bestSiswa.kelas?.namaKelas || null,
            distance: bestDistance,
          },
        },
        { status: 200 }
      );
    }

    const status = determineStatusFromTime(waktuStr, await getActiveJadwal(targetKelasId));

    let fotoWajahPath: string | null = null;
    if (fotoWajah) {
      fotoWajahPath = await saveFacePhoto(fotoWajah, bestSiswa.id);
    }

    let absensi;
    try {
      absensi = await prisma.absensi.create({
        data: {
          userId: bestSiswa.id,
          tanggal: today,
          waktuMasuk: now,
          status,
          fotoWajah: fotoWajahPath,
        },
      });
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
        const existing = await prisma.absensi.findUnique({
          where: { userId_tanggal: { userId: bestSiswa.id, tanggal: today } },
        });
        return NextResponse.json(
          {
            message: `${bestSiswa.nama} sudah absen hari ini pukul ${existing?.waktuMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
            match: true,
            alreadyAbsen: true,
            distance: bestDistance,
            absensi: {
              ...existing,
              nama: bestSiswa.nama,
              kelas: bestSiswa.kelas?.namaKelas || null,
              distance: bestDistance,
            },
          },
          { status: 200 }
        );
      }
      throw e;
    }

    await createAbsensiLog(absensi.id, session.user.id, role as "ADMIN" | "GURU" | "SISWA", "SCAN_AUTO_FACE", null, absensi);

    return NextResponse.json(
      {
        message: `Absen berhasil! ${bestSiswa.nama} — ${status === "HADIR" ? "Hadir" : "Terlambat"}`,
        match: true,
        distance: bestDistance,
        alreadyAbsen: false,
        absensi: {
          id: absensi.id,
          status: absensi.status,
          waktuMasuk: absensi.waktuMasuk,
          fotoWajah: absensi.fotoWajah,
          nama: bestSiswa.nama,
          kelas: bestSiswa.kelas?.namaKelas || null,
          distance: bestDistance,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error face absen:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}