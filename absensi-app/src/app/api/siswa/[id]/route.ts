import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateSiswaSchema } from "@/lib/validations/siswa";

type Params = { params: Promise<{ id: string }> };

// GET /api/siswa/[id] — Get single siswa
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const siswa = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nama: true,
        nis: true,
        email: true,
        role: true,
        isActive: true,
        kelasId: true,
        kelas: {
          select: { id: true, namaKelas: true },
        },
        faceDescriptor: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!siswa || siswa.role !== "SISWA") {
      return NextResponse.json(
        { message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: siswa });
  } catch (error) {
    console.error("Error fetching siswa:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// PUT /api/siswa/[id] — Update siswa
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Cek siswa exists
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== "SISWA") {
      return NextResponse.json(
        { message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validation = updateSiswaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { password, kelasId, ...data } = validation.data;

    // Cek duplikasi NIS
    if (data.nis && data.nis !== existing.nis) {
      const nisExists = await prisma.user.findUnique({
        where: { nis: data.nis },
      });
      if (nisExists) {
        return NextResponse.json(
          { message: "NIS sudah digunakan siswa lain" },
          { status: 409 }
        );
      }
    }

    // Cek duplikasi email
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        return NextResponse.json(
          { message: "Email sudah digunakan siswa lain" },
          { status: 409 }
        );
      }
    }

    // Jika kelasId diberikan, pastikan kelas exists
    if (kelasId) {
      const kelas = await prisma.kelas.findUnique({
        where: { id: kelasId },
      });
      if (!kelas) {
        return NextResponse.json(
          { message: "Kelas tidak ditemukan" },
          { status: 404 }
        );
      }
    }

    const updateData: Record<string, unknown> = { ...data };

    if (kelasId !== undefined) {
      updateData.kelasId = kelasId || null;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const siswa = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nama: true,
        nis: true,
        email: true,
        role: true,
        isActive: true,
        kelasId: true,
        kelas: {
          select: { id: true, namaKelas: true },
        },
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Siswa berhasil diperbarui",
      data: siswa,
    });
  } catch (error) {
    console.error("Error updating siswa:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/siswa/[id] — Delete siswa
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== "SISWA") {
      return NextResponse.json(
        { message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Hapus absensi terkait dulu
    await prisma.absensi.deleteMany({ where: { userId: id } });

    // Hapus user
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Siswa berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting siswa:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
