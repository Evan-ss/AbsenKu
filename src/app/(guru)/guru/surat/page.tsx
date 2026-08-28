"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/format";

interface SuratItem {
  id: string;
  tanggal: string;
  jenis: string;
  fotoSurat: string;
  keterangan: string | null;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    nama: string;
    nis: string;
    kelas: { id: string; namaKelas: string } | null;
  };
  reviewer: { nama: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
};

const STATUS_COLORS: Record<string, string> = {
  MENUNGGU: "bg-amber-100 text-amber-700",
  DISETUJUI: "bg-green-100 text-green-700",
  DITOLAK: "bg-red-100 text-red-700",
};

const JENIS_LABELS: Record<string, string> = {
  SAKIT: "Sakit",
  IZIN: "Izin",
};

const JENIS_COLORS: Record<string, string> = {
  SAKIT: "text-purple-700",
  IZIN: "text-blue-700",
};



export default function GuruSuratPage() {
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      params.set("page", String(pagination.page));

      const res = await fetch(`/api/guru/surat?${params}`);
      const result = await res.json();

      if (res.ok) {
        setSuratList(result.data || []);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, pagination.page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Count pending for badge
  const pendingCount = suratList.filter((s) => s.status === "MENUNGGU").length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Surat</h1>
          <p className="text-gray-500 mt-1">
            Pengajuan surat izin/sakit dari siswa di kelas Anda
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {pendingCount} perlu direview
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: "", label: "Semua", count: pagination.total },
          { value: "MENUNGGU", label: "Menunggu" },
          { value: "DISETUJUI", label: "Disetujui" },
          { value: "DITOLAK", label: "Ditolak" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setFilterStatus(tab.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === tab.value
                ? "bg-amber-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">Memuat data...</p>
          </div>
        ) : suratList.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">
              {filterStatus
                ? "Tidak ada surat dengan status ini"
                : "Belum ada pengajuan surat"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Foto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Siswa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jenis</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reviewer</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suratList.map((surat) => (
                    <tr key={surat.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          <img
                            src={surat.fotoSurat}
                            alt="Bukti surat"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect fill='%23f3f4f6' width='40' height='40'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'%3E?%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{surat.user.nama}</p>
                        <p className="text-xs text-gray-500 font-mono">{surat.user.nis}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{surat.user.kelas?.namaKelas || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${JENIS_COLORS[surat.jenis] || "text-gray-700"}`}>
                          {JENIS_LABELS[surat.jenis] || surat.jenis}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{formatDate(surat.tanggal)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[surat.status]}`}>
                          {STATUS_LABELS[surat.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {surat.reviewer?.nama || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {surat.status === "MENUNGGU" ? (
                          <Link
                            href={`/guru/review/${surat.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Review
                          </Link>
                        ) : (
                          <Link
                            href={`/guru/review/${surat.id}`}
                            className="text-xs text-gray-500 hover:text-amber-600 font-medium"
                          >
                            Lihat Detail
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {suratList.map((surat) => (
                <Link
                  key={surat.id}
                  href={`/guru/review/${surat.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                      <img
                        src={surat.fotoSurat}
                        alt="Bukti surat"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect fill='%23f3f4f6' width='40' height='40'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'%3E?%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-900">{surat.user.nama}</p>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[surat.status]}`}>
                          {STATUS_LABELS[surat.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {surat.user.kelas?.namaKelas} • {JENIS_LABELS[surat.jenis]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatDate(surat.tanggal)}</span>
                    {surat.status === "MENUNGGU" && (
                      <span className="text-xs text-amber-600 font-medium">Review →</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Halaman {pagination.page} dari {pagination.totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
