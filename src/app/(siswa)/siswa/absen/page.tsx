"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import FaceCamera from "@/components/face-camera";
import { formatTime } from "@/lib/format";

type Step = "idle" | "scanning" | "success" | "error" | "already-absen" | "manual";

interface AbsenResult {
  message: string;
  match: boolean;
  alreadyAbsen?: boolean;
  noFaceData?: boolean;
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

export default function AbsenPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("idle");
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

  // Handle face captured — auto-submit after countdown finishes
  const handleFaceDetected = useCallback(
    async (descriptor: number[]) => {
      if (submitting) return;
      setSubmitting(true);
      setStep("scanning");

      try {
        const res = await fetch("/api/absen/face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ faceDescriptor: descriptor }),
        });

        const data: AbsenResult = await res.json();

        if (!res.ok) {
          setStep("error");
          setErrorMsg(data.message || "Terjadi kesalahan");
          return;
        }

        if (data.match && data.alreadyAbsen) {
          setStep("already-absen");
          setFailedAttempts(0);
        } else if (data.match) {
          setStep("success");
          setFailedAttempts(0);
        } else {
          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);
          if (newFailed >= 3) {
            setStep("manual");
          } else {
            setStep("error");
            setErrorMsg(
              `Wajah tidak cocok (${newFailed}/3). Silakan coba lagi.`
            );
          }
        }

        setResult(data);
      } catch {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        if (newFailed >= 3) {
          setStep("manual");
        } else {
          setStep("error");
          setErrorMsg(`Koneksi gagal (${newFailed}/3). Coba lagi.`);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [submitting]
  );

  // Handle detection updates (confidence only)
  const handleDetectionUpdate = useCallback(
    (update: { detected: boolean; confidence: number }) => {
      setFaceConfidence(update.confidence);
    },
    []
  );

  // Handle position/countdown updates from camera
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
    setStep("idle");
    setResult(null);
    setErrorMsg("");
    setCameraError("");
    setPositionStatus("waiting");
    setCountdown(null);
    setFailedAttempts(0);
  };

  const goToManual = () => {
    setStep("manual");
  };

  // useCallback agar referensi stabil — kalau tidak, tiap re-render membuat
  // fungsi baru → useEffect kamera di FaceCamera (deps [modelsLoaded, onError])
  // jalan ulang → getUserMedia dipanggil berulang → kamera stuck.
  const handleCameraError = useCallback((msg: string) => {
    setCameraError(msg);
  }, []);



  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Absen</h1>
        <p className="text-gray-500 mt-1">
          Lakukan absen dengan face recognition
        </p>
      </div>

      {/* Camera Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Camera */}
        <FaceCamera
          onFaceDetected={handleFaceDetected}
          onDetectionUpdate={handleDetectionUpdate}
          onPositionUpdate={handlePositionUpdate}
          onError={handleCameraError}
          active={step === "idle"}
        >
          {/* Status overlay inside camera */}
          {step === "success" && result && (
            <div className="absolute inset-0 bg-green-900/70 flex flex-col items-center justify-center text-white rounded-xl">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-center px-4">
                {result.absensi?.nama
                  ? `Selamat datang, ${result.absensi.nama}!`
                  : "Absen berhasil!"}
              </p>
              <p className="text-sm text-green-200 mt-1">
                Status:{" "}
                <span className="font-medium">
                  {result.absensi?.status === "HADIR" ? "Hadir" : "Telat"}
                </span>
                {" — "}
                {result.absensi?.waktuMasuk
                  ? formatTime(result.absensi.waktuMasuk)
                  : ""}
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
              <p className="text-lg font-semibold">Sudah Absen Hari Ini</p>
              <p className="text-sm text-yellow-200 mt-1">
                Kamu sudah absen pukul{" "}
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
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={resetCamera}
                  className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Coba Lagi ({3 - failedAttempts} tersisa)
                </button>
              </div>
            </div>
          )}

          {step === "scanning" && (
            <div className="absolute inset-0 bg-blue-900/60 flex flex-col items-center justify-center text-white rounded-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-3" />
              <p className="text-sm">Memverifikasi wajah...</p>
            </div>
          )}

          {step === "manual" && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/90 to-orange-900/90 flex flex-col items-center justify-center text-white rounded-xl p-6">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-lg font-semibold mb-1">Face Recognition Gagal</p>
              <p className="text-sm text-amber-200 text-center mb-4">
                Wajah tidak dapat dikenali setelah 3 percobaan.
                <br />Silakan absen manual.
              </p>
              <ManualAbsenButton
                onDone={() => {
                  setStep("success");
                  setResult({
                    message: "Absen manual berhasil!",
                    match: true,
                    alreadyAbsen: false,
                    absensi: { id: "", status: "HADIR", waktuMasuk: new Date().toISOString() },
                  });
                }}
              />
            </div>
          )}
        </FaceCamera>

        {/* Bottom action area */}
        <div className="p-5 border-t border-gray-100">
          {step === "idle" && !cameraError && (
            <div className="text-center">
              {/* Position status indicator */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {positionStatus === "waiting" && (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
                    <span className="text-sm text-gray-500">
                      Posisikan wajah dalam oval
                    </span>
                  </>
                )}
                {positionStatus === "in-position" && countdown === null && (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700">
                      Posisi tepat! Bersiap...
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

              {/* Confidence bar */}
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
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0%</span>
                  <span className="text-gray-500">Confidence</span>
                  <span>100%</span>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                {countdown !== null
                  ? "Tetap diam, sistem akan mengambil data wajah..."
                  : positionStatus === "in-position"
                  ? "Pertahankan posisi..."
                  : "Posisikan wajah tepat di tengah oval"}
              </p>
            </div>
          )}

          {cameraError && (
            <div className="text-center">
              <p className="text-sm text-red-600 mb-3">{cameraError}</p>
              <p className="text-xs text-gray-500 mb-4">
                Kamera tidak tersedia. Kamu bisa absen manual di bawah.
              </p>
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Coba Lagi
                </button>
                <ManualAbsenButton onDone={() => { setStep("success"); setResult({ message: "Absen manual berhasil!", match: true, alreadyAbsen: false, absensi: { id: "", status: "HADIR", waktuMasuk: new Date().toISOString() } }); }} />
              </div>
            </div>
          )}

          {(step === "success" || step === "already-absen") && (
            <div className="text-center space-y-3">
              {/* Show match distance if available */}
              {result?.distance !== undefined && (
                <div className="text-xs text-gray-500">
                  Skor kecocokan:{" "}
                  <span
                    className={`font-mono font-medium ${
                      result.distance < 0.5
                        ? "text-emerald-600"
                        : result.distance < 0.6
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {result.distance.toFixed(3)}
                  </span>
                  <span className="text-gray-400">
                    {" "}(semakin kecil semakin cocok)
                  </span>
                </div>
              )}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={resetCamera}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Absen Lagi
                </button>
                <button
                  onClick={() => router.push("/siswa/riwayat")}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Lihat Riwayat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              Cara Absen Otomatis
            </h3>
            <ol className="mt-2 text-sm text-blue-700 space-y-1.5 list-decimal list-inside">
              <li>Posisikan wajah di dalam <strong>oval panduan</strong></li>
              <li>Tunggu hingga oval berubah <strong>hijau</strong> (posisi tepat)</li>
              <li>Diam! Hitungan <strong>3-2-1</strong> akan berjalan otomatis</li>
              <li>Hasil absen akan muncul (Hadir / Telat)</li>
            </ol>
            <p className="mt-2 text-xs text-blue-500">
              💡 Tidak perlu klik tombol apapun — sistem akan otomatis mengambil data wajah
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Manual Absen Button Component
function ManualAbsenButton({ onDone }: { onDone: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<"HADIR" | "IZIN" | "SAKIT">("HADIR");
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!keterangan.trim()) {
      alert("Keterangan harus diisi!");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/absen/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, keterangan: keterangan.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.message);
        return;
      }
      setShowModal(false);
      onDone();
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
      >
        Absen Manual
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Absen Manual</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "HADIR" | "IZIN" | "SAKIT")}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  <option value="HADIR">Hadir</option>
                  <option value="IZIN">Izin</option>
                  <option value="SAKIT">Sakit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Alasan izin/sakit..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Batal</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium">
                  {submitting ? "Memproses..." : "Kirim"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
