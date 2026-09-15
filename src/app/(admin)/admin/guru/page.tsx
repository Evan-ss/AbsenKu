"use client";

import { useEffect, useState, useCallback } from "react";
import { useSweetAlert } from "@/components/sweet-alert";

interface Guru {
  id: string;
  nama: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  _count?: { guruKelas: number };
}

interface WaliKelasInfo {
  guruId: string;
  guruNama: string;
  guruEmail: string;
}

interface Kelas {
  id: string;
  namaKelas: string;
  waliKelas: string | null;
  waliKelasInfo: WaliKelasInfo | null;
  _count?: { siswa: number };
}

interface Assignment {
  guru: Guru;
  kelas: Kelas;
  createdAt: string;
}

interface GuruFormData {
  nama: string;
  email: string;
  password: string;
}

interface AssignFormData {
  guruId: string;
  kelasId: string;
  mode: "assign" | "replace";
  currentWaliKelas?: WaliKelasInfo;
}

const emptyGuruForm: GuruFormData = { nama: "", email: "", password: "" };

export default function AdminGuruPage() {
  const { showAlert } = useSweetAlert();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignFormData>({
    guruId: "",
    kelasId: "",
    mode: "assign",
  });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Replace confirmation modal
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingAssign, setPendingAssign] = useState<AssignFormData | null>(null);

  // Tambah Guru modal
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [guruForm, setGuruForm] = useState<GuruFormData>(emptyGuruForm);
  const [guruError, setGuruError] = useState("");
  const [creatingGuru, setCreatingGuru] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, guruRes, kelasRes] = await Promise.all([
        fetch("/api/admin/guru-kelas"),
        fetch("/api/admin/guru"),
        fetch("/api/kelas"),
      ]);
      const assignData = await assignRes.json();
      const guruData = await guruRes.json();
      const kelasData = await kelasRes.json();
      if (assignRes.ok) setAssignments(assignData.data || []);
      if (guruRes.ok) setGuruList(guruData.data || []);
      // Gunakan kelas dari API guru-kelas yang sudah include waliKelasInfo
      if (kelasRes.ok && assignRes.ok && assignData.kelas) {
        setKelasList(assignData.kelas);
      } else if (kelasRes.ok) {
        setKelasList(kelasData.data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuruError("");
    setCreatingGuru(true);
    try {
      const res = await fetch("/api/admin/guru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guruForm),
      });
      const result = await res.json();
      if (!res.ok) {
        setGuruError(result.message || "Gagal membuat akun guru");
        return;
      }
      setShowGuruModal(false);
      setGuruForm(emptyGuruForm);
      showAlert({ title: "Berhasil!", message: "Akun guru berhasil dibuat", type: "success", autoClose: 2000 });
      fetchData();
    } catch {
      setGuruError("Terjadi kesalahan");
    } finally {
      setCreatingGuru(false);
    }
  };

  const handleDeleteGuru = (guru: Guru) => {
    showAlert({
      title: "Hapus Akun Guru?",
      message: `Semua data penugasan "${guru.nama}" juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
      type: "confirm",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/guru/${guru.id}`, { method: "DELETE" });
          const result = await res.json();
          if (!res.ok) {
            showAlert({ title: "Gagal", message: result.message, type: "error" });
            return;
          }
          showAlert({ title: "Terhapus!", message: `"${guru.nama}" berhasil dihapus`, type: "success", autoClose: 2000 });
          fetchData();
        } catch {
          showAlert({ title: "Error", message: "Terjadi kesalahan server", type: "error" });
        }
      },
    });
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError("");
    setAssigning(true);

    const payload = {
      guruId: assignForm.guruId,
      kelasId: assignForm.kelasId,
      mode: assignForm.mode,
    };

    try {
      const res = await fetch("/api/admin/guru-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        // Jika error karena sudah ada wali kelas dan mode assign, tampilkan konfirmasi replace
        if (res.status === 409 && result.hasExistingWaliKelas && assignForm.mode === "assign") {
          setPendingAssign({
            ...assignForm,
            mode: "replace",
            currentWaliKelas: result.currentWaliKelas,
          });
          setShowReplaceConfirm(true);
          setAssigning(false);
          return;
        }
        setAssignError(result.message || "Gagal assign guru");
        return;
      }

      setShowAssignModal(false);
      setAssignForm({ guruId: "", kelasId: "", mode: "assign" });
      showAlert({ title: "Berhasil!", message: result.message, type: "success", autoClose: 2000 });
      fetchData();
    } catch {
      setAssignError("Terjadi kesalahan");
    } finally {
      setAssigning(false);
    }
  };

  const handleReplaceConfirm = async () => {
    if (!pendingAssign) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/guru-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guruId: pendingAssign.guruId,
          kelasId: pendingAssign.kelasId,
          mode: "replace",
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setAssignError(result.message || "Gagal mengganti wali kelas");
        return;
      }
      setShowReplaceConfirm(false);
      setShowAssignModal(false);
      setPendingAssign(null);
      setAssignForm({ guruId: "", kelasId: "", mode: "assign" });
      showAlert({ title: "Berhasil!", message: result.message, type: "success", autoClose: 2000 });
      fetchData();
    } catch {
      setAssignError("Terjadi kesalahan");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = (guruId: string, kelasId: string, namaGuru: string, namaKelas: string) => {
    showAlert({
      title: "Hapus Penugasan?",
      message: `Hapus penugasan "${namaGuru}" dari "${namaKelas}"?`,
      type: "confirm",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/guru-kelas?guruId=${guruId}&kelasId=${kelasId}`, { method: "DELETE" });
          showAlert({ title: "Terhapus!", message: "Penugasan berhasil dihapus", type: "success", autoClose: 2000 });
          fetchData();
        } catch {
          showAlert({ title: "Error", message: "Terjadi kesalahan", type: "error" });
        }
      },
    });
  };

  const openAssignModal = () => {
    setAssignForm({ guruId: "", kelasId: "", mode: "assign" });
    setAssignError("");
    setShowAssignModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Guru</h1>
          <p className="text-gray-500 mt-1">Buat akun guru & atur penugasan wali kelas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowGuruModal(true); setGuruForm(emptyGuruForm); setGuruError(""); }}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Tambah Guru
          </button>
          <button
            onClick={openAssignModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Assign ke Kelas
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{guruList.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Guru</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{kelasList.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Kelas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Penugasan</p>
        </div>
      </div>

      {/* Daftar Guru */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Daftar Guru</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : guruList.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Belum ada akun guru</p>
            <button onClick={() => { setShowGuruModal(true); setGuruForm(emptyGuruForm); }} className="mt-4 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
              + Buat akun guru pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Guru</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guruList.map((guru) => (
                  <tr key={guru.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-semibold text-amber-600">{guru.nama.charAt(0)}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{guru.nama}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-600">{guru.email}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {guru._count?.guruKelas || 0} kelas
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${guru.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${guru.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        {guru.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteGuru(guru)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Guru">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignments */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Penugasan Guru ke Kelas</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Belum ada penugasan</p>
            <button onClick={openAssignModal} className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">+ Assign guru pertama</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Guru</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Siswa</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{a.guru.nama}</p></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {a.kelas.namaKelas}
                        {a.kelas.waliKelasInfo && a.kelas.waliKelasInfo.guruId === a.guru.id && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">Wali</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="text-sm text-gray-600">{a.kelas._count?.siswa || 0} siswa</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleUnassign(a.guru.id, a.kelas.id, a.guru.nama, a.kelas.namaKelas)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Guru */}
      {showGuruModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowGuruModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Tambah Akun Guru</h2>
              <button onClick={() => setShowGuruModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateGuru} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input type="text" required value={guruForm.nama} onChange={(e) => setGuruForm({ ...guruForm, nama: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900" placeholder="Nama lengkap guru" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={guruForm.email} onChange={(e) => setGuruForm({ ...guruForm, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900" placeholder="guru@sekolah.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" required minLength={6} value={guruForm.password} onChange={(e) => setGuruForm({ ...guruForm, password: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900" placeholder="Minimal 6 karakter" />
              </div>
              {guruError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{guruError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowGuruModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">Batal</button>
                <button type="submit" disabled={creatingGuru} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors">{creatingGuru ? "Membuat..." : "Buat Akun Guru"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assign */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Assign Guru ke Kelas</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Guru</label>
                <select value={assignForm.guruId} onChange={(e) => setAssignForm({ ...assignForm, guruId: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="">Pilih guru...</option>
                  {guruList.map((g) => (<option key={g.id} value={g.id}>{g.nama} ({g.email})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kelas</label>
                <select value={assignForm.kelasId} onChange={(e) => setAssignForm({ ...assignForm, kelasId: e.target.value })} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="">Pilih kelas...</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.namaKelas} ({k._count?.siswa || 0} siswa)
                      {k.waliKelasInfo && ` — Wali: ${k.waliKelasInfo.guruNama}`}
                    </option>
                  ))}
                </select>
                {assignForm.kelasId && kelasList.find(k => k.id === assignForm.kelasId)?.waliKelasInfo && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Kelas ini sudah memiliki wali kelas: {kelasList.find(k => k.id === assignForm.kelasId)?.waliKelasInfo?.guruNama}
                  </p>
                )}
              </div>
              {assignError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{assignError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">Batal</button>
                <button type="submit" disabled={assigning || !assignForm.guruId || !assignForm.kelasId} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors">
                  {assigning ? "Memproses..." : assignForm.mode === "replace" ? "Ganti Wali Kelas" : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Ganti Wali Kelas */}
      {showReplaceConfirm && pendingAssign && pendingAssign.currentWaliKelas && pendingAssign.currentWaliKelas.guruNama && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowReplaceConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Ganti Wali Kelas?</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800 mb-2">Kelas <strong>{kelasList.find(k => k.id === pendingAssign.kelasId)?.namaKelas}</strong> sudah memiliki wali kelas:</p>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-100">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-semibold text-amber-600">{pendingAssign.currentWaliKelas.guruNama.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-medium text-amber-800">{pendingAssign.currentWaliKelas.guruNama}</p>
                  <p className="text-xs text-amber-600">{pendingAssign.currentWaliKelas.guruEmail || "-"}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Guru baru: <strong>{guruList.find(g => g.id === pendingAssign.guruId)?.nama}</strong> akan menggantikan wali kelas di atas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReplaceConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReplaceConfirm}
                disabled={assigning}
                className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {assigning ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Ya, Ganti Wali Kelas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}