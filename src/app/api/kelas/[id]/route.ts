import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateKelasSchema = z.object({
  namaKelas: z
    .string()
    .min(1, "Nama kelas harus diisi")
    .max(50, "Nama kelas maksimal 50 karakter")
    .optional(),
  waliKelas: z
    .string()
    .max(100, "Nama wali kelas maksimal 100 karakter")
    .optional()
    .nullable()
    .or(z.literal("")),
});

// GET /api/kelas/[id] — Get single kelas
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const kelas = await prisma.kelas.findUnique({
      where: { id },
      include: {
        _count: { select: { siswa: true } },
      },
    });

    if (!kelas) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: kelas });
  } catch (error) {
    console.error("Error fetching kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// PUT /api/kelas/[id] — Update kelas
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.kelas.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validation = updateKelasSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { namaKelas, waliKelas } = validation.data;

    // Cek duplikasi nama kelas
    if (namaKelas && namaKelas !== existing.namaKelas) {
      const duplicate = await prisma.kelas.findUnique({
        where: { namaKelas },
      });
      if (duplicate) {
        return NextResponse.json(
          { message: "Nama kelas sudah digunakan" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (namaKelas !== undefined) updateData.namaKelas = namaKelas;
    if (waliKelas !== undefined) updateData.waliKelas = waliKelas || null;

    const kelas = await prisma.kelas.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: "Kelas berhasil diperbarui",
      data: kelas,
    });
  } catch (error) {
    console.error("Error updating kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/kelas/[id] — Delete kelas
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.kelas.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah masih ada siswa di kelas ini
    const siswaCount = await prisma.user.count({
      where: { kelasId: id, role: "SISWA" },
    });
    if (siswaCount > 0) {
      return NextResponse.json(
        {
          message: `Tidak dapat menghapus kelas. Masih ada ${siswaCount} siswa terdaftar di kelas ini.`,
        },
        { status: 409 }
      );
    }

    await prisma.kelas.delete({ where: { id } });

    return NextResponse.json({ message: "Kelas berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
