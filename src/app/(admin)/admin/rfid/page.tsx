"use client";

import { useEffect, useState, useCallback } from "react";
import { useSweetAlert } from "@/components/sweet-alert";

interface RfidCard {
  id: string;
  uid: string;
  isActive: boolean;
  issuedAt: string;
  revokedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    nama: string;
    nis: string;
    email: string;
    kelas: { namaKelas: string } | null;
  } | null;
  _count: { absensi: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RfidFormData {
  uid: string;
  userId: string;
}

const emptyForm: RfidFormData = {
  uid: "",
  userId: "",
};

export default function AdminRfidPage() {
  const { showAlert } = useSweetAlert();

  const [rfidList, setRfidList] = useState<RfidCard[]>([]);
  const [siswaList, setSiswaList] = useState<{ id: string; nama: string; nis: string }[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RfidFormData>(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RfidCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRfid = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      params.set("page", String(pagination.page));

      const res = await fetch(`/api/admin/rfid?${params}`);
      const result = await res.json();

      if (!res.ok) throw new Error(result.message);

      setRfidList(result.data);
      setPagination(result.pagination);
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, pagination.page]);

  const fetchSiswa = useCallback(async () => {
    try {
      const res = await fetch("/api/siswa?limit=1000");
      const result = await res.json();
      if (res.ok) {
        setSiswaList(
          (result.data || []).map((s: { id: string; nama: string; nis: string }) => ({
            id: s.id,
            nama: s.nama,
            nis: s.nis,
          }))
        );
      }
    } catch (err) {
      console.warn("Gagal memuat daftar siswa:", err);
    }
  }, []);

  useEffect(() => {
    fetchRfid();
  }, [fetchRfid]);

  useEffect(() => {
    fetchSiswa();
  }, [fetchSiswa]);

  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (rfid: RfidCard) => {
    setModalMode("edit");
    setEditingId(rfid.id);
    setForm({
      uid: rfid.uid,
      userId: rfid.user?.id || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setFormError("");
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const url = modalMode === "add" ? "/api/admin/rfid" : `/api/admin/rfid/${editingId}`;
      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan");
      }

      showAlert({
        title: "Berhasil!",
        message: modalMode === "add" ? "Kartu RFID berhasil ditambahkan" : "Kartu RFID berhasil diperbarui",
        type: "success",
        autoClose: 2000,
      });

      closeModal();
      fetchRfid();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (rfid: RfidCard) => {
    setDeleteTarget(rfid);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/rfid/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal mencabut kartu");
      }

      showAlert({
        title: "Berhasil!",
        message: "Kartu RFID berhasil dicabut",
        type: "success",
        autoClose: 2000,
      });

      setDeleteTarget(null);
      fetchRfid();
    } catch (err) {
      showAlert({
        title: "Gagal",
        message: err instanceof Error ? err.message : "Terjadi kesalahan",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
  };

  const STATUS_LABELS: Record<string, string> = {
    active: "Aktif",
    inactive: "Nonaktif",
  };

  const filteredRfid = rfidList.filter((rfid) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      rfid.uid.toLowerCase().includes(q) ||
      rfid.user?.nama.toLowerCase().includes(q) ||
      rfid.user?.nis.toLowerCase().includes(q) ||
      rfid.user?.kelas?.namaKelas.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Kartu RFID</h1>
          <p className="text-gray-500 mt-1">
            Kelola kartu RFID siswa untuk absensi tap-to-scan
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kartu
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Kartu</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pagination.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Kartu Aktif</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {rfidList.filter((r) => r.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Kartu Nonaktif</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">
            {rfidList.filter((r) => !r.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Tanpa Pemilik</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {rfidList.filter((r) => !r.user).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Cari UID, nama, NIS, atau kelas..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">Memuat data...</p>
          </div>
        ) : filteredRfid.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">
              {search || filterStatus ? "Tidak ada data yang cocok" : "Belum ada kartu RFID"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">UID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pemilik</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Absensi</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dibuat</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRfid.map((rfid) => (
                    <tr key={rfid.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <code className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {rfid.uid}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {rfid.user ? (
                          <>
                            <p className="text-sm font-medium text-gray-900">{rfid.user.nama}</p>
                            <p className="text-xs text-gray-500 font-mono">{rfid.user.nis}</p>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">— Belum ditetapkan —</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{rfid.user?.kelas?.namaKelas || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rfid.isActive ? "active" : "inactive"]}`}>
                          {STATUS_LABELS[rfid.isActive ? "active" : "inactive"]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600">{rfid._count.absensi}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">
                          {new Date(rfid.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(rfid)}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => confirmDelete(rfid)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                          >
                            {rfid.isActive ? "Cabut" : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Halaman {pagination.page} dari {pagination.totalPages} · Total {pagination.total} data
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === "add" ? "Tambah Kartu RFID" : "Edit Kartu RFID"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UID Kartu</label>
                <input
                  type="text"
                  value={form.uid}
                  onChange={(e) => setForm({ ...form, uid: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                  placeholder="Tempelkan kartu atau ketik UID..."
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">UID akan otomatis diubah ke huruf besar</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Siswa Pemilik</label>
                <select
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required={modalMode === "add"}
                >
                  <option value="">Pilih siswa...</option>
                  {siswaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} (NIS: {s.nis})
                    </option>
                  ))}
                </select>
                {modalMode === "edit" && !form.userId && (
                  <p className="text-xs text-amber-600 mt-1">Kosongkan untuk melepas kartu dari siswa</p>
                )}
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    modalMode === "add" ? "Tambah" : "Simpan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cabut Kartu RFID?</h3>
            <p className="text-gray-500 mb-4">
              Kartu <code className="font-mono bg-gray-100 px-1 rounded">{deleteTarget.uid}</code>
              {deleteTarget.user
                ? ` milik <strong>{deleteTarget.user.nama}</strong>`
                : " (tanpa pemilik)"}
              akan dicabut dan dinonaktifkan.
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Data absensi yang sudah tercatat tidak akan terhapus.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  "Ya, Cabut"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}