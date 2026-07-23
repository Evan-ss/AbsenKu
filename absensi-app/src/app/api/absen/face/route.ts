import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Fungsi untuk menghitung Euclidean distance antara dua face descriptor
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

// Threshold untuk kecocokan wajah (semakin kecil semakin ketat)
// 0.45 = ketat (hanya wajah yang sangat mirip)
// face-api.js Euclidean distance: 0.0-0.4 = sangat cocok, 0.4-0.5 = cocok, >0.5 = berbeda
const MATCH_THRESHOLD = 0.45;

// Fungsi untuk menentukan status absen berdasarkan jadwal
async function determineStatus(
  waktuSekarang: Date
): Promise<"HADIR" | "TELAT"> {
  // Format waktu ke HH:mm
  const jam = waktuSekarang.getHours().toString().padStart(2, "0");
  const menit = waktuSekarang.getMinutes().toString().padStart(2, "0");
  const waktuStr = `${jam}:${menit}`;

  // Cari jadwal aktif
  const jadwal = await prisma.jadwalAbsensi.findFirst({
    where: { aktif: true },
  });

  if (!jadwal) {
    // Tidak ada jadwal → default HADIR
    return "HADIR";
  }

  if (waktuStr < jadwal.jamMulaiMasuk) {
    // Belum waktunya absen — seharusnya前端 sudah cegah, default HADIR
    return "HADIR";
  }

  if (waktuStr <= jadwal.jamSelesaiMasuk) {
    return "HADIR";
  }

  return "TELAT";
}

// POST /api/absen/face — Absen via Face Recognition
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SISWA") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { faceDescriptor } = body;

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

    // Ambil data user yang sedang login (termasuk faceDescriptor)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nama: true,
        faceDescriptor: true,
        kelas: { select: { namaKelas: true } },
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

    // Bandingkan HANYA dengan wajah user yang sedang login (bukan semua siswa)
    // Ini mencegah: user A login pakai akun B, tapi absen pakai wajah A
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

    const bestMatch = {
      id: currentUser.id,
      nama: currentUser.nama,
      distance,
      kelas: currentUser.kelas?.namaKelas || null,
    };

    // Cek apakah sudah absen hari ini (pakai user ID yang login)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existingAbsensi = await prisma.absensi.findUnique({
      where: {
        userId_tanggal: {
          userId: currentUser.id,
          tanggal: today,
        },
      },
    });

    if (existingAbsensi) {
      return NextResponse.json(
        {
          message: `Kamu sudah absen hari ini pukul ${existingAbsensi.waktuMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
          match: true,
          alreadyAbsen: true,
          absensi: existingAbsensi,
        },
        { status: 200 }
      );
    }

    // Tentukan status (HADIR / TELAT)
    const status = await determineStatus(new Date());

    // Catat absensi
    const absensi = await prisma.absensi.create({
      data: {
        userId: bestMatch.id,
        tanggal: today,
        waktuMasuk: new Date(),
        status,
      },
      select: {
        id: true,
        status: true,
        waktuMasuk: true,
      },
    });

    return NextResponse.json(
      {
        message: `Absen berhasil! Selamat datang, ${bestMatch.nama}`,
        match: true,
        distance: bestMatch.distance,
        alreadyAbsen: false,
        absensi: {
          ...absensi,
          nama: bestMatch.nama,
          kelas: bestMatch.kelas,
          distance: bestMatch.distance,
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
