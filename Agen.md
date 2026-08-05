# Project Context — Aplikasi Absensi Siswa (Face Recognition)

> File ini adalah context utama project. Baca dan pahami seluruh isi file ini
> di awal sesi sebelum mengerjakan task apapun. Jangan minta user menjelaskan
> ulang stack, flow, atau schema — semua sudah didefinisikan di sini.

---

## 📦 Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js |
| Bahasa | TypeScript |
| Framework | Next.js (App Router) |
| UI Library | React (built-in Next.js) |
| Styling | Tailwind CSS |
| Validasi Data | Zod |
| ORM | Prisma |
| Database | MySQL |
| Face Detection/Recognition | face-api.js |
| Auth | NextAuth.js |
| Primary Key | UUID (bukan auto-increment) |
| Hashing Password | bcrypt |

---

## 🎯 Deskripsi Project

Aplikasi absensi untuk **siswa sekolah** dengan fitur absen otomatis memakai
face recognition (deteksi wajah via webcam). Ada 2 role: **ADMIN** dan **SISWA**,
masing-masing punya panel/dashboard sendiri.

### Fitur Utama
1. Autentikasi (Login & Register — register hanya dilakukan Admin/TU)
2. CRUD (siswa, kelas, absensi)
3. Absensi berbasis face recognition
4. Admin bisa atur jam mulai & selesai sesi absen (jadwal absensi)

---

## 🗺️ Flow Aplikasi

### Auth
- Register siswa baru dilakukan oleh Admin (bukan self-register), termasuk
  capture foto wajah untuk `faceDescriptor`.
- Login pakai NextAuth.js, redirect berdasarkan `role`:
  - `ADMIN` → `/admin/dashboard`
  - `SISWA` → `/siswa/dashboard`

### Admin Panel
- CRUD data siswa
- CRUD data kelas
- Monitoring & CRUD data absensi (filter tanggal/kelas/status, export laporan)
- Pengaturan jadwal absensi (jam mulai/selesai absen masuk & pulang)
- Re-capture foto wajah siswa

### Panel Siswa
- Lihat profil sendiri
- Absen (buka kamera → face-api.js deteksi wajah → cocokkan dengan
  `faceDescriptor` di database → simpan ke tabel `Absensi`)
- Lihat riwayat absensi sendiri

### Logic Jadwal Absensi
```
waktu_sekarang < jamMulaiMasuk        → absen belum dibuka
jamMulaiMasuk <= waktu_sekarang        → status: HADIR
      <= jamSelesaiMasuk
waktu_sekarang > jamSelesaiMasuk       → status: TELAT (atau ditolak,
                                          tergantung kebijakan)
```

### Proteksi Akses (Middleware)
- Belum login → redirect ke `/login`
- Role tidak sesuai path (`/admin/*` diakses `SISWA`) → block (403)

### Struktur Routing
```
/                     → Landing/Login
/register             → Register (khusus admin)
/admin/dashboard       → Dashboard admin
/admin/siswa           → CRUD data siswa
/admin/kelas           → CRUD data kelas
/admin/absensi         → Monitoring & CRUD absensi
/admin/jadwal          → Pengaturan jadwal absensi
/siswa/dashboard        → Dashboard siswa
/siswa/absen            → Halaman absen (kamera + face recognition)
/siswa/riwayat           → Riwayat absensi pribadi
```

---

## 🗄️ Schema Database (Prisma + MySQL + UUID)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
}

model User {
  id             String    @id @default(uuid()) @db.Char(36)
  nama           String
  nis            String?   @unique
  email          String    @unique
  password       String
  role           Role      @default(SISWA)
  faceDescriptor Json?
  isActive       Boolean   @default(true)
  kelasId        String?   @db.Char(36)
  kelas          Kelas?    @relation(fields: [kelasId], references: [id])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  absensi        Absensi[]

  @@map("users")
}

enum Role { ADMIN, SISWA }

model Kelas {
  id        String   @id @default(uuid()) @db.Char(36)
  namaKelas String   @unique
  waliKelas String?
  createdAt DateTime @default(now())
  siswa     User[]

  @@map("kelas")
}

model Absensi {
  id          String        @id @default(uuid()) @db.Char(36)
  userId      String        @db.Char(36)
  user        User          @relation(fields: [userId], references: [id])
  tanggal     DateTime      @db.Date
  waktuMasuk  DateTime?
  waktuPulang DateTime?
  status      StatusAbsensi @default(HADIR)
  keterangan  String?
  createdAt   DateTime      @default(now())

  @@unique([userId, tanggal])
  @@index([tanggal, status])
  @@map("absensi")
}

enum StatusAbsensi { HADIR, TELAT, IZIN, SAKIT, ALPA }

model JadwalAbsensi {
  id               String   @id @default(uuid()) @db.Char(36)
  namaJadwal       String   @default("Jadwal Utama")
  jamMulaiMasuk    String
  jamSelesaiMasuk  String
  jamMulaiPulang   String?
  jamSelesaiPulang String?
  aktif            Boolean  @default(true)
  updatedAt        DateTime @updatedAt

  @@map("jadwal_absensi")
}
```

---

## 🧭 Konvensi & Aturan Kerja untuk Agent

- Semua ID primary key pakai **UUID**, jangan pakai auto-increment integer.
- Semua kode ditulis pakai **TypeScript**, hindari `any` kecuali benar-benar
  tidak ada alternatif (misal saat integrasi tipe dari face-api.js).
- Semua input dari form/API **wajib divalidasi pakai Zod** sebelum diproses
  atau disimpan ke database.
- Password **wajib di-hash** pakai bcrypt sebelum disimpan, jangan pernah
  simpan plain text.
- Gunakan **Prisma Client** untuk semua akses database, jangan raw query
  kecuali kasus khusus yang tidak bisa ditangani Prisma.
- Face descriptor disimpan sebagai `Json` (array angka), validasi panjang
  array sebelum disimpan.
- Ikuti struktur routing yang sudah didefinisikan di atas — jangan buat
  struktur folder/routing baru tanpa alasan kuat.
- Kalau ada ambiguitas soal requirement, buat asumsi yang masuk akal
  berdasarkan konteks di file ini, sebutkan asumsinya secara singkat, lalu
  lanjutkan pekerjaan.

---

## 📌 Status Project

- [x] Setup project Next.js + TypeScript + Tailwind + App Router
- [x] Install dependencies (Prisma, Zod, NextAuth, bcryptjs, dotenv)
- [x] Setup Prisma + schema database (User, Kelas, Absensi, JadwalAbsensi)
- [ ] Setup Prisma + MySQL + migration awal (⚠️ butuh MySQL running)
- [x] Setup NextAuth.js (Credentials provider, JWT session, role callbacks)
- [x] Middleware proteksi role (admin/siswa)
- [x] Landing page (role-based redirect or hero)
- [x] Halaman Login (form + loading state)
- [x] Halaman Register (khusus admin, validasi Zod)
- [x] Halaman Admin (layout sidebar, dashboard, placeholder CRUD)
- [x] Halaman Siswa (layout sidebar, dashboard, placeholder absen/riwayat)
- [ ] CRUD Siswa
- [ ] CRUD Kelas
- [ ] CRUD Absensi
- [ ] Fitur Face Recognition (face-api.js)
- [ ] Pengaturan Jadwal Absensi
- [ ] Testing & deployment

> Update checklist ini setiap kali sebuah fitur selesai dikerjakan, supaya
> sesi berikutnya tahu progress project tanpa perlu ditanya ulang.
