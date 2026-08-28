import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/dashboard/stats — Statistik real dari database
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );

    // Hitung semua statistik secara paralel
    const [
      totalSiswa,
      totalKelas,
      totalGuru,
      absensiHariIni,
      belumAbsenHariIni,
      suratMenunggu,
      absensiPerStatus,
    ] = await Promise.all([
      // Total siswa aktif
      prisma.user.count({
        where: { role: "SISWA", isActive: true },
      }),

      // Total kelas
      prisma.kelas.count(),

      // Total guru
      prisma.user.count({
        where: { role: "GURU", isActive: true },
      }),

      // Absensi hari ini (sudah scan wajah)
      prisma.absensi.count({
        where: {
          tanggal: todayUTC,
          status: { in: ["HADIR", "TELAT"] },
        },
      }),

      // Belum absen hari ini (total siswa - yang sudah absen)
      prisma.user.count({
        where: {
          role: "SISWA",
          isActive: true,
          absensi: {
            none: {
              tanggal: todayUTC,
              status: { in: ["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA"] },
            },
          },
        },
      }),

      // Surat menunggu konfirmasi
      prisma.suratIzin.count({
        where: { status: "MENUNGGU" },
      }),

      // Absensi per status hari ini
      prisma.absensi.groupBy({
        by: ["status"],
        where: { tanggal: todayUTC },
        _count: { status: true },
      }),
    ]);

    // Format absensi per status
    const statusCount: Record<string, number> = {
      HADIR: 0,
      TELAT: 0,
      IZIN: 0,
      SAKIT: 0,
      ALPA: 0,
    };
    for (const row of absensiPerStatus) {
      statusCount[row.status] = row._count.status;
    }

    return NextResponse.json({
      totalSiswa,
      totalKelas,
      totalGuru,
      absensiHariIni,
      belumAbsenHariIni,
      suratMenunggu,
      statusCount,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
