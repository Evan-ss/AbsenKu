import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createAbsensiSchema = z.object({
  userId: z.string().uuid("User ID tidak valid"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  waktuMasuk: z.string().optional().nullable(),
  waktuPulang: z.string().optional().nullable(),
  status: z.enum(["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA"]).default("HADIR"),
  keterangan: z.string().max(500).optional().nullable(),
});

// GET /api/absensi — List all absensi with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tanggal = searchParams.get("tanggal") || "";
    const kelasId = searchParams.get("kelasId") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Prisma.AbsensiFindManyArgs["where"] = {};

    // Filter by date
    if (tanggal) {
      where.tanggal = new Date(tanggal);
    }

    // Filter by status
    if (status && ["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA"].includes(status)) {
      where.status = status as "HADIR" | "TELAT" | "IZIN" | "SAKIT" | "ALPA";
    }

    // Filter by kelas and search
    const userWhere: Prisma.UserFindManyArgs["where"] = {};
    if (kelasId) {
      userWhere.kelasId = kelasId;
    }
    if (search) {
      userWhere.OR = [
        { nama: { contains: search } },
        { nis: { contains: search } },
      ];
    }
    if (Object.keys(userWhere).length > 0) {
      where.user = userWhere;
    }

    const [absensi, total] = await Promise.all([
      prisma.absensi.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              nis: true,
              kelas: { select: { namaKelas: true } },
            },
          },
        },
      }),
      prisma.absensi.count({ where }),
    ]);

    return NextResponse.json({
      data: absensi,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching absensi:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/absensi — Create absensi (admin manual or from face recognition)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createAbsensiSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId, tanggal, waktuMasuk, waktuPulang, status, keterangan } =
      validation.data;

    // Cek user exists dan role SISWA
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "SISWA") {
      return NextResponse.json(
        { message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah sudah absen di tanggal ini
    const existing = await prisma.absensi.findUnique({
      where: { userId_tanggal: { userId, tanggal: new Date(tanggal) } },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Siswa sudah absen pada tanggal ini" },
        { status: 409 }
      );
    }

    const absensi = await prisma.absensi.create({
      data: {
        userId,
        tanggal: new Date(tanggal),
        waktuMasuk: waktuMasuk ? new Date(waktuMasuk) : null,
        waktuPulang: waktuPulang ? new Date(waktuPulang) : null,
        status,
        keterangan: keterangan || null,
      },
      include: {
        user: {
          select: { id: true, nama: true, nis: true },
        },
      },
    });

    return NextResponse.json(
      { message: "Absensi berhasil dicatat", data: absensi },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating absensi:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
