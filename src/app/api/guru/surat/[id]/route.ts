import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const reviewSuratSchema = z.object({
  keputusan: z.enum(["DISETUJUI", "DITOLAK"]),
});

// GET /api/guru/surat/[id] — Detail surat
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const surat = await prisma.suratIzin.findUnique({
      where: { id },
      select: {
        id: true,
        tanggal: true,
        jenis: true,
        fotoSurat: true,
        keterangan: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        userId: true,
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
    });

    if (!surat) {
      return NextResponse.json(
        { message: "Surat tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah guru ditugaskan di kelas siswa pengirim
    const guruKelas = await prisma.guruKelas.findUnique({
      where: {
        guruId_kelasId: {
          guruId: session.user.id,
          kelasId: surat.user.kelas?.id || "",
        },
      },
    });

    if (!guruKelas) {
      return NextResponse.json(
        { message: "Anda tidak memiliki akses ke surat ini" },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: surat });
  } catch (error) {
    console.error("Error fetching surat detail:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// PUT /api/guru/surat/[id] — Setujui atau tolak surat
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const surat = await prisma.suratIzin.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            kelas: { select: { id: true } },
          },
        },
      },
    });

    if (!surat) {
      return NextResponse.json(
        { message: "Surat tidak ditemukan" },
        { status: 404 }
      );
    }

    if (surat.status !== "MENUNGGU") {
      return NextResponse.json(
        { message: "Surat ini sudah diproses sebelumnya" },
        { status: 400 }
      );
    }

    // Cek apakah guru ditugaskan di kelas siswa
    const guruKelas = await prisma.guruKelas.findUnique({
      where: {
        guruId_kelasId: {
          guruId: session.user.id,
          kelasId: surat.user.kelas?.id || "",
        },
      },
    });

    if (!guruKelas) {
      return NextResponse.json(
        { message: "Anda tidak memiliki akses ke surat ini" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = reviewSuratSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { keputusan } = validation.data;

    // Update status surat
    const updatedSurat = await prisma.suratIzin.update({
      where: { id },
      data: {
        status: keputusan,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Auto-update absensi siswa
    const tanggalUTC = new Date(
      Date.UTC(
        surat.tanggal.getFullYear(),
        surat.tanggal.getMonth(),
        surat.tanggal.getDate()
      )
    );

    const statusAbsensi =
      keputusan === "DISETUJUI"
        ? surat.jenis === "SAKIT"
          ? "SAKIT"
          : "IZIN"
        : "ALPA";

    // Cek apakah sudah ada absensi
    const existingAbsensi = await prisma.absensi.findUnique({
      where: { userId_tanggal: { userId: surat.userId, tanggal: tanggalUTC } },
    });

    if (existingAbsensi) {
      // Update absensi yang sudah ada
      await prisma.absensi.update({
        where: { id: existingAbsensi.id },
        data: {
          status: statusAbsensi as
            | "HADIR"
            | "TELAT"
            | "IZIN"
            | "SAKIT"
            | "ALPA",
          keterangan: `${keputusan === "DISETUJUI" ? "Disetujui" : "Ditolak"} oleh guru`,
        },
      });
    } else {
      // Buat absensi baru
      await prisma.absensi.create({
        data: {
          userId: surat.userId,
          tanggal: tanggalUTC,
          status: statusAbsensi as
            | "HADIR"
            | "TELAT"
            | "IZIN"
            | "SAKIT"
            | "ALPA",
          keterangan: `Surat ${surat.jenis} - ${keputusan === "DISETUJUI" ? "Disetujui" : "Ditolak"}`,
        },
      });
    }

    return NextResponse.json({
      message: `Surat berhasil ${keputusan === "DISETUJUI" ? "disetujui" : "ditolak"}`,
      data: {
        id: updatedSurat.id,
        status: updatedSurat.status,
        reviewedAt: updatedSurat.reviewedAt,
        absensiStatus: statusAbsensi,
      },
    });
  } catch (error) {
    console.error("Error reviewing surat:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
