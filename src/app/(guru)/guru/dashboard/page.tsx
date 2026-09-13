"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { formatDate, formatTime } from "@/lib/format";

interface KelasGuru {
  id: string;
  namaKelas: string;
  waliKelas: string | null;
  totalSiswa: number;
  sudahAbsen: number;
  suratMenunggu: number;
  isWaliKelas?: boolean;
  isGuruMapel?: boolean;
  mataPelajaran?: string[];
}

interface SuratPending {
  id: string;
  tanggal: string;
  jenis: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    nama: string;
    nis: string;
    kelas: { id: string; namaKelas: string } | null;
  };
}

interface DashboardStats {
  totalKelas: number;
  totalSiswa: number;
  totalSudahAbsen: number;
  totalBelumAbsen: number;
  totalSuratMenunggu: number;
}

export default function GuruDashboard() {
  const { data: session } = useSession();
  const [kelasList, setKelasList] = useState<KelasGuru[]>([]);
  const [suratPending, setSuratPending] = useState<SuratPending[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kelasRes, suratRes] = await Promise.all([
        fetch("/api/guru/kelas"),
        fetch("/api/guru/surat?status=MENUNGGU&limit=10"),
      ]);

      const kelasData = await kelasRes.json();
      const suratData = await suratRes.json();

      if (kelasRes.ok) {
        const kelas = kelasData.data || [];
        setKelasList(kelas);

        // Compute stats
        const totalSiswa = kelas.reduce((s: number, k: KelasGuru) => s + k.totalSiswa, 0);
        const totalSudahAbsen = kelas.reduce((s: number, k: KelasGuru) => s + k.sudahAbsen, 0);
        const totalSuratMenunggu = kelas.reduce((s: number, k: KelasGuru) => s + k.suratMenunggu, 0);

        setStats({
          totalKelas: kelas.length,
          totalSiswa,
          totalSudahAbsen,
          totalBelumAbsen: totalSiswa - totalSudahAbsen,
          totalSuratMenunggu,
        });
      }

      if (suratRes.ok) setSuratPending(suratData.data || []);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Selamat pagi"
      : now.getHours() < 17
      ? "Selamat siang"
      : "Selamat sore";

  const todayStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {session?.user?.nama?.split(" ")[0] || "Guru"}! 👋
        </h1>
        <p className="text-gray-500 mt-1">{todayStr}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalKelas}</p>
                    <p className="text-xs text-gray-500">Kelas</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalSiswa}</p>
                    <p className="text-xs text-gray-500">Total Siswa</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{stats.totalSudahAbsen}</p>
                    <p className="text-xs text-gray-500">Sudah Absen</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.totalBelumAbsen}</p>
                    <p className="text-xs text-gray-500">Belum Absen</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Link
              href="/guru/kelas"
              className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="font-semibold">Lihat Kelas</h3>
              </div>
              <p className="text-amber-100 text-sm">Pantau absensi & kelola kelas</p>
            </Link>

            <Link
              href="/guru/surat"
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-amber-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">Review Surat</h3>
              </div>
              {stats && stats.totalSuratMenunggu > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  {stats.totalSuratMenunggu} menunggu
                </span>
              ) : (
                <p className="text-sm text-gray-500">Tidak ada surat baru</p>
              )}
            </Link>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Persentase</h3>
              </div>
              {stats && stats.totalSiswa > 0 ? (
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {Math.round((stats.totalSudahAbsen / stats.totalSiswa) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">Kehadiran hari ini</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">-</p>
              )}
            </div>
          </div>

          {/* Kelas Overview */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kelas Hari Ini</h2>
          {kelasList.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-8">
              <p className="text-gray-500">Belum ada data kelas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {kelasList.map((kelas) => {
                const persen =
                  kelas.totalSiswa > 0
                    ? Math.round((kelas.sudahAbsen / kelas.totalSiswa) * 100)
                    : 0;

                return (
                  <Link
                    key={kelas.id}
                    href={`/guru/kelas/${kelas.id}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:border-amber-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                          <span className="text-sm font-bold text-amber-600">
                            {kelas.namaKelas.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                            {kelas.namaKelas}
                            {kelas.isWaliKelas && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
                                Wali Kelas
                              </span>
                            )}
                            {kelas.isGuruMapel && kelas.mataPelajaran && kelas.mataPelajaran.length > 0 && (
                              <span className="ml-2">
                                {kelas.mataPelajaran.map((mp) => (
                                  <span key={mp} className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">
                                    {mp}
                                  </span>
                                ))}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500">{kelas.totalSiswa} siswa</p>
                        </div>
                      </div>
                      {kelas.suratMenunggu > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {kelas.suratMenunggu} surat
                        </span>
                      )}
                    </div>

                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{kelas.sudahAbsen}/{kelas.totalSiswa} hadir</span>
                        <span className="font-medium">{persen}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            persen >= 80 ? "bg-emerald-500" : persen >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${persen}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 group-hover:text-amber-500 transition-colors">
                      Klik untuk detail →
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Surat Menunggu */}
          {suratPending.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Surat Menunggu Review
                </h2>
                <Link href="/guru/surat" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                  Lihat Semua →
                </Link>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {suratPending.slice(0, 5).map((surat) => (
                    <Link
                      key={surat.id}
                      href={`/guru/review/${surat.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${surat.jenis === "SAKIT" ? "bg-purple-100" : "bg-blue-100"}`}>
                        <svg className={`w-5 h-5 ${surat.jenis === "SAKIT" ? "text-purple-600" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{surat.user.nama}</p>
                        <p className="text-xs text-gray-500">
                          {surat.user.kelas?.namaKelas} • Surat {surat.jenis === "SAKIT" ? "Sakit" : "Izin"} • {formatDate(surat.tanggal)}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Review
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
