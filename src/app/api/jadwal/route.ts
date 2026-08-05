import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createJadwalSchema = z.object({
  namaJadwal: z.string().min(1, "Nama jadwal harus diisi").max(100).default("Jadwal Utama"),
  jamMulaiMasuk: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:mm"),
  jamSelesaiMasuk: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:mm"),
  jamMulaiPulang: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:mm").optional().nullable().or(z.literal("")),
  jamSelesaiPulang: z.string().regex(/^\d{2}:\d{2}$/, "Format jam HH:mm").optional().nullable().or(z.literal("")),
});

// GET /api/jadwal — List all schedules
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const jadwal = await prisma.jadwalAbsensi.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: jadwal });
  } catch (error) {
    console.error("Error fetching jadwal:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// POST /api/jadwal — Create new schedule
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createJadwalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { namaJadwal, jamMulaiMasuk, jamSelesaiMasuk, jamMulaiPulang, jamSelesaiPulang } =
      validation.data;

    const jadwal = await prisma.jadwalAbsensi.create({
      data: {
        namaJadwal,
        jamMulaiMasuk,
        jamSelesaiMasuk,
        jamMulaiPulang: jamMulaiPulang || null,
        jamSelesaiPulang: jamSelesaiPulang || null,
      },
    });

    return NextResponse.json(
      { message: "Jadwal berhasil ditambahkan", data: jadwal },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating jadwal:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
