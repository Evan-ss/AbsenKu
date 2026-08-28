import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createSuratSchema = z.object({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD"),
  jenis: z.enum(["SAKIT", "IZIN"]),
  fotoSurat: z.string().min(1, "Foto bukti harus diunggah"),
  keterangan: z.string().max(500).optional(),
});

// GET /api/siswa/surat — Riwayat surat siswa yang login
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SISWA") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [surat, total] = await Promise.all([
      prisma.suratIzin.findMany({
        where: { userId: session.user.id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          tanggal: true,
          jenis: true,
          fotoSurat: true,
          keterangan: true,
          status: true,
          reviewedAt: true,
          createdAt: true,
          reviewer: {
            select: { nama: true },
          },
        },
      }),
      prisma.suratIzin.count({
        where: { userId: session.user.id },
      }),
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
    console.error("Error fetching siswa surat:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/siswa/surat — Ajukan surat izin/sakit
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SISWA") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createSuratSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tanggal, jenis, fotoSurat, keterangan } = validation.data;

    // Cek apakah sudah ada surat untuk tanggal ini
    const tanggalDate = new Date(tanggal);
    const tanggalUTC = new Date(
      Date.UTC(
        tanggalDate.getFullYear(),
        tanggalDate.getMonth(),
        tanggalDate.getDate()
      )
    );

    const existingSurat = await prisma.suratIzin.findFirst({
      where: {
        userId: session.user.id,
        tanggal: tanggalUTC,
      },
    });

    if (existingSurat) {
      return NextResponse.json(
        { message: "Anda sudah mengajukan surat untuk tanggal ini" },
        { status: 409 }
      );
    }

    // Cek apakah sudah absen di tanggal ini
    const existingAbsensi = await prisma.absensi.findUnique({
      where: {
        userId_tanggal: {
          userId: session.user.id,
          tanggal: tanggalUTC,
        },
      },
    });

    if (
      existingAbsensi &&
      (existingAbsensi.status === "HADIR" ||
        existingAbsensi.status === "TELAT")
    ) {
      return NextResponse.json(
        {
          message:
            "Anda sudah absen hadir/telat di tanggal ini, tidak bisa mengajukan surat",
        },
        { status: 400 }
      );
    }

    // Buat surat baru
    const surat = await prisma.suratIzin.create({
      data: {
        userId: session.user.id,
        tanggal: tanggalUTC,
        jenis,
        fotoSurat,
        keterangan: keterangan || null,
        status: "MENUNGGU",
      },
      select: {
        id: true,
        tanggal: true,
        jenis: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Surat berhasil diajukan. Menunggu konfirmasi guru.",
        data: surat,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating surat:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
