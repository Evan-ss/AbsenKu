import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Schema validasi dengan Zod
const registerSchema = z.object({
  nama: z.string().min(1, "Nama harus diisi"),
  nis: z.string().min(1, "NIS harus diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  kelasId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Cek session — hanya admin yang boleh register
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = registerSchema.safeParse(body);

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user baru
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
      },
    });

    return NextResponse.json(
      { message: "Siswa berhasil didaftarkan", data: user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
