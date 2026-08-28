"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSweetAlert } from "@/components/sweet-alert";
import { formatDateLong, formatDateTime } from "@/lib/format";

interface SuratDetail {
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
  reviewer: {
    id: string;
    nama: string;
  } | null;
}

export default function GuruReviewSuratPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { showAlert } = useSweetAlert();
  const { id } = use(params);
  const router = useRouter();
  const [surat, setSurat] = useState<SuratDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    absensiStatus: string;
  } | null>(null);

  const fetchSurat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guru/surat/${id}`);
      const data = await res.json();

      if (!res.ok) {
        showAlert({ title: "Gagal", message: data.message || "Gagal memuat data surat", type: "error" });
        router.push("/guru/dashboard");
        return;
      }

      setSurat(data.data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchSurat();
  }, [fetchSurat]);

  const handleDecision = async (keputusan: "DISETUJUI" | "DITOLAK") => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/guru/surat/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keputusan }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert({ title: "Gagal", message: data.message || "Gagal memproses surat", type: "error" });
        return;
      }

      setResult({
        status: keputusan,
        absensiStatus: data.data.absensiStatus,
      });

      // Refresh data
      fetchSurat();
    } catch (err) {
      console.error("Error:", err);
      showAlert({ title: "Error", message: "Terjadi kesalahan", type: "error" });
    } finally {
      setProcessing(false);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!surat) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Surat tidak ditemukan</p>
        <Link
          href="/guru/dashboard"
          className="text-amber-600 hover:text-amber-700 text-sm mt-2 inline-block"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/guru/dashboard" className="hover:text-amber-600">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Review Surat</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Review Surat</h1>
      </div>

      {/* Result Banner */}
      {result && (
        <div
          className={`rounded-xl p-4 mb-6 flex items-center gap-3 ${
            result.status === "DISETUJUI"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              result.status === "DISETUJUI" ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {result.status === "DISETUJUI" ? (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <p
              className={`text-sm font-medium ${
                result.status === "DISETUJUI" ? "text-green-900" : "text-red-900"
              }`}
            >
              Surat berhasil{" "}
              {result.status === "DISETUJUI" ? "disetujui" : "ditolak"}
            </p>
            <p
              className={`text-xs ${
                result.status === "DISETUJUI" ? "text-green-700" : "text-red-700"
              }`}
            >
              Status absensi siswa: {result.absensiStatus}
            </p>
          </div>
        </div>
      )}

      {/* Surat Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {surat.user.nama}
            </h2>
            <p className="text-sm text-gray-500">
              {surat.user.kelas?.namaKelas || "-"} • NIS: {surat.user.nis}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              surat.status === "MENUNGGU"
                ? "bg-amber-100 text-amber-700"
                : surat.status === "DISETUJUI"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {surat.status === "MENUNGGU"
              ? "Menunggu"
              : surat.status === "DISETUJUI"
              ? "Disetujui"
              : "Ditolak"}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24">Jenis Surat</span>
            <span
              className={`text-sm font-medium ${
                surat.jenis === "SAKIT" ? "text-purple-700" : "text-blue-700"
              }`}
            >
              Surat {surat.jenis === "SAKIT" ? "Sakit" : "Izin"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24">Tanggal</span>
            <span className="text-sm text-gray-900">
              {formatDateLong(surat.tanggal)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24">Diajukan</span>
            <span className="text-sm text-gray-900">
              {formatDateTime(surat.createdAt)}
            </span>
          </div>
          {surat.keterangan && (
            <div className="flex items-start gap-3">
              <span className="text-sm text-gray-500 w-24">Keterangan</span>
              <span className="text-sm text-gray-900">
                {surat.keterangan}
              </span>
            </div>
          )}
          {surat.reviewer && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-24">Direview</span>
              <span className="text-sm text-gray-900">
                {surat.reviewer.nama} •{" "}
                {surat.reviewedAt ? formatDateTime(surat.reviewedAt) : "—"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Foto Surat */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Foto Bukti Surat
          </h3>
        </div>
        <div className="p-4">
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            {surat.fotoSurat.startsWith("data:") ? (
              <img
                src={surat.fotoSurat}
                alt="Bukti surat"
                className="w-full h-auto max-h-96 object-contain"
              />
            ) : (
              <img
                src={surat.fotoSurat}
                alt="Bukti surat"
                className="w-full h-auto max-h-96 object-contain"
              />
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {surat.status === "MENUNGGU" && !result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Keputusan
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleDecision("DITOLAK")}
              disabled={processing}
              className="flex-1 px-4 py-3 border-2 border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {processing ? "Memproses..." : "Tolak"}
            </button>
            <button
              onClick={() => handleDecision("DISETUJUI")}
              disabled={processing}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {processing ? "Memproses..." : "Setujui"}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            Menyetujui = status siswa menjadi{" "}
            {surat.jenis === "SAKIT" ? "SAKIT" : "IZIN"} • Menolak = status
            siswa menjadi ALPA
          </p>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <Link
          href="/guru/dashboard"
          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
