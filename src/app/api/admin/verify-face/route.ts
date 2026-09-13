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

    const filename = `${userId}_verify_${Date.now()}.${ext}`;
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, faceDescriptor, kelasId, siswaId, absensiId, fotoWajah } = body;

    if (!kelasId) {
      return NextResponse.json(
        { message: "kelasId wajib diisi" },
        { status: 400 }
      );
    }

    // Handle CONFIRM action (after verification panel)
    if (action === "CONFIRM") {
      if (!siswaId) {
        return NextResponse.json(
          { message: "siswaId wajib diisi untuk konfirmasi" },
          { status: 400 }
        );
      }

      const now = new Date();
      const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const jam = now.getHours().toString().padStart(2, "0");
      const menit = now.getMinutes().toString().padStart(2, "0");
      const waktuStr = `${jam}:${menit}`;

      // Check if already has absensi today
      let existingAbsensi = absensiId
        ? await prisma.absensi.findUnique({ where: { id: absensiId } })
        : await prisma.absensi.findUnique({
            where: { userId_tanggal: { userId: siswaId, tanggal: today } },
          });

      const siswa = await prisma.user.findUnique({
        where: { id: siswaId },
        select: { id: true, nama: true, kelas: { select: { namaKelas: true } } },
      });

      if (!siswa) {
        return NextResponse.json({ message: "Siswa tidak ditemukan" }, { status: 404 });
      }

      const jadwal = await getActiveJadwal(kelasId);
      const status = determineStatusFromTime(waktuStr, jadwal);

      let fotoWajahPath: string | null = null;
      if (fotoWajah) {
        fotoWajahPath = await saveFacePhoto(fotoWajah, siswaId);
      }

      let absensi;
      let actionType: string;

      if (existingAbsensi) {
        const oldData = { ...existingAbsensi };
        absensi = await prisma.absensi.update({
          where: { id: existingAbsensi.id },
          data: {
            waktuMasuk: now,
            status,
            fotoWajah: fotoWajahPath,
            verifiedBy: session.user.id,
            verifiedAt: now,
          },
        });
        actionType = "VERIFY_CONFIRM_UPDATE";
        await createAbsensiLog(absensi.id, session.user.id, "ADMIN", actionType, oldData, absensi);
      } else {
        absensi = await prisma.absensi.create({
          data: {
            userId: siswaId,
            tanggal: today,
            waktuMasuk: now,
            status,
            fotoWajah: fotoWajahPath,
            verifiedBy: session.user.id,
            verifiedAt: now,
          },
        });
        actionType = "VERIFY_CONFIRM_CREATE";
        await createAbsensiLog(absensi.id, session.user.id, "ADMIN", actionType, null, absensi);
      }

      return NextResponse.json({
        message: `Verifikasi berhasil! ${siswa.nama} — ${status === "HADIR" ? "Hadir" : "Terlambat"}`,
        match: true,
        distance: 0,
        alreadyAbsen: false,
        absensi: {
          id: absensi.id,
          status: absensi.status,
          waktuMasuk: absensi.waktuMasuk,
          fotoWajah: absensi.fotoWajah,
          nama: siswa.nama,
          kelas: siswa.kelas?.namaKelas || null,
          distance: 0,
        },
      });
    }

    // Handle REJECT/SKIP - just return to scanning
    if (action === "REJECT" || action === "SKIP") {
      return NextResponse.json({ message: "Dibatalkan", match: false });
    }

    // Default: Face detection for verification
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

    // Get all students in class with face descriptor
    const siswaWhere: Record<string, unknown> = {
      role: "SISWA",
      isActive: true,
      kelasId,
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

    // Find best match
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

    // Check if already has absensi today
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

    // Need verification - return match data for verification panel
    const confidence = 1 - bestDistance / 0.6; // Rough confidence estimate
    const jadwal = await getActiveJadwal(kelasId);
    const status = determineStatusFromTime(waktuStr, jadwal);

    return NextResponse.json({
      message: `Wajah cocok dengan ${bestSiswa.nama}. Silakan verifikasi.`,
      match: true,
      needVerification: true,
      distance: bestDistance,
      confidence: Math.max(0, Math.min(1, confidence)),
      siswaId: bestSiswa.id,
      nama: bestSiswa.nama,
      kelas: bestSiswa.kelas?.namaKelas || null,
      status,
    });
  } catch (error) {
    console.error("Error admin verify face:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}