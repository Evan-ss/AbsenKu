import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const assignRfidSchema = z.object({
  uid: z.string().min(1, "UID kartu wajib diisi").max(50),
  userId: z.string().uuid("User ID tidak valid"),
});

// POST /api/rfid/assign — Assign RFID card to student
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = assignRfidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { uid, userId } = validation.data;
    const normalizedUid = uid.toUpperCase();

    // Find RFID card by UID
    const rfidCard = await prisma.rfidCard.findUnique({
      where: { uid: normalizedUid },
    });

    if (!rfidCard) {
      return NextResponse.json(
        { message: "Kartu RFID tidak ditemukan. Daftarkan kartu terlebih dahulu." },
        { status: 404 }
      );
    }

    // Check if RFID card is already assigned to another student
    if (rfidCard.userId !== userId) {
      if (rfidCard.isActive) {
        return NextResponse.json(
          { message: "Kartu RFID sudah terdaftar ke siswa lain" },
          { status: 409 }
        );
      }
      // If inactive, we can reassign
    }

    // Check if user exists and is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nama: true, role: true, rfidCards: { where: { isActive: true } } },
    });

    if (!user || user.role !== "SISWA") {
      return NextResponse.json(
        { message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if student already has an active RFID card
    if (user.rfidCards.length > 0 && rfidCard.userId !== userId) {
      return NextResponse.json(
        { message: "Siswa sudah memiliki kartu RFID aktif" },
        { status: 409 }
      );
    }

    // Assign/reassign RFID card to student
    const updatedRfid = await prisma.rfidCard.update({
      where: { id: rfidCard.id },
      data: {
        userId,
        isActive: true,
        revokedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nis: true,
            email: true,
            kelas: { select: { namaKelas: true } },
          },
        },
      },
    });

    return NextResponse.json({
      message: "Kartu RFID berhasil ditetapkan ke siswa",
      data: updatedRfid,
    });
  } catch (error) {
    console.error("Error assigning RFID card:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}