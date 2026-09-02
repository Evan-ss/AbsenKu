import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/data-manager — List all students with data stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ambil semua siswa
    const siswaList = await prisma.user.findMany({
      where: { role: "SISWA" },
      select: {
        id: true,
        nama: true,
        nis: true,
        email: true,
        faceDescriptor: true,
        kelas: { select: { namaKelas: true } },
      },
      orderBy: { nama: "asc" },
    });

    // Ambil stats absensi per siswa
    const absensiStats = await prisma.absensi.groupBy({
      by: ["userId"],
      where: {
        userId: { in: siswaList.map(s => s.id) },
      },
      _count: { id: true },
    });

    // Hitung foto yang tidak null
    const absensiWithFoto = await prisma.absensi.groupBy({
      by: ["userId"],
      where: {
        userId: { in: siswaList.map(s => s.id) },
        fotoWajah: { not: null },
      },
      _count: { id: true },
    });

    // Ambil stats surat per siswa
    const suratStats = await prisma.suratIzin.groupBy({
      by: ["userId"],
      where: {
        userId: { in: siswaList.map(s => s.id) },
      },
      _count: { id: true },
    });

    // Map stats
    const absensiMap: Record<string, number> = {};
    const absensiFotoMap: Record<string, number> = {};
    const suratMap: Record<string, number> = {};

    for (const a of absensiStats) {
      absensiMap[a.userId] = a._count.id;
    }
    for (const a of absensiWithFoto) {
      absensiFotoMap[a.userId] = a._count.id;
    }
    for (const s of suratStats) {
      suratMap[s.userId] = s._count.id;
    }

    // Gabungkan data
    const students = siswaList.map(siswa => ({
      id: siswa.id,
      nama: siswa.nama,
      nis: siswa.nis,
      email: siswa.email,
      kelas: siswa.kelas?.namaKelas || null,
      punyaWajah: !!siswa.faceDescriptor,
      totalAbsensi: absensiMap[siswa.id] || 0,
      absensiDenganFoto: absensiFotoMap[siswa.id] || 0,
      totalSurat: suratMap[siswa.id] || 0,
    }));

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Error fetching data manager:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
