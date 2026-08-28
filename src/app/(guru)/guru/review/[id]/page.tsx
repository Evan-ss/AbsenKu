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
  const [imageLoaded, setImageLoaded] = useState(false);

  const fetchSurat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guru/surat/${id}`);
      const data = await res.json();

      if (!res.ok) {
        showAlert({
          title: "Gagal",
          message: data.message || "Gagal memuat data surat",
          type: "error",
        });
        router.push("/guru/surat");
        return;
      }

      setSurat(data.data);
    } catch {
      showAlert({
        title: "Error",
        message: "Gagal memuat data surat",
        type: "error",
      });
      router.push("/guru/surat");
    } finally {
      setLoading(false);
    }
  }, [id, router, showAlert]);

  useEffect(() => {
    fetchSurat();
  }, [fetchSurat]);

  const handleDecision = async (keputusan: "DISETUJUI" | "DITOLAK") => {
    const confirmMsg =
      keputusan === "DISETUJUI"
        ? `Setujui surat ${surat?.jenis === "SAKIT" ? "sakit" : "izin"} dari ${surat?.user.nama}? Status absensi akan diubah.`
        : `Tolak surat dari ${surat?.user.nama}? Status siswa akan menjadi ALPA.`;

    showAlert({
      title: keputusan === "DISETUJUI" ? "Setujui Surat?" : "Tolak Surat?",
      message: confirmMsg,
      type: "confirm",
      confirmText:
        keputusan === "DISETUJUI" ? "Ya, Setujui" : "Ya, Tolak",
      onConfirm: async () => {
        setProcessing(true);
        try {
          const res = await fetch(`/api/guru/surat/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keputusan }),
          });

          const data = await res.json();
          if (!res.ok) {
            showAlert({
              title: "Gagal",
              message: data.message || "Gagal memproses surat",
              type: "error",
            });
            return;
          }

          setResult({
            status: keputusan,
            absensiStatus: data.data.absensiStatus,
          });

          showAlert({
            title:
              keputusan === "DISETUJUI"
                ? "Surat Disetujui! ✅"
                : "Surat Ditolak",
            message: `Status ${surat?.user.nama}: ${data.data.absensiStatus}`,
            type: keputusan === "DISETUJUI" ? "success" : "warning",
          });

          fetchSurat();
        } catch {
          showAlert({
            title: "Error",
            message: "Terjadi kesalahan",
            type: "error",
          });
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">Memuat surat...</p>
        </div>
      </div>
    );
  }

  if (!surat) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">Surat tidak ditemukan</p>
        <Link
          href="/guru/surat"
          className="text-amber-600 hover:text-amber-700 text-sm mt-3 inline-block font-medium"
        >
          ← Kembali ke Daftar Surat
        </Link>
      </div>
    );
  }

  const isPending = surat.status === "MENUNGGU" && !result;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/guru/surat" className="hover:text-amber-600">
          Daftar Surat
        </Link>
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-gray-900 font-medium">Review Surat</span>
      </div>

      {/* Result Banner */}
      {result && (
        <div
          className={`rounded-xl p-4 mb-4 flex items-center gap-3 ${
            result.status === "DISETUJUI"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              result.status === "DISETUJUI" ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {result.status === "DISETUJUI" ? (
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-red-600"
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
              Status absensi: {result.absensiStatus}
            </p>
          </div>
        </div>
      )}

      {/* ====== FOTO SURAT (Paling Atas) ====== */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            📷 Foto Bukti Surat
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              surat.status === "MENUNGGU"
                ? "bg-amber-100 text-amber-700"
                : surat.status === "DISETUJUI"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {surat.status === "MENUNGGU"
              ? "⏳ Menunggu"
              : surat.status === "DISETUJUI"
              ? "✅ Disetujui"
              : "❌ Ditolak"}
          </span>
        </div>
        <div className="p-2">
          <div className="bg-gray-50 rounded-lg overflow-hidden relative min-h-[200px]">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
              </div>
            )}
            <img
              src={surat.fotoSurat}
              alt={`Surat ${surat.jenis === "SAKIT" ? "Sakit" : "Izin"} - ${surat.user.nama}`}
              className={`w-full h-auto max-h-[500px] object-contain ${
                imageLoaded ? "opacity-100" : "opacity-0"
              } transition-opacity duration-300`}
              loading="eager"
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23f3f4f6' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'%3EFoto tidak tersedia%3C/text%3E%3C/svg%3E";
                setImageLoaded(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* ====== TOMBOL AKSI (Di Bawah Foto) ====== */}
      {isPending && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex gap-3">
            <button
              onClick={() => handleDecision("DITOLAK")}
              disabled={processing}
              className="flex-1 px-4 py-3.5 border-2 border-red-200 text-red-700 hover:bg-red-50 active:bg-red-100 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
              ) : (
                <svg
                  className="w-5 h-5"
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
              )}
              {processing ? "Memproses..." : "Tolak"}
            </button>
            <button
              onClick={() => handleDecision("DISETUJUI")}
              disabled={processing}
              className="flex-1 px-4 py-3.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {processing ? "Memproses..." : "Setujui"}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            ✅ Setujui ={" "}
            {surat.jenis === "SAKIT" ? "SAKIT" : "IZIN"} • ❌ Tolak = ALPA
          </p>
        </div>
      )}

      {/* ====== KETERANGAN & TANGGAL (Paling Bawah) ====== */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          📋 Detail Surat
        </h3>

        <div className="space-y-0 divide-y divide-gray-100">
          {/* Nama Siswa */}
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Nama Siswa</span>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {surat.user.nama}
              </p>
              <p className="text-xs text-gray-400">NIS: {surat.user.nis}</p>
            </div>
          </div>

          {/* Kelas */}
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Kelas</span>
            <span className="text-sm font-medium text-gray-900">
              {surat.user.kelas?.namaKelas || "-"}
            </span>
          </div>

          {/* Jenis Surat */}
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Jenis Surat</span>
            <span
              className={`text-sm font-semibold ${
                surat.jenis === "SAKIT"
                  ? "text-purple-700"
                  : "text-blue-700"
              }`}
            >
              {surat.jenis === "SAKIT" ? "🏥 Surat Sakit" : "📝 Surat Izin"}
            </span>
          </div>

          {/* Tanggal */}
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Tanggal</span>
            <span className="text-sm font-medium text-gray-900">
              📅 {formatDateLong(surat.tanggal)}
            </span>
          </div>

          {/* Diajukan */}
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Diajukan</span>
            <span className="text-sm text-gray-700">
              🕐 {formatDateTime(surat.createdAt)}
            </span>
          </div>

          {/* Keterangan */}
          {surat.keterangan && (
            <div className="py-3">
              <span className="text-sm text-gray-500 block mb-1">
                Keterangan
              </span>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-sm text-amber-900">{surat.keterangan}</p>
              </div>
            </div>
          )}

          {/* Reviewer (jika sudah direview) */}
          {surat.reviewer && (
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-500">Direview Oleh</span>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {surat.reviewer.nama}
                </p>
                {surat.reviewedAt && (
                  <p className="text-xs text-gray-400">
                    {formatDateTime(surat.reviewedAt)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back Link */}
      <Link
        href="/guru/surat"
        className="text-sm text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Kembali ke Daftar Surat
      </Link>
    </div>
  );
}
