-- ============================================================
-- DATABASE ABSENSI SISWA (AbsensiKu) - Face Recognition
-- File: database_absensi.sql
-- Database: MySQL 8+
-- Struktur dibuat mengikuti schema Prisma (prisma/schema.prisma)
--
-- [TAMBAHAN] Dukungan role GURU (panel /guru):
--   1) users.role mendapat nilai 'GURU'
--   2) tabel guru_kelas  -> relasi guru <-> kelas (menu pilih kelas di dashboard guru)
--   3) tabel surat_izin  -> pengajuan surat izin/sakit siswa + review guru
--      (MENUNGGU = menunggu konfirmasi, DISETUJUI -> SAKIT/IZIN, DITOLAK -> ALPA)
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
DROP TABLE IF EXISTS surat_izin;
DROP TABLE IF EXISTS guru_kelas;
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
-- 4. TABEL: USERS (Admin, Guru & Siswa)
-- ------------------------------------------------------------
CREATE TABLE users (
  id             CHAR(36)                          NOT NULL,
  nama           VARCHAR(191)                      NOT NULL,
  nis            VARCHAR(191)                      NULL,
  email          VARCHAR(191)                      NOT NULL,
  password       VARCHAR(191)                      NOT NULL,
  role           ENUM('ADMIN', 'SISWA', 'GURU')    NOT NULL DEFAULT 'SISWA',
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
-- 5. TABEL: GURU KELAS (pivot guru <-> kelas, many-to-many)
-- ------------------------------------------------------------
CREATE TABLE guru_kelas (
  guruId    CHAR(36)    NOT NULL,
  kelasId   CHAR(36)    NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (guruId, kelasId),
  INDEX guru_kelas_kelasId_fkey (kelasId),
  CONSTRAINT guru_kelas_guruId_fkey FOREIGN KEY (guruId)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT guru_kelas_kelasId_fkey FOREIGN KEY (kelasId)
    REFERENCES kelas (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. TABEL: JADWAL ABSENSI
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
-- 7. TABEL: ABSENSI
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

-- ------------------------------------------------------------
-- 8. TABEL: SURAT IZIN / SAKIT (pengajuan + review guru)
-- ------------------------------------------------------------
CREATE TABLE surat_izin (
  id          CHAR(36)                              NOT NULL,
  userId      CHAR(36)                              NOT NULL,
  tanggal     DATE                                  NOT NULL,
  jenis       ENUM('SAKIT', 'IZIN')                 NOT NULL DEFAULT 'IZIN',
  fotoSurat   VARCHAR(500)                          NOT NULL,
  keterangan  VARCHAR(191)                          NULL,
  status      ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK')
                                                    NOT NULL DEFAULT 'MENUNGGU',
  reviewedBy  CHAR(36)                              NULL,
  reviewedAt  DATETIME(3)                           NULL,
  createdAt   DATETIME(3)                           NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  INDEX surat_izin_status_idx (status),
  INDEX surat_izin_userId_tanggal_idx (userId, tanggal),
  INDEX surat_izin_reviewedBy_fkey (reviewedBy),
  CONSTRAINT surat_izin_userId_fkey FOREIGN KEY (userId)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT surat_izin_reviewedBy_fkey FOREIGN KEY (reviewedBy)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 9. DATA AWAL (SEED)
-- ============================================================

-- Admin default: admin@sekolah.com / admin123
-- (password di-hash bcrypt dengan cost 10)
INSERT INTO users (id, nama, nis, email, password, role, faceDescriptor, isActive, kelasId, createdAt, updatedAt) VALUES
('a0000000-0000-4000-8000-000000000001', 'Admin Sekolah', NULL, 'admin@sekolah.com', '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'ADMIN', NULL, 1, NULL, NOW(3), NOW(3));

-- Guru (wali kelas) — password sama dengan Admin Sekolah (ganti setelah login)
INSERT INTO users (id, nama, nis, email, password, role, faceDescriptor, isActive, kelasId, createdAt, updatedAt) VALUES
('e0000000-0000-4000-8000-000000000001', 'Budi Santoso',   NULL, 'budi.santoso@sekolah.com',   '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'GURU', NULL, 1, NULL, NOW(3), NOW(3)),
('e0000000-0000-4000-8000-000000000002', 'Siti Rahmawati', NULL, 'siti.rahmawati@sekolah.com', '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'GURU', NULL, 1, NULL, NOW(3), NOW(3)),
('e0000000-0000-4000-8000-000000000003', 'Ahmad Fauzi',    NULL, 'ahmad.fauzi@sekolah.com',    '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'GURU', NULL, 1, NULL, NOW(3), NOW(3)),
('e0000000-0000-4000-8000-000000000004', 'Dewi Lestari',   NULL, 'dewi.lestari@sekolah.com',   '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'GURU', NULL, 1, NULL, NOW(3), NOW(3)),
('e0000000-0000-4000-8000-000000000005', 'Rudi Hartono',   NULL, 'rudi.hartono@sekolah.com',   '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'GURU', NULL, 1, NULL, NOW(3), NOW(3)),
('e0000000-0000-4000-8000-000000000006', 'Maya Anggraini', NULL, 'maya.anggraini@sekolah.com', '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'GURU', NULL, 1, NULL, NOW(3), NOW(3));

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

-- Relasi guru <-> kelas (dashboard guru: menu pilih kelas)
INSERT INTO guru_kelas (guruId, kelasId, createdAt) VALUES
('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', NOW(3)),
('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', NOW(3)),
('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', NOW(3)),
('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', NOW(3)),
('e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', NOW(3)),
('e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006', NOW(3));

-- Contoh data siswa (password: siswa123 — bisa diganti / dihapus)
INSERT INTO users (id, nama, nis, email, password, role, faceDescriptor, isActive, kelasId, createdAt, updatedAt) VALUES
('d0000000-0000-4000-8000-000000000001', 'Andi Pratama',  '2024001', 'andi@sekolah.com',  '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'SISWA', NULL, 1, 'c0000000-0000-4000-8000-000000000001', NOW(3), NOW(3)),
('d0000000-0000-4000-8000-000000000002', 'Budi Hartono',  '2024002', 'budi@sekolah.com',  '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'SISWA', NULL, 1, 'c0000000-0000-4000-8000-000000000001', NOW(3), NOW(3)),
('d0000000-0000-4000-8000-000000000003', 'Citra Lestari', '2024003', 'citra@sekolah.com', '$2b$10$lErhd8r2tY9a6aqVdmY21Od63PCtAJM/5iYJB8LBgHEQZPFX6GtT6', 'SISWA', NULL, 1, 'c0000000-0000-4000-8000-000000000002', NOW(3), NOW(3));

-- Contoh data absensi (demo status setelah review surat)
INSERT INTO absensi (id, userId, tanggal, waktuMasuk, waktuPulang, status, keterangan, createdAt) VALUES
('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', '2026-08-04', NULL, NULL, 'SAKIT', 'Surat sakit disetujui guru', '2026-08-04 08:15:00.000'),
('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', '2026-08-04', NULL, NULL, 'ALPA',  'Surat izin ditolak guru',     '2026-08-04 08:20:00.000');

-- Contoh data surat izin/sakit (demo panel review guru)
INSERT INTO surat_izin (id, userId, tanggal, jenis, fotoSurat, keterangan, status, reviewedBy, reviewedAt, createdAt) VALUES
('70000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '2026-08-05', 'SAKIT', '/uploads/surat/andi-surat-sakit.jpg',  'Sakit demam - surat keterangan dokter', 'MENUNGGU',  NULL, NULL, '2026-08-05 06:10:00.000'),
('70000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', '2026-08-04', 'SAKIT', '/uploads/surat/budi-surat-sakit.jpg',  'Demam berdarah',                      'DISETUJUI', 'e0000000-0000-4000-8000-000000000001', '2026-08-04 08:15:00.000', '2026-08-03 19:40:00.000'),
('70000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', '2026-08-04', 'IZIN',   '/uploads/surat/citra-surat-izin.jpg',    'Izin acara keluarga',                 'DITOLAK',   'e0000000-0000-4000-8000-000000000001', '2026-08-04 08:20:00.000', '2026-08-03 20:05:00.000');

-- ============================================================
-- SELESAI. Database 'absensi_siswa' siap dipakai.
-- ============================================================
