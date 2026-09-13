"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import FaceCamera from "@/components/face-camera";
import VerificationPanel from "@/components/verification-panel";
import { formatTime } from "@/lib/format";

type Step = "select-class" | "scanning" | "verifying" | "success" | "error" | "already-absen";

interface Kelas {
  id: string;
  namaKelas: string;
}

interface AbsenResult {
  message: string;
  match: boolean;
  alreadyAbsen?: boolean;
  distance?: number;
  absensi?: {
    id: string;
    status: string;
    waktuMasuk: string;
    nama?: string;
    kelas?: string;
    distance?: number;
  };
}

interface ScanHistory {
  id: string;
  nama: string;
  kelas: string;
  status: string;
  waktuMasuk: string;
  distance: number;
  verified: boolean;
  timestamp: number;
}

interface MatchData {
  siswaId: string;
  nama: string;
  kelas: string;
  distance: number;
  confidence: number;
}

export default function AdminAbsensiKameraPage() {
  const { data: session } = useSession();

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState("");
  const [selectedKelasNama, setSelectedKelasNama] = useState("");
  const [step, setStep] = useState<Step>("select-class");
  const [result, setResult] = useState<AbsenResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceConfidence, setFaceConfidence] = useState(0);
  const [positionStatus, setPositionStatus] = useState<
    "waiting" | "finding" | "in-position"
  >("waiting");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [currentMatch, setCurrentMatch] = useState<MatchData | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Fetch kelas list on mount
  useEffect(() => {
    async function fetchKelas() {
      try {
        const res = await fetch("/api/kelas");
        const data = await res.json();
        if (res.ok) {
          setKelasList(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching kelas:", err);
      }
    }
    fetchKelas();
  }, []);

  const handleClassSelect = (kelasId: string) => {
    const kelas = kelasList.find((k) => k.id === kelasId);
    setSelectedKelasId(kelasId);
    setSelectedKelasNama(kelas?.namaKelas || "");
    setStep("scanning");
    setScanHistory([]);
    setCurrentMatch(null);
  };

  const handleFaceDetected = useCallback(
    async (descriptor: number[], photo?: string) => {
      if (submitting) return;
      setSubmitting(true);
      setStep("verifying");

      try {
        const res = await fetch("/api/admin/verify-face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faceDescriptor: descriptor,
            kelasId: selectedKelasId,
            fotoWajah: photo || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStep("error");
          setErrorMsg(data.message || "Terjadi kesalahan");
          setCurrentMatch(null);
          return;
        }

        if (data.match && data.alreadyAbsen) {
          setStep("already-absen");
          setFailedAttempts(0);
          setCurrentMatch(null);
          if (data.absensi) {
            setScanHistory((prev) => [
              {
                id: data.absensi!.id || `already-${Date.now()}`,
                nama: data.absensi!.nama || "Unknown",
                kelas: data.absensi!.kelas || "—",
                status: "SUDAH_ABSEN",
                waktuMasuk: data.absensi!.waktuMasuk || "",
                distance: data.distance || 0,
                verified: true,
                timestamp: Date.now(),
              },
              ...prev,
            ]);
          }
        } else if (data.match && data.needVerification) {
          // Show verification panel with match data
          setCurrentMatch({
            siswaId: data.siswaId,
            nama: data.nama,
            kelas: data.kelas,
            distance: data.distance,
            confidence: data.confidence,
          });
          setStep("verifying");
        } else if (data.match) {
          setStep("success");
          setFailedAttempts(0);
          setCurrentMatch(null);
          if (data.absensi) {
            setScanHistory((prev) => [
              {
                id: data.absensi!.id,
                nama: data.absensi!.nama || "Unknown",
                kelas: data.absensi!.kelas || "—",
                status: data.absensi!.status || "HADIR",
                waktuMasuk: data.absensi!.waktuMasuk || "",
                distance: data.distance || 0,
                verified: true,
                timestamp: Date.now(),
              },
              ...prev,
            ]);
          }
        } else {
          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);
          setStep("error");
          setErrorMsg(
            newFailed >= 5
              ? "Wajah tidak dikenali setelah beberapa percobaan. Silakan coba lagi."
              : `Wajah tidak cocok (${newFailed}/5). Silakan coba lagi.`
          );
          setCurrentMatch(null);
        }

        setResult(data);
      } catch {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        setStep("error");
        setErrorMsg(`Koneksi gagal (${newFailed}/5). Coba lagi.`);
        setCurrentMatch(null);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, selectedKelasId, failedAttempts]
  );

  const handleDetectionUpdate = useCallback(
    (update: { detected: boolean; confidence: number }) => {
      setFaceConfidence(update.confidence);
    },
    []
  );

  const handlePositionUpdate = useCallback(
    (update: { inOval: boolean; countdown: number | null }) => {
      if (update.countdown !== null) {
        setPositionStatus("in-position");
        setCountdown(update.countdown);
      } else if (update.inOval) {
        setPositionStatus("finding");
        setCountdown(null);
      } else {
        setPositionStatus("waiting");
        setCountdown(null);
      }
    },
    []
  );

  const resetCamera = () => {
    setStep(selectedKelasId ? "scanning" : "select-class");
    setResult(null);
    setErrorMsg("");
    setCameraError("");
    setPositionStatus("waiting");
    setCountdown(null);
    setFailedAttempts(0);
    setCurrentMatch(null);
  };

  const handleCameraError = useCallback((msg: string) => {
    setCameraError(msg);
  }, []);

  const handleVerifyConfirm = async (absensiId?: string) => {
    if (!currentMatch) return;
    setVerificationLoading(true);

    try {
      const res = await fetch("/api/admin/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM",
          kelasId: selectedKelasId,
          siswaId: currentMatch.siswaId,
          absensiId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Gagal memverifikasi");
        return;
      }

      setStep("success");
      setCurrentMatch(null);
      if (data.absensi) {
        setScanHistory((prev) => [
          {
            id: data.absensi.id,
            nama: data.absensi.nama || "Unknown",
            kelas: data.absensi.kelas || "—",
            status: data.absensi.status || "HADIR",
            waktuMasuk: data.absensi.waktuMasuk || "",
            distance: data.distance || 0,
            verified: true,
            timestamp: Date.now(),
          },
          ...prev,
        ]);
      }
    } catch {
      alert("Gagal memverifikasi");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyReject = () => {
    setCurrentMatch(null);
    setStep("scanning");
  };

  const handleVerifySkip = () => {
    setCurrentMatch(null);
    setStep("scanning");
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verifikasi Absensi Admin</h1>
        <p className="text-gray-500 mt-1">
          Scan wajah siswa → Verifikasi identitas → Catat absensi
        </p>
      </div>

      {/* Class Selection */}
      {step === "select-class" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pilih Kelas
          </h2>
          {kelasList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada data kelas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {kelasList.map((kelas) => (
                <button
                  key={kelas.id}
                  onClick={() => handleClassSelect(kelas.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedKelasId === kelas.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900">
                    {kelas.namaKelas}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Klik untuk memulai verifikasi
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Camera + Verification Layout */}
      {step !== "select-class" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Section (2/3 width) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Selected class indicator */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Kelas:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedKelasNama}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    Admin Verifikasi
                  </span>
                </div>
                <button
                  onClick={() => setStep("select-class")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ganti Kelas
                </button>
              </div>

              {/* Camera */}
              <FaceCamera
                onFaceDetected={handleFaceDetected}
                onDetectionUpdate={handleDetectionUpdate}
                onPositionUpdate={handlePositionUpdate}
                onError={handleCameraError}
                active={step === "scanning"}
              >
                {/* Status overlays */}
                {step === "verifying" && currentMatch && (
                  <div className="absolute inset-0 bg-blue-900/60 flex flex-col items-center justify-center text-white rounded-xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-3" />
                    <p className="text-sm">Memproses verifikasi untuk {currentMatch.nama}...</p>
                    <p className="text-xs text-blue-200 mt-1">Skor: {currentMatch.distance.toFixed(3)}</p>
                  </div>
                )}

                {step === "success" && result && (
                  <div className="absolute inset-0 bg-green-900/70 flex flex-col items-center justify-center text-white rounded-xl">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-center px-4">
                      {result.absensi?.nama
                        ? `${result.absensi.nama} — Absen Berhasil!`
                        : "Absen berhasil dicatat!"}
                    </p>
                    <p className="text-sm text-green-200 mt-1">
                      Status:{" "}
                      <span className="font-medium">
                        {result.absensi?.status === "HADIR" ? "Hadir" : "Terlambat"}
                      </span>
                      {result.absensi?.waktuMasuk &&
                        ` — ${formatTime(result.absensi.waktuMasuk)}`}
                    </p>
                    {result.absensi?.kelas && (
                      <p className="text-xs text-green-300 mt-1">
                        {result.absensi.kelas}
                      </p>
                    )}
                  </div>
                )}

                {step === "already-absen" && result && (
                  <div className="absolute inset-0 bg-yellow-900/70 flex flex-col items-center justify-center text-white rounded-xl">
                    <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold">
                      {result.absensi?.nama || "Siswa"} Sudah Absen
                    </p>
                    <p className="text-sm text-yellow-200 mt-1">
                      Absen pukul{" "}
                      {result.absensi?.waktuMasuk
                        ? formatTime(result.absensi.waktuMasuk)
                        : "—"}
                    </p>
                  </div>
                )}

                {step === "error" && (
                  <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center text-white rounded-xl">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-center px-4">{errorMsg}</p>
                    <button
                      onClick={resetCamera}
                      className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                      Coba Lagi
                    </button>
                  </div>
                )}
              </FaceCamera>

              {/* Bottom status */}
              <div className="p-5 border-t border-gray-100">
                {step === "scanning" && !cameraError && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      {positionStatus === "waiting" && (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
                          <span className="text-sm text-gray-500">
                            Arahkan wajah siswa ke dalam oval
                          </span>
                        </>
                      )}
                      {positionStatus === "in-position" && countdown === null && (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-medium text-emerald-700">
                            Wajah terdeteksi! Bersiap...
                          </span>
                        </>
                      )}
                      {countdown !== null && countdown > 0 && (
                        <>
                          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-sm font-bold text-emerald-700">
                            Scan dalam {countdown}...
                          </span>
                        </>
                      )}
                    </div>

                    <div className="w-full max-w-xs mx-auto mb-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            positionStatus === "in-position"
                              ? "bg-emerald-500"
                              : "bg-gray-300"
                          }`}
                          style={{
                            width: `${Math.round(faceConfidence * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-400">
                      {countdown !== null
                        ? "Tetap diam, mengambil data wajah..."
                        : positionStatus === "in-position"
                        ? "Pertahankan posisi..."
                        : "Posisikan wajah siswa tepat di tengah oval"}
                    </p>
                  </div>
                )}

                {cameraError && (
                  <div className="text-center">
                    <p className="text-sm text-red-600 mb-3">{cameraError}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Muat Ulang
                    </button>
                  </div>
                )}

                {(step === "success" || step === "already-absen") && (
                  <div className="text-center">
                    {result?.distance !== undefined && (
                      <div className="text-xs text-gray-500 mb-3">
                        Skor kecocokan:{" "}
                        <span
                          className={`font-mono font-medium ${
                            result.distance < 0.4
                              ? "text-emerald-600"
                              : result.distance < 0.45
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {result.distance.toFixed(3)}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={resetCamera}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Scan Siswa Berikutnya
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Verification Panel (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <VerificationPanel
                match={currentMatch}
                onConfirm={handleVerifyConfirm}
                onReject={handleVerifyReject}
                onSkip={handleVerifySkip}
                onDetail={() => {}}
                isLoading={verificationLoading}
              />

              {/* Scan History */}
              <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Riwayat Verifikasi Hari Ini
                </h3>
                {scanHistory.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">Belum ada verifikasi</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {scanHistory.map((item) => (
                      <div
                        key={item.id + item.timestamp}
                        className={`p-3 rounded-lg border ${
                          item.status === "SUDAH_ABSEN"
                            ? "bg-yellow-50 border-yellow-200"
                            : item.verified
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.nama}
                            </p>
                            <p className="text-xs text-gray-500">{item.kelas}</p>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              item.status === "SUDAH_ABSEN"
                                ? "bg-yellow-100 text-yellow-700"
                                : item.verified
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.status === "SUDAH_ABSEN"
                              ? "Sudah Absen"
                              : item.verified
                              ? "✅ Terverifikasi"
                              : "⏳ Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(item.waktuMasuk)} • Skor: {item.distance.toFixed(3)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}