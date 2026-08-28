"use client";

import { useEffect, useState, useCallback } from "react";
import { useSweetAlert } from "@/components/sweet-alert";

interface Jadwal {
  id: string;
  namaJadwal: string;
  jamMulaiMasuk: string;
  jamSelesaiMasuk: string;
  jamMulaiPulang: string | null;
  jamSelesaiPulang: string | null;
  aktif: boolean;
  updatedAt: string;
}

interface JadwalForm {
  namaJadwal: string;
  jamMulaiMasuk: string;
  jamSelesaiMasuk: string;
  jamMulaiPulang: string;
  jamSelesaiPulang: string;
}

const emptyForm: JadwalForm = {
  namaJadwal: "Jadwal Utama",
  jamMulaiMasuk: "06:30",
  jamSelesaiMasuk: "07:30",
  jamMulaiPulang: "15:00",
  jamSelesaiPulang: "16:00",
};

export default function JadwalPage() {
  const { showAlert } = useSweetAlert();
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JadwalForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Jadwal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchJadwal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jadwal");
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setJadwalList(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJadwal();
  }, [fetchJadwal]);

  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (jadwal: Jadwal) => {
    setModalMode("edit");
    setEditingId(jadwal.id);
    setForm({
      namaJadwal: jadwal.namaJadwal,
      jamMulaiMasuk: jadwal.jamMulaiMasuk,
      jamSelesaiMasuk: jadwal.jamSelesaiMasuk,
      jamMulaiPulang: jadwal.jamMulaiPulang || "",
      jamSelesaiPulang: jadwal.jamSelesaiPulang || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (modalMode === "add") {
        const res = await fetch("/api/jadwal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
      } else {
        const body: Record<string, unknown> = {
          namaJadwal: form.namaJadwal,
          jamMulaiMasuk: form.jamMulaiMasuk,
          jamSelesaiMasuk: form.jamSelesaiMasuk,
        };
        if (form.jamMulaiPulang) body.jamMulaiPulang = form.jamMulaiPulang;
        else body.jamMulaiPulang = null;
        if (form.jamSelesaiPulang) body.jamSelesaiPulang = form.jamSelesaiPulang;
        else body.jamSelesaiPulang = null;

        const res = await fetch(`/api/jadwal/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
      }

      setModalOpen(false);
      fetchJadwal();
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
      const res = await fetch(`/api/jadwal/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setDeleteTarget(null);
      fetchJadwal();
    } catch (err) {
      showAlert({ title: "Gagal", message: err instanceof Error ? err.message : "Gagal menghapus", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (jadwal: Jadwal) => {
    try {
      const res = await fetch(`/api/jadwal/${jadwal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !jadwal.aktif }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status");
      fetchJadwal();
    } catch (err) {
      showAlert({ title: "Gagal", message: err instanceof Error ? err.message : "Gagal mengubah status", type: "error" });
    }
  };

  const activeJadwal = jadwalList.filter((j) => j.aktif);
  const nonActiveJadwal = jadwalList.filter((j) => !j.aktif);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jadwal Absensi</h1>
          <p className="text-gray-500 mt-1">
            Atur jam absen masuk & pulang
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Jadwal
        </button>
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold">
            {activeJadwal.length > 0
              ? `Jadwal Aktif: ${activeJadwal[0].namaJadwal}`
              : "Belum ada jadwal aktif"}
          </h2>
        </div>
        {activeJadwal.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <p className="text-xs text-blue-200">Masuk Mulai</p>
              <p className="text-lg font-bold">{activeJadwal[0].jamMulaiMasuk}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <p className="text-xs text-blue-200">Masuk Selesai</p>
              <p className="text-lg font-bold">{activeJadwal[0].jamSelesaiMasuk}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <p className="text-xs text-blue-200">Pulang Mulai</p>
              <p className="text-lg font-bold">{activeJadwal[0].jamMulaiPulang || "—"}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <p className="text-xs text-blue-200">Pulang Selesai</p>
              <p className="text-lg font-bold">{activeJadwal[0].jamSelesaiPulang || "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Schedule list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">Memuat data...</p>
          </div>
        ) : jadwalList.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">Belum ada jadwal absensi</p>
            <button onClick={openAddModal} className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
              + Tambah jadwal pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jadwalList.map((jadwal) => (
              <div key={jadwal.id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        jadwal.aktif ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {jadwal.namaJadwal}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {jadwal.aktif ? "Aktif" : "Nonaktif"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(jadwal)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        jadwal.aktif
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {jadwal.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => openEditModal(jadwal)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(jadwal)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Jam Masuk</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {jadwal.jamMulaiMasuk} — {jadwal.jamSelesaiMasuk}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Jam Pulang</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {jadwal.jamMulaiPulang && jadwal.jamSelesaiPulang
                        ? `${jadwal.jamMulaiPulang} — ${jadwal.jamSelesaiPulang}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === "add" ? "Tambah Jadwal Baru" : "Edit Jadwal"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Jadwal
                </label>
                <input
                  type="text"
                  required
                  value={form.namaJadwal}
                  onChange={(e) => setForm({ ...form, namaJadwal: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="Contoh: Jadwal Utama"
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Jam Masuk
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Mulai
                    </label>
                    <input
                      type="time"
                      required
                      value={form.jamMulaiMasuk}
                      onChange={(e) =>
                        setForm({ ...form, jamMulaiMasuk: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Selesai
                    </label>
                    <input
                      type="time"
                      required
                      value={form.jamSelesaiMasuk}
                      onChange={(e) =>
                        setForm({ ...form, jamSelesaiMasuk: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Jam Pulang
                  <span className="text-gray-400 font-normal ml-1">
                    (opsional)
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Mulai
                    </label>
                    <input
                      type="time"
                      value={form.jamMulaiPulang}
                      onChange={(e) =>
                        setForm({ ...form, jamMulaiPulang: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Selesai
                    </label>
                    <input
                      type="time"
                      value={form.jamSelesaiPulang}
                      onChange={(e) =>
                        setForm({ ...form, jamSelesaiPulang: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? "Menyimpan..." : modalMode === "add" ? "Tambah Jadwal" : "Simpan"}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hapus Jadwal</h3>
              <p className="text-sm text-gray-500">
                Hapus jadwal{" "}
                <span className="font-medium text-gray-700">
                  {deleteTarget.namaJadwal}
                </span>
                ?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium"
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
