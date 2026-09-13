"use client";

import { useEffect, useState, useCallback } from "react";

interface Siswa {
  id: string;
  nama: string;
  nis: string;
  status?: string;
  waktuMasuk?: string | null;
}

interface AttendanceSidebarProps {
  kelasId: string;
  selectedSiswaIds: string[];
  onSiswaClick: (siswa: Siswa) => void;
  onManualAbsen: (siswaId: string, status: "HADIR" | "TELAT" | "IZIN" | "SAKIT" | "ALPA") => void;
  filter: "all" | "scanned" | "pending";
  onFilterChange: (filter: "all" | "scanned" | "pending") => void;
  autoRefresh?: boolean;
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

export default function AttendanceSidebar({
  kelasId,
  selectedSiswaIds,
  onSiswaClick,
  onManualAbsen,
  filter,
  onFilterChange,
  autoRefresh = true,
}: AttendanceSidebarProps) {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSiswa = useCallback(async () => {
    try {
      const [siswaRes, absensiRes] = await Promise.all([
        fetch(`/api/guru/kelas/${kelasId}/siswa`),
        fetch(`/api/absensi/hari-ini?kelasId=${kelasId}`),
      ]);

      if (!siswaRes.ok) throw new Error("Gagal memuat daftar siswa");

      const siswaData = await siswaRes.json();
      const absensiData = absensiRes.ok ? await absensiRes.json() : { data: [] };

      interface AbsensiItem {
  userId: string;
  status: string;
  waktuMasuk: string | null;
}

      const absensiMap = new Map<string, AbsensiItem>(
        (absensiData.data || []).map((a: AbsensiItem) => [a.userId, a])
      );

      const merged = (siswaData.data || []).map((s: any) => {
        const absensi = absensiMap.get(s.id);
        return {
          id: s.id,
          nama: s.nama,
          nis: s.nis,
          status: absensi?.status || null,
          waktuMasuk: absensi?.waktuMasuk || null,
        };
      });

      setSiswaList(merged);
      setTotalCount(merged.length);
      setScannedCount(merged.filter((s: Siswa) => s.status).length);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [kelasId]);

  useEffect(() => {
    fetchSiswa();
  }, [fetchSiswa]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSiswa, 10000);
    return () => clearInterval(interval);
  }, [fetchSiswa, autoRefresh]);

  const filteredSiswa = siswaList.filter((s) => {
    if (filter === "scanned") return !!s.status;
    if (filter === "pending") return !s.status;
    return true;
  });

  const pendingSiswa = siswaList.filter((s) => !s.status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Status Absen</h3>
          <button
            onClick={fetchSiswa}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-900">
              {scannedCount} / {totalCount} siswa
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: totalCount > 0 ? `${(scannedCount / totalCount) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {pendingSiswa.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-amber-800 mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium">Belum di-scan: {pendingSiswa.length} siswa</span>
            </div>
          </div>
        )}

        <div className="flex gap-1 border-b border-gray-200 pb-2">
          {(["all", "pending", "scanned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "Semua" : f === "pending" ? "Belum" : "Sudah"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600 text-sm">
            {error}
            <button onClick={fetchSiswa} className="ml-2 text-blue-600 hover:underline">Coba lagi</button>
          </div>
        )}

        {!loading && filteredSiswa.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p>Tidak ada data siswa</p>
          </div>
        )}

        {!loading && filteredSiswa.length > 0 && (
          <div className="space-y-2">
            {filteredSiswa.map((siswa) => (
              <div
                key={siswa.id}
                onClick={() => onSiswaClick(siswa)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedSiswaIds.includes(siswa.id)
                    ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                    : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{siswa.nama}</p>
                    <p className="text-xs text-gray-500">NIS: {siswa.nis}</p>
                  </div>
                  {siswa.status ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[siswa.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[siswa.status]}`} />
                      {STATUS_LABELS[siswa.status]}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
                      Belum
                    </span>
                  )}
                </div>
                {siswa.waktuMasuk && (
                  <p className="text-xs text-gray-400 mt-1">Masuk: {new Date(siswa.waktuMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                )}

                {!siswa.status && (
                  <div className="mt-2 flex gap-1 pt-2 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onManualAbsen(siswa.id, "HADIR");
                      }}
                      className="flex-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                    >
                      Hadir
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onManualAbsen(siswa.id, "TELAT");
                      }}
                      className="flex-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors"
                    >
                      Telat
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onManualAbsen(siswa.id, "IZIN");
                      }}
                      className="flex-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    >
                      Izin
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onManualAbsen(siswa.id, "SAKIT");
                      }}
                      className="flex-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                    >
                      Sakit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {lastUpdated && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-center text-xs text-gray-400">
            Diperbarui: {lastUpdated.toLocaleTimeString("id-ID")}
          </div>
        )}
      </div>
    </div>
  );
}