-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `nis` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SISWA') NOT NULL DEFAULT 'SISWA',
    `faceDescriptor` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `kelasId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_nis_key`(`nis`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kelas` (
    `id` CHAR(36) NOT NULL,
    `namaKelas` VARCHAR(191) NOT NULL,
    `waliKelas` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `kelas_namaKelas_key`(`namaKelas`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `absensi` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tanggal` DATE NOT NULL,
    `waktuMasuk` DATETIME(3) NULL,
    `waktuPulang` DATETIME(3) NULL,
    `status` ENUM('HADIR', 'TELAT', 'IZIN', 'SAKIT', 'ALPA') NOT NULL DEFAULT 'HADIR',
    `keterangan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `absensi_tanggal_status_idx`(`tanggal`, `status`),
    UNIQUE INDEX `absensi_userId_tanggal_key`(`userId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jadwal_absensi` (
    `id` CHAR(36) NOT NULL,
    `namaJadwal` VARCHAR(191) NOT NULL DEFAULT 'Jadwal Utama',
    `jamMulaiMasuk` VARCHAR(191) NOT NULL,
    `jamSelesaiMasuk` VARCHAR(191) NOT NULL,
    `jamMulaiPulang` VARCHAR(191) NULL,
    `jamSelesaiPulang` VARCHAR(191) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `kelas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absensi` ADD CONSTRAINT `absensi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
