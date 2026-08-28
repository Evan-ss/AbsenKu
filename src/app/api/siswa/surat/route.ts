import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

// POST /api/siswa/surat — Ajukan surat izin/sakit (multipart/form-data)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SISWA") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const tanggal = formData.get("tanggal") as string;
    const jenis = formData.get("jenis") as string;
    const keterangan = (formData.get("keterangan") as string) || "";
    const fotoFile = formData.get("fotoSurat") as File | null;

    // Validasi
    if (!tanggal || !["SAKIT", "IZIN"].includes(jenis)) {
      return NextResponse.json(
        { message: "Data tidak valid" },
        { status: 400 }
      );
    }

    if (!fotoFile || fotoFile.size === 0) {
      return NextResponse.json(
        { message: "Foto bukti harus diunggah" },
        { status: 400 }
      );
    }

    // Validasi tipe file
    if (!fotoFile.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "File harus berupa gambar" },
        { status: 400 }
      );
    }

    // Validasi ukuran (max 5MB)
    if (fotoFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "Ukuran file maksimal 5MB" },
        { status: 400 }
      );
    }

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

    // Simpan foto ke public/upload/surat/
    const uploadDir = path.join(process.cwd(), "public", "upload", "surat");
    await mkdir(uploadDir, { recursive: true });

    const ext = fotoFile.name.split(".").pop() || "jpg";
    const filename = `${session.user.id}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    const bytes = await fotoFile.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const fotoUrl = `/upload/surat/${filename}`;

    // Buat surat baru
    const surat = await prisma.suratIzin.create({
      data: {
        userId: session.user.id,
        tanggal: tanggalUTC,
        jenis: jenis as "SAKIT" | "IZIN",
        fotoSurat: fotoUrl,
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
