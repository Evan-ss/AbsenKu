import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET || "default-secret-change-in-production";

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // Get all active schedules with their class
    const jadwalList = await prisma.jadwalAbsensi.findMany({
      where: { aktif: true },
      include: { kelas: true },
    });

    if (jadwalList.length === 0) {
      return NextResponse.json({ message: "Tidak ada jadwal aktif", updated: 0 });
    }

    let totalUpdated = 0;
    const results = [];

    for (const jadwal of jadwalList) {
      if (!jadwal.jamSelesaiPulang) continue;

      // Parse jamSelesaiPulang (format: "HH:mm")
      const [selesaiJam, selesaiMenit] = jadwal.jamSelesaiPulang.split(":").map(Number);
      const selesaiDate = new Date();
      selesaiDate.setHours(selesaiJam, selesaiMenit, 0, 0);

      // Only run if current time is past jamSelesaiPulang
      if (now < selesaiDate) continue;

      // Build query for students in this class (or all if no kelasId)
      const whereKelas = jadwal.kelasId ? { kelasId: jadwal.kelasId } : {};

      // Find students who checked in (HADIR/TELAT) but haven't checked out
      const siswaBelumPulang = await prisma.absensi.findMany({
        where: {
          tanggal: today,
          status: { in: ["HADIR", "TELAT"] },
          waktuPulang: null,
          user: {
            ...whereKelas,
            role: "SISWA",
            isActive: true,
          },
        },
        include: {
          user: { select: { id: true, nama: true } },
        },
      });

      if (siswaBelumPulang.length === 0) {
        results.push({
          kelas: jadwal.kelas?.namaKelas || "Global",
          updated: 0,
        });
        continue;
      }

      // Bulk update: set auto checkout
      const absensiIds = siswaBelumPulang.map((a) => a.id);
      const updated = await prisma.absensi.updateMany({
        where: { id: { in: absensiIds } },
        data: {
          waktuPulang: selesaiDate,
          statusPulang: "AUTO",
          isAutoCheckout: true,
        },
      });

      // Create audit logs for each
      for (const absensi of siswaBelumPulang) {
        await prisma.absensiLog.create({
          data: {
            absensiId: absensi.id,
            actorId: "SYSTEM_AUTO",
            actorRole: "ADMIN",
            action: "AUTO_CHECKOUT",
            oldData: { waktuPulang: null, statusPulang: "BELUM" },
            newData: { waktuPulang: selesaiDate.toISOString(), statusPulang: "AUTO", isAutoCheckout: true },
          },
        });
      }

      totalUpdated += updated.count;
      results.push({
        kelas: jadwal.kelas?.namaKelas || "Global",
        updated: updated.count,
        jamSelesaiPulang: jadwal.jamSelesaiPulang,
      });
    }

    return NextResponse.json({
      message: `Auto check-out completed. ${totalUpdated} siswa di-update.`,
      totalUpdated,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error auto checkout:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(req: NextRequest) {
  return GET(req);
}