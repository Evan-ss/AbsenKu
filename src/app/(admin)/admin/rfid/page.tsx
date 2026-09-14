"use client";

import { useEffect, useState, useCallback } from "react";
import { useSweetAlert } from "@/components/sweet-alert";
import DateInput from "@/components/date-input";

interface RfidCard {
  id: string;
  uid: string;
  isActive: boolean;
  issuedAt: string;
  revokedAt: string | null;
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

export default function AdminRfidPage() {
  const { showAlert } = useSweetAlert();
  const [rfidList, setRfidList] = useState<RfidCard[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingRfid, setEditingRfid] = useState<RfidCard | null>(null);
  const [form, setForm] = useState({ uid: "", userId: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // User search for modal
  const [userSearch, setUserSearch] = useState("");
  const [userList, setUserList] = useState<{ id: string; nama: string; nis: string; email: string; kelas: { namaKelas: string } | null }[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);

  const fetchRfid = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));

      const res = await fetch(`/api/admin/rfid?${params}`);
      const result = await res.json();

      if (!res.ok) throw new Error(result.message);

      setRfidList(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchRfid();
  }, [fetchRfid]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/siswa?limit=1000&search=${userSearch}`);
      const result = await res.json();
      if (res.ok) {
        setUserList(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, [userSearch]);

  useEffect(() => {
    if (showUserSearch) {
      fetchUsers();
    }
  }, [fetchUsers, showUserSearch]);

  const openAddModal = () => {
    setModalMode("add");
    setEditingRfid(null);
    setForm({ uid: "", userId: "" });
    setFormError("");
    setShowUserSearch(false);
    setUserSearch("");
    setModalOpen(true);
  };

  const openEditModal = (rfid: RfidCard) => {
    setModalMode("edit");
    setEditingRfid(rfid);
    setForm({ uid: rfid.uid, userId: rfid.user?.id || "" });
    setFormError("");
    setShowUserSearch(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const url = modalMode === "add" ? "/api/admin/rfid" : `/api/admin/rfid/${editingRfid?.id}`;
      const method = modalMode === "add" ? "POST" : "PUT";

      const body: any = {};
      if (form.uid) body.uid = form.uid;
      if (form.userId) body.userId = form.userId;
      if (modalMode === "edit" && editingRfid) body.isActive = true; // Keep active unless explicitly changed

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        setFormError(result.message || "Gagal menyimpan");
        return;
      }

      showAlert({ title: "Berhasil!", message: result.message, type: "success", autoClose: 2000 });
      setModalOpen(false);
      fetchRfid();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (rfid: RfidCard) => {
    showAlert({
      title: "Cabut Kartu RFID?",
      message: `Cabut kartu RFID ${rfid.uid} dari ${rfid.user?.nama || "siswa"}? Kartu akan dinonaktifkan.`,
      type: "confirm",
      confirmText: "Ya, Cabut",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/rfid/${rfid.id}`, { method: "DELETE" });
          const result = await res.json();
          if (!res.ok) throw new Error(result.message);
          showAlert({ title: "Berhasil!", message: result.message, type: "success", autoClose: 2000 });
          fetchRfid();
        } catch (err) {
          showAlert({ title: "Gagal", message: err instanceof Error ? err.message : "Gagal mencabut", type: "error" });
        }
      },
    });
  };

  const handleUserSelect = (user: { id: string; nama: string; nis: string }) => {
    setForm({ ...form, userId: user.id });
    setShowUserSearch(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Kartu RFID</h1>
          <p className="text-gray-500 mt-1">Kelola kartu RFID untuk absensi siswa</p>
        </div>
        <button onClick={openAddModal} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tambah Kartu RFID
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari UID, nama, atau NIS..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "inactive");
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Error state */}
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
        ) : rfidList.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">Belum ada kartu RFID</p>
            <p className="text-sm text-gray-400 mt-1">Klik "Tambah Kartu RFID" untuk menambah kartu baru</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">UID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Siswa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Absensi</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Terbit</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rfidList.map((rfid) => (
                    <tr key={rfid.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-900">{rfid.uid}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{rfid.user?.nama || "—"}</p>
                          <p className="text-xs text-gray-500 font-mono">{rfid.user?.nis || "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{rfid.user?.kelas?.namaKelas || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rfid.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {rfid.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600">{rfid._count.absensi} kali</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{new Date(rfid.issuedAt).toLocaleDateString("id-ID")}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(rfid)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {rfid.isActive && (
                            <button
                              onClick={() => handleRevoke(rfid)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cabut"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {rfidList.map((rfid) => (
                <div key={rfid.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{rfid.uid}</p>
                      <p className="text-xs text-gray-500">{rfid.user?.nama || "—"} ({rfid.user?.nis || "—"})</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${rfid.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {rfid.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Kelas: {rfid.user?.kelas?.namaKelas || "—"}</p>
                  <p className="text-xs text-gray-500">Absensi: {rfid._count.absensi} kali</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEditModal(rfid)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                    {rfid.isActive && (
                      <button onClick={() => handleRevoke(rfid)} className="text-xs text-red-600 hover:text-red-700 font-medium">Cabut</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} kartu)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === "add" ? "Tambah Kartu RFID" : "Edit Kartu RFID"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UID Kartu RFID</label>
                <input
                  type="text"
                  required={modalMode === "add"}
                  disabled={modalMode === "edit"}
                  value={form.uid}
                  onChange={(e) => setForm({ ...form, uid: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
                  placeholder="Contoh: A1B2C3D4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Siswa</label>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={userList.find(u => u.id === form.userId)?.nama || (form.userId ? "Loading..." : "Pilih siswa...")}
                      onClick={() => { setShowUserSearch(true); setUserSearch(""); }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserSearch(!showUserSearch)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                  <input type="hidden" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
                </div>
              </div>

              {showUserSearch && (
                <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                  <input
                    type="text"
                    placeholder="Cari nama, NIS, atau email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-2"
                  />
                  {userList.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Tidak ada siswa ditemukan</p>
                  ) : (
                    <div className="space-y-1">
                      {userList.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <p className="font-medium text-gray-900">{user.nama}</p>
                          <p className="text-xs text-gray-500">NIS: {user.nis} | {user.kelas?.namaKelas || "Tidak punya kelas"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">Batal</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      Menyimpan...
                    </>
                  ) : modalMode === "add" ? (
                    "Tambah Kartu"
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}