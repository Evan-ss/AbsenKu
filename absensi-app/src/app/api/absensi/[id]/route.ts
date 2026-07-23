import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateAbsensiSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD").optional(),
  waktuMasuk: z.string().optional().nullable(),
  waktuPulang: z.string().optional().nullable(),
  status: z.enum(["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA"]).optional(),
  keterangan: z.string().max(500).optional().nullable(),
});

// GET /api/absensi/[id] — Get single absensi
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const absensi = await prisma.absensi.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nis: true,
            email: true,
            kelas: { select: { namaKelas: true } },
          },
        },
      },
    });

    if (!absensi) {
      return NextResponse.json(
        { message: "Absensi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: absensi });
  } catch (error) {
    console.error("Error fetching absensi:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// PUT /api/absensi/[id] — Update absensi (koreksi manual)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.absensi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Absensi tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validation = updateAbsensiSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tanggal, waktuMasuk, waktuPulang, status, keterangan } =
      validation.data;

    const updateData: Record<string, unknown> = {};
    if (tanggal !== undefined) updateData.tanggal = new Date(tanggal);
    if (waktuMasuk !== undefined)
      updateData.waktuMasuk = waktuMasuk ? new Date(waktuMasuk) : null;
    if (waktuPulang !== undefined)
      updateData.waktuPulang = waktuPulang ? new Date(waktuPulang) : null;
    if (status !== undefined) updateData.status = status;
    if (keterangan !== undefined) updateData.keterangan = keterangan || null;

    const absensi = await prisma.absensi.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, nama: true, nis: true },
        },
      },
    });

    return NextResponse.json({
      message: "Absensi berhasil diperbarui",
      data: absensi,
    });
  } catch (error) {
    console.error("Error updating absensi:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/absensi/[id] — Delete absensi
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.absensi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Absensi tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.absensi.delete({ where: { id } });

    return NextResponse.json({ message: "Absensi berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting absensi:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
