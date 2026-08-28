import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/guru/kelas — Daftar kelas yang ditangani guru login
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ambil kelas yang ditangani guru via pivot table GuruKelas
    const guruKelas = await prisma.guruKelas.findMany({
      where: { guruId: session.user.id },
      include: {
        kelas: {
          include: {
            _count: { select: { siswa: true } },
          },
        },
      },
    });

    // Hitung surat menunggu per kelas
    const kelasIds = guruKelas.map((gk) => gk.kelasId);

    const suratCounts = await prisma.suratIzin.groupBy({
      by: ["userId"],
      where: {
        status: "MENUNGGU",
        user: { kelasId: { in: kelasIds } },
      },
      _count: { id: true },
    });

    // Map surat count per kelas
    const suratCountMap: Record<string, number> = {};
    for (const row of suratCounts) {
      // Cari kelasId dari userId
      const user = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { kelasId: true },
      });
      if (user?.kelasId) {
        suratCountMap[user.kelasId] =
          (suratCountMap[user.kelasId] || 0) + row._count.id;
      }
    }

    // Ambil jumlah siswa yang sudah absen hari ini per kelas
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    const absensiCounts = await prisma.absensi.groupBy({
      by: ["userId"],
      where: {
        tanggal: todayUTC,
        user: { kelasId: { in: kelasIds } },
      },
      _count: { id: true },
    });

    const absensiCountMap: Record<string, number> = {};
    for (const row of absensiCounts) {
      const user = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { kelasId: true },
      });
      if (user?.kelasId) {
        absensiCountMap[user.kelasId] =
          (absensiCountMap[user.kelasId] || 0) + row._count.id;
      }
    }

    const result = guruKelas.map((gk) => ({
      id: gk.kelas.id,
      namaKelas: gk.kelas.namaKelas,
      waliKelas: gk.kelas.waliKelas,
      totalSiswa: gk.kelas._count.siswa,
      sudahAbsen: absensiCountMap[gk.kelasId] || 0,
      suratMenunggu: suratCountMap[gk.kelasId] || 0,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error fetching guru kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
