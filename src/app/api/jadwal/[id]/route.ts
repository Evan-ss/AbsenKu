import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateJadwalSchema = z.object({
  namaJadwal: z.string().min(1).max(100).optional(),
  jamMulaiMasuk: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:mm").optional(),
  jamSelesaiMasuk: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:mm").optional(),
  jamMulaiPulang: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:mm").optional().nullable().or(z.literal("")),
  jamSelesaiPulang: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:mm").optional().nullable().or(z.literal("")),
  aktif: z.boolean().optional(),
});

// GET /api/jadwal/[id] — Get single schedule
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const jadwal = await prisma.jadwalAbsensi.findUnique({
      where: { id },
    });

    if (!jadwal) {
      return NextResponse.json(
        { message: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: jadwal });
  } catch (error) {
    console.error("Error fetching jadwal:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// PUT /api/jadwal/[id] — Update schedule
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.jadwalAbsensi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validation = updateJadwalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { jamMulaiPulang, jamSelesaiPulang, ...data } = validation.data;

    const updateData: Record<string, unknown> = { ...data };
    if (jamMulaiPulang !== undefined) updateData.jamMulaiPulang = jamMulaiPulang || null;
    if (jamSelesaiPulang !== undefined) updateData.jamSelesaiPulang = jamSelesaiPulang || null;

    const jadwal = await prisma.jadwalAbsensi.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: "Jadwal berhasil diperbarui",
      data: jadwal,
    });
  } catch (error) {
    console.error("Error updating jadwal:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/jadwal/[id] — Delete schedule
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.jadwalAbsensi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.jadwalAbsensi.delete({ where: { id } });

    return NextResponse.json({ message: "Jadwal berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting jadwal:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
