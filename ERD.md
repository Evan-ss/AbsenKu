# 🗄️ ERD — Aplikasi AbsensiKu (Face Recognition)

Diagram ERD database `absensi_siswa` dalam format **Mermaid**. Copy blok kode di bawah ke file `.md` yang mendukung Mermaid (GitHub, GitLab, VS Code + extension, Mermaid Live Editor: https://mermaid.live).

## 📊 ERD Utama (4 Tabel + Relasi)

```mermaid
---
title: ERD Aplikasi Absensi Siswa (AbsensiKu) — Face Recognition
---
erDiagram
    KELAS ||--o{ USERS : "memiliki 1..N siswa"
    USERS ||--o{ ABSENSI : "mencatat 1..N absensi"

    KELAS {
        char36 id PK "UUID"
        varchar191 namaKelas UK "UNIQUE - contoh: X IPA 1"
        varchar191 waliKelas "nullable - nama wali kelas"
        datetime3 createdAt "default now()"
    }

    USERS {
        char36 id PK "UUID"
        varchar191 nama "nama lengkap"
        varchar191 nis UK "nullable - Nomor Induk Siswa"
        varchar191 email UK "email login"
        varchar191 password "hash bcrypt"
        enum_role role "ADMIN | SISWA, default SISWA"
        json faceDescriptor "nullable - array 128 angka"
        boolean isActive "default true"
        char36 kelasId FK "nullable - relasi ke kelas"
        datetime3 createdAt "default now()"
        datetime3 updatedAt "auto update"
    }

    ABSENSI {
        char36 id PK "UUID"
        char36 userId FK "relasi ke users"
        date tanggal "UNIQUE(userId, tanggal)"
        datetime3 waktuMasuk "nullable - jam masuk"
        datetime3 waktuPulang "nullable - jam pulang"
        enum_status status "HADIR | TELAT | IZIN | SAKIT | ALPA, default HADIR"
        varchar191 keterangan "nullable - catatan"
        datetime3 createdAt "default now()"
    }

    JADWAL_ABSENSI {
        char36 id PK "UUID"
        varchar191 namaJadwal "default Jadwal Utama"
        varchar191 jamMulaiMasuk "contoh: 06:30"
        varchar191 jamSelesaiMasuk "contoh: 07:30"
        varchar191 jamMulaiPulang "nullable - contoh: 15:00"
        varchar191 jamSelesaiPulang "nullable - contoh: 16:00"
        boolean aktif "default true"
        datetime3 updatedAt "auto update"
    }
```

## 🔑 Keterangan

| Simbol | Arti |
|--------|------|
| `PK` | Primary Key (UUID, CHAR(36)) |
| `FK` | Foreign Key |
| `UK` | Unique Key |
| `||--o{` | One-to-Many (1 kelas → banyak users, 1 user → banyak absensi) |
| `enum_role` | `ENUM('ADMIN','SISWA')` |
| `enum_status` | `ENUM('HADIR','TELAT','IZIN','SAKIT','ALPA')` |

## 📌 Catatan Relasi

- **`kelas` 1 — N `users`**: satu kelas menampung banyak siswa (`users.kelasId → kelas.id`). Admin tidak punya kelas (`kelasId = NULL`).
- **`users` 1 — N `absensi`**: satu siswa punya banyak catatan absensi (`absensi.userId → users.id`).
- **`jadwal_absensi`**: tabel mandiri (tanpa relasi) — dipakai sebagai pengaturan jam absen global.
- **Constraint unik**: `absensi(userId, tanggal)` → satu siswa hanya boleh absen 1× per hari.

---

## 🎨 Bonus: ERD Versi Simpel (Ringkas)

```mermaid
erDiagram
    KELAS ||--o{ USERS : "memiliki"
    USERS ||--o{ ABSENSI : "melakukan"
    KELAS {
        string id PK
        string namaKelas UK
        string waliKelas
    }
    USERS {
        string id PK
        string nama
        string nis UK
        string email UK
        string password
        string role
        string faceDescriptor
        string kelasId FK
    }
    ABSENSI {
        string id PK
        string userId FK
        date tanggal
        string waktuMasuk
        string status
    }
    JADWAL_ABSENSI {
        string id PK
        string jamMulaiMasuk
        string jamSelesaiMasuk
        boolean aktif
    }
```
