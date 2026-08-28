# AbsensiKu — Aplikasi Absensi Siswa (Face Recognition)

Aplikasi absensi siswa berbasis **face recognition** menggunakan webcam. Dibangun dengan Next.js, TypeScript, Prisma, MySQL, dan face-api.js.

## ✨ Fitur

### Admin
- **Dashboard** — Statistik ringkas dan akses cepat ke semua fitur
- **Data Siswa** — CRUD lengkap dengan search, filter kelas, pagination, toggle aktif
- **Data Kelas** — CRUD dengan proteksi hapus jika masih ada siswa
- **Data Absensi** — Monitoring dengan filter tanggal/kelas/status, koreksi manual, catat manual
- **Jadwal Absensi** — Atur jam masuk/pulang, toggle aktif/nonaktif
- **Rekam Wajah** — Capture face descriptor via kamera saat daftar atau dari tabel siswa

### Siswa
- **Dashboard** — Informasi status hari ini
- **Absen** — Face recognition via webcam (deteksi otomatis, auto-submit)
- **Riwayat Absensi** — Filter bulan/tahun, statistik kehadiran, progress bar

## 🧱 Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js |
| Framework | Next.js (App Router) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| Database | MySQL |
| ORM | Prisma 6 |
| Auth | NextAuth.js (Credentials) |
| Face Recognition | face-api.js (client-side) |
| Validasi | Zod |

## 🗄️ Database Schema

4 model utama:

| Model | Tabel | Fungsi |
|---|---|---|
| `User` | `users` | Admin & Siswa (UUID, role, faceDescriptor, isActive) |
| `Kelas` | `kelas` | Data kelas dengan wali kelas |
| `Absensi` | `absensi` | Catatan absensi (unique per user per hari) |
| `JadwalAbsensi` | `jadwal_absensi` | Pengaturan jam absen masuk/pulang |

## 🚀 Memulai

### Prasyarat

- **Node.js** v18+ ([Download](https://nodejs.org))
- **MySQL** via XAMPP / Laragon ([Download XAMPP](https://www.apachefriends.org))

### Instalasi

```bash
# 1. Masuk ke direktori project
cd absensi-app

# 2. Install dependencies
npm install

# 3. Copy env dan sesuaikan konfigurasi MySQL
cp .env.example .env
# Edit .env: sesuaikan DATABASE_URL dengan user/password/port MySQL kamu

# 4. Setup database & seed data (otomatis: push schema + seed)
npm run setup

# 5. Jalankan development server
npm run dev
```

Buka [http://localhost:3001](http://localhost:3001)

### Login Default (setelah seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@sekolah.com | admin123 |

### Data Seed Default

- **1 Admin**: Admin Sekolah
- **6 Kelas**: X IPA 1, X IPA 2, XI IPA 1, XI IPA 2, XII IPA 1, XII IPA 2
- **1 Jadwal**: Jadwal Utama (06:30-07:30 masuk, 15:00-16:00 pulang)

## 📁 Struktur Folder

```
src/
├── app/
│   ├── api/           # API Routes
│   │   ├── absen/     → face (absen), riwayat (siswa)
│   │   ├── absensi/   → CRUD absensi (admin)
│   │   ├── auth/      → nextauth, register
│   │   ├── jadwal/    → CRUD jadwal (admin)
│   │   ├── kelas/     → CRUD kelas (admin)
│   │   └── siswa/     → CRUD siswa (admin), face
│   ├── (auth)/        → login, register
│   ├── (admin)/admin/ → dashboard, siswa, kelas, absensi, jadwal
│   └── (siswa)/siswa/ → dashboard, absen, riwayat
├── components/        → providers, face-camera, face-capture
├── lib/               → auth, prisma, validations
├── types/             → next-auth type declarations
└── proxy.ts            → Role-based route protection
```

## 🔐 Route Protection

| Route | Akses | Middleware |
|---|---|---|
| `/` | Public | — |
| `/login` | Public | — |
| `/register` | Admin | API-level check |
| `/admin/*` | Admin | Middleware + API check |
| `/siswa/*` | Siswa | Middleware + API check |

## 🧪 Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run seed     # Seed database
npm run setup    # Push schema + seed (first time)
```

## 🌐 Deployment (Vercel + PlanetScale)

```bash
# 1. Push ke GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main

# 2. Deploy ke Vercel
#    - Import repo dari GitHub
#    - Set environment variables:
#      - DATABASE_URL: dari PlanetScale
#      - NEXTAUTH_SECRET: openssl rand -base64 32
#      - NEXTAUTH_URL: https://your-app.vercel.app

# 3. Setup database di PlanetScale
#    - Buat database di planetscale.com
#    - Hubungkan dan dapatkan connection string
#    - Jalankan: npx prisma db push
#    - Jalankan: npm run seed
```

## 🔑 Environment Variables

| Variable | Deskripsi | Contoh |
|---|---|---|
| `DATABASE_URL` | Koneksi MySQL | `mysql://root:@localhost:3306/absensi_siswa` |
| `NEXTAUTH_SECRET` | Secret JWT (generate: `openssl rand -base64 32`) | `your-secret-key` |
| `NEXTAUTH_URL` | URL aplikasi | `http://localhost:3001` |
