-- ============================================================
-- DATABASE ABSENSI SISWA (AbsensiKu) - Face Recognition
-- File: database_absensi.sql
-- Database: MySQL 8+
-- Struktur dibuat mengikuti schema Prisma (prisma/schema.prisma)
-- ============================================================

-- ------------------------------------------------------------
-- 1. BUAT DATABASE
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS absensi_siswa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE absensi_siswa;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 2. DROP TABEL (jika sudah ada) — urut FK dulu
-- ------------------------------------------------------------
DROP TABLE IF EXISTS absensi;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS jadwal_absensi;
DROP TABLE IF EXISTS kelas;

-- ------------------------------------------------------------
-- 3. TABEL: KELAS
-- ------------------------------------------------------------
CREATE TABLE kelas (
  id         CHAR(36)     NOT NULL,
  namaKelas  VARCHAR(191) NOT NULL,
  waliKelas  VARCHAR(191) NULL,
  createdAt  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE INDEX kelas_namaKelas_key (namaKelas)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. TABEL: USERS (Admin & Siswa)
-- ------------------------------------------------------------
CREATE TABLE users (
  id             CHAR(36)                          NOT NULL,
  nama           VARCHAR(191)                      NOT NULL,
  nis            VARCHAR(191)                      NULL,
  email          VARCHAR(191)                      NOT NULL,
  password       VARCHAR(191)                      NOT NULL,
  role           ENUM('ADMIN', 'SISWA')            NOT NULL DEFAULT 'SISWA',
  faceDescriptor JSON                              NULL,
  isActive       TINYINT(1)                        NOT NULL DEFAULT 1,
  kelasId        CHAR(36)                          NULL,
  createdAt      DATETIME(3)                       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt      DATETIME(3)                       NOT NULL,

  PRIMARY KEY (id),
  UNIQUE INDEX users_email_key (email),
  UNIQUE INDEX users_nis_key (nis),
  INDEX users_kelasId_fkey (kelasId),
  CONSTRAINT users_kelasId_fkey FOREIGN KEY (kelasId)
    REFERENCES kelas (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. TABEL: JADWAL ABSENSI
-- ------------------------------------------------------------
CREATE TABLE jadwal_absensi (
  id                CHAR(36)     NOT NULL,
  namaJadwal        VARCHAR(191) NOT NULL DEFAULT 'Jadwal Utama',
  jamMulaiMasuk     VARCHAR(191) NOT NULL,
  jamSelesaiMasuk   VARCHAR(191) NOT NULL,
  jamMulaiPulang    VARCHAR(191) NULL,
  jamSelesaiPulang  VARCHAR(191) NULL,
  aktif             TINYINT(1)   NOT NULL DEFAULT 1,
  updatedAt         DATETIME(3)  NOT NULL,

  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. TABEL: ABSENSI
-- ------------------------------------------------------------
CREATE TABLE absensi (
  id          CHAR(36)                                     NOT NULL,
  userId      CHAR(36)                                     NOT NULL,
  tanggal     DATE                                         NOT NULL,
  waktuMasuk  DATETIME(3)                                  NULL,
  waktuPulang DATETIME(3)                                  NULL,
  status      ENUM('HADIR', 'TELAT', 'IZIN', 'SAKIT', 'ALPA')
                                                           NOT NULL DEFAULT 'HADIR',
  keterangan  VARCHAR(191)                                 NULL,
  createdAt   DATETIME(3)                                  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE INDEX absensi_userId_tanggal_key (userId, tanggal),
  INDEX absensi_tanggal_status_idx (tanggal, status),
  CONSTRAINT absensi_userId_fkey FOREIGN KEY (userId)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 7. DATA AWAL (SEED)
-- ============================================================

-- Admin default: admin@sekolah.com / admin123
-- (password di-hash bcrypt dengan cost 10)
INSERT INTO users (id, nama, nis, email, password, role, faceDescriptor, isActive, kelasId, createdAt, updatedAt) VALUES
('a0000000-0000-4000-8000-000000000001', 'Admin Sekolah', NULL, 'admin@sekolah.com', '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'ADMIN', NULL, 1, NULL, NOW(3), NOW(3));

-- Jadwal absensi default
INSERT INTO jadwal_absensi (id, namaJadwal, jamMulaiMasuk, jamSelesaiMasuk, jamMulaiPulang, jamSelesaiPulang, aktif, updatedAt) VALUES
('b0000000-0000-4000-8000-000000000001', 'Jadwal Utama', '06:30', '07:30', '15:00', '16:00', 1, NOW(3));

-- Data kelas contoh
INSERT INTO kelas (id, namaKelas, waliKelas, createdAt) VALUES
('c0000000-0000-4000-8000-000000000001', 'X IPA 1',  'Budi Santoso',    NOW(3)),
('c0000000-0000-4000-8000-000000000002', 'X IPA 2',  'Siti Rahmawati',  NOW(3)),
('c0000000-0000-4000-8000-000000000003', 'XI IPA 1', 'Ahmad Fauzi',     NOW(3)),
('c0000000-0000-4000-8000-000000000004', 'XI IPA 2', 'Dewi Lestari',    NOW(3)),
('c0000000-0000-4000-8000-000000000005', 'XII IPA 1','Rudi Hartono',    NOW(3)),
('c0000000-0000-4000-8000-000000000006', 'XII IPA 2','Maya Anggraini',  NOW(3));

-- Contoh data siswa (password: siswa123 — bisa diganti / dihapus)
INSERT INTO users (id, nama, nis, email, password, role, faceDescriptor, isActive, kelasId, createdAt, updatedAt) VALUES
('d0000000-0000-4000-8000-000000000001', 'Andi Pratama',  '2024001', 'andi@sekolah.com',  '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'SISWA', NULL, 1, 'c0000000-0000-4000-8000-000000000001', NOW(3), NOW(3)),
('d0000000-0000-4000-8000-000000000002', 'Budi Hartono',  '2024002', 'budi@sekolah.com',  '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'SISWA', NULL, 1, 'c0000000-0000-4000-8000-000000000001', NOW(3), NOW(3)),
('d0000000-0000-4000-8000-000000000003', 'Citra Lestari', '2024003', 'citra@sekolah.com', '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'SISWA', NULL, 1, 'c0000000-0000-4000-8000-000000000002', NOW(3), NOW(3));

-- ============================================================
-- SELESAI. Database 'absensi_siswa' siap dipakai.
-- ============================================================
