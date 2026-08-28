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

  // Create default guru
  const guruPassword = await bcrypt.hash("guru123", 10);

  const guru = await prisma.user.upsert({
    where: { email: "guru@sekolah.com" },
    update: {},
    create: {
      nama: "Guru Wali Kelas",
      nis: null,
      email: "guru@sekolah.com",
      password: guruPassword,
      role: "GURU",
    },
  });

  console.log(`✅ Guru created: ${guru.email} (password: guru123)`);

  // Assign guru to first 2 classes
  const allKelas = await prisma.kelas.findMany({ take: 2 });
  for (const k of allKelas) {
    await prisma.guruKelas.upsert({
      where: { guruId_kelasId: { guruId: guru.id, kelasId: k.id } },
      update: {},
      create: { guruId: guru.id, kelasId: k.id },
    });
  }
  console.log(`✅ Guru assigned to ${allKelas.length} classes`);

  // Create sample students for first 2 classes
  const siswaPassword = await bcrypt.hash("siswa123", 10);
  const sampleSiswa = [
    { nama: "Andi Pratama", nis: "001", email: "andi@sekolah.com", kelasIdx: 0 },
    { nama: "Budi Santoso", nis: "002", email: "budi@sekolah.com", kelasIdx: 0 },
    { nama: "Citra Dewi", nis: "003", email: "citra@sekolah.com", kelasIdx: 0 },
    { nama: "Dian Permata", nis: "004", email: "dian@sekolah.com", kelasIdx: 1 },
    { nama: "Eka Putri", nis: "005", email: "eka@sekolah.com", kelasIdx: 1 },
    { nama: "Fajar Ramadhan", nis: "006", email: "fajar@sekolah.com", kelasIdx: 1 },
  ];

  for (const s of sampleSiswa) {
    const kelas = allKelas[s.kelasIdx];
    if (!kelas) continue;
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        nama: s.nama,
        nis: s.nis,
        email: s.email,
        password: siswaPassword,
        role: "SISWA",
        kelasId: kelas.id,
      },
    });
  }
  console.log(`✅ ${sampleSiswa.length} sample students created`);

  console.log("");
  console.log("🎉 Seeding complete!");
  console.log("");
  console.log("📋 Login credentials:");
  console.log("   Admin : admin@sekolah.com / admin123");
  console.log("   Guru  : guru@sekolah.com  / guru123");
  console.log("   Siswa : andi@sekolah.com  / siswa123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
