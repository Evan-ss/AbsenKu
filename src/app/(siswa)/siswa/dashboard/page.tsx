"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatDateLong, formatTime } from "@/lib/format";

interface TodayAbsensi {
  id: string;
  tanggal: string;
  waktuMasuk: string | null;
  waktuPulang: string | null;
  status: string;
  keterangan: string | null;
}

interface RecentAbsensi {
  id: string;
  tanggal: string;
  waktuMasuk: string | null;
  status: string;
}

interface SuratItem {
  id: string;
  tanggal: string;
  jenis: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  HADIR: "Hadir",
  TELAT: "Telat",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPA: "Alpa",
};

const STATUS_COLORS: Record<string, string> = {
  HADIR: "bg-green-100 text-green-700",
  TELAT: "bg-yellow-100 text-yellow-700",
  IZIN: "bg-blue-100 text-blue-700",
  SAKIT: "bg-purple-100 text-purple-700",
  ALPA: "bg-red-100 text-red-700",
};

const STATUS_DOT: Record<string, string> = {
  HADIR: "bg-green-500",
  TELAT: "bg-yellow-500",
  IZIN: "bg-blue-500",
  SAKIT: "bg-purple-500",
  ALPA: "bg-red-500",
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function getDayName(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", { weekday: "long" });
}

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Status card config per status
function getStatusCard(status: string, absensi: TodayAbsensi | null) {
  switch (status) {
    case "HADIR":
      return {
        bg: "from-green-50 to-emerald-50",
        border: "border-green-200",
        iconBg: "bg-green-500",
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ),
        label: "Sudah Hadir",
        desc: absensi?.waktuMasuk
          ? `Masuk pukul ${formatTime(absensi.waktuMasuk)}`
          : "Absen tercatat",
        badge: "bg-green-100 text-green-700",
        badgeDot: "bg-green-500",
        badgeLabel: "Hadir",
      };
    case "TELAT":
      return {
        bg: "from-yellow-50 to-amber-50",
        border: "border-yellow-200",
        iconBg: "bg-yellow-500",
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        label: "Terlambat",
        desc: absensi?.waktuMasuk
          ? `Masuk pukul ${formatTime(absensi.waktuMasuk)}`
          : "Melewati jam masuk",
        badge: "bg-yellow-100 text-yellow-700",
        badgeDot: "bg-yellow-500",
        badgeLabel: "Telat",
      };
    case "IZIN":
      return {
        bg: "from-blue-50 to-indigo-50",
        border: "border-blue-200",
        iconBg: "bg-blue-500",
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        label: "Izin Diterima",
        desc: absensi?.keterangan || "Surat izin telah disetujui guru",
        badge: "bg-blue-100 text-blue-700",
        badgeDot: "bg-blue-500",
        badgeLabel: "Izin",
      };
    case "SAKIT":
      return {
        bg: "from-purple-50 to-fuchsia-50",
        border: "border-purple-200",
        iconBg: "bg-purple-500",
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ),
        label: "Sakit Diterima",
        desc: absensi?.keterangan || "Surat sakit telah disetujui guru",
        badge: "bg-purple-100 text-purple-700",
        badgeDot: "bg-purple-500",
        badgeLabel: "Sakit",
      };
    case "ALPA":
      return {
        bg: "from-red-50 to-rose-50",
        border: "border-red-200",
        iconBg: "bg-red-500",
        icon: (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
        label: "Tidak Hadir",
        desc: absensi?.keterangan || "Tidak ada keterangan",
        badge: "bg-red-100 text-red-700",
        badgeDot: "bg-red-500",
        badgeLabel: "Alpa",
      };
    default:
      return null;
  }
}

export default function SiswaDashboard() {
  const { data: session } = useSession();
  const [todayAbsensi, setTodayAbsensi] = useState<TodayAbsensi | null>(null);
  const [recentAbsensi, setRecentAbsensi] = useState<RecentAbsensi[]>([]);
  const [todaySurat, setTodaySurat] = useState<SuratItem | null>(null);
  const [pendingSuratCount, setPendingSuratCount] = useState(0);
  const [stats, setStats] = useState({ hadir: 0, total: 0, persen: 0 });
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const today = new Date();
      const bulan = String(today.getMonth() + 1);
      const tahun = String(today.getFullYear());
      const todayStr = getTodayStr();

      // Fetch riwayat absensi
      const riwayatRes = await fetch(
        `/api/absen/riwayat?bulan=${bulan}&tahun=${tahun}&page=1`
      );
      const riwayatData = await riwayatRes.json();

      if (riwayatRes.ok && riwayatData.data) {
        const todayRecord = riwayatData.data.find(
          (a: TodayAbsensi) => a.tanggal === todayStr
        );
        setTodayAbsensi(todayRecord || null);
        setRecentAbsensi(riwayatData.data.slice(0, 5));

        if (riwayatData.stats) {
          const total =
            riwayatData.stats.hadir +
            riwayatData.stats.telat +
            riwayatData.stats.izin +
            riwayatData.stats.sakit +
            riwayatData.stats.alpa;
          setStats({
            hadir: riwayatData.stats.hadir,
            total,
            persen:
              total > 0
                ? Math.round((riwayatData.stats.hadir / total) * 100)
                : 0,
          });
        }
      }

      // Fetch surat — check today's pending surat & total pending
      const suratRes = await fetch("/api/siswa/surat");
      const suratData = await suratRes.json();
      if (suratRes.ok && suratData.data) {
        const allSurat: SuratItem[] = suratData.data || [];

        // Find today's surat (any status)
        const todaySuratRecord = allSurat.find(
          (s: SuratItem) => s.tanggal === todayStr
        );
        setTodaySurat(todaySuratRecord || null);

        // Count pending surat
        const pending = allSurat.filter(
          (s: SuratItem) => s.status === "MENUNGGU"
        ).length;
        setPendingSuratCount(pending);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Auto-polling: refresh data every 10 seconds when tab is visible
  useEffect(() => {
    const POLL_INTERVAL = 10_000; // 10 seconds

    const tick = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData(false); // silent refresh, no loading spinner
      }
    };

    const id = setInterval(tick, POLL_INTERVAL);

    // Also refresh when user switches back to the tab
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchDashboardData]);

  const todayStr = getTodayStr();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Greeting Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <span className="text-white text-2xl font-bold">
              {session?.user?.nama?.charAt(0)?.toUpperCase() || "S"}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {session?.user?.nama?.split(" ")[0] || "Siswa"}!
            </h1>
            <p className="text-gray-500 mt-1">
              {getDayName(new Date().toISOString())},{" "}
              {formatDateLong(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* Today's Status Card — Different per status     */}
      {/* ============================================= */}
      {!loading && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-600 font-medium">Live</span>
        </div>
      )}
      <div className="mb-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </div>
          </div>
        ) : todayAbsensi ? (
          (() => {
            const card = getStatusCard(todayAbsensi.status, todayAbsensi);
            if (!card) return null;
            return (
              <div
                className={`bg-gradient-to-br ${card.bg} rounded-2xl border ${card.border} p-6`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${card.iconBg}`}
                  >
                    {card.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Status Hari Ini
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${card.badge}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${card.badgeDot}`}
                        />
                        {card.badgeLabel}
                      </span>
                      <span className="text-sm text-gray-500">{card.desc}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : todaySurat && todaySurat.status === "MENUNGGU" ? (
          /* ----- Surat submitted but waiting for guru approval ----- */
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Surat Menunggu Acc Guru
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Menunggu
                  </span>
                  <span className="text-sm text-gray-500">
                    Surat{" "}
                    {todaySurat.jenis === "SAKIT" ? "Sakit" : "Izin"} hari ini
                    sedang dikirim
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ----- No absensi & no surat today ----- */
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-400 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Belum Absen Hari Ini
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Absensi akan dicatat oleh guru saat scan wajah di sekolah
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href="/siswa/surat"
          className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                Ajukan Surat
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Kirim surat izin atau sakit
              </p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>

        <Link
          href="/siswa/riwayat"
          className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                Riwayat Absensi
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Lihat histori kehadiran
              </p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Ringkasan Bulan Ini
          </h2>
          <span className="text-2xl font-bold text-emerald-600">
            {stats.persen}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-emerald-500 to-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.persen}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{stats.hadir}</span>{" "}
              hari hadir
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-300 rounded-full" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{stats.total}</span>{" "}
              hari total
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Riwayat Terbaru
            </h2>
            <Link
              href="/siswa/riwayat"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Lihat Semua
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentAbsensi.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-10 h-10 text-gray-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-sm text-gray-500">Belum ada riwayat</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAbsensi.map((absen) => (
                <div
                  key={absen.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      absen.status === "HADIR"
                        ? "bg-green-100"
                        : absen.status === "TELAT"
                        ? "bg-yellow-100"
                        : absen.status === "IZIN"
                        ? "bg-blue-100"
                        : absen.status === "SAKIT"
                        ? "bg-purple-100"
                        : "bg-red-100"
                    }`}
                  >
                    {absen.status === "HADIR" ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : absen.status === "TELAT" ? (
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : absen.status === "IZIN" ? (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : absen.status === "SAKIT" ? (
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateLong(absen.tanggal)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {absen.waktuMasuk
                        ? `Masuk ${formatTime(absen.waktuMasuk)}`
                        : absen.status === "IZIN"
                        ? "Izin"
                        : absen.status === "SAKIT"
                        ? "Sakit"
                        : absen.status === "ALPA"
                        ? "Alpa"
                        : "—"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[absen.status]}`}
                  >
                    {STATUS_LABELS[absen.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Surat */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Status Surat
            </h2>
            <Link
              href="/siswa/surat"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Lihat Semua
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : pendingSuratCount === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-10 h-10 text-gray-300 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-gray-500">Tidak ada surat pending</p>
              <p className="text-xs text-gray-400 mt-1">
                Semua surat sudah diproses
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-amber-600 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    {pendingSuratCount} surat menunggu acc guru
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Guru akan memproses surat kamu segera
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
