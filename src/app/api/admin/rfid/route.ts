import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createRfidSchema = z.object({
  uid: z.string().min(1, "UID kartu wajib diisi").max(50),
  userId: z.string().uuid("User ID tidak valid"),
});

const updateRfidSchema = z.object({
  uid: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/rfid — List all RFID cards
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || ""; // active, inactive, all
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { uid: { contains: search } },
        { user: { nama: { contains: search } } },
        { user: { nis: { contains: search } } },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const [rfidCards, total] = await Promise.all([
      prisma.rfidCard.findMany({
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
              email: true,
              kelas: { select: { namaKelas: true } },
            },
          },
          _count: { select: { absensi: true } },
        },
      }),
      prisma.rfidCard.count({ where }),
    ]);

    return NextResponse.json({
      data: rfidCards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching RFID cards:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/admin/rfid — Create new RFID card
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createRfidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { uid, userId } = validation.data;

    // Check if UID already exists
    const existingUid = await prisma.rfidCard.findUnique({
      where: { uid: uid.toUpperCase() },
    });

    if (existingUid) {
      return NextResponse.json(
        { message: "UID kartu sudah terdaftar" },
        { status: 409 }
      );
    }

    // Check if user exists and is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nama: true, role: true, rfidCards: { where: { isActive: true } } },
    });

    if (!user || user.role !== "SISWA") {
      return NextResponse.json(
        { message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if student already has an active RFID card
    if (user.rfidCards.length > 0) {
      return NextResponse.json(
        { message: "Siswa sudah memiliki kartu RFID aktif" },
        { status: 409 }
      );
    }

    const rfidCard = await prisma.rfidCard.create({
      data: {
        uid: uid.toUpperCase(),
        userId,
      },
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

    return NextResponse.json(
      { message: "Kartu RFID berhasil ditambahkan", data: rfidCard },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating RFID card:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}