"use client";

import { useEffect, useState, useCallback } from "react";
import { useSweetAlert } from "@/components/sweet-alert";

interface StudentData {
  id: string;
  nama: string;
  nis: string;
  email: string;
  kelas: string | null;
  punyaWajah: boolean;
  totalAbsensi: number;
  absensiDenganFoto: number;
  totalSurat: number;
}

interface DeleteProgress {
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

export default function DataManagerPage() {
  const { showAlert } = useSweetAlert();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewStudent, setViewStudent] = useState<StudentData | null>(null);

  // Summary stats
  const totalStudents = students.length;
  const studentsWithFace = students.filter(s => s.punyaWajah).length;
  const totalFacePhotos = students.reduce((sum, s) => sum + s.absensiDenganFoto, 0);
  const totalSurat = students.reduce((sum, s) => sum + s.totalSurat, 0);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data-manager");
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const toggleSelect = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredStudents();
    if (selectedStudents.size === filtered.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filtered.map(s => s.id)));
    }
  };

  const getFilteredStudents = () => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      s.nama.toLowerCase().includes(q) ||
      s.nis?.toLowerCase().includes(q) ||
      s.kelas?.toLowerCase().includes(q)
    );
  };

  // Execute bulk delete with progress
  const executeBulkDelete = async (ids: string[], deleteFiles: boolean) => {
    setIsDeleting(true);
    setDeleteProgress({ total: ids.length, completed: 0, current: "", errors: [] });

    const errors: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      const student = students.find(s => s.id === ids[i]);
      setDeleteProgress(prev => prev ? {
        ...prev,
        completed: i,
        current: student?.nama || "",
      } : null);

      try {
        const res = await fetch(`/api/siswa/${ids[i]}/face`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleteFiles }),
        });
        if (!res.ok) {
          const data = await res.json();
          errors.push(`${student?.nama}: ${data.message}`);
        }
      } catch {
        errors.push(`${student?.nama}: Koneksi gagal`);
      }
    }

    setDeleteProgress(prev => prev ? { ...prev, completed: ids.length, current: "" } : null);

    if (errors.length > 0) {
      showAlert({
        title: "Selesai dengan error",
        message: `${ids.length - errors.length} berhasil, ${errors.length} gagal: ${errors.slice(0, 3).join("; ")}`,
        type: "error",
      });
    } else {
      showAlert({
        title: "Berhasil!",
        message: `Data wajah ${ids.length} siswa berhasil dihapus`,
        type: "success",
        autoClose: 2000,
      });
    }

    setSelectedStudents(new Set());
    setDeleteProgress(null);
    setIsDeleting(false);
    fetchStudents();
  };

  // Delete face data for selected students
  const handleDeleteFaceData = (deleteFiles: boolean = false) => {
    const ids = Array.from(selectedStudents);
    if (ids.length === 0) return;

    showAlert({
      title: "Hapus Data Wajah?",
      message: `Hapus data wajah${deleteFiles ? " dan file foto" : ""} dari ${ids.length} siswa yang dipilih?`,
      type: "confirm",
      confirmText: "Ya, Hapus",
      onConfirm: () => executeBulkDelete(ids, deleteFiles),
    });
  };

  // Delete student account
  const handleDeleteStudent = (studentId: string, nama: string) => {
    showAlert({
      title: "Hapus Siswa?",
      message: `Hapus akun "${nama}" beserta semua data absensi dan foto? Tindakan ini tidak dapat dibatalkan.`,
      type: "confirm",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/siswa/${studentId}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) {
            showAlert({ title: "Gagal", message: data.message, type: "error" });
            return;
          }
          showAlert({ title: "Terhapus!", message: `${nama} berhasil dihapus`, type: "success", autoClose: 2000 });
          fetchStudents();
        } catch {
          showAlert({ title: "Error", message: "Terjadi kesalahan", type: "error" });
        }
      },
    });
  };

  // Clear all face data (bulk)
  const handleClearAllFace = () => {
    const withFace = students.filter(s => s.punyaWajah);
    if (withFace.length === 0) return;

    showAlert({
      title: "Hapus Semua Data Wajah?",
      message: `Hapus face descriptor dari ${withFace.length} siswa? File foto tidak dihapus.`,
      type: "confirm",
      confirmText: "Ya, Hapus Semua",
      onConfirm: () => executeBulkDelete(withFace.map(s => s.id), false),
    });
  };

  // Delete single student's face via mobile
  const handleDeleteSingleFace = (student: StudentData) => {
    showAlert({
      title: "Hapus Data Wajah?",
      message: `Hapus data wajah ${student.nama}?`,
      type: "confirm",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/siswa/${student.id}/face`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleteFiles: true }),
          });
          if (res.ok) {
            showAlert({ title: "Berhasil!", message: "Data wajah dihapus", type: "success", autoClose: 2000 });
            fetchStudents();
          } else {
            const data = await res.json();
            showAlert({ title: "Gagal", message: data.message, type: "error" });
          }
        } catch {
          showAlert({ title: "Error", message: "Terjadi kesalahan", type: "error" });
        }
      },
    });
  };

  const filtered = getFilteredStudents();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Manager</h1>
        <p className="text-gray-500 mt-1">
          Kelola data siswa, foto wajah, dan file terkait
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
          <p className="text-xs text-gray-500">Total Siswa</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{studentsWithFace}</p>
          <p className="text-xs text-gray-500">Punya Data Wajah</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalFacePhotos}</p>
          <p className="text-xs text-gray-500">Foto Absensi</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{totalSurat}</p>
          <p className="text-xs text-gray-500">File Surat</p>
        </div>
      </div>

      {/* Progress Bar */}
      {deleteProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              {deleteProgress.current ? `Menghapus: ${deleteProgress.current}` : "Memproses..."}
            </span>
            <span className="text-sm text-blue-700">
              {deleteProgress.completed}/{deleteProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(deleteProgress.completed / deleteProgress.total) * 100}%` }}
            />
          </div>
          {deleteProgress.errors.length > 0 && (
            <p className="text-xs text-red-600 mt-2">
              {deleteProgress.errors.length} error terjadi
            </p>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedStudents.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari nama, NIS, atau kelas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 bg-gray-100 rounded-full text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none w-64 transition-colors"
              />
            </div>
            {selectedStudents.size > 0 && (
              <span className="text-sm text-gray-500">
                {selectedStudents.size} dipilih
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedStudents.size > 0 && (
              <>
                <button
                  onClick={() => handleDeleteFaceData(false)}
                  disabled={isDeleting}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Hapus Data Wajah ({selectedStudents.size})
                </button>
                <button
                  onClick={() => handleDeleteFaceData(true)}
                  disabled={isDeleting}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Hapus Wajah + File ({selectedStudents.size})
                </button>
              </>
            )}
            {studentsWithFace > 0 && (
              <button
                onClick={handleClearAllFace}
                disabled={isDeleting}
                className="px-3 py-2 border border-red-300 text-red-700 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg text-sm font-medium transition-colors"
              >
                Hapus Semua Data Wajah
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Student Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Tidak ada siswa ditemukan</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nama</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelas</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data Wajah</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Foto Absensi</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Surat</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => toggleSelect(student.id)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.nama}</p>
                        <p className="text-xs text-gray-500 font-mono">{student.nis}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{student.kelas || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {student.punyaWajah ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Terekam
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Kosong
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${student.absensiDenganFoto > 0 ? "text-blue-600" : "text-gray-400"}`}>
                        {student.absensiDenganFoto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${student.totalSurat > 0 ? "text-purple-600" : "text-gray-400"}`}>
                        {student.totalSurat}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Tombol Lihat Detail */}
                        <button
                          onClick={() => setViewStudent(student)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Lihat detail data"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Tombol Hapus Wajah */}
                        {student.punyaWajah && (
                          <button
                            onClick={() => {
                              setSelectedStudents(new Set([student.id]));
                              handleDeleteFaceData(false);
                            }}
                            disabled={isDeleting}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Hapus data wajah"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        {/* Tombol Hapus Siswa */}
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.nama)}
                          disabled={isDeleting}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus siswa"
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((student) => (
              <div key={student.id} className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={() => toggleSelect(student.id)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.nama}</p>
                        <p className="text-xs text-gray-500">{student.kelas || "Tanpa kelas"}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Tombol Lihat Detail */}
                        <button
                          onClick={() => setViewStudent(student)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Lihat detail data"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Tombol Hapus Wajah */}
                        {student.punyaWajah && (
                          <button
                            onClick={() => handleDeleteSingleFace(student)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                            title="Hapus data wajah"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        {/* Tombol Hapus Siswa */}
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.nama)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Hapus siswa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {student.punyaWajah ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Wajah
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Tanpa wajah
                        </span>
                      )}
                      <span>{student.absensiDenganFoto} foto</span>
                      <span>{student.totalSurat} surat</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setViewStudent(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Detail Data Siswa</h2>
              <button
                onClick={() => setViewStudent(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Info Siswa */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {viewStudent.nama.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{viewStudent.nama}</p>
                    <p className="text-sm text-gray-500">{viewStudent.kelas || "Tanpa kelas"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">NIS:</span>
                    <span className="ml-1 font-mono text-gray-900">{viewStudent.nis || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-1 text-gray-900 truncate">{viewStudent.email}</span>
                  </div>
                </div>
              </div>

              {/* Status Data */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Status Data</h3>

                {/* Face Descriptor */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm text-gray-700">Data Wajah (Descriptor)</span>
                  </div>
                  {viewStudent.punyaWajah ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Terekam
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Belum ada
                    </span>
                  )}
                </div>

                {/* Foto Absensi */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">Foto Absensi</span>
                  </div>
                  <span className={`text-sm font-medium ${viewStudent.absensiDenganFoto > 0 ? "text-blue-600" : "text-gray-400"}`}>
                    {viewStudent.absensiDenganFoto} foto
                  </span>
                </div>

                {/* Total Absensi */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm text-gray-700">Total Absensi</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {viewStudent.totalAbsensi} hari
                  </span>
                </div>

                {/* Surat */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">Surat Izin/Sakit</span>
                  </div>
                  <span className={`text-sm font-medium ${viewStudent.totalSurat > 0 ? "text-purple-600" : "text-gray-400"}`}>
                    {viewStudent.totalSurat} surat
                  </span>
                </div>
              </div>

              {/* Aksi */}
              <div className="flex gap-2 pt-2">
                {viewStudent.punyaWajah && (
                  <button
                    onClick={() => {
                      setViewStudent(null);
                      setSelectedStudents(new Set([viewStudent.id]));
                      handleDeleteFaceData(false);
                    }}
                    className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Hapus Data Wajah
                  </button>
                )}
                <button
                  onClick={() => {
                    setViewStudent(null);
                    handleDeleteStudent(viewStudent.id, viewStudent.nama);
                  }}
                  className="flex-1 px-4 py-2.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Hapus Siswa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
