import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSiswaSchema } from "@/lib/validations/siswa";

// GET /api/siswa — List all siswa (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const kelasId = searchParams.get("kelasId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Prisma.UserFindManyArgs["where"] = {
      role: "SISWA",
    };

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { nis: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (kelasId) {
      where.kelasId = kelasId;
    }

    const [siswa, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
          rfidCards: {
            select: { id: true, uid: true, isActive: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: siswa,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching siswa:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/siswa — Create new siswa (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createSiswaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { nama, nis, email, password, kelasId } = validation.data;

    // Cek duplikasi NIS
    const existingNis = await prisma.user.findUnique({ where: { nis } });
    if (existingNis) {
      return NextResponse.json(
        { message: "NIS sudah terdaftar" },
        { status: 409 }
      );
    }

    // Cek duplikasi email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 409 }
      );
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nama,
        nis,
        email,
        password: hashedPassword,
        role: "SISWA",
        kelasId: kelasId || null,
      },
      select: {
        id: true,
        nama: true,
        nis: true,
        email: true,
        role: true,
        kelas: { select: { id: true, namaKelas: true } },
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "Siswa berhasil ditambahkan", data: user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating siswa:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
