"use client";

import { useRef, useState, useCallback } from "react";
import FaceCamera from "@/components/face-camera";

interface FaceCaptureProps {
  siswaId: string;
  siswaNama: string;
  onSaved?: () => void;
  existingDescriptor?: boolean;
}

export default function FaceCapture({
  siswaId,
  siswaNama,
  onSaved,
  existingDescriptor = false,
}: FaceCaptureProps) {
  const [step, setStep] = useState<"idle" | "capturing" | "confirm" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [faceConfidence, setFaceConfidence] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const descriptorRef = useRef<number[] | null>(null);

  const handleFaceDetected = useCallback((descriptor: number[]) => {
    if (step !== "capturing") return;
    descriptorRef.current = descriptor;
    setStep("confirm");
  }, [step]);

  const handleDetectionUpdate = useCallback(
    (update: { detected: boolean; confidence: number }) => {
      setFaceDetected(update.detected);
      setFaceConfidence(update.confidence);
    },
    []
  );

  const startCapture = () => {
    descriptorRef.current = null;
    setMessage("");
    setFaceConfidence(0);
    setFaceDetected(false);
    setStep("capturing");
  };

  const saveFace = async () => {
    if (!descriptorRef.current) return;
    setStep("saving");
    setMessage("Menyimpan wajah...");

    try {
      const res = await fetch(`/api/siswa/${siswaId}/face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceDescriptor: descriptorRef.current }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setStep("done");
      setMessage("Wajah berhasil direkam!");
      onSaved?.();
    } catch (err) {
      setStep("error");
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan wajah");
    }
  };

  return (
    <div className="space-y-3">
      {/* Status info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Rekam Wajah</span>
        </div>
        {existingDescriptor && (
          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            Sudah terekam
          </span>
        )}
      </div>

      {/* Action buttons */}
      {step === "idle" && (
        <button
          onClick={startCapture}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {existingDescriptor ? "Rekam Ulang Wajah" : "Rekam Wajah Siswa"}
        </button>
      )}

      {/* Camera capture mode */}
      {step === "capturing" && (
        <div>
          <div className="relative">
            <FaceCamera
              onFaceDetected={handleFaceDetected}
              onDetectionUpdate={handleDetectionUpdate}
              active={true}
            />
            {/* Confidence indicator overlay */}
            {faceDetected ? (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-900/70 text-white px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {Math.round(faceConfidence * 100)}%
              </div>
            ) : (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-gray-900/50 text-white/60 px-2.5 py-1 rounded-full text-xs backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                Mencari...
              </div>
            )}
          </div>

          {/* Confidence bar */}
          <div className="mt-3">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  faceDetected ? "bg-emerald-500" : "bg-gray-300"
                }`}
                style={{ width: `${Math.round(faceConfidence * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Tunggu deteksi...</span>
              <span className={faceDetected ? "text-emerald-600 font-medium" : ""}>
                {faceDetected
                  ? "Wajah terdeteksi!"
                  : "Arahkan wajah ke oval"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confirm step */}
      {step === "confirm" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-900">Wajah terdeteksi!</p>
              <p className="text-xs text-emerald-700">
                {siswaNama} — {descriptorRef.current?.length || 0} data point
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={startCapture}
              className="flex-1 px-3 py-2 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 text-sm font-medium transition-colors"
            >
              Ulang
            </button>
            <button
              onClick={saveFace}
              className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Simpan Wajah
            </button>
          </div>
        </div>
      )}

      {/* Saving / Done / Error */}
      {step === "saving" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-sm text-blue-700">{message}</p>
        </div>
      )}

      {step === "done" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-emerald-700">{message}</span>
            </div>
            <button
              onClick={startCapture}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Rekam Ulang
            </button>
          </div>
        </div>
      )}

      {step === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700">{message}</span>
            </div>
            <button onClick={startCapture} className="text-xs text-red-600 hover:text-red-700 font-medium">
              Coba Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
