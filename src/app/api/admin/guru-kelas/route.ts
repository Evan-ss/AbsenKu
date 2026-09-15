import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const assignGuruSchema = z.object({
  guruId: z.string().uuid("Guru ID tidak valid"),
  kelasId: z.string().uuid("Kelas ID tidak valid"),
  mode: z.enum(["assign", "replace"]).default("assign"),
});

interface WaliKelasInfo {
  guruId: string;
  guruNama: string;
  guruEmail: string;
}

// GET /api/admin/guru-kelas — Daftar semua assignment guru-kelas + info wali kelas per kelas
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.guruKelas.findMany({
      include: {
        guru: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
        kelas: {
          select: {
            id: true,
            namaKelas: true,
            waliKelas: true,
            _count: { select: { siswa: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Ambil semua guru (untuk dropdown)
    const allGuru = await prisma.user.findMany({
      where: { role: "GURU" },
      select: {
        id: true,
        nama: true,
        email: true,
      },
    });

    // Ambil semua kelas dengan info wali kelas saat ini
    const allKelas = await prisma.kelas.findMany({
      select: {
        id: true,
        namaKelas: true,
        waliKelas: true,
        _count: { select: { siswa: true } },
      },
    });

    // Bangkap map wali kelas per kelas dari GuruKelas
    const waliKelasMap = new Map<string, WaliKelasInfo>();
    for (const assignment of assignments) {
      // Hanya yang pertama kali diassign sebagai wali (bisa multiple guru per kelas, tapi yang pertama dianggap wali)
      if (!waliKelasMap.has(assignment.kelas.id)) {
        waliKelasMap.set(assignment.kelas.id, {
          guruId: assignment.guru.id,
          guruNama: assignment.guru.nama,
          guruEmail: assignment.guru.email,
        });
      }
    }

    return NextResponse.json({
      data: assignments,
      guru: allGuru,
      kelas: allKelas.map((k) => ({
        ...k,
        waliKelasInfo: waliKelasMap.get(k.id) || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching guru-kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/admin/guru-kelas — Assign guru ke kelas (dengan mode replace)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = assignGuruSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { guruId, kelasId, mode } = validation.data;

    // Cek guru exists
    const guru = await prisma.user.findUnique({ where: { id: guruId } });
    if (!guru || guru.role !== "GURU") {
      return NextResponse.json(
        { message: "Guru tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek kelas exists
    const kelas = await prisma.kelas.findUnique({ where: { id: kelasId } });
    if (!kelas) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cek apakah guru sudah diassign ke kelas ini
    const existingAssignment = await prisma.guruKelas.findUnique({
      where: { guruId_kelasId: { guruId, kelasId } },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { message: "Guru sudah ditugaskan di kelas ini" },
        { status: 409 }
      );
    }

    // Cek wali kelas saat ini (guruKelas pertama untuk kelas ini)
    const currentWaliKelas = await prisma.guruKelas.findFirst({
      where: { kelasId },
      include: { guru: { select: { id: true, nama: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (mode === "replace") {
      // MODE REPLACE: Hapus wali kelas lama, lalu assign guru baru
      if (!currentWaliKelas) {
        return NextResponse.json(
          { message: "Kelas ini belum memiliki wali kelas untuk diganti" },
          { status: 400 }
        );
      }

      if (currentWaliKelas.guruId === guruId) {
        return NextResponse.json(
          { message: "Guru ini sudah menjadi wali kelas saat ini" },
          { status: 409 }
        );
      }

      // Simpan info wali lama sebelum dihapus
      const oldWaliInfo = {
        id: currentWaliKelas.guru.id,
        nama: currentWaliKelas.guru.nama,
      };

      // Transaksi: hapus wali lama + assign wali baru
      const [, assignment] = await prisma.$transaction([
        prisma.guruKelas.delete({
          where: { guruId_kelasId: { guruId: currentWaliKelas.guruId, kelasId } },
        }),
        prisma.guruKelas.create({
          data: { guruId, kelasId },
          include: {
            guru: { select: { id: true, nama: true } },
            kelas: { select: { id: true, namaKelas: true } },
          },
        }),
      ]);

      return NextResponse.json({
        message: `Wali kelas diganti: ${oldWaliInfo.nama} → ${guru.nama} untuk ${kelas.namaKelas}`,
        data: assignment,
        replaced: {
          oldWaliKelas: oldWaliInfo,
          newWaliKelas: { id: guru.id, nama: guru.nama },
        },
      });
    }

    // MODE ASSIGN (default): Cek apakah kelas sudah punya wali kelas
    if (currentWaliKelas) {
      return NextResponse.json(
        {
          message: `Kelas ini sudah memiliki wali kelas: ${currentWaliKelas.guru.nama}. Gunakan mode "replace" untuk mengganti.`,
          hasExistingWaliKelas: true,
          currentWaliKelas: {
            guruId: currentWaliKelas.guru.id,
            guruNama: currentWaliKelas.guru.nama,
            guruEmail: currentWaliKelas.guru.email || "",
          },
          suggestion: "replace",
        },
        { status: 409 }
      );
    }

    // Assign baru (kelas belum punya wali)
    const assignment = await prisma.guruKelas.create({
      data: { guruId, kelasId },
      include: {
        guru: { select: { id: true, nama: true } },
        kelas: { select: { id: true, namaKelas: true } },
      },
    });

    return NextResponse.json(
      {
        message: `${guru.nama} berhasil ditugaskan sebagai wali kelas ${kelas.namaKelas}`,
        data: assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error assigning guru:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/guru-kelas — Unassign guru dari kelas
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const guruId = searchParams.get("guruId");
    const kelasId = searchParams.get("kelasId");

    if (!guruId || !kelasId) {
      return NextResponse.json(
        { message: "guruId dan kelasId harus diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.guruKelas.findUnique({
      where: { guruId_kelasId: { guruId, kelasId } },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Assignment tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.guruKelas.delete({
      where: { guruId_kelasId: { guruId, kelasId } },
    });

    return NextResponse.json({ message: "Assignment berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting guru-kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}