import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/siswa/[id]/face — Save face descriptor for a student
// - Role ADMIN: bisa rekam wajah semua siswa
// - Role GURU: bisa rekam wajah siswa di kelas yang ditugaskan
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "GURU")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Cek siswa exists
    const siswa = await prisma.user.findUnique({ where: { id } });
    if (!siswa || siswa.role !== "SISWA") {
      return NextResponse.json(
        { message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jika GURU, pastikan siswa di kelas yang ditugaskan
    if (session.user.role === "GURU" && siswa.kelasId) {
      const guruKelas = await prisma.guruKelas.findUnique({
        where: {
          guruId_kelasId: {
            guruId: session.user.id,
            kelasId: siswa.kelasId,
          },
        },
      });
      if (!guruKelas) {
        return NextResponse.json(
          { message: "Anda tidak ditugaskan di kelas siswa ini" },
          { status: 403 }
        );
      }
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

    // Simpan face descriptor
    await prisma.user.update({
      where: { id },
      data: { faceDescriptor: faceDescriptor as number[] },
    });

    return NextResponse.json({
      message: "Wajah berhasil direkam",
      length: faceDescriptor.length,
    });
  } catch (error) {
    console.error("Error saving face descriptor:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
