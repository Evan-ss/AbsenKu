import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: kelasId } = await params;

    // Cek kelas exists
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      select: { id: true },
    });

    if (!kelas) {
      return NextResponse.json({ message: "Kelas tidak ditemukan" }, { status: 404 });
    }

    const siswa = await prisma.user.findMany({
      where: { kelasId, role: "SISWA", isActive: true },
      select: {
        id: true,
        nama: true,
        nis: true,
        email: true,
        faceDescriptor: true,
      },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ data: siswa });
  } catch (error) {
    console.error("Error fetching siswa:", error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}