import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/guru/surat — Daftar surat izin/sakit dari siswa di kelas guru
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Ambil kelas yang ditangani guru
    const guruKelas = await prisma.guruKelas.findMany({
      where: { guruId: session.user.id },
      select: { kelasId: true },
    });

    const kelasIds = guruKelas.map((gk) => gk.kelasId);

    if (kelasIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      });
    }

    // Build filter
    const where: Record<string, unknown> = {
      user: { kelasId: { in: kelasIds } },
    };

    if (status && ["MENUNGGU", "DISETUJUI", "DITOLAK"].includes(status)) {
      where.status = status;
    }

    const [surat, total] = await Promise.all([
      prisma.suratIzin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              nis: true,
              kelas: { select: { id: true, namaKelas: true } },
            },
          },
          reviewer: {
            select: { id: true, nama: true },
          },
        },
      }),
      prisma.suratIzin.count({ where }),
    ]);

    return NextResponse.json({
      data: surat,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching guru surat:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
