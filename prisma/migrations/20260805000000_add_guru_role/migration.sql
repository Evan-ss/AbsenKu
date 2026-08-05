-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'SISWA', 'GURU') NOT NULL DEFAULT 'SISWA';

-- CreateTable
CREATE TABLE `guru_kelas` (
    `guruId` CHAR(36) NOT NULL,
    `kelasId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`guruId`, `kelasId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surat_izin` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tanggal` DATE NOT NULL,
    `jenis` ENUM('SAKIT', 'IZIN') NOT NULL DEFAULT 'IZIN',
    `fotoSurat` VARCHAR(500) NOT NULL,
    `keterangan` VARCHAR(191) NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `reviewedBy` CHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `surat_izin_status_idx`(`status`),
    INDEX `surat_izin_userId_tanggal_idx`(`userId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `guru_kelas` ADD CONSTRAINT `guru_kelas_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guru_kelas` ADD CONSTRAINT `guru_kelas_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surat_izin` ADD CONSTRAINT `surat_izin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surat_izin` ADD CONSTRAINT `surat_izin_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
