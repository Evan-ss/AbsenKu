import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

// GET /api/admin/absensi/export — Export semua absensi ke Excel
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan") || String(new Date().getMonth() + 1);
    const tahun = searchParams.get("tahun") || String(new Date().getFullYear());
    const kelasId = searchParams.get("kelasId") || "";

    const m = parseInt(bulan);
    const y = parseInt(tahun);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);

    // Build user filter
    const userWhere: Record<string, unknown> = { role: "SISWA" };
    if (kelasId) {
      userWhere.kelasId = kelasId;
    }

    // Get all students
    const siswaList = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        nama: true,
        nis: true,
        kelas: { select: { namaKelas: true } },
      },
      orderBy: [{ kelas: { namaKelas: "asc" } }, { nama: "asc" }],
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
    const headers = ["No", "Nama", "NIS", "Kelas"];

    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      const dayName = date.toLocaleDateString("id-ID", { weekday: "short" });
      headers.push(`${dayName} ${d}`);
    }

    headers.push("Hadir", "Telat", "Izin", "Sakit", "Alpa", "Total");

    const rows: (string | number)[][] = [];

    siswaList.forEach((siswa, idx) => {
      const row: (string | number)[] = [
        idx + 1,
        siswa.nama,
        siswa.nis || "",
        siswa.kelas?.namaKelas || "-",
      ];

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

      const total = hadir + telat + izin + sakit + alpa;
      row.push(hadir, telat, izin, sakit, alpa, total);
      rows.push(row);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const monthNames = [
      "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const titleRow = ["Laporan Absensi Siswa — AbsensiKu"];
    const periodRow = [`Periode: ${monthNames[m]} ${y}`];
    const totalRow = [`Total Siswa: ${siswaList.length}`];
    const emptyRow: string[] = [];

    const fullData = [titleRow, periodRow, totalRow, emptyRow, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(fullData);

    // Set column widths
    ws["!cols"] = headers.map((_, i) => ({
      wch: i === 0 ? 5 : i === 1 ? 25 : i === 2 ? 15 : i === 3 ? 15 : i < 4 + daysInMonth ? 12 : 10,
    }));

    XLSX.utils.book_append_sheet(wb, ws, "Absensi");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-absensi-${monthNames[m]}-${y}.xlsx"`,
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
