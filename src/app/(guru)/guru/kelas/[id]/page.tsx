"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useSweetAlert } from "@/components/sweet-alert";
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

          {/* Action Bar */}
          {summary && summary.belumAbsen > 0 && (
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

          {/* Table */}
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
                          {!siswa.punyaWajah && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                              No face
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
              {siswaList.map((siswa) => (
                <div
                  key={siswa.id}
                  className={`p-4 ${
                    !siswa.absensi ? "bg-red-50/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {siswa.nama}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        NIS: {siswa.nis}
                      </p>
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
                </div>
              ))}
            </div>
          </div>
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
    </div>
  );
}
