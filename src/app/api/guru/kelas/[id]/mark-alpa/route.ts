import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const markAlpaSchema = z.object({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD")
    .optional(),
  userIds: z
    .array(z.string().uuid())
    .min(1, "Pilih minimal satu siswa")
    .optional(),
  markAll: z.boolean().optional(),
});

// POST /api/guru/kelas/[id]/mark-alpa — Tandai siswa yang belum absen sebagai ALPA
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Cek apakah guru ditugaskan di kelas ini
    const guruKelas = await prisma.guruKelas.findUnique({
      where: { guruId_kelasId: { guruId: session.user.id, kelasId: id } },
    });

    if (!guruKelas) {
      return NextResponse.json(
        { message: "Anda tidak ditugaskan di kelas ini" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = markAlpaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tanggal, userIds, markAll } = validation.data;

    // Tentukan tanggal (default: hari ini)
    const targetDate = tanggal ? new Date(tanggal) : new Date();
    const tanggalUTC = new Date(
      Date.UTC(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      )
    );

    // Ambil semua siswa di kelas ini
    const siswaList = await prisma.user.findMany({
      where: { kelasId: id, role: "SISWA" },
      select: { id: true },
    });

    const siswaIds = siswaList.map((s) => s.id);

    // Ambil siswa yang SUDAH absen hari ini
    const sudahAbsen = await prisma.absensi.findMany({
      where: {
        userId: { in: siswaIds },
        tanggal: tanggalUTC,
      },
      select: { userId: true },
    });

    const sudahAbsenSet = new Set(sudahAbsen.map((a) => a.userId));

    // Filter siswa yang belum absen
    let targetSiswaIds: string[];
    if (markAll) {
      targetSiswaIds = siswaIds.filter((id) => !sudahAbsenSet.has(id));
    } else if (userIds && userIds.length > 0) {
      targetSiswaIds = userIds.filter((id) => !sudahAbsenSet.has(id));
    } else {
      return NextResponse.json(
        { message: "Tentukan siswa yang ingin ditandai ALPA" },
        { status: 400 }
      );
    }

    if (targetSiswaIds.length === 0) {
      return NextResponse.json({
        message: "Semua siswa sudah absen hari ini",
        marked: 0,
      });
    }

    // Bulk create absensi ALPA
    const result = await prisma.absensi.createMany({
      data: targetSiswaIds.map((userId) => ({
        userId,
        tanggal: tanggalUTC,
        status: "ALPA" as const,
        keterangan: "Ditandai ALPA oleh guru",
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: `${result.count} siswa ditandai sebagai ALPA`,
      marked: result.count,
      tanggal: tanggalUTC.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error marking ALPA:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
