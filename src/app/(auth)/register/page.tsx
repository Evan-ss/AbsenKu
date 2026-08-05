"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FaceCapture from "@/components/face-capture";

interface Kelas {
  id: string;
  namaKelas: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const faceSavedRef = useRef(false);

  // Face capture modal state (after successful registration)
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [createdSiswaId, setCreatedSiswaId] = useState<string | null>(null);
  const [createdSiswaNama, setCreatedSiswaNama] = useState("");

  // Load kelas
  useEffect(() => {
    async function loadKelas() {
      try {
        const res = await fetch("/api/kelas");
        const result = await res.json();
        if (res.ok) setKelasList(result.data || []);
      } catch {
        console.warn("Gagal memuat daftar kelas");
      }
    }
    loadKelas();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      nama: formData.get("nama") as string,
      nis: formData.get("nis") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      kelasId: formData.get("kelasId") as string,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "Gagal mendaftarkan siswa");
        return;
      }

      // Buka modal rekam wajah
      if (result.data?.id) {
        setCreatedSiswaId(result.data.id);
        setCreatedSiswaNama(result.data.nama);
        faceSavedRef.current = false;
        setShowFaceCapture(true);
      } else {
        router.push("/admin/siswa");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const closeFaceCapture = () => {
    setShowFaceCapture(false);
    router.push("/admin/siswa");
    router.refresh();
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">AbsensiKu</h1>
            <p className="text-blue-200 mt-2">Daftarkan Siswa Baru</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Register Siswa
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  name="nama"
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Nama lengkap siswa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIS
                </label>
                <input
                  name="nis"
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Nomor Induk Siswa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="email@sekolah.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Minimal 6 karakter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kelas
                </label>
                <select
                  name="kelasId"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="">Pilih kelas (opsional)</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.namaKelas}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {loading ? "Memproses..." : "Daftarkan Siswa"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Kembali ke Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Face Capture Modal */}
      {showFaceCapture && createdSiswaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={closeFaceCapture}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Rekam Wajah
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {createdSiswaNama} — Langkah terakhir pendaftaran
                </p>
              </div>
              <button
                onClick={closeFaceCapture}
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
                onClick={closeFaceCapture}
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
    </>
  );
}
