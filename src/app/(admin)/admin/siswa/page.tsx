"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useSweetAlert } from "@/components/sweet-alert";

// Lazy-load komponen kamera (face-api.js) agar halaman data siswa tetap ringan.
// face-camera hanya dimuat saat modal "Rekam Wajah" benar-benar dibuka.
const FaceCapture = dynamic(() => import("@/components/face-capture"), {
  ssr: false,
});

// Types
interface Kelas {
  id: string;
  namaKelas: string;
}

interface Siswa {
  id: string;
  nama: string;
  nis: string;
  email: string;
  isActive: boolean;
  kelasId: string | null;
  faceDescriptor?: number[] | null;
  kelas: { id: string; namaKelas: string } | null;
  rfidCards?: { id: string; uid: string; isActive: boolean }[];
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SiswaFormData {
  nama: string;
  nis: string;
  email: string;
  password: string;
  kelasId: string;
  rfidUid: string;
}

const emptyForm: SiswaFormData = {
  nama: "",
  nis: "",
  email: "",
  password: "",
  kelasId: "",
  rfidUid: "",
};

export default function SiswaPage() {
  const { showAlert } = useSweetAlert();
  // State
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SiswaFormData>(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Siswa | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Face capture state
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [createdSiswaId, setCreatedSiswaId] = useState<string | null>(null);
  const [createdSiswaNama, setCreatedSiswaNama] = useState("");
  const faceSavedRef = useRef(false);
  const currentRfidCardRef = useRef<{ id: string; uid: string } | null>(null);

  // Fetch siswa
  const fetchSiswa = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterKelas) params.set("kelasId", filterKelas);
      params.set("page", String(pagination.page));

      const res = await fetch(`/api/siswa?${params}`);
      const result = await res.json();

      if (!res.ok) throw new Error(result.message);

      setSiswaList(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [search, filterKelas, pagination.page]);

  // Fetch kelas list for dropdown
  const fetchKelas = useCallback(async () => {
    try {
      const res = await fetch("/api/kelas");
      const result = await res.json();
      if (res.ok) setKelasList(result.data || []);
    } catch (err) {
      console.warn("Gagal memuat daftar kelas:", err);
    }
  }, []);

  useEffect(() => {
    fetchSiswa();
  }, [fetchSiswa]);

  useEffect(() => {
    fetchKelas();
  }, [fetchKelas]);

  // Open modal for add
  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    currentRfidCardRef.current = null;
    setModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (siswa: Siswa) => {
    setModalMode("edit");
    setEditingId(siswa.id);
    const activeCard =
      siswa.rfidCards?.find((c) => c.isActive) ?? null;
    currentRfidCardRef.current = activeCard
      ? { id: activeCard.id, uid: activeCard.uid }
      : null;
    setForm({
      nama: siswa.nama,
      nis: siswa.nis,
      email: siswa.email,
      password: "",
      kelasId: siswa.kelasId || "",
      rfidUid: activeCard?.uid ?? "",
    });
    setFormError("");
    setModalOpen(true);
  };

  // Sinkronkan kartu RFID saat edit siswa
  // - UID sama → tidak melakukan apa-apa
  // - Ada kartu + UID berubah → perbarui UID kartu
  // - Ada kartu + UID dikosongkan → cabut kartu
  // - Tidak ada kartu + UID diisi → tautkan kartu baru
  const handleEditRfid = async (userId: string) => {
    const desired = form.rfidUid.trim().toUpperCase();
    const before = currentRfidCardRef.current;
    const beforeUid = (before?.uid || "").toUpperCase();

    if (desired === beforeUid) return;

    try {
      if (before) {
        if (desired) {
          // Ganti UID kartu yang sudah ada
          const res = await fetch(`/api/admin/rfid/${before.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: desired }),
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.message || "Gagal memperbarui kartu RFID");
        } else {
          // Cabut kartu karena UID dikosongkan
          const res = await fetch(`/api/admin/rfid/${before.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.message || "Gagal mencabut kartu RFID");
        }
      } else if (desired) {
        // Tautkan kartu baru karena siswa belum punya kartu
        const res = await fetch("/api/admin/rfid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: desired, userId }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Gagal menautkan kartu RFID");
      }
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Gagal memperbarui kartu RFID"
      );
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (modalMode === "add") {
        const res = await fetch("/api/siswa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        // Opsional: tautkan kartu RFID jika UID diisi
        const rfidUid = form.rfidUid.trim();
        if (rfidUid) {
          try {
            const rfidRes = await fetch("/api/admin/rfid", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uid: rfidUid, userId: result.data.id }),
            });
            const rfidResult = await rfidRes.json();
            if (rfidRes.ok) {
              showAlert({
                title: "Kartu RFID Tertaut",
                message: "Siswa berhasil ditambahkan dan kartu RFID berhasil ditautkan.",
                type: "success",
                autoClose: 2500,
              });
            } else {
              showAlert({
                title: "Perhatian",
                message: `Siswa berhasil ditambahkan, tetapi kartu RFID gagal ditautkan: ${rfidResult.message}.`,
                type: "warning",
                autoClose: 5000,
              });
            }
          } catch {
            showAlert({
              title: "Perhatian",
              message: "Siswa berhasil ditambahkan, tetapi kartu RFID gagal ditautkan.",
              type: "warning",
              autoClose: 5000,
            });
          }
        }

        // Tutup form modal dulu, buka modal rekam wajah
        setModalOpen(false);
        setCreatedSiswaId(result.data.id);
        setCreatedSiswaNama(result.data.nama);
        faceSavedRef.current = false;
        setShowFaceCapture(true);
      } else {
        const body: Record<string, unknown> = {
          nama: form.nama,
          nis: form.nis,
          email: form.email,
          kelasId: form.kelasId || null,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/siswa/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        // Sinkronkan kartu RFID (opsional)
        try {
          await handleEditRfid(editingId!);
        } catch (rfidErr) {
          showAlert({
            title: "Perhatian",
            message:
              rfidErr instanceof Error
                ? rfidErr.message
                : "Gagal memperbarui kartu RFID.",
            type: "warning",
            autoClose: 5000,
          });
        }

        setModalOpen(false);
        fetchSiswa();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/siswa/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setDeleteTarget(null);
      fetchSiswa();
    } catch (err) {
      showAlert({ title: "Gagal", message: err instanceof Error ? err.message : "Gagal menghapus", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  // Toggle active status
  const toggleActive = async (siswa: Siswa) => {
    try {
      const res = await fetch(`/api/siswa/${siswa.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !siswa.isActive }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status");
      fetchSiswa();
    } catch (err) {
      showAlert({ title: "Gagal", message: err instanceof Error ? err.message : "Gagal mengubah status", type: "error" });
    }
  };

  // Search handler with debounce
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-gray-500 mt-1">Kelola data siswa</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Siswa
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, NIS, atau email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-colors"
            />
          </div>
          <select
            value={filterKelas}
            onChange={(e) => {
              setFilterKelas(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          >
            <option value="">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namaKelas}
              </option>
            ))}
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
        ) : siswaList.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
            <p className="text-gray-500">
              {search || filterKelas
                ? "Tidak ada siswa yang cocok dengan pencarian"
                : "Belum ada data siswa"}
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Tambah siswa pertama
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      NIS
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Kelas
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Wajah
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {siswaList.map((siswa) => (
                    <tr
                      key={siswa.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {siswa.nama}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 font-mono">
                          {siswa.nis}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {siswa.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {siswa.kelas?.namaKelas || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(siswa)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            siswa.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              siswa.isActive ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          {siswa.isActive ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setCreatedSiswaId(siswa.id);
                            setCreatedSiswaNama(siswa.nama);
                            setShowFaceCapture(true);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            siswa.faceDescriptor
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
                          }`}
                        >
                          {siswa.faceDescriptor ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Rekam Ulang
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              </svg>
                              Rekam
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(siswa)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(siswa)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
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
              {siswaList.map((siswa) => (
                <div key={siswa.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {siswa.nama}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        NIS: {siswa.nis}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleActive(siswa)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        siswa.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {siswa.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{siswa.email}</p>
                  <p className="text-xs text-gray-500">
                    Kelas: {siswa.kelas?.namaKelas || "-"}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => openEditModal(siswa)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(siswa)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Menampilkan halaman {pagination.page} dari{" "}
                  {pagination.totalPages} ({pagination.total} siswa)
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page - 1 }))
                    }
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page + 1 }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Face Capture Modal (setelah tambah siswa) */}
      {showFaceCapture && createdSiswaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setShowFaceCapture(false); setModalOpen(false); fetchSiswa(); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Rekam Wajah</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {createdSiswaNama} — Langkah terakhir pendaftaran
                </p>
              </div>
              <button
                onClick={() => { setShowFaceCapture(false); setModalOpen(false); fetchSiswa(); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <FaceCapture
              siswaId={createdSiswaId}
              siswaNama={createdSiswaNama}
              onSaved={() => { faceSavedRef.current = true; }}
            />

            <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => { setShowFaceCapture(false); setModalOpen(false); fetchSiswa(); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                {faceSavedRef.current ? "Selesai" : "Lewati"}
              </button>
              {!faceSavedRef.current && (
                <button
                  disabled
                  className="flex-1 px-4 py-2.5 bg-gray-300 text-white rounded-lg text-sm font-medium"
                >
                  Rekam wajah terlebih dahulu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === "add" ? "Tambah Siswa Baru" : "Edit Siswa"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
                  placeholder="Nama lengkap siswa"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIS
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nis}
                    onChange={(e) => setForm({ ...form, nis: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
                    placeholder="Nomor Induk"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={form.kelasId}
                    onChange={(e) =>
                      setForm({ ...form, kelasId: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
                  >
                    <option value="">Pilih kelas</option>
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.namaKelas}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm text-gray-900"
                  placeholder="email@sekolah.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password{" "}
                  {modalMode === "edit" && (
                    <span className="text-gray-400 font-normal">
                      (kosongkan jika tidak diganti)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  required={modalMode === "add"}
                  minLength={modalMode === "add" ? 6 : undefined}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
                  placeholder={
                    modalMode === "add"
                      ? "Minimal 6 karakter"
                      : "Kosongkan jika tidak diganti"
                  }
                />
              </div>

              {modalMode === "add" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UID Kartu RFID{" "}
                    <span className="text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.rfidUid}
                    onChange={(e) =>
                      setForm({ ...form, rfidUid: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
                    placeholder="Scan kartu RFID atau ketik UID"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Bisa dikosongkan. Kartu dapat ditautkan nanti melalui menu
                    Kartu RFID.
                  </p>
                </div>
              )}

              {modalMode === "edit" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UID Kartu RFID{" "}
                    <span className="text-gray-400 font-normal">
                      (opsional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.rfidUid}
                    onChange={(e) =>
                      setForm({ ...form, rfidUid: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
                    placeholder="Ketik UID baru kosongkan untuk melepas kartu"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Kosongkan untuk melepas kartu yang ada pada siswa ini.
                  </p>
                </div>
              )}

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Menyimpan...
                    </>
                  ) : modalMode === "add" ? (
                    "Tambah Siswa"
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Hapus Siswa
              </h3>
              <p className="text-sm text-gray-500">
                Apakah kamu yakin ingin menghapus{" "}
                <span className="font-medium text-gray-700">
                  {deleteTarget.nama}
                </span>
                ? Semua data absensi siswa ini juga akan dihapus. Tindakan ini
                tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
