# Dokumentasi Aplikasi Absensi Siswa (Face Recognition)

---

## 📦 1. Tech Stack

| Layer | Teknologi | Fungsi |
|---|---|---|
| **Runtime** | Node.js | Fondasi dasar, tempat semua kode JS/TS dijalankan |
| **Bahasa** | TypeScript | Bahasa utama, biar type-safe |
| **Framework** | Next.js (App Router) | Full-stack: frontend (React) + backend (API Routes) jadi satu project |
| **UI Library** | React (built-in di Next.js) | Bikin komponen tampilan |
| **Styling** | Tailwind CSS | Styling cepat & konsisten |
| **Validasi Data** | Zod | Validasi input form & API (runtime check) |
| **ORM** | Prisma | Query database, type-safe, auto-generate types |
| **Database** | MySQL | Simpan data siswa, absensi, kelas, jadwal |
| **Face Detection/Recognition** | face-api.js | Deteksi & pengenalan wajah di browser (client-side) |
| **Auth** | NextAuth.js | Login & manajemen role (admin/siswa) |
| **Primary Key** | UUID | ID unik yang tidak mudah ditebak urutannya |

### Hierarki Teknologi

```
Node.js (runtime)
   ↓
JavaScript/TypeScript (bahasa)
   ↓
React (library UI)
   ↓
Next.js (framework)
   ↓
Prisma, Zod, Tailwind, NextAuth (tools tambahan)
```

### Alur Data Sistem

```
[Browser: Kamera + face-api.js]
        ↓ kirim face descriptor (array angka)
[Next.js API Routes + Zod validasi]
        ↓
[Prisma Client]
        ↓
[MySQL Database]
```

### Persiapan Sebelum Development

1. Install **Node.js** (versi LTS) → https://nodejs.org
2. Install **MySQL** (lokal via XAMPP/Laragon, atau cloud seperti PlanetScale/AWS RDS)
3. Buat project baru:
   ```bash
   npx create-next-app@latest absensi-app --typescript
   ```
4. Install dependencies tambahan:
   ```bash
   npm install prisma @prisma/client zod face-api.js next-auth bcrypt
   npm install -D tailwindcss postcss autoprefixer
   ```
5. Setup Prisma:
   ```bash
   npx prisma init
   ```
6. Atur koneksi database di `.env`:
   ```
   DATABASE_URL="mysql://user:password@localhost:3306/nama_database"
   ```

---

## 🗺️ 2. Flow Aplikasi

### 2.1 Flow Umum (Login → Role → Panel)

```
[Landing/Login Page]
        ↓
   ┌────┴────┐
   │  Login  │──→ Cek Role (dari database)
   └─────────┘
        ↓
   ┌────┴─────────┐
   │              │
[Role: Admin]  [Role: Siswa]
   │              │
[Admin Panel]  [Panel Siswa]
```

### 2.2 Flow Authentication (Login & Register)

```
[Register] (dilakukan Admin/Guru untuk daftarkan siswa baru)
   ↓
Input: Nama, NIS, Email, Password, Foto Wajah (face descriptor)
   ↓
Validasi (Zod) → Simpan ke MySQL (password di-hash pakai bcrypt)
   ↓
[Login]
   ↓
Input: Email/NIS + Password
   ↓
Validasi kredensial (NextAuth.js)
   ↓
Cek role di database → Redirect sesuai role
   ↓
   ├── role: "ADMIN" → /admin/dashboard
   └── role: "SISWA" → /siswa/dashboard
```

> Catatan: Register dilakukan oleh **Admin/Guru/TU**, bukan siswa daftar sendiri — supaya data NIS dan foto wajah untuk face recognition terverifikasi langsung oleh pihak sekolah.

### 2.3 Flow Admin Panel

```
[Admin Dashboard]
   │
   ├── Kelola Data Siswa (CRUD)
   │     ├── Create → tambah siswa baru + capture foto wajah
   │     ├── Read   → lihat daftar semua siswa
   │     ├── Update → edit data siswa
   │     └── Delete → hapus siswa
   │
   ├── Kelola Data Kelas (CRUD)
   │     └── Atur siswa masuk ke kelas mana
   │
   ├── Kelola Data Absensi (Monitoring + CRUD)
   │     ├── Lihat riwayat absensi semua siswa
   │     ├── Filter by tanggal/kelas/status
   │     ├── Edit absensi (koreksi manual)
   │     └── Export laporan (PDF/Excel)
   │
   ├── Pengaturan Jadwal Absensi
   │     ├── Atur jam mulai & selesai absen masuk
   │     └── Atur jam mulai & selesai absen pulang
   │
   └── Setting Face Recognition
         └── Re-capture / update foto wajah siswa tertentu
```

### 2.4 Flow Panel Siswa

```
[Dashboard Siswa]
   │
   ├── Lihat Profil Sendiri (Read only / limited update)
   │
   ├── Absen (Fitur Utama)
   │     ↓
   │  [Sistem cek jadwal absensi aktif]
   │     ↓
   │  ┌────────────┼────────────┬─────────────┐
   │  │            │            │             │
   │ Belum jam   Dalam jam   Lewat jam    Sudah absen
   │ buka absen   masuk       tapi masih   hari ini
   │  │           normal      toleransi     │
   │  ↓             │            │           ↓
   │ Ditolak,     Tombol      Tombol      "Kamu sudah
   │ "Absen       "Absen"     "Absen"      absen hari
   │  belum       aktif       aktif,       ini pukul.."
   │  dibuka"     (hadir)     (jadi telat)
   │                 │            │
   │                 └─────┬──────┘
   │                       ↓
   │               [Buka Kamera]
   │                       ↓
   │           face-api.js deteksi wajah
   │                       ↓
   │       Cocokkan dengan faceDescriptor siswa
   │                       ↓
   │            ┌──────────┴──────────┐
   │            │                     │
   │       [Wajah Cocok]        [Wajah Tidak Cocok]
   │            ↓                     ↓
   │     Simpan ke tabel Absensi   Tampilkan pesan
   │     (status hadir/telat)      "Wajah tidak dikenali"
   │            ↓
   │     "Absen berhasil!"
   │
   └── Lihat Riwayat Absensi Sendiri
         └── Filter by tanggal/bulan
```

### 2.5 Logic Pengecekan Jadwal Absensi

```
Ambil waktu sekarang → misal "07:45"
Bandingkan dengan jadwal:
  jamMulaiMasuk   = "06:30"
  jamSelesaiMasuk = "07:30"

IF waktu_sekarang < jamMulaiMasuk
   → Absen belum dibuka

IF jamMulaiMasuk <= waktu_sekarang <= jamSelesaiMasuk
   → Status: HADIR

IF waktu_sekarang > jamSelesaiMasuk
   → Status: TELAT (jika masih diizinkan)
   → atau ditolak sepenuhnya (tergantung kebijakan)
```

### 2.6 Middleware / Proteksi Akses

```
Setiap request ke halaman:
   ↓
[Middleware Next.js] cek session/token (dari NextAuth)
   ↓
   ├── Belum login → redirect ke /login
   ├── Login tapi akses /admin/* padahal role "SISWA" → block (403)
   └── Login & role sesuai → izinkan akses
```

### 2.7 Struktur Routing

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

## 🗄️ 3. Schema Database (Prisma + MySQL + UUID)

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================
// MODEL: USER (Admin & Siswa)
// ============================
model User {
  id             String    @id @default(uuid()) @db.Char(36)
  nama           String
  nis            String?   @unique // Nomor Induk Siswa, opsional untuk admin
  email          String    @unique
  password       String
  role           Role      @default(SISWA)
  faceDescriptor Json?     // array angka hasil face-api.js
  kelasId        String?   @db.Char(36)
  kelas          Kelas?    @relation(fields: [kelasId], references: [id])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  absensi        Absensi[]

  @@map("users")
}

enum Role {
  ADMIN
  SISWA
}

// ============================
// MODEL: KELAS
// ============================
model Kelas {
  id        String   @id @default(uuid()) @db.Char(36)
  namaKelas String   @unique // contoh: "X IPA 1"
  waliKelas String?
  createdAt DateTime @default(now())

  siswa     User[]

  @@map("kelas")
}

// ============================
// MODEL: ABSENSI
// ============================
model Absensi {
  id          String        @id @default(uuid()) @db.Char(36)
  userId      String        @db.Char(36)
  user        User          @relation(fields: [userId], references: [id])
  tanggal     DateTime      @default(now()) @db.Date
  waktuMasuk  DateTime?
  waktuPulang DateTime?
  status      StatusAbsensi @default(HADIR)
  keterangan  String?       // opsional, misal alasan izin/sakit
  createdAt   DateTime      @default(now())

  @@unique([userId, tanggal]) // 1 siswa hanya bisa absen 1x per hari
  @@map("absensi")
}

enum StatusAbsensi {
  HADIR
  TELAT
  IZIN
  SAKIT
  ALPA
}

// ============================
// MODEL: JADWAL ABSENSI
// ============================
model JadwalAbsensi {
  id               String   @id @default(uuid()) @db.Char(36)
  namaJadwal       String   @default("Jadwal Utama")
  jamMulaiMasuk    String   // format "06:30"
  jamSelesaiMasuk  String   // format "07:30"
  jamMulaiPulang   String?  // format "15:00"
  jamSelesaiPulang String?  // format "16:00"
  aktif            Boolean  @default(true)
  updatedAt        DateTime @updatedAt

  @@map("jadwal_absensi")
}
```

### Penjelasan Schema

**User**
- `id` pakai `String @default(uuid())` dengan `@db.Char(36)` supaya di MySQL disimpan efisien sebagai `CHAR(36)`.
- `role` pakai enum (`ADMIN` / `SISWA`) supaya nilainya selalu tervalidasi.
- `faceDescriptor` pakai `Json?` untuk simpan array angka hasil deteksi wajah.
- `kelasId` relasi ke tabel `Kelas` (opsional, karena admin tidak butuh kelas).

**Kelas**
- Tabel terpisah supaya siswa bisa dikelompokkan per kelas.

**Absensi**
- `@@unique([userId, tanggal])` memastikan 1 siswa hanya punya 1 record absensi per hari.
- `status` pakai enum `StatusAbsensi` biar konsisten (HADIR, TELAT, IZIN, SAKIT, ALPA).

**JadwalAbsensi**
- Versi simpel (1 jadwal global). Bisa dikembangkan dengan relasi ke `Kelas` kalau nanti butuh jadwal berbeda per kelas.

### Setelah Schema Dibuat

```bash
npx prisma migrate dev --name init_uuid_schema
npx prisma generate
```

---

## ✅ 4. Ringkasan Fitur

- Autentikasi (Login & Register dengan role Admin/Siswa)
- CRUD data siswa
- CRUD data kelas
- CRUD & monitoring data absensi
- Absen otomatis via face recognition (real-time webcam)
- Pengaturan jadwal jam absen oleh admin
- Riwayat & laporan absensi
- Proteksi akses berbasis role (middleware)