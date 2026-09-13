import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const manualAbsensiSchema = z.object({
  userId: z.string().uuid("User ID tidak valid"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  status: z.enum(["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA"]),
  keterangan: z.string().max(500).optional().nullable(),
  waktuMasuk: z.string().optional().nullable(),
});

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

async function getJadwalForKelas(kelasId: string | null) {
  if (!kelasId) {
    return prisma.jadwalAbsensi.findFirst({ where: { aktif: true } });
  }
  return prisma.jadwalAbsensi.findFirst({
    where: { kelasId, aktif: true },
  });
}

function determineStatus(waktuStr: string, jadwal: { jamMulaiMasuk: string; jamSelesaiMasuk: string } | null): "HADIR" | "TELAT" {
  if (!jadwal) return "HADIR";
  if (waktuStr < jadwal.jamMulaiMasuk) return "HADIR";
  if (waktuStr <= jadwal.jamSelesaiMasuk) return "HADIR";
  return "TELAT";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "GURU" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = manualAbsensiSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId, tanggal, status, keterangan, waktuMasuk } = validation.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { kelas: true },
    });

    if (!targetUser || targetUser.role !== "SISWA") {
      return NextResponse.json({ message: "Siswa tidak ditemukan" }, { status: 404 });
    }

    if (session.user.role === "GURU") {
      const guruKelas = await prisma.guruKelas.findUnique({
        where: { guruId_kelasId: { guruId: session.user.id, kelasId: targetUser.kelasId! } },
      });
      if (!guruKelas) {
        return NextResponse.json({ message: "Anda tidak wali kelas siswa ini" }, { status: 403 });
      }
    }

    const tgl = new Date(tanggal);
    const existing = await prisma.absensi.findUnique({
      where: { userId_tanggal: { userId, tanggal: tgl } },
    });

    const now = new Date();
    const jam = now.getHours().toString().padStart(2, "0");
    const menit = now.getMinutes().toString().padStart(2, "0");
    const waktuStr = waktuMasuk || `${jam}:${menit}`;

    const jadwal = await getJadwalForKelas(targetUser.kelasId);
    const finalStatus = status === "HADIR" || status === "TELAT" ? determineStatus(waktuStr, jadwal) : status;

    let absensi;
    let action: string;
    let oldData: unknown = null;

    if (existing) {
      oldData = { ...existing };
      absensi = await prisma.absensi.update({
        where: { id: existing.id },
        data: {
          status: finalStatus,
          keterangan: keterangan || null,
          waktuMasuk: waktuMasuk ? new Date(waktuMasuk) : (status === "HADIR" || status === "TELAT" ? now : null),
          updatedAt: new Date(),
        },
        include: { user: { select: { id: true, nama: true, nis: true, kelas: { select: { namaKelas: true } } } } },
      });
      action = "EDIT_MANUAL";
    } else {
      absensi = await prisma.absensi.create({
        data: {
          userId,
          tanggal: tgl,
          waktuMasuk: waktuMasuk ? new Date(waktuMasuk) : (status === "HADIR" || status === "TELAT" ? now : null),
          status: finalStatus,
          keterangan: keterangan || null,
        },
        include: { user: { select: { id: true, nama: true, nis: true, kelas: { select: { namaKelas: true } } } } },
      });
      action = "CREATE_MANUAL";
    }

    await createAbsensiLog(absensi.id, session.user.id, session.user.role as "ADMIN" | "GURU" | "SISWA", action, oldData, absensi);

    return NextResponse.json(
      { message: "Absensi manual berhasil dicatat", data: absensi },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("Error manual absensi:", error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}