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

    const filename = `${userId}_pulang_${Date.now()}.${ext}`;
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

function determinePulangStatus(
  waktuStr: string,
  jadwal: { jamMulaiPulang?: string | null; jamSelesaiPulang?: string | null } | null
): "TEPAT_WAKTU" | "LEBIH_AWAL" | "AUTO" {
  if (!jadwal || !jadwal.jamMulaiPulang || !jadwal.jamSelesaiPulang) {
    return "TEPAT_WAKTU";
  }
  if (waktuStr < jadwal.jamMulaiPulang) return "LEBIH_AWAL";
  if (waktuStr <= jadwal.jamSelesaiPulang) return "TEPAT_WAKTU";
  return "TEPAT_WAKTU"; // After hours tetap TEPAT_WAKTU
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SISWA") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { faceDescriptor, fotoWajah } = body;

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

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const jam = now.getHours().toString().padStart(2, "0");
    const menit = now.getMinutes().toString().padStart(2, "0");
    const waktuStr = `${jam}:${menit}`;

    // Cek absensi masuk hari ini
    const existingAbsensi = await prisma.absensi.findUnique({
      where: { userId_tanggal: { userId: currentUser.id, tanggal: today } },
    });

    if (!existingAbsensi) {
      return NextResponse.json(
        {
          message: "Kamu belum absen masuk hari ini. Silakan absen masuk terlebih dahulu.",
          match: true,
          notCheckedIn: true,
        },
        { status: 200 }
      );
    }

    // Cek status masuk - hanya HADIR/TELAT yang bisa absen pulang
    if (existingAbsensi.status !== "HADIR" && existingAbsensi.status !== "TELAT") {
      return NextResponse.json(
        {
          message: `Kamu tidak bisa absen pulang karena status masuk: ${existingAbsensi.status}. Hanya status Hadir/Telat yang bisa absen pulang.`,
          match: true,
          notCheckedIn: true,
        },
        { status: 200 }
      );
    }

    // Cek sudah absen pulang
    if (existingAbsensi.waktuPulang) {
      return NextResponse.json(
        {
          message: `Kamu sudah absen pulang hari ini pukul ${existingAbsensi.waktuPulang?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
          match: true,
          alreadyAbsen: true,
          absensi: existingAbsensi,
        },
        { status: 200 }
      );
    }

    const statusPulang = determinePulangStatus(waktuStr, await getActiveJadwal(currentUser.kelas?.id ?? null));

    let fotoPulangPath: string | null = null;
    if (fotoWajah) {
      fotoPulangPath = await saveFacePhoto(fotoWajah, currentUser.id);
    }

    const oldData = { ...existingAbsensi };
    const absensi = await prisma.absensi.update({
      where: { id: existingAbsensi.id },
      data: {
        waktuPulang: now,
        statusPulang,
        fotoPulang: fotoPulangPath,
      },
    });

    await createAbsensiLog(absensi.id, session.user.id, "SISWA", "SCAN_PULANG", oldData, absensi);

    return NextResponse.json(
      {
        message: `Absen pulang berhasil! Selamat jalan, ${currentUser.nama}`,
        match: true,
        distance,
        alreadyAbsen: false,
        absensi: {
          id: absensi.id,
          status: absensi.status,
          statusPulang: absensi.statusPulang,
          waktuMasuk: absensi.waktuMasuk,
          waktuPulang: absensi.waktuPulang,
          fotoWajah: absensi.fotoWajah,
          fotoPulang: absensi.fotoPulang,
          nama: currentUser.nama,
          kelas: currentUser.kelas?.namaKelas || null,
          distance,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error face absen pulang:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}