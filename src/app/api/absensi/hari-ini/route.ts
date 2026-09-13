import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "GURU" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kelasId = searchParams.get("kelasId");

    if (!kelasId) {
      return NextResponse.json({ message: "kelasId wajib diisi" }, { status: 400 });
    }

    // Cek kelas exists
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      select: { id: true },
    });

    if (!kelas) {
      return NextResponse.json({ message: "Kelas tidak ditemukan" }, { status: 404 });
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const absensi = await prisma.absensi.findMany({
      where: {
        tanggal: today,
        user: { kelasId },
      },
      select: {
        id: true,
        userId: true,
        status: true,
        waktuMasuk: true,
        waktuPulang: true,
        keterangan: true,
        fotoWajah: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: absensi });
  } catch (error) {
    console.error("Error fetching today absensi:", error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}