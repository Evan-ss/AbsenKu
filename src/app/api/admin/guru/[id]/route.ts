import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/admin/guru/[id] — Hapus akun guru
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const guru = await prisma.user.findUnique({ where: { id } });
    if (!guru || guru.role !== "GURU") {
      return NextResponse.json(
        { message: "Guru tidak ditemukan" },
        { status: 404 }
      );
    }

    // Hapus semua assignment guru-kelas dulu
    await prisma.guruKelas.deleteMany({ where: { guruId: id } });

    // Hapus guru
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Guru berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting guru:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
