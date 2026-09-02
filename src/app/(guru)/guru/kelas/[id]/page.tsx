"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useSweetAlert } from "@/components/sweet-alert";
import { formatTime } from "@/lib/format";
import DateInput from "@/components/date-input";
import FaceCapture from "@/components/face-capture";

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
  const { showAlert } = useSweetAlert();
  const { id } = use(params);
  const [kelas, setKelas] = useState<KelasInfo | null>(null);
  const [siswaList, setSiswaList] = useState<SiswaAbsensi[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tanggal, setTanggal] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<Set<string>>(new Set());
  const [showMarkAllConfirm, setShowMarkAllConfirm] = useState(false);
  const [showManualAbsen, setShowManualAbsen] = useState(false);
  const [manualSiswaId, setManualSiswaId] = useState("");
  const [manualStatus, setManualStatus] = useState<"HADIR" | "IZIN" | "SAKIT">("HADIR");
  const [manualKeterangan, setManualKeterangan] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [exportBulan, setExportBulan] = useState(String(new Date().getMonth() + 1));
  const [exportTahun, setExportTahun] = useState(String(new Date().getFullYear()));
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceSiswa, setFaceSiswa] = useState<{ id: string; nama: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"absensi" | "foto">("absensi");
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; nama: string; waktu: string; tanggal: string } | null>(null);

  // Format tanggal ke Bahasa Indonesia
  const formatTanggalIndo = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Cek apakah tanggal yang dipilih adalah hari ini
  const isToday = (() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return tanggal === today;
  })();

  // Navigasi tanggal
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
    setLoading(true);
    try {
      const res = await fetch(
        `/api/guru/kelas/${id}?tanggal=${tanggal}`
      );
      const data = await res.json();

      if (!res.ok) {
        showAlert({ title: "Gagal", message: data.message || "Gagal memuat data", type: "error" });
        return;
      }

      setKelas(data.kelas);
      setSiswaList(data.siswa);
      setSummary(data.summary);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id, tanggal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelect = (siswaId: string) => {
    setSelectedSiswa((prev) => {
      const next = new Set(prev);
      if (next.has(siswaId)) {
        next.delete(siswaId);
      } else {
        next.add(siswaId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const belumAbsen = siswaList
      .filter((s) => !s.absensi)
      .map((s) => s.id);
    if (selectedSiswa.size === belumAbsen.length) {
      setSelectedSiswa(new Set());
    } else {
      setSelectedSiswa(new Set(belumAbsen));
    }
  };

  const handleMarkAlpa = async (markAll: boolean) => {
    setMarking(true);
    try {
      const body: Record<string, unknown> = { tanggal };
      if (markAll) {
        body.markAll = true;
      } else {
        body.userIds = Array.from(selectedSiswa);
      }

      const res = await fetch(`/api/guru/kelas/${id}/mark-alpa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) {
        showAlert({ title: "Gagal", message: result.message || "Gagal menandai ALPA", type: "error" });
        return;
      }

      showAlert({ title: "Berhasil!", message: result.message, type: "success", autoClose: 2000 });
      setSelectedSiswa(new Set());
      setShowMarkAllConfirm(false);
      fetchData();
    } catch (err) {
      console.error("Error:", err);
      showAlert({ title: "Error", message: "Terjadi kesalahan", type: "error" });
    } finally {
      setMarking(false);
    }
  };

  // Hapus absensi manual
  const handleDeleteManual = (absensiId: string, namaSiswa: string) => {
    showAlert({
      title: "Hapus Absensi Manual?",
      message: `Hapus catatan absensi manual "${namaSiswa}"?`,
      type: "confirm",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/guru/absensi?id=${absensiId}`, { method: "DELETE" });
          const result = await res.json();
          if (!res.ok) {
            showAlert({ title: "Gagal", message: result.message, type: "error" });
            return;
          }
          showAlert({ title: "Terhapus!", message: "Absensi manual berhasil dihapus", type: "success", autoClose: 2000 });
          fetchData();
        } catch {
          showAlert({ title: "Error", message: "Terjadi kesalahan", type: "error" });
        }
      },
    });
  };



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
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <DateInput
            value={tanggal}
            onChange={setTanggal}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none w-32"
          />
          <div className="h-6 w-px bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowManualAbsen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Absen Manual
            </button>
            <button
              onClick={() => window.open(`/api/guru/kelas/${id}/export?bulan=${exportBulan}&tahun=${exportTahun}`, "_blank")}
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

          {/* Action Bar */}
          {activeTab === "absensi" && summary && summary.belumAbsen > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-amber-900">
                  {summary.belumAbsen} siswa belum absen hari ini
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Pilih siswa lalu tandai sebagai ALPA, atau tandai semua sekaligus
                </p>
              </div>
              <div className="flex gap-2">
                {selectedSiswa.size > 0 && (
                  <button
                    onClick={() => handleMarkAlpa(false)}
                    disabled={marking}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {marking
                      ? "Memproses..."
                      : `Tandai ${selectedSiswa.size} Siswa ALPA`}
                  </button>
                )}
                <button
                  onClick={() => setShowMarkAllConfirm(true)}
                  disabled={marking}
                  className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Tandai Semua ALPA
                </button>
              </div>
            </div>
          )}

          {/* Face Photo Gallery */}
          {activeTab === "foto" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {/* Header dengan navigasi tanggal */}
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
              {/* Stats Ringkasan */}
              {(() => {
                const totalFoto = siswaList.filter(s => s.absensi?.fotoWajah).length;
                const totalSiswa = siswaList.length;
                const sudahAbsen = siswaList.filter(s => s.absensi).length;
                const persenFoto = totalSiswa > 0 ? Math.round((totalFoto / totalSiswa) * 100) : 0;
                const fotoHadir = siswaList.filter(s => s.absensi?.fotoWajah && s.absensi?.status === "HADIR").length;
                const fotoTelat = siswaList.filter(s => s.absensi?.fotoWajah && s.absensi?.status === "TELAT").length;
                return totalFoto > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{totalFoto}</p>
                      <p className="text-[11px] text-gray-500">Foto Tersimpan</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">{totalSiswa - sudahAbsen}</p>
                      <p className="text-[11px] text-gray-500">Belum Absen</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{fotoHadir}</p>
                      <p className="text-[11px] text-gray-500">Foto Hadir</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{fotoTelat}</p>
                      <p className="text-[11px] text-gray-500">Foto Telat</p>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Progress bar */}
              {siswaList.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Foto wajah terekam</span>
                    <span className="font-semibold text-gray-700">
                      {siswaList.filter(s => s.absensi?.fotoWajah).length}/{siswaList.length} siswa
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        siswaList.filter(s => s.absensi?.fotoWajah).length === siswaList.length
                          ? "bg-emerald-500"
                          : siswaList.filter(s => s.absensi?.fotoWajah).length > siswaList.length / 2
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${siswaList.length > 0 ? (siswaList.filter(s => s.absensi?.fotoWajah).length / siswaList.length) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {Math.round((siswaList.filter(s => s.absensi?.fotoWajah).length / siswaList.length) * 100)}% dari {siswaList.length} siswa memiliki foto
                  </p>
                </div>
              )}

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
                        {/* Hover overlay */}
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
                    {summary && summary.belumAbsen > 0 && (
                      <th className="px-4 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedSiswa.size ===
                            siswaList.filter((s) => !s.absensi).length
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                      </th>
                    )}
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
                      {summary && summary.belumAbsen > 0 && (
                        <td className="px-4 py-3 text-center">
                          {!siswa.absensi && (
                            <input
                              type="checkbox"
                              checked={selectedSiswa.has(siswa.id)}
                              onChange={() => toggleSelect(siswa.id)}
                              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {siswa.nama}
                          </p>
                          {!siswa.punyaWajah ? (
                            <button
                              onClick={() => {
                                setFaceSiswa({ id: siswa.id, nama: siswa.nama });
                                setShowFaceModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              Rekam
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setFaceSiswa({ id: siswa.id, nama: siswa.nama });
                                setShowFaceModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              Rekam Ulang
                            </button>
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
                          {siswa.absensi.keterangan?.startsWith("[MANUAL]") && (
                            <button
                              onClick={() => handleDeleteManual(siswa.absensi!.id, siswa.nama)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Hapus absensi manual"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {/* Mobile select all */}
              {summary && summary.belumAbsen > 0 && (
                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedSiswa.size ===
                        siswaList.filter((s) => !s.absensi).length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-600">
                      Pilih semua ({siswaList.filter((s) => !s.absensi).length} belum absen)
                    </span>
                  </div>
                  {selectedSiswa.size > 0 && (
                    <button
                      onClick={() => handleMarkAlpa(false)}
                      disabled={marking}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
                    >
                      Tandai ALPA ({selectedSiswa.size})
                    </button>
                  )}
                </div>
              )}
              {siswaList.map((siswa) => (
                <div
                  key={siswa.id}
                  className={`p-4 ${
                    !siswa.absensi ? "bg-red-50/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {/* Mobile checkbox */}
                      {summary && summary.belumAbsen > 0 && !siswa.absensi && (
                        <input
                          type="checkbox"
                          checked={selectedSiswa.has(siswa.id)}
                          onChange={() => toggleSelect(siswa.id)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mt-0.5"
                        />
                      )}
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
                      {siswa.absensi.keterangan?.startsWith("[MANUAL]") && (
                        <button
                          onClick={() => handleDeleteManual(siswa.absensi!.id, siswa.nama)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Hapus manual"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                      </>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Belum Absen
                      </span>
                    )}
                    </div>
                  </div>
                  {siswa.absensi?.waktuMasuk && (
                    <p className="text-xs text-gray-500">
                      Masuk: {formatTime(siswa.absensi.waktuMasuk)}
                      {siswa.absensi.selisihMenit
                        ? ` (+${siswa.absensi.selisihMenit} mnt)`
                        : ""}
                    </p>
                  )}
                  {!siswa.punyaWajah && (
                    <button
                      onClick={() => {
                        setFaceSiswa({ id: siswa.id, nama: siswa.nama });
                        setShowFaceModal(true);
                      }}
                      className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Rekam Wajah
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}
        </>
      )}

      {/* Mark All ALPA Confirmation Modal */}
      {showMarkAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowMarkAllConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tandai Semua ALPA?
              </h3>
              <p className="text-sm text-gray-500">
                Semua siswa yang belum absen hari ini akan ditandai sebagai
                ALPA. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMarkAllConfirm(false)}
                disabled={marking}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleMarkAlpa(true)}
                disabled={marking}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {marking ? "Memproses..." : "Ya, Tandai ALPA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Absen Modal */}
      {showManualAbsen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowManualAbsen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Absen Manual</h2>
              <button onClick={() => setShowManualAbsen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!manualSiswaId || !manualKeterangan.trim()) return;
              setManualSubmitting(true);
              try {
                const res = await fetch("/api/absen/manual", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: manualSiswaId,
                    tanggal,
                    status: manualStatus,
                    keterangan: manualKeterangan.trim(),
                  }),
                });
                const result = await res.json();
                if (!res.ok) {
                  showAlert({ title: "Gagal", message: result.message, type: "error" });
                  return;
                }
                showAlert({ title: "Berhasil!", message: result.message, type: "success", autoClose: 2000 });
                setShowManualAbsen(false);
                setManualSiswaId("");
                setManualKeterangan("");
                fetchData();
              } catch {
                showAlert({ title: "Error", message: "Terjadi kesalahan", type: "error" });
              } finally {
                setManualSubmitting(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Siswa</label>
                <select
                  value={manualSiswaId}
                  onChange={(e) => setManualSiswaId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  <option value="">Pilih siswa...</option>
                  {siswaList.filter((s) => !s.absensi).map((s) => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as "HADIR" | "IZIN" | "SAKIT")}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  <option value="HADIR">Hadir</option>
                  <option value="IZIN">Izin</option>
                  <option value="SAKIT">Sakit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={manualKeterangan}
                  onChange={(e) => setManualKeterangan(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Alasan absen manual..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowManualAbsen(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">Batal</button>
                <button type="submit" disabled={manualSubmitting || !manualSiswaId || !manualKeterangan.trim()} className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors">
                  {manualSubmitting ? "Memproses..." : "Catat Absen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Face Recording Modal */}
      {showFaceModal && faceSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setShowFaceModal(false); setFaceSiswa(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Rekam Wajah</h2>
                <p className="text-sm text-gray-500">{faceSiswa.nama}</p>
              </div>
              <button
                onClick={() => { setShowFaceModal(false); setFaceSiswa(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <FaceCapture
              siswaId={faceSiswa.id}
              siswaNama={faceSiswa.nama}
              existingDescriptor={false}
              onSaved={() => {
                setShowFaceModal(false);
                setFaceSiswa(null);
                fetchData();
              }}
            />
          </div>
        </div>
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
