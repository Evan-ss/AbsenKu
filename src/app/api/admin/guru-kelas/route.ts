import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const assignGuruSchema = z.object({
  guruId: z.string().uuid("Guru ID tidak valid"),
  kelasId: z.string().uuid("Kelas ID tidak valid"),
});

// GET /api/admin/guru-kelas — Daftar semua assignment guru-kelas
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.guruKelas.findMany({
      include: {
        guru: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
        kelas: {
          select: {
            id: true,
            namaKelas: true,
            waliKelas: true,
            _count: { select: { siswa: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Ambil semua guru (untuk dropdown)
    const allGuru = await prisma.user.findMany({
      where: { role: "GURU" },
      select: {
        id: true,
        nama: true,
        email: true,
      },
    });

    // Ambil semua kelas (untuk dropdown)
    const allKelas = await prisma.kelas.findMany({
      select: {
        id: true,
        namaKelas: true,
        _count: { select: { siswa: true } },
      },
    });

    return NextResponse.json({
      data: assignments,
      guru: allGuru,
      kelas: allKelas,
    });
  } catch (error) {
    console.error("Error fetching guru-kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/admin/guru-kelas — Assign guru ke kelas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = assignGuruSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { guruId, kelasId } = validation.data;

    // Cek guru exists
    const guru = await prisma.user.findUnique({ where: { id: guruId } });
    if (!guru || guru.role !== "GURU") {
      return NextResponse.json(
        { message: "Guru tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek kelas exists
    const kelas = await prisma.kelas.findUnique({ where: { id: kelasId } });
    if (!kelas) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah sudah diassign
    const existing = await prisma.guruKelas.findUnique({
      where: { guruId_kelasId: { guruId, kelasId } },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Guru sudah ditugaskan di kelas ini" },
        { status: 409 }
      );
    }

    const assignment = await prisma.guruKelas.create({
      data: { guruId, kelasId },
      include: {
        guru: { select: { id: true, nama: true } },
        kelas: { select: { id: true, namaKelas: true } },
      },
    });

    return NextResponse.json(
      {
        message: `${guru.nama} berhasil ditugaskan ke ${kelas.namaKelas}`,
        data: assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error assigning guru:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/guru-kelas — Unassign guru dari kelas
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const guruId = searchParams.get("guruId");
    const kelasId = searchParams.get("kelasId");

    if (!guruId || !kelasId) {
      return NextResponse.json(
        { message: "guruId dan kelasId harus diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.guruKelas.findUnique({
      where: { guruId_kelasId: { guruId, kelasId } },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Assignment tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.guruKelas.delete({
      where: { guruId_kelasId: { guruId, kelasId } },
    });

    return NextResponse.json({ message: "Assignment berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting guru-kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
