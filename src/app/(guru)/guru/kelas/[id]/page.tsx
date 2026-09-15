"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/format";
import DateInput from "@/components/date-input";

interface SiswaAbsensi {
  id: string;
  nama: string;
  nis: string;
  email: string;
  punyaWajah: boolean;
  absensi: {
    id: string;
    status: string;
    waktuMasuk: Date | null;
    waktuPulang: Date | null;
    keterangan: string | null;
    fotoWajah: string | null;
    selisihMenit: number | null;
  } | null;
}

interface KelasInfo {
  id: string;
  namaKelas: string;
  waliKelas: string | null;
}

interface Summary {
  total: number;
  hadir: number;
  telat: number;
  izin: number;
  sakit: number;
  alpa: number;
  belumAbsen: number;
}

const STATUS_LABELS: Record<string, string> = {
  HADIR: "Hadir",
  TELAT: "Terlambat",
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

export default function GuruKelasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  const id = resolvedParams?.id;
  const [kelas, setKelas] = useState<KelasInfo | null>(null);
  const [siswaList, setSiswaList] = useState<SiswaAbsensi[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tanggal, setTanggal] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [isGuruMapel, setIsGuruMapel] = useState(false);
  const [mataPelajaran, setMataPelajaran] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"absensi" | "foto">("absensi");
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; nama: string; waktu: string; tanggal: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const formatTanggalIndo = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isToday = (() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return tanggal === today;
  })();

  const goToPrevDay = () => {
    const d = new Date(tanggal + "T00:00:00");
    d.setDate(d.getDate() - 1);
    setTanggal(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };
  const goToNextDay = () => {
    const d = new Date(tanggal + "T00:00:00");
    d.setDate(d.getDate() + 1);
    setTanggal(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };
  const goToToday = () => {
    const now = new Date();
    setTanggal(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
  };

  const fetchData = useCallback(async () => {
    if (!id) return; // Wait for id to be resolved
    setLoading(true);
    try {
      const res = await fetch(`/api/guru/kelas/${id}?tanggal=${tanggal}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("Gagal memuat data:", data.message);
        return;
      }

      setKelas(data.kelas);
      setSiswaList(data.siswa);
      setSummary(data.summary);
      setIsWaliKelas(data.isWaliKelas || false);
      setIsReadOnly(data.isReadOnly !== false); // default true for safety
      setIsGuruMapel(data.isGuruMapel || false);
      setMataPelajaran(data.mataPelajaran || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id, tanggal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/guru/dashboard" className="hover:text-amber-600">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {kelas?.namaKelas || "Memuat..."}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {kelas?.namaKelas || "Detail Kelas"}
          </h1>
          {kelas?.waliKelas && (
            <p className="text-gray-500 mt-1">
              Wali Kelas: {kelas.waliKelas}
              {isWaliKelas && <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Anda (Wali Kelas)</span>}
            </p>
          )}
          {isGuruMapel && mataPelajaran.length > 0 && (
            <p className="text-gray-500 mt-1">
              Mata Pelajaran: {mataPelajaran.join(", ")}
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Guru Mapel</span>
            </p>
          )}
        </div>

        {/* Actions - Read-only: hanya DateInput dan Export */}
        <div className="flex flex-wrap items-center gap-2">
          <DateInput
            value={tanggal}
            onChange={setTanggal}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none w-32"
          />
          <div className="h-6 w-px bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            {isWaliKelas && (
              <>
                <button
                  onClick={() => setActiveTab("absensi")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  Absen Manual
                </button>
              </>
            )}
            <button
              onClick={() => window.open(`/api/guru/kelas/${id}/export?bulan=${new Date(tanggal).getMonth() + 1}&tahun=${new Date(tanggal).getFullYear()}`, "_blank")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                <p className="text-xs text-gray-500">Total Siswa</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{summary.hadir}</p>
                <p className="text-xs text-gray-500">Hadir</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.telat}</p>
                <p className="text-xs text-gray-500">Terlambat</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.izin}</p>
                <p className="text-xs text-gray-500">Izin</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{summary.sakit}</p>
                <p className="text-xs text-gray-500">Sakit</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.belumAbsen}</p>
                <p className="text-xs text-gray-500">Belum Absen</p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("absensi")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "absensi"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Absensi
              </span>
            </button>
            <button
              onClick={() => setActiveTab("foto")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "foto"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Foto Wajah
                {siswaList.filter(s => s.absensi?.fotoWajah).length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px]">
                    {siswaList.filter(s => s.absensi?.fotoWajah).length}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Wali Kelas Only: Action Bar for marking ALPA */}
          {!isReadOnly && activeTab === "absensi" && summary && summary.belumAbsen > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {summary.belumAbsen} siswa belum absen hari ini
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Gunakan halaman <Link href="/guru/absen" className="text-amber-700 underline hover:text-amber-800">Absen Siswa</Link> untuk scan wajah, atau tandai ALPA di sini.
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/guru/absen?kelas=${id}&tanggal=${tanggal}`)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Buka Halaman Scan
                </button>
              </div>
            </div>
          )}

          {/* Guru Non-Wali & Guru Mapel: Read-only notice */}
          {isReadOnly && activeTab === "absensi" && summary && summary.belumAbsen > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Mode Baca Saja (Read-Only)
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {isGuruMapel 
                      ? `Anda Guru Mapel (${mataPelajaran.join(", ")}). Hanya wali kelas yang dapat mengelola absensi.`
                      : isWaliKelas
                        ? "Anda Wali Kelas lain. Mode baca saja untuk kelas ini."
                        : "Anda bukan wali kelas ini. Hanya wali kelas yang dapat mengelola absensi."
                    }
                    <br />
                    {summary.belumAbsen > 0 && `${summary.belumAbsen} siswa belum absen hari ini.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Face Photo Gallery */}
          {activeTab === "foto" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Foto Wajah Siswa
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatTanggalIndo(tanggal)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={goToPrevDay}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Hari sebelumnya"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {!isToday && (
                    <button
                      onClick={goToToday}
                      className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                      Hari Ini
                    </button>
                  )}
                  {isToday && (
                    <span className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg">
                      Hari Ini
                    </span>
                  )}
                  <button
                    onClick={goToNextDay}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Hari berikutnya"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {siswaList.filter(s => s.absensi?.fotoWajah).length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">Belum ada foto wajah yang tersimpan</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {isToday
                      ? "Foto akan tersimpan saat siswa absen melalui face recognition"
                      : `Tidak ada foto wajah pada ${formatTanggalIndo(tanggal)}`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {siswaList
                    .filter(s => s.absensi?.fotoWajah)
                    .map(siswa => (
                      <div
                        key={siswa.id}
                        className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedPhoto({
                          url: siswa.absensi!.fotoWajah!,
                          nama: siswa.nama,
                          waktu: siswa.absensi!.waktuMasuk
                            ? new Date(siswa.absensi!.waktuMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                            : "—",
                          tanggal: formatTanggalIndo(tanggal),
                        })}
                      >
                        <div className="aspect-square">
                          <img
                            src={siswa.absensi!.fotoWajah!}
                            alt={`Foto ${siswa.nama}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 truncate">{siswa.nama}</p>
                          <p className="text-[10px] text-gray-500">
                            {siswa.absensi!.waktuMasuk
                              ? new Date(siswa.absensi!.waktuMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                            {" • "}
                            <span className={`font-medium ${
                              siswa.absensi!.status === "HADIR" ? "text-green-600" : "text-yellow-600"
                            }`}>
                              {siswa.absensi!.status === "HADIR" ? "Hadir" : "Telat"}
                            </span>
                          </p>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Table */}
          {activeTab === "absensi" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      NIS
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Waktu Masuk
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Keterlambatan
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Keterangan
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Foto
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {siswaList.map((siswa) => (
                    <tr
                      key={siswa.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        !siswa.absensi ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {siswa.nama}
                          </p>
                          {!siswa.punyaWajah && isWaliKelas && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                              Belum rekam wajah
                            </span>
                          )}
                          {siswa.punyaWajah && isWaliKelas && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                              Wajah terekam
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 font-mono">
                          {siswa.nis}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                        {siswa.absensi ? (
                          <>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[siswa.absensi.status] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                STATUS_DOT[siswa.absensi.status] || "bg-gray-500"
                              }`}
                            />
                            {STATUS_LABELS[siswa.absensi.status] || siswa.absensi.status}
                          </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Belum Absen
                          </span>
                        )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {formatTime(siswa.absensi?.waktuMasuk ?? null)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {siswa.absensi?.selisihMenit ? (
                          <span className="text-sm text-yellow-600 font-medium">
                            +{siswa.absensi.selisihMenit} menit
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {siswa.absensi?.keterangan || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {siswa.absensi?.fotoWajah ? (
                          <button
                            onClick={() => setSelectedPhoto({
                              url: siswa.absensi!.fotoWajah!,
                              nama: siswa.nama,
                              waktu: siswa.absensi!.waktuMasuk
                                ? new Date(siswa.absensi!.waktuMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                                : "—",
                              tanggal: formatTanggalIndo(tanggal),
                            })}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Lihat foto"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {siswaList.map((siswa) => (
                <div
                  key={siswa.id}
                  className={`p-4 ${
                    !siswa.absensi ? "bg-red-50/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {siswa.nama}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          NIS: {siswa.nis}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                    {siswa.absensi ? (
                      <>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[siswa.absensi.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_LABELS[siswa.absensi.status] || siswa.absensi.status}
                      </span>
                      </>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Belum Absen
                      </span>
                    )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <span>Masuk: {formatTime(siswa.absensi?.waktuMasuk)}</span>
                    <span>Keterlambatan: {siswa.absensi?.selisihMenit ? `+${siswa.absensi.selisihMenit} mnt` : "—"}</span>
                    <span>Keterangan: {siswa.absensi?.keterangan || "—"}</span>
                    <span>Foto: {siswa.absensi?.fotoWajah ? "Ada" : "Tidak ada"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setSelectedPhoto(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-4 z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedPhoto.nama}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedPhoto.tanggal} — {selectedPhoto.waktu}
                </p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-100">
              <img
                src={selectedPhoto.url}
                alt={`Foto ${selectedPhoto.nama}`}
                className="w-full h-auto object-contain max-h-[70vh]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}