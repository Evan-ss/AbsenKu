"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateLong } from "@/lib/format";
import DateInput from "@/components/date-input";

interface SuratItem {
  id: string;
  tanggal: string;
  jenis: string;
  fotoSurat: string;
  keterangan: string | null;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
  reviewer: { nama: string } | null;
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



export default function SiswaSuratPage() {
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form state
  const [tanggal, setTanggal] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [jenis, setJenis] = useState<"SAKIT" | "IZIN">("SAKIT");
  const [keterangan, setKeterangan] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>("");

  const fetchSurat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/siswa/surat");
      const result = await res.json();
      if (res.ok) setSuratList(result.data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurat();
  }, [fetchSurat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setFormError("File harus berupa gambar");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ukuran file maksimal 5MB");
      return;
    }

    setFotoFile(file);
    setFormError("");

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!fotoFile || !fotoPreview) {
      setFormError("Foto bukti harus diunggah");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/siswa/surat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal,
          jenis,
          fotoSurat: fotoPreview,
          keterangan: keterangan || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setFormError(result.message || "Gagal mengajukan surat");
        return;
      }

      // Reset form
      setShowForm(false);
      setFotoFile(null);
      setFotoPreview("");
      setKeterangan("");
      setFormError("");
      fetchSurat();
    } catch {
      setFormError("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Surat Izin/Sakit</h1>
          <p className="text-gray-500 mt-1">
            Ajukan surat izin atau sakit dengan foto bukti
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajukan Surat
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Form Pengajuan Surat
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal
                </label>
                <DateInput
                  value={tanggal}
                  onChange={setTanggal}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Surat
                </label>
                <select
                  value={jenis}
                  onChange={(e) => setJenis(e.target.value as "SAKIT" | "IZIN")}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="SAKIT">Surat Sakit</option>
                  <option value="IZIN">Surat Izin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto Bukti Surat
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-400 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {fotoPreview ? (
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      className="max-h-32 object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">
                        Klik untuk upload foto
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        JPG, PNG, max 5MB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keterangan (Opsional)
              </label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                placeholder="Tulis keterangan tambahan..."
              />
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                  setFotoFile(null);
                  setFotoPreview("");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !fotoFile}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Surat"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Riwayat Surat */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Riwayat Pengajuan
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : suratList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">Belum ada pengajuan surat</p>
          <p className="text-sm text-gray-400 mt-1">
            Klik tombol &quot;Ajukan Surat&quot; untuk mengirim surat izin/sakit
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Tanggal
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Jenis
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Keterangan
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Reviewer
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suratList.map((surat) => (
                  <tr key={surat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">
                        {formatDateLong(surat.tanggal)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium ${
                          surat.jenis === "SAKIT"
                            ? "text-purple-700"
                            : "text-blue-700"
                        }`}
                      >
                        {surat.jenis === "SAKIT" ? "Sakit" : "Izin"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {surat.keterangan || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[surat.status]
                        }`}
                      >
                        {STATUS_LABELS[surat.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {surat.reviewer?.nama || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {suratList.map((surat) => (
              <div key={surat.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateLong(surat.tanggal)}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        surat.jenis === "SAKIT"
                          ? "text-purple-700"
                          : "text-blue-700"
                      }`}
                    >
                      Surat {surat.jenis === "SAKIT" ? "Sakit" : "Izin"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLORS[surat.status]
                    }`}
                  >
                    {STATUS_LABELS[surat.status]}
                  </span>
                </div>
                {surat.keterangan && (
                  <p className="text-xs text-gray-400 italic">
                    {surat.keterangan}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
