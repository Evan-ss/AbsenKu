import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// DELETE /api/guru/absensi?id=xxx — Hapus absensi manual
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const absensiId = searchParams.get("id");

    if (!absensiId) {
      return NextResponse.json(
        { message: "ID absensi harus diisi" },
        { status: 400 }
      );
    }

    // Find the absensi
    const absensi = await prisma.absensi.findUnique({
      where: { id: absensiId },
      include: {
        user: {
          select: { id: true, kelasId: true },
        },
      },
    });

    if (!absensi) {
      return NextResponse.json(
        { message: "Absensi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verify guru is assigned to the student's class
    if (absensi.user.kelasId) {
      const guruKelas = await prisma.guruKelas.findUnique({
        where: {
          guruId_kelasId: {
            guruId: session.user.id,
            kelasId: absensi.user.kelasId,
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

    // Only allow deleting manual attendance (keterangan starts with [MANUAL])
    if (!absensi.keterangan?.startsWith("[MANUAL]")) {
      return NextResponse.json(
        { message: "Hanya absensi manual yang bisa dihapus" },
        { status: 400 }
      );
    }

    // Delete the absensi
    await prisma.absensi.delete({
      where: { id: absensiId },
    });

    return NextResponse.json({
      message: "Absensi manual berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting manual absensi:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
