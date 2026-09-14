"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";

type IconProps = { className?: string };

/* ------------------------------ Icons ------------------------------ */

function ShieldIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function ScanFaceIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8V5a2 2 0 012-2h3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M21 16v3a2 2 0 01-2 2h-3" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 10h.01M15 10h.01M9.5 14.5c.7.6 1.6.9 2.5.9s1.8-.3 2.5-.9" />
    </svg>
  );
}

function CameraIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function WalkOutIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 16l-4-4m0 0l4-4m-4 4h14m-6-8h2a2 2 0 012 2v12a2 2 0 01-2 2h-2" />
    </svg>
  );
}

function DocIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function SheetIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h10M17 16l3 3m0 0l-3 3m3-3h-6" />
    </svg>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm8-3a3 3 0 10-2-5.24" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m0 0l-6-6m6 6l-6 6" />
    </svg>
  );
}

function MenuIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/* ------------------------------ Data ------------------------------ */

const NAV_LINKS = [
  { label: "Fitur", href: "#fitur" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Peran", href: "#peran" },
] as const;

const HERO_FACTS = [
  { value: "± 3 detik", label: "scan wajah per siswa" },
  { value: "3 peran", label: "Admin · Guru · Siswa" },
  { value: "16.10 WIB", label: "auto checkout Sen–Jum" },
] as const;

type Feature = {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
  tone: string;
};

const FEATURES: Feature[] = [
  {
    icon: ScanFaceIcon,
    title: "Face Recognition Real-time",
    description:
      "Deteksi wajah langsung dari webcam dengan kotak pemindaian dan landai wajah. Wajah harus berada di dalam area oval sebelum absen dicatat.",
    tone: "from-blue-500 to-indigo-600",
  },
  {
    icon: CameraIcon,
    title: "Absen Masuk per Kelas",
    description:
      "Guru wali kelas atau admin memilih kelas, lalu memindai wajah siswa satu per satu. Kehadiran tercatat otomatis tanpa antre kartu.",
    tone: "from-cyan-500 to-blue-600",
  },
  {
    icon: WalkOutIcon,
    title: "Absen Pulang Mandiri",
    description:
      "Siswa memindai wajahnya sendiri saat pulang. Status pulang ditandai tepat waktu atau lebih awal secara otomatis.",
    tone: "from-emerald-500 to-teal-600",
  },
  {
    icon: DocIcon,
    title: "Surat Izin & Sakit Digital",
    description:
      "Siswa mengunggah surat beserta foto bukti, wali kelas meninjau, dan status absensi harian langsung menyesuaikan keputusan.",
    tone: "from-amber-500 to-orange-600",
  },
  {
    icon: SheetIcon,
    title: "Rekap & Export Excel",
    description:
      "Rekap kehadiran per kelas maupun seluruh sekolah dapat diekspor ke Excel dalam sekali klik untuk laporan bulanan.",
    tone: "from-violet-500 to-purple-600",
  },
  {
    icon: ClockIcon,
    title: "Auto Checkout & Jejak Audit",
    description:
      "Cron harian menutup absensi yang belum pulang, dan setiap perubahan data terekam di log audit dengan pelaku serta nilai lama.",
    tone: "from-rose-500 to-pink-600",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Wajah didaftarkan sekali",
    description:
      "Admin mendaftarkan foto dan descriptor wajah 128 dimensi setiap siswa. Descriptor ini yang dipakai untuk pencocokan, bukan foto mentahnya.",
  },
  {
    step: "02",
    title: "Guru memindai kelas",
    description:
      "Buka panel Guru, pilih kelas, lalu arahkan wajah siswa ke kamera. Cocok dalam hitungan detik, kehadiran langsung tersimpan.",
  },
  {
    step: "03",
    title: "Rekap otomatis tiap hari",
    description:
      "Siswa bisa absen pulang sendiri, sistem menutup absensi yang terlewat, dan guru tinggal mengekspor rekap harian atau bulanan.",
  },
];

type Role = {
  name: string;
  tagline: string;
  tone: string;
  icon: ComponentType<IconProps>;
  points: string[];
};

const ROLES: Role[] = [
  {
    name: "Admin",
    tagline: "Pusat kendali data sekolah",
    tone: "from-blue-500 to-indigo-600",
    icon: ShieldIcon,
    points: [
      "Kelola data siswa, kelas, jadwal, dan akun guru",
      "Verifikasi wajah siswa lewat panel kamera & verifikasi manual",
      "Export seluruh data absensi sekolah",
    ],
  },
  {
    name: "Guru",
    tagline: "Absensi kelas tanpa kertas",
    tone: "from-cyan-500 to-blue-600",
    icon: CameraIcon,
    points: [
      "Absen kelas lewat kamera atau input manual",
      "Tandai alpa massal untuk siswa yang tidak hadir",
      "Review surat izin dan sakit dari siswa",
    ],
  },
  {
    name: "Siswa",
    tagline: "Pantau kehadiran sendiri",
    tone: "from-emerald-500 to-teal-600",
    icon: WalkOutIcon,
    points: [
      "Dashboard rekap kehadiran, izin, dan alpa pribadi",
      "Ajukan surat izin atau sakit beserta bukti foto",
      "Absen pulang mandiri dengan pemindaian wajah",
    ],
  },
];

/* ------------------------------ Page ------------------------------ */

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else if (session.user.role === "SISWA") {
        router.push("/siswa/dashboard");
      } else if (session.user.role === "GURU") {
        router.push("/guru/dashboard");
      }
    }
  }, [session, status, router]);

  // Hanya tampilkan spinner saat pengguna terautentikasi sedang diarahkan.
  // Saat sesi masih dimuat, landing page tetap dirender agar konten langsung
  // tampil (dan ikut ter-render di HTML awal).
  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050b1e]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b1e] text-white antialiased overflow-x-hidden selection:bg-blue-500/40">
      {/* ---------------- Navbar ---------------- */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="border-b border-white/10 bg-[#050b1e]/70 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/50">
                <ShieldIcon className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-semibold tracking-tight">
                Absensi<span className="text-blue-400">Ku</span>
              </span>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-300 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-blue-950/40 transition-all hover:bg-blue-50"
              >
                Masuk
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white md:hidden"
            >
              {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </nav>

          {menuOpen && (
            <div className="border-t border-white/10 bg-[#050b1e]/95 px-4 pb-5 pt-3 md:hidden">
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  href="/login"
                  className="mt-2 rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-900"
                >
                  Masuk
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-glow absolute -left-24 -top-32 h-80 w-80 rounded-full bg-blue-600/40 blur-[120px]" />
          <div
            className="animate-glow absolute -right-20 top-24 h-[26rem] w-[26rem] rounded-full bg-indigo-600/30 blur-[140px]"
            style={{ animationDelay: "2.5s" }}
          />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="bg-grid-mask absolute inset-0" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1.2fr] lg:gap-10">
          <div className="animate-rise text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium tracking-wide text-blue-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Absensi sekolah berbasis pengenalan wajah
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Kehadiran siswa terdata{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                hanya dengan wajah
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-300 lg:mx-0 sm:text-lg">
              AbsensiKu menggantikan presensi manual dengan pemindaian wajah di
              depan kamera. Guru memindai kelas, siswa absen pulang sendiri, dan
              rekap harian tersusun rapi — semua dalam satu aplikasi.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/login"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-950/50 transition-all hover:from-blue-400 hover:to-indigo-500 hover:shadow-blue-900/60 sm:w-auto"
              >
                Masuk ke Akun
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#fitur"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur transition-colors hover:bg-white/10 hover:text-white sm:w-auto"
              >
                Lihat Fitur
              </a>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {HERO_FACTS.map((fact) => (
                <div key={fact.label} className="text-center lg:text-left">
                  <dt className="text-lg font-semibold text-white sm:text-xl">
                    {fact.value}
                  </dt>
                  <dd className="mt-1 text-[11px] leading-snug text-slate-400 sm:text-xs">
                    {fact.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Banner */}
          <div className="animate-rise relative" style={{ animationDelay: "0.15s" }}>
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-cyan-500/20 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-2xl shadow-blue-950/60 ring-1 ring-inset ring-white/5">
              <Image
                src="/upload/Banner.jpg"
                alt="Ilustrasi siswa melakukan absensi dengan pemindaian wajah di sekolah"
                width={1376}
                height={768}
                priority
                sizes="(max-width: 1024px) 100vw, 620px"
                className="h-auto w-full object-cover"
              />

              {/* scan sweep + bottom fade */}
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="animate-scan absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050b1e] via-[#050b1e]/50 to-transparent" />
              </div>

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-[#050b1e]/70 px-3 py-1.5 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
                <span className="text-[11px] font-medium text-emerald-100">
                  Wajah terdeteksi
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                  Hadir · 07.12
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                  Kecocokan 96%
                </span>
              </div>
            </div>

            {/* Floating stat card */}
            <div
              className="animate-float-sm absolute -left-4 bottom-10 hidden rounded-2xl border border-white/15 bg-[#0a1230]/85 p-3.5 shadow-xl shadow-blue-950/60 backdrop-blur-lg sm:block"
              style={{ animationDelay: "1.2s" }}
            >
              <p className="text-[10px] uppercase tracking-widest text-slate-400">
                Rekap hari ini
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">32 / 34</p>
              <p className="text-[11px] text-emerald-300">Hadir terverifikasi</p>
            </div>

            <div
              className="animate-float absolute -right-3 top-8 hidden items-center gap-2 rounded-2xl border border-white/15 bg-[#0a1230]/85 px-3.5 py-3 shadow-xl shadow-blue-950/60 backdrop-blur-lg sm:flex"
              style={{ animationDelay: "0.6s" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
                <CheckIcon className="h-4 w-4 text-emerald-300" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Tercatat</p>
                <p className="text-[10px] text-slate-400">tanpa kartu absen</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="fitur" className="scroll-mt-20 bg-white py-20 text-slate-900 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Fitur Utama
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Semua kebutuhan absensi sekolah, dalam satu aplikasi
            </h2>
            <p className="mt-4 text-slate-600">
              Dari pemindaian wajah di depan kelas sampai rekap Excel untuk
              laporan bulanan — tanpa kertas, tanpa rekap ulang.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60"
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.tone} text-white shadow-lg shadow-blue-100`}
                >
                  <feature.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="cara-kerja" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-blue-700/20 blur-[130px]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              Cara Kerja
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Tiga langkah, absensi kelas selesai
            </h2>
          </div>

          <div className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent md:block"
            />
            {STEPS.map((step) => (
              <div key={step.step} className="relative text-center md:text-left">
                <span className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/30 bg-[#0a1230] text-sm font-bold text-blue-300 shadow-lg shadow-blue-950/60">
                  {step.step}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Roles ---------------- */}
      <section id="peran" className="relative scroll-mt-20 pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              Peran Pengguna
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Satu aplikasi, tiga pengalaman berbeda
            </h2>
            <p className="mt-4 text-slate-400">
              Menu dan izin akses menyesuaikan peran masing-masing pengguna
              secara otomatis setelah masuk.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {ROLES.map((role) => (
              <div
                key={role.name}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-400/30 hover:bg-white/[0.07]"
              >
                <div
                  aria-hidden
                  className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${role.tone} opacity-20 blur-3xl transition-opacity group-hover:opacity-35`}
                />
                <div className="relative">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${role.tone} text-white shadow-lg shadow-blue-950/50`}
                  >
                    <role.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {role.name}
                  </h3>
                  <p className="mt-1 text-sm text-blue-300">{role.tagline}</p>
                  <ul className="mt-5 space-y-3">
                    {role.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm text-slate-300">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-14 text-center shadow-2xl shadow-blue-950/60 sm:px-16">
            <div
              aria-hidden
              className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"
            />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Siap memulai absensi tanpa kertas?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-blue-100">
                Masuk menggunakan akun sekolah Anda — admin, guru, atau siswa —
                dan langsung kelola kehadiran hari ini.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 sm:w-auto"
                >
                  Masuk Sekarang
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#fitur"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
                >
                  Pelajari Fitur
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <ShieldIcon className="h-4 w-4 text-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">AbsensiKu</p>
              <p className="text-xs text-slate-400">
                Absensi siswa berbasis face recognition
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </a>
            ))}
            <Link href="/login" className="transition-colors hover:text-white">
              Masuk
            </Link>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <UsersIcon className="h-4 w-4" />
            &copy; {new Date().getFullYear()} AbsensiKu
          </p>
        </div>
      </footer>
    </div>
  );
}
