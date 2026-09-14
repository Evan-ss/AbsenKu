"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* ------------------------------ Data ------------------------------ */

const NAV_LINKS = [
  { label: "Fitur", href: "#fitur" },
  { label: "Alur", href: "#alur" },
  { label: "Peran", href: "#peran" },
] as const;

/** Spesifikasi sistem — ditarik dari perilaku aplikasi yang sebenarnya. */
const SPECS = [
  { label: "Metode", value: "Face recognition" },
  { label: "Proses absen", value: "± 3 detik / siswa" },
  { label: "Peran", value: "Admin · Guru · Siswa" },
  { label: "Auto checkout", value: "16.10 WIB, Sen–Jum" },
  { label: "Rekap", value: "Export Excel" },
] as const;

const FEATURES = [
  {
    title: "Pemindaian wajah",
    description:
      "Wajah harus berada di dalam area pindai sebelum absen dicatat, dengan indikator kecocokan yang muncul saat descriptor siswa terbaca.",
  },
  {
    title: "Absen masuk per kelas",
    description:
      "Guru wali kelas atau admin memilih kelas lalu memindai wajah siswa satu per satu. Kehadiran tersimpan otomatis.",
  },
  {
    title: "Absen pulang mandiri",
    description:
      "Siswa memindai wajahnya sendiri saat pulang, dan status keterangan diisi tepat waktu atau lebih awal.",
  },
  {
    title: "Surat izin & sakit",
    description:
      "Siswa mengunggah surat beserta foto bukti. Wali kelas meninjau, lalu status absensi harian menyesuaikan keputusan.",
  },
  {
    title: "Rekap & export Excel",
    description:
      "Rekap kehadiran per kelas maupun seluruh sekolah dapat diunduh sebagai berkas Excel untuk laporan bulanan.",
  },
  {
    title: "Auto checkout & jejak audit",
    description:
      "Absensi yang belum ditutup diisi otomatis setiap sore, dan setiap perubahan data terekam dengan pelaku serta nilai lamanya.",
  },
] as const;

const STEPS = [
  {
    step: "01",
    title: "Wajah didaftarkan sekali",
    description:
      "Admin mendaftarkan foto dan descriptor wajah setiap siswa. Descriptor inilah yang dipakai untuk pencocokan, bukan foto mentahnya.",
  },
  {
    step: "02",
    title: "Guru memindai kelas",
    description:
      "Buka panel Guru, pilih kelas, arahkan wajah siswa ke kamera. Kecocokan terbaca dalam hitungan detik.",
  },
  {
    step: "03",
    title: "Rekap tersusun sendiri",
    description:
      "Siswa absen pulang sendiri, sistem menutup absensi yang terlewat, dan guru tinggal mengunduh rekapnya.",
  },
] as const;

const ROLES = [
  {
    name: "Admin",
    heading: "Pusat kendali data sekolah",
    points: [
      "Mengelola data siswa, kelas, jadwal, dan akun guru",
      "Verifikasi wajah lewat panel kamera dan tinjauan manual",
      "Mengunduh seluruh data absensi sekolah",
    ],
  },
  {
    name: "Guru",
    heading: "Absensi kelas tanpa kertas",
    points: [
      "Absen kelas lewat kamera atau input manual",
      "Menandai alpa bagi siswa yang tidak hadir",
      "Meninjau surat izin dan sakit dari siswa",
    ],
  },
  {
    name: "Siswa",
    heading: "Pantau kehadiran sendiri",
    points: [
      "Dashboard rekap hadir, izin, dan alpa pribadi",
      "Mengajukan surat izin atau sakit beserta bukti",
      "Absen pulang mandiri dengan pemindaian wajah",
    ],
  },
] as const;

/* ------------------------------ Helpers ------------------------------ */

function SectionHead({
  index,
  title,
  lead,
}: {
  index: string;
  title: string;
  lead: string;
}) {
  return (
    <header className="border-t border-ink pt-4">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="label-mono text-accent">{index}</span>
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          {title}
        </h2>
      </div>
      <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
        {lead}
      </p>
    </header>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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

  // Spinner hanya saat pengguna terautentikasi sedang diarahkan; saat sesi masih
  // dimuat, landing page tetap dirender supaya isinya ikut ada di HTML awal.
  if (status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="label-mono text-muted">Mengarahkan…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink antialiased">
      {/* ---------------- Header ---------------- */}
      <header className="sticky top-0 z-40 border-b border-rule bg-paper">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6 lg:px-8">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="text-lg font-semibold tracking-tight text-ink">
              AbsensiKu
            </span>
            <span className="label-mono hidden text-muted sm:inline">
              Sistem Absensi Sekolah
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <div className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="label-mono text-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <Link
              href="/login"
              className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="border-b border-rule">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="grid gap-12 py-16 md:grid-cols-12 md:gap-8 md:py-24">
              <div className="animate-rise md:col-span-7">
                <p className="label-mono text-muted">
                  Face recognition · Absensi harian
                </p>

                <h1 className="mt-8 max-w-[22ch] text-[clamp(2.25rem,4.6vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
                  Wajah siswa jadi{" "}
                  <span className="text-accent">tanda hadir</span>, rekapnya
                  tersusun sendiri.
                </h1>

                <p className="mt-8 max-w-xl text-pretty text-base leading-relaxed text-muted">
                  AbsensiKu menggantikan presensi manual di kelas. Guru memindai
                  wajah siswa di depan kamera, siswa memindai sendiri saat
                  pulang, dan sistem menyusun rekap harian yang siap diekspor.
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <Link
                    href="/login"
                    className="bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
                  >
                    Masuk ke akun →
                  </Link>
                  <a
                    href="#fitur"
                    className="label-mono border-b border-ink/30 pb-1 text-ink transition-colors hover:border-ink"
                  >
                    Lihat fitur ↓
                  </a>
                </div>
              </div>

              <div className="md:col-span-5 md:border-l md:border-rule md:pl-8">
                <p className="label-mono text-muted">Spesifikasi</p>
                <dl className="mt-5 border-t border-rule">
                  {SPECS.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex items-baseline justify-between gap-6 border-b border-rule py-3.5"
                    >
                      <dt className="text-sm text-muted">{spec.label}</dt>
                      <dd className="figure-mono text-right text-xs text-ink">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Banner ---------------- */}
        <section className="border-b border-rule">
          <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8 md:py-16">
            <figure>
              <div className="border border-rule bg-paper-dim">
                <Image
                  src="/upload/Banner.jpg"
                  alt="Suasana absensi siswa dengan pemindaian wajah di sekolah"
                  width={1376}
                  height={768}
                  priority
                  sizes="(max-width: 1152px) 100vw, 1152px"
                  className="h-auto w-full"
                />
              </div>
              <figcaption className="mt-3 flex flex-col gap-1 text-xs leading-relaxed text-muted sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
                <span className="max-w-2xl text-pretty">
                  Pemindaian wajah di depan kelas. Model deteksi berjalan
                  langsung di peramban, lalu hasilnya dicocokkan dengan
                  descriptor wajah siswa yang terdaftar.
                </span>
                <span className="label-mono shrink-0">Gbr. 01</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ---------------- Fitur ---------------- */}
        <section id="fitur" className="scroll-mt-20 border-b border-rule">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 md:py-24">
            <SectionHead
              index="01 / Fitur"
              title="Yang sudah berjalan di dalam sistem"
              lead="Enam hal ini bukan rencana pengembangan — semuanya sudah dipakai di aplikasi, dari pemindaian kamera sampai berkas Excel."
            />

            <ol className="mt-12 border-t border-rule">
              {FEATURES.map((feature, index) => (
                <li
                  key={feature.title}
                  className="grid gap-2 border-b border-rule py-7 md:grid-cols-12 md:gap-8"
                >
                  <span className="figure-mono text-xs text-muted md:col-span-1">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight text-ink md:col-span-4">
                    {feature.title}
                  </h3>
                  <p className="text-pretty text-sm leading-relaxed text-muted md:col-span-7">
                    {feature.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Alur ---------------- */}
        <section id="alur" className="scroll-mt-20 border-b border-rule">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 md:py-24">
            <SectionHead
              index="02 / Alur"
              title="Tiga langkah dari daftar sampai rekap"
              lead="Absensi harian dirancang untuk dilakukan di depan kelas, bukan di meja kerja."
            />

            <ol className="mt-12 grid border-t border-rule md:grid-cols-3">
              {STEPS.map((step) => (
                <li
                  key={step.step}
                  className="border-t border-rule py-7 first:border-t-0 md:border-l md:border-t-0 md:pl-8 md:first:border-l-0 md:first:pl-0"
                >
                  <span className="figure-mono text-xs text-accent">
                    {step.step}
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Peran ---------------- */}
        <section id="peran" className="scroll-mt-20 border-b border-rule">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 md:py-24">
            <SectionHead
              index="03 / Peran"
              title="Tiga peran, tiga tampilan"
              lead="Setiap pengguna masuk ke panel yang berbeda; menu dan izin akses disesuaikan otomatis oleh sistem."
            />

            <div className="mt-12 grid gap-10 border-t border-rule pt-10 md:grid-cols-3 md:gap-8">
              {ROLES.map((role) => (
                <div key={role.name}>
                  <span className="label-mono text-accent">{role.name}</span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">
                    {role.heading}
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {role.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-3 text-pretty text-sm leading-relaxed text-muted"
                      >
                        <span aria-hidden className="text-accent">
                          —
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Penutup ---------------- */}
        <section className="border-b border-rule bg-ink">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 md:py-20">
            <div className="grid gap-8 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="label-mono text-paper/60">Masuk</p>
                <h2 className="mt-6 max-w-[24ch] text-2xl font-semibold leading-tight tracking-tight text-paper sm:text-3xl">
                  Gunakan akun sekolah Anda untuk mulai mengabsen hari ini.
                </h2>
              </div>
              <div className="flex flex-col items-start gap-4 md:col-span-4 md:items-end md:justify-end">
                <Link
                  href="/login"
                  className="bg-paper px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-accent hover:text-paper"
                >
                  Masuk ke akun →
                </Link>
                <span className="label-mono text-paper/60">
                  Admin · Guru · Siswa
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-rule">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:px-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-ink">
              AbsensiKu
            </p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted">
              Sistem absensi siswa berbasis face recognition untuk sekolah.
            </p>
          </div>

          <nav className="flex flex-col gap-2 sm:items-center">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="label-mono text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              className="label-mono text-muted transition-colors hover:text-ink"
            >
              Masuk
            </Link>
          </nav>

          <div className="sm:text-right">
            <p className="label-mono text-muted">Dibangun dengan</p>
            <p className="mt-2 text-xs text-muted">
              Next.js · Prisma · MySQL · face-api.js
            </p>
            <p className="mt-1 figure-mono text-xs text-muted">
              © {new Date().getFullYear()} AbsensiKu
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
