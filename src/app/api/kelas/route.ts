import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createKelasSchema = z.object({
  namaKelas: z
    .string()
    .min(1, "Nama kelas harus diisi")
    .max(50, "Nama kelas maksimal 50 karakter"),
  waliKelas: z
    .string()
    .max(100, "Nama wali kelas maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
});

// GET /api/kelas — List all kelas
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const kelas = await prisma.kelas.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { siswa: true } },
      },
    });

    return NextResponse.json({ data: kelas });
  } catch (error) {
    console.error("Error fetching kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/kelas — Create new kelas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createKelasSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { namaKelas, waliKelas } = validation.data;

    // Cek duplikasi nama kelas
    const existing = await prisma.kelas.findUnique({
      where: { namaKelas },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Nama kelas sudah ada" },
        { status: 409 }
      );
    }

    const kelas = await prisma.kelas.create({
      data: {
        namaKelas,
        waliKelas: waliKelas || null,
      },
    });

    return NextResponse.json(
      { message: "Kelas berhasil ditambahkan", data: kelas },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
