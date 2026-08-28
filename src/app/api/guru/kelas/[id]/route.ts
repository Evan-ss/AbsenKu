import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/guru/kelas/[id] — Detail absensi real-time untuk kelas tertentu
export async function GET(req: NextRequest, { params }: Params) {
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

    // Ambil parameter tanggal (default: hari ini)
    const { searchParams } = new URL(req.url);
    const tanggalParam = searchParams.get("tanggal");
    const tanggal = tanggalParam
      ? new Date(tanggalParam)
      : new Date();
    const tanggalUTC = new Date(
      Date.UTC(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate())
    );

    // Ambil info kelas
    const kelas = await prisma.kelas.findUnique({
      where: { id },
      select: { id: true, namaKelas: true, waliKelas: true },
    });

    if (!kelas) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil semua siswa di kelas ini
    const siswaList = await prisma.user.findMany({
      where: { kelasId: id, role: "SISWA" },
      select: {
        id: true,
        nama: true,
        nis: true,
        email: true,
        faceDescriptor: true,
      },
      orderBy: { nama: "asc" },
    });

    // Ambil data absensi untuk kelas ini pada tanggal yang dipilih
    const absensiList = await prisma.absensi.findMany({
      where: {
        userId: { in: siswaList.map((s) => s.id) },
        tanggal: tanggalUTC,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        waktuMasuk: true,
        waktuPulang: true,
        keterangan: true,
      },
    });

    // Map absensi per user
    const absensiMap: Record<
      string,
      {
        id: string;
        status: string;
        waktuMasuk: Date | null;
        waktuPulang: Date | null;
        keterangan: string | null;
      }
    > = {};
    for (const a of absensiList) {
      absensiMap[a.userId] = {
        id: a.id,
        status: a.status,
        waktuMasuk: a.waktuMasuk,
        waktuPulang: a.waktuPulang,
        keterangan: a.keterangan,
      };
    }

    // Ambil jadwal aktif untuk hitung keterlambatan
    const jadwal = await prisma.jadwalAbsensi.findFirst({
      where: { aktif: true },
    });

    // Gabungkan data siswa + absensi
    const result = siswaList.map((siswa) => {
      const absensi = absensiMap[siswa.id];
      let selisihMenit: number | null = null;

      if (absensi?.waktuMasuk && jadwal) {
        const jamMasuk = absensi.waktuMasuk;
        const [jamSelesai, menitSelesai] = jadwal.jamSelesaiMasuk
          .split(":")
          .map(Number);
        const batasMenit = jamSelesai * 60 + menitSelesai;
        const actualMenit = jamMasuk.getHours() * 60 + jamMasuk.getMinutes();
        if (actualMenit > batasMenit) {
          selisihMenit = actualMenit - batasMenit;
        }
      }

      return {
        id: siswa.id,
        nama: siswa.nama,
        nis: siswa.nis,
        email: siswa.email,
        punyaWajah: !!siswa.faceDescriptor,
        absensi: absensi
          ? {
              status: absensi.status,
              waktuMasuk: absensi.waktuMasuk,
              waktuPulang: absensi.waktuPulang,
              keterangan: absensi.keterangan,
              selisihMenit,
            }
          : null,
      };
    });

    // Hitung ringkasan
    const summary = {
      total: siswaList.length,
      hadir: absensiList.filter((a) => a.status === "HADIR").length,
      telat: absensiList.filter((a) => a.status === "TELAT").length,
      izin: absensiList.filter((a) => a.status === "IZIN").length,
      sakit: absensiList.filter((a) => a.status === "SAKIT").length,
      alpa: absensiList.filter((a) => a.status === "ALPA").length,
      belumAbsen:
        siswaList.length -
        absensiList.filter((a) =>
          ["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA"].includes(a.status)
        ).length,
    };

    return NextResponse.json({
      kelas,
      tanggal: tanggalUTC.toISOString().split("T")[0],
      siswa: result,
      summary,
      jadwal: jadwal
        ? {
            jamMulaiMasuk: jadwal.jamMulaiMasuk,
            jamSelesaiMasuk: jadwal.jamSelesaiMasuk,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching kelas detail:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
