import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

type Params = { params: Promise<{ id: string }> };

// GET /api/guru/kelas/[id]/export — Export absensi kelas ke Excel
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "GURU") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify guru is assigned to this class
    const guruKelas = await prisma.guruKelas.findUnique({
      where: { guruId_kelasId: { guruId: session.user.id, kelasId: id } },
    });

    if (!guruKelas) {
      return NextResponse.json(
        { message: "Anda tidak ditugaskan di kelas ini" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan") || String(new Date().getMonth() + 1);
    const tahun = searchParams.get("tahun") || String(new Date().getFullYear());

    const m = parseInt(bulan);
    const y = parseInt(tahun);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);

    // Get class info
    const kelas = await prisma.kelas.findUnique({
      where: { id },
      select: { namaKelas: true },
    });

    // Get all students
    const siswaList = await prisma.user.findMany({
      where: { kelasId: id, role: "SISWA" },
      select: { id: true, nama: true, nis: true },
      orderBy: { nama: "asc" },
    });

    // Get all absensi for this month
    const absensiList = await prisma.absensi.findMany({
      where: {
        userId: { in: siswaList.map((s) => s.id) },
        tanggal: { gte: startDate, lt: endDate },
      },
      select: {
        userId: true,
        tanggal: true,
        status: true,
        waktuMasuk: true,
        keterangan: true,
      },
    });

    // Build Excel data
    const headers = [
      "No",
      "Nama",
      "NIS",
    ];

    // Generate date columns for each day of the month
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      const dayName = date.toLocaleDateString("id-ID", { weekday: "short" });
      headers.push(`${dayName} ${d}`);
    }

    headers.push("Hadir", "Telat", "Izin", "Sakit", "Alpa");

    const rows: (string | number)[][] = [];

    siswaList.forEach((siswa, idx) => {
      const row: (string | number)[] = [idx + 1, siswa.nama, siswa.nis || ""];

      let hadir = 0,
        telat = 0,
        izin = 0,
        sakit = 0,
        alpa = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const absensi = absensiList.find(
          (a) =>
            a.userId === siswa.id &&
            a.tanggal.toISOString().split("T")[0] === dateStr
        );

        if (absensi) {
          row.push(absensi.status);
          switch (absensi.status) {
            case "HADIR": hadir++; break;
            case "TELAT": telat++; break;
            case "IZIN": izin++; break;
            case "SAKIT": sakit++; break;
            case "ALPA": alpa++; break;
          }
        } else {
          row.push("-");
        }
      }

      row.push(hadir, telat, izin, sakit, alpa);
      rows.push(row);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const wsData = [headers, ...rows];

    // Add title row
    const titleRow = [`Laporan Absensi - ${kelas?.namaKelas || "Kelas"}`];
    const monthNames = [
      "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const periodRow = [`Periode: ${monthNames[m]} ${y}`];
    const emptyRow: string[] = [];

    const fullData = [titleRow, periodRow, emptyRow, ...wsData];
    const ws = XLSX.utils.aoa_to_sheet(fullData);

    // Set column widths
    ws["!cols"] = headers.map((_, i) => ({
      wch: i === 0 ? 5 : i === 1 ? 25 : i === 2 ? 15 : i < 3 + daysInMonth ? 12 : 10,
    }));

    XLSX.utils.book_append_sheet(wb, ws, "Absensi");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="absensi-${kelas?.namaKelas || "kelas"}-${monthNames[m]}-${y}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
