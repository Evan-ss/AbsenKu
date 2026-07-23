import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default admin
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@sekolah.com" },
    update: {},
    create: {
      nama: "Admin Sekolah",
      nis: null,
      email: "admin@sekolah.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log(`✅ Admin created: ${admin.email} (password: admin123)`);

  // Create default schedule
  let jadwal = await prisma.jadwalAbsensi.findFirst({
    where: { namaJadwal: "Jadwal Utama" },
  });

  if (!jadwal) {
    jadwal = await prisma.jadwalAbsensi.create({
      data: {
        namaJadwal: "Jadwal Utama",
        jamMulaiMasuk: "06:30",
        jamSelesaiMasuk: "07:30",
        jamMulaiPulang: "15:00",
        jamSelesaiPulang: "16:00",
        aktif: true,
      },
    });
  }

  console.log(`✅ Jadwal created: ${jadwal.namaJadwal}`);

  // Create sample classes
  const kelasList = [
    { namaKelas: "X IPA 1", waliKelas: "Budi Santoso" },
    { namaKelas: "X IPA 2", waliKelas: "Siti Rahmawati" },
    { namaKelas: "XI IPA 1", waliKelas: "Ahmad Fauzi" },
    { namaKelas: "XI IPA 2", waliKelas: "Dewi Lestari" },
    { namaKelas: "XII IPA 1", waliKelas: "Rudi Hartono" },
    { namaKelas: "XII IPA 2", waliKelas: "Maya Anggraini" },
  ];

  for (const k of kelasList) {
    await prisma.kelas.upsert({
      where: { namaKelas: k.namaKelas },
      update: {},
      create: {
        namaKelas: k.namaKelas,
        waliKelas: k.waliKelas,
      },
    });
  }

  console.log(`✅ ${kelasList.length} classes created`);

  console.log("");
  console.log("🎉 Seeding complete!");
  console.log("");
  console.log("📋 Login credentials:");
  console.log("   Admin: admin@sekolah.com / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
