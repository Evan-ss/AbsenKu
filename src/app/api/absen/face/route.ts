import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

// Simpan foto wajah dari data URL ke public/upload/face/
async function saveFacePhoto(
  fotoWajah: string,
  userId: string
): Promise<string | null> {
  try {
    // Parse data URL: data:image/jpeg;base64,...
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

// Fungsi untuk menentukan status absen berdasarkan jadwal
// Sebelum jamMulaiMasuk → HADIR (absen awal diperbolehkan)
// Antara jamMulaiMasuk dan jamSelesaiMasuk → HADIR
// Setelah jamSelesaiMasuk → TELAT
async function determineStatus(
  waktuSekarang: Date
): Promise<"HADIR" | "TELAT"> {
  const jam = waktuSekarang.getHours().toString().padStart(2, "0");
  const menit = waktuSekarang.getMinutes().toString().padStart(2, "0");
  const waktuStr = `${jam}:${menit}`;

  const jadwal = await prisma.jadwalAbsensi.findFirst({
    where: { aktif: true },
  });

  if (!jadwal) {
    return "HADIR";
  }

  // Sebelum jam mulai masuk → tetap HADIR (absen awal diperbolehkan)
  if (waktuStr < jadwal.jamMulaiMasuk) {
    return "HADIR";
  }

  // Dalam rentang jam masuk → HADIR
  if (waktuStr <= jadwal.jamSelesaiMasuk) {
    return "HADIR";
  }

  // Setelah jam selesai masuk → TELAT
  return "TELAT";
}

// POST /api/absen/face — Absen via Face Recognition
// - Role SISWA: siswa absen untuk diri sendiri (backward compatibility)
// - Role GURU: guru scan wajah siswa di kelas yang ditugaskan
// - Role ADMIN: admin scan wajah siswa (akses semua kelas)
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

    // ============================================
    // MODE SISWA: absen untuk diri sendiri
    // ============================================
    if (role === "SISWA") {
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

      const now = new Date();
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );

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
            message: `${currentUser.nama} sudah absen hari ini pukul ${existingAbsensi.waktuMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
            match: true,
            alreadyAbsen: true,
            absensi: existingAbsensi,
          },
          { status: 200 }
        );
      }

      const status = await determineStatus(now);

      // Simpan foto wajah jika ada
      let fotoWajahPath: string | null = null;
      if (fotoWajah) {
        fotoWajahPath = await saveFacePhoto(fotoWajah, bestMatch.id);
      }

      let absensi;
      try {
        absensi = await prisma.absensi.create({
          data: {
            userId: bestMatch.id,
            tanggal: today,
            waktuMasuk: now,
            status,
            fotoWajah: fotoWajahPath,
          },
          select: {
            id: true,
            status: true,
            waktuMasuk: true,
            fotoWajah: true,
          },
        });
      } catch (e: unknown) {
        // P2002 = unique constraint — sudah ada absensi untuk user+tanggal ini
        if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
          const existing = await prisma.absensi.findUnique({
            where: {
              userId_tanggal: { userId: bestMatch.id, tanggal: today },
            },
          });
          return NextResponse.json(
            {
              message: `${bestMatch.nama} sudah absen hari ini pukul ${existing?.waktuMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) || "—"}`,
              match: true,
              alreadyAbsen: true,
              absensi: existing,
            },
            { status: 200 }
          );
        }
        throw e;
      }

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
    }

    // ============================================
    // MODE GURU/ADMIN: scan wajah siswa
    // ============================================

    // Untuk GURU: ambil kelas yang ditugaskan
    // Untuk ADMIN: bisa akses semua kelas
    let siswaWhere: Record<string, unknown> = {
      role: "SISWA",
      isActive: true,
    };

    if (role === "GURU") {
      // Ambil ID kelas yang ditugaskan ke guru ini
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

      // Jika kelasId spesifik diminta, validasi guru ditugaskan di kelas itu
      if (kelasId) {
        if (!kelasIds.includes(kelasId)) {
          return NextResponse.json(
            { message: "Anda tidak ditugaskan di kelas ini" },
            { status: 403 }
          );
        }
        siswaWhere.kelasId = kelasId;
      } else {
        // Scan semua kelas yang ditugaskan
        siswaWhere.kelasId = { in: kelasIds };
      }
    } else if (role === "ADMIN") {
      // Admin bisa filter per kelas atau semua
      if (kelasId) {
        siswaWhere.kelasId = kelasId;
      }
    }

    // Ambil semua siswa di kelas yang ditugaskan
    const allSiswa = await prisma.user.findMany({
      where: siswaWhere,
      select: {
        id: true,
        nama: true,
        faceDescriptor: true,
        kelas: { select: { namaKelas: true } },
      },
    });

    // Filter hanya yang punya face descriptor valid
    const siswaList = allSiswa.filter((s) => {
      const fd = s.faceDescriptor;
      return fd !== null && fd !== undefined && Array.isArray(fd) && (fd as number[]).length >= 100;
    });

    if (siswaList.length === 0) {
      return NextResponse.json(
        {
          message: "Tidak ada siswa dengan data wajah yang terdaftar",
          match: false,
          noFaceData: true,
        },
        { status: 200 }
      );
    }

    // Bandingkan dengan SEMUA siswa, cari yang paling cocok
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

    // Wajah cocok! Cek apakah sudah absen hari ini
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    const existingAbsensi = await prisma.absensi.findUnique({
      where: {
        userId_tanggal: {
          userId: bestSiswa.id,
          tanggal: today,
        },
      },
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

    // Tentukan status (HADIR / TELAT)
    const status = await determineStatus(now);

    // Simpan foto wajah jika ada
    let fotoWajahPath: string | null = null;
    if (fotoWajah) {
      fotoWajahPath = await saveFacePhoto(fotoWajah, bestSiswa.id);
    }

    // Catat absensi
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
        select: {
          id: true,
          status: true,
          waktuMasuk: true,
          fotoWajah: true,
        },
      });
    } catch (e: unknown) {
      // P2002 = unique constraint — sudah ada absensi untuk user+tanggal ini
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
        const existing = await prisma.absensi.findUnique({
          where: {
            userId_tanggal: { userId: bestSiswa.id, tanggal: today },
          },
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

    return NextResponse.json(
      {
        message: `Absen berhasil! ${bestSiswa.nama} — ${status === "HADIR" ? "Hadir" : "Terlambat"}`,
        match: true,
        distance: bestDistance,
        alreadyAbsen: false,
        absensi: {
          ...absensi,
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
