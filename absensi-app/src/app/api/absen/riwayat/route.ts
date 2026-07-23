import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getDateRange(bulan: string, tahun: string) {
  if (bulan && tahun) {
    const m = parseInt(bulan);
    const y = parseInt(tahun);
    return {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }
  if (tahun) {
    const y = parseInt(tahun);
    return {
      gte: new Date(y, 0, 1),
      lt: new Date(y + 1, 0, 1),
    };
  }
  return null;
}

// GET /api/absen/riwayat — Get current student's attendance history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SISWA") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan") || "";
    const tahun = searchParams.get("tahun") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const skip = (page - 1) * limit;

    const tanggalFilter = getDateRange(bulan, tahun);

    const where: Prisma.AbsensiFindManyArgs["where"] = {
      userId: session.user.id,
    };

    if (tanggalFilter) {
      where.tanggal = tanggalFilter;
    }

    // Ambil data paginated + total count + statistik full bulan secara paralel
    const [absensi, total, statusCounts] = await Promise.all([
      prisma.absensi.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tanggal: "desc" },
        select: {
          id: true,
          tanggal: true,
          waktuMasuk: true,
          waktuPulang: true,
          status: true,
          keterangan: true,
        },
      }),
      prisma.absensi.count({ where }),
      prisma.absensi.groupBy({
        by: ["status"],
        where: {
          userId: session.user.id,
          ...(tanggalFilter ? { tanggal: tanggalFilter } : {}),
        },
        _count: { status: true },
      }),
    ]);

    // Hitung statistik dari groupBy (akurat untuk seluruh bulan)
    const stats = {
      hadir: 0,
      telat: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
    };

    for (const row of statusCounts) {
      const key = row.status.toLowerCase() as keyof typeof stats;
      stats[key] = row._count.status;
    }

    return NextResponse.json({
      data: absensi,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching riwayat:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
