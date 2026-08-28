import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const manualAbsenSchema = z.object({
  userId: z.string().uuid("User ID tidak valid").optional(),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD")
    .optional(),
  status: z.enum(["HADIR", "IZIN", "SAKIT"]),
  keterangan: z.string().max(500).optional(),
});

// POST /api/absen/manual — Absen manual (siswa untuk diri sendiri, atau guru untuk siswanya)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = manualAbsenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId: targetUserId, tanggal, status, keterangan } = validation.data;
    const role = session.user.role;

    // Determine target user
    let targetUser: string;
    if (role === "SISWA") {
      // Siswa only absen for themselves
      targetUser = session.user.id;
    } else if (role === "GURU") {
      // Guru absen for a student in their class
      if (!targetUserId) {
        return NextResponse.json(
          { message: "userId harus diisi untuk guru" },
          { status: 400 }
        );
      }

      // Verify the student is in a class assigned to this guru
      const student = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, kelasId: true },
      });

      if (!student || !student.kelasId) {
        return NextResponse.json(
          { message: "Siswa tidak ditemukan" },
          { status: 404 }
        );
      }

      const guruKelas = await prisma.guruKelas.findUnique({
        where: {
          guruId_kelasId: {
            guruId: session.user.id,
            kelasId: student.kelasId,
          },
        },
      });

      if (!guruKelas) {
        return NextResponse.json(
          { message: "Anda tidak ditugaskan di kelas siswa ini" },
          { status: 403 }
        );
      }

      targetUser = targetUserId;
    } else {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Determine date
    const targetDate = tanggal ? new Date(tanggal) : new Date();
    const tanggalUTC = new Date(
      Date.UTC(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      )
    );

    // Check if already absen
    const existing = await prisma.absensi.findUnique({
      where: {
        userId_tanggal: {
          userId: targetUser,
          tanggal: tanggalUTC,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Siswa sudah absen pada tanggal ini" },
        { status: 409 }
      );
    }

    // Create absensi
    const absensi = await prisma.absensi.create({
      data: {
        userId: targetUser,
        tanggal: tanggalUTC,
        status,
        keterangan: `[MANUAL] ${keterangan || (role === "GURU" ? "Absen manual oleh guru" : "Absen manual oleh siswa")}`,
        waktuMasuk: status === "HADIR" ? new Date() : null,
      },
      select: {
        id: true,
        status: true,
        tanggal: true,
        waktuMasuk: true,
      },
    });

    return NextResponse.json(
      {
        message: `Absen ${status} berhasil dicatat`,
        data: absensi,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error manual absen:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
