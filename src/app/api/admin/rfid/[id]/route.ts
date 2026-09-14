import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updateRfidSchema = z.object({
  uid: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/rfid/[id] — Update RFID card
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = updateRfidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { uid, isActive } = validation.data;

    // Check if RFID card exists
    const existing = await prisma.rfidCard.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Kartu RFID tidak ditemukan" },
        { status: 404 }
      );
    }

    // If updating UID, check for duplicates
    if (uid && uid.toUpperCase() !== existing.uid) {
      const uidExists = await prisma.rfidCard.findUnique({
        where: { uid: uid.toUpperCase() },
      });

      if (uidExists) {
        return NextResponse.json(
          { message: "UID kartu sudah digunakan" },
          { status: 409 }
        );
      }
    }

    const rfidCard = await prisma.rfidCard.update({
      where: { id },
      data: {
        uid: uid?.toUpperCase(),
        isActive,
        revokedAt: isActive === false ? new Date() : null,
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
      message: "Kartu RFID berhasil diperbarui",
      data: rfidCard,
    });
  } catch (error) {
    console.error("Error updating RFID card:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rfid/[id] — Revoke RFID card (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.rfidCard.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Kartu RFID tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.rfidCard.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Kartu RFID berhasil dicabut" });
  } catch (error) {
    console.error("Error revoking RFID card:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}