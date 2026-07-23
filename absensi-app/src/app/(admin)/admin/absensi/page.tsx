"use client";

import { useEffect, useState, useCallback } from "react";

// Types
interface Kelas {
  id: string;
  namaKelas: string;
}

interface Siswa {
  id: string;
  nama: string;
  nis: string;
  kelas?: { namaKelas: string } | null;
}

interface Absensi {
  id: string;
  userId: string;
  tanggal: string;
  waktuMasuk: string | null;
  waktuPulang: string | null;
  status: "HADIR" | "TELAT" | "IZIN" | "SAKIT" | "ALPA";
  keterangan: string | null;
  createdAt: string;
  user: Siswa;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

const STATUS_OPTIONS = ["HADIR", "TELAT", "IZIN", "SAKIT", "ALPA"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function AbsensiPage() {
  // Data state
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [tanggal, setTanggal] = useState(todayISO());
  const [filterKelas, setFilterKelas] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Absensi | null>(null);
  const [editForm, setEditForm] = useState({
    status: "HADIR" as string,
    keterangan: "",
    waktuMasuk: "",
    waktuPulang: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Absensi | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add manual modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [addForm, setAddForm] = useState({
    userId: "",
    tanggal: todayISO(),
    status: "HADIR" as string,
    keterangan: "",
  });
  const [addFormError, setAddFormError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchAbsensi = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (tanggal) params.set("tanggal", tanggal);
      if (filterKelas) params.set("kelasId", filterKelas);
      if (filterStatus) params.set("status", filterStatus);
      if (search) params.set("search", search);
      params.set("page", String(pagination.page));

      const res = await fetch(`/api/absensi?${params}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setAbsensiList(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [tanggal, filterKelas, filterStatus, search, pagination.page]);

  const fetchFilterData = useCallback(async () => {
    // Fetch kelas
    try {
      const res = await fetch("/api/kelas");
      const result = await res.json();
      if (res.ok) setKelasList(result.data || []);
    } catch (err) {
      console.warn("Gagal memuat kelas:", err);
    }
    // Fetch siswa for add modal
    try {
      const res = await fetch("/api/siswa?limit=1000");
      const result = await res.json();
      if (res.ok) setSiswaList(result.data || []);
    } catch (err) {
      console.warn("Gagal memuat siswa:", err);
    }
  }, []);

  useEffect(() => {
    fetchAbsensi();
  }, [fetchAbsensi]);

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // Open edit modal
  const openEditModal = (absensi: Absensi) => {
    setEditTarget(absensi);
    setEditForm({
      status: absensi.status,
      keterangan: absensi.keterangan || "",
      waktuMasuk: absensi.waktuMasuk
        ? new Date(absensi.waktuMasuk).toISOString().slice(0, 16)
        : "",
      waktuPulang: absensi.waktuPulang
        ? new Date(absensi.waktuPulang).toISOString().slice(0, 16)
        : "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setFormError("");
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        status: editForm.status,
      };
      if (editForm.keterangan) body.keterangan = editForm.keterangan;
      else body.keterangan = null;
      if (editForm.waktuMasuk) body.waktuMasuk = new Date(editForm.waktuMasuk).toISOString();
      else body.waktuMasuk = null;
      if (editForm.waktuPulang) body.waktuPulang = new Date(editForm.waktuPulang).toISOString();
      else body.waktuPulang = null;

      const res = await fetch(`/api/absensi/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setModalOpen(false);
      fetchAbsensi();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/absensi/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setDeleteTarget(null);
      fetchAbsensi();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError("");
    setAdding(true);

    try {
      const res = await fetch("/api/absensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setAddModalOpen(false);
      fetchAbsensi();
    } catch (err) {
      setAddFormError(err instanceof Error ? err.message : "Gagal mencatat absensi");
    } finally {
      setAdding(false);
    }
  };

  // Stats
  const totalHadir = absensiList.filter((a) => a.status === "HADIR").length;
  const totalTelat = absensiList.filter((a) => a.status === "TELAT").length;
  const totalAlpha = absensiList.filter((a) => a.status === "ALPA").length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Absensi</h1>
          <p className="text-gray-500 mt-1">
            Monitoring dan kelola data absensi
          </p>
        </div>
        <button
          onClick={() => {
            setAddForm({
              userId: "",
              tanggal: todayISO(),
              status: "HADIR",
              keterangan: "",
            });
            setAddFormError("");
            setAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Catat Manual
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-500">Hadir</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalHadir}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-500">Telat</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalTelat}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-500">Alpa</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalAlpha}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pagination.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => {
                setTanggal(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Kelas
            </label>
            <select
              value={filterKelas}
              onChange={(e) => {
                setFilterKelas(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">Semua Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Cari Siswa
            </label>
            <input
              type="text"
              placeholder="Nama atau NIS..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">Memuat data...</p>
          </div>
        ) : absensiList.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-gray-500">Belum ada data absensi</p>
            <p className="text-gray-400 text-sm mt-1">
              {tanggal
                ? `Tidak ada absensi untuk tanggal ${formatDate(tanggal)}`
                : "Pilih tanggal untuk melihat absensi"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Siswa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Masuk</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pulang</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {absensiList.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.user.nama}</p>
                          <p className="text-xs text-gray-500 font-mono">NIS: {a.user.nis}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {a.user.kelas?.namaKelas || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{formatDate(a.tanggal)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{formatTime(a.waktuMasuk)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{formatTime(a.waktuPulang)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                          {STATUS_LABELS[a.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(a)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {absensiList.map((a) => (
                <div key={a.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.user.nama}</p>
                      <p className="text-xs text-gray-500">NIS: {a.user.nis}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <span>Kelas: {a.user.kelas?.namaKelas || "—"}</span>
                    <span>Masuk: {formatTime(a.waktuMasuk)}</span>
                    <span>Tanggal: {formatDate(a.tanggal)}</span>
                    <span>Pulang: {formatTime(a.waktuPulang)}</span>
                  </div>
                  {a.keterangan && (
                    <p className="text-xs text-gray-400 italic">{a.keterangan}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEditModal(a)} className="text-xs text-blue-600 font-medium">Edit</button>
                    <button onClick={() => setDeleteTarget(a)} className="text-xs text-red-600 font-medium">Hapus</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} data)
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

      {/* Edit Modal */}
      {modalOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Koreksi Absensi</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editTarget.user.nama} — {formatDate(editTarget.tanggal)}
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Masuk</label>
                  <input
                    type="datetime-local"
                    value={editForm.waktuMasuk}
                    onChange={(e) => setEditForm({ ...editForm, waktuMasuk: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Pulang</label>
                  <input
                    type="datetime-local"
                    value={editForm.waktuPulang}
                    onChange={(e) => setEditForm({ ...editForm, waktuPulang: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="grid grid-cols-5 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status: s })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        editForm.status === s
                          ? "ring-2 ring-blue-500 " + STATUS_COLORS[s]
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea
                  value={editForm.keterangan}
                  onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                  placeholder="Opsional"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hapus Absensi</h3>
              <p className="text-sm text-gray-500">
                Hapus absensi <span className="font-medium">{deleteTarget.user.nama}</span> tanggal {formatDate(deleteTarget.tanggal)}?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium">
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAddModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Catat Absensi Manual</h2>
              <button onClick={() => setAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Siswa</label>
                <select
                  required
                  value={addForm.userId}
                  onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                >
                  <option value="">Pilih siswa</option>
                  {siswaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} (NIS: {s.nis}) {s.kelas?.namaKelas ? `— ${s.kelas.namaKelas}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={addForm.tanggal}
                  onChange={(e) => setAddForm({ ...addForm, tanggal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="grid grid-cols-5 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, status: s })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        addForm.status === s
                          ? "ring-2 ring-blue-500 " + STATUS_COLORS[s]
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea
                  value={addForm.keterangan}
                  onChange={(e) => setAddForm({ ...addForm, keterangan: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                  placeholder="Opsional"
                />
              </div>

              {addFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {addFormError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAddModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Batal
                </button>
                <button type="submit" disabled={adding} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                  {adding ? "Menyimpan..." : "Catat Absensi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
