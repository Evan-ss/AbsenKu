"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import FaceCamera from "@/components/face-camera";
import { formatTime } from "@/lib/format";

type Step = "idle" | "scanning" | "success" | "error" | "already-pulang" | "not-checked-in";

interface AbsenResult {
  message: string;
  match: boolean;
  alreadyAbsen?: boolean;
  notCheckedIn?: boolean;
  distance?: number;
  absensi?: {
    id: string;
    status: string;
    waktuMasuk: string;
    waktuPulang?: string;
    nama?: string;
    kelas?: string;
    distance?: number;
  };
}

export default function SiswaAbsenPulangPage() {
  const { data: session } = useSession();
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
  const [todayAbsensi, setTodayAbsensi] = useState<{
    status: string;
    waktuMasuk: string | null;
  } | null>(null);

  // Check if already checked in today
  useEffect(() => {
    async function checkTodayAbsensi() {
      try {
        const res = await fetch("/api/absen/riwayat?page=1&limit=1");
        const data = await res.json();
        if (res.ok && data.data?.length > 0) {
          const today = new Date().toISOString().split("T")[0];
          const todayRecord = data.data.find((a: any) => a.tanggal === today);
          if (todayRecord) {
            setTodayAbsensi({
              status: todayRecord.status,
              waktuMasuk: todayRecord.waktuMasuk,
            });
          }
        }
      } catch (err) {
        console.error("Error checking today absensi:", err);
      }
    }
    checkTodayAbsensi();
  }, []);

  const handleFaceDetected = useCallback(
    async (descriptor: number[], photo?: string) => {
      if (submitting) return;
      setSubmitting(true);
      setStep("scanning");

      try {
        const res = await fetch("/api/absen/pulang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faceDescriptor: descriptor,
            fotoWajah: photo || undefined,
          }),
        });

        const data: AbsenResult = await res.json();

        if (!res.ok) {
          setStep("error");
          setErrorMsg(data.message || "Terjadi kesalahan");
          return;
        }

        if (data.match && data.alreadyAbsen) {
          setStep("already-pulang");
          setFailedAttempts(0);
        } else if (data.notCheckedIn) {
          setStep("not-checked-in");
          setFailedAttempts(0);
        } else if (data.match) {
          setStep("success");
          setFailedAttempts(0);
        } else {
          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);
          setStep("error");
          setErrorMsg(
            newFailed >= 5
              ? "Wajah tidak dikenali setelah beberapa percobaan. Silakan coba lagi."
              : `Wajah tidak cocok (${newFailed}/5). Silakan coba lagi.`
          );
        }

        setResult(data);
      } catch {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        setStep("error");
        setErrorMsg(`Koneksi gagal (${newFailed}/5). Coba lagi.`);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, failedAttempts]
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
    setStep("idle");
    setResult(null);
    setErrorMsg("");
    setCameraError("");
    setPositionStatus("waiting");
    setCountdown(null);
    setFailedAttempts(0);
  };

  const handleCameraError = useCallback((msg: string) => {
    setCameraError(msg);
  }, []);

  const canCheckOut = todayAbsensi !== null && (todayAbsensi.status === "HADIR" || todayAbsensi.status === "TELAT");

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Absen Pulang</h1>
        <p className="text-gray-500 mt-1">
          Scan wajah untuk mencatat kehadiran pulang
        </p>
      </div>

      {/* Status Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Informasi Absen Masuk</h3>
            {todayAbsensi ? (
              <p className="text-sm text-gray-500 mt-1">
                Status: <span className="font-medium text-gray-900">{todayAbsensi.status}</span>
                {todayAbsensi.waktuMasuk && ` • Masuk: ${formatTime(todayAbsensi.waktuMasuk)}`}
              </p>
            ) : (
              <p className="text-sm text-red-600 mt-1">Belum absen masuk hari ini</p>
            )}
          </div>
        </div>
        {!canCheckOut && todayAbsensi && (
          <p className="text-xs text-red-600 mt-2">
            ⚠️ Kamu tidak bisa absen pulang karena status masuk: {todayAbsensi.status}
          </p>
        )}
        {!todayAbsensi && (
          <p className="text-xs text-red-600 mt-2">
            ⚠️ Kamu harus absen masuk terlebih dahulu sebelum absen pulang
          </p>
        )}
      </div>

      {/* Camera Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Camera */}
        <FaceCamera
          onFaceDetected={handleFaceDetected}
          onDetectionUpdate={handleDetectionUpdate}
          onPositionUpdate={handlePositionUpdate}
          onError={handleCameraError}
          active={step === "idle" && canCheckOut}
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
                  ? `${result.absensi.nama} — Pulang!`
                  : "Absen pulang berhasil!"}
              </p>
              <p className="text-sm text-green-200 mt-1">
                {result.absensi?.waktuPulang
                  ? `Pulang pukul ${formatTime(result.absensi.waktuPulang)}`
                  : "Terima kasih telah hadir hari ini"}
              </p>
              {result.absensi?.kelas && (
                <p className="text-xs text-green-300 mt-1">
                  {result.absensi.kelas}
                </p>
              )}
            </div>
          )}

          {step === "already-pulang" && result && (
            <div className="absolute inset-0 bg-yellow-900/70 flex flex-col items-center justify-center text-white rounded-xl">
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-semibold">
                {result.absensi?.nama || "Kamu"} Sudah Absen Pulang
              </p>
              <p className="text-sm text-yellow-200 mt-1">
                Pulang pukul{" "}
                {result.absensi?.waktuPulang
                  ? formatTime(result.absensi.waktuPulang)
                  : "—"}
              </p>
            </div>
          )}

          {step === "not-checked-in" && (
            <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center text-white rounded-xl">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-center px-4">
                Belum Absen Masuk Hari Ini
              </p>
              <p className="text-sm text-red-200 mt-1">
                Silakan absen masuk terlebih dahulu di halaman dashboard
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

          {step === "scanning" && (
            <div className="absolute inset-0 bg-blue-900/60 flex flex-col items-center justify-center text-white rounded-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-3" />
              <p className="text-sm">Mengenali wajah...</p>
            </div>
          )}

          {!canCheckOut && step === "idle" && (
            <div className="absolute inset-0 bg-gray-900/70 flex flex-col items-center justify-center text-white rounded-xl">
              <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-center px-4">
                Tidak Bisa Absen Pulang
              </p>
              <p className="text-sm text-gray-200 mt-1 text-center px-4">
                {todayAbsensi
                  ? `Status masuk: ${todayAbsensi.status}. Hanya status Hadir/Telat yang bisa absen pulang.`
                  : "Kamu belum absen masuk hari ini. Silakan absen masuk terlebih dahulu."}
              </p>
            </div>
          )}
        </FaceCamera>

        {/* Bottom action area */}
        <div className="p-5 border-t border-gray-100">
          {step === "idle" && canCheckOut && !cameraError && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                {positionStatus === "waiting" && (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
                    <span className="text-sm text-gray-500">
                      Arahkan wajah ke dalam oval
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
                  : "Posisikan wajah tepat di tengah oval"}
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

          {(step === "success" || step === "already-pulang") && (
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
                Selesai
              </button>
            </div>
          )}

          {step === "not-checked-in" && (
            <div className="text-center">
              <a
                href="/siswa/dashboard"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali ke Dashboard
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Info Jam Pulang */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Informasi Jam Pulang</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-blue-700 font-medium">Jam Pulang Normal</p>
            <p className="text-blue-600">15:40 - 16:10</p>
          </div>
          <div>
            <p className="text-blue-700 font-medium">Auto Check-out</p>
            <p className="text-blue-600">Otomatis jam 16:10 (jika lupa)</p>
          </div>
        </div>
        <p className="text-xs text-blue-500 mt-2">
          * Absen pulang hanya bisa dilakukan setelah absen masuk (status Hadir/Telat)
        </p>
      </div>
    </div>
  );
}