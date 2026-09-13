import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/guru/kelas — Daftar semua kelas dengan flag isWaliKelas & isGuruMapel + mataPelajaran
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ambil kelas yang diampu sebagai WALI KELAS
    const guruKelas = await prisma.guruKelas.findMany({
      where: { guruId: session.user.id },
      select: { kelasId: true },
    });
    const waliKelasIds = new Set(guruKelas.map((gk) => gk.kelasId));

    // Ambil kelas yang diampu sebagai GURU MAPEL
    const guruMapel = await prisma.guruMapel.findMany({
      where: { guruId: session.user.id },
      select: { kelasId: true, mataPelajaran: true },
    });
    const mapelKelasMap = new Map<string, string[]>();
    for (const gm of guruMapel) {
      const existing = mapelKelasMap.get(gm.kelasId) || [];
      existing.push(gm.mataPelajaran);
      mapelKelasMap.set(gm.kelasId, existing);
    }
    const mapelKelasIds = new Set(guruMapel.map((gm) => gm.kelasId));

    // Ambil SEMUA kelas untuk ditampilkan ke semua guru
    const allKelas = await prisma.kelas.findMany({
      include: {
        _count: { select: { siswa: true } },
      },
      orderBy: { namaKelas: "asc" },
    });

    // Hitung surat menunggu per kelas
    const allKelasIds = allKelas.map((k) => k.id);

    const suratCounts = await prisma.suratIzin.groupBy({
      by: ["userId"],
      where: {
        status: "MENUNGGU",
        user: { kelasId: { in: allKelasIds } },
      },
      _count: { id: true },
    });

    const suratCountMap: Record<string, number> = {};
    for (const row of suratCounts) {
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
        user: { kelasId: { in: allKelasIds } },
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

    const result = allKelas.map((kelas) => ({
      id: kelas.id,
      namaKelas: kelas.namaKelas,
      waliKelas: kelas.waliKelas,
      totalSiswa: kelas._count.siswa,
      sudahAbsen: absensiCountMap[kelas.id] || 0,
      suratMenunggu: suratCountMap[kelas.id] || 0,
      isWaliKelas: waliKelasIds.has(kelas.id),
      isGuruMapel: mapelKelasIds.has(kelas.id),
      mataPelajaran: mapelKelasMap.get(kelas.id) || [],
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