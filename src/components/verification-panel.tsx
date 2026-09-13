"use client";

import { useEffect, useState } from "react";

interface MatchData {
  siswaId: string;
  nama: string;
  kelas: string;
  distance: number;
  confidence: number;
}

interface VerificationPanelProps {
  match: MatchData | null;
  onConfirm: (absensiId?: string) => void;
  onReject: () => void;
  onSkip: () => void;
  onDetail: () => void;
  isLoading?: boolean;
}

export default function VerificationPanel({
  match,
  onConfirm,
  onReject,
  onSkip,
  onDetail,
  isLoading = false,
}: VerificationPanelProps) {
  const [showDetail, setShowDetail] = useState(false);

  if (!match) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <p className="text-gray-500">Menunggu wajah terdeteksi...</p>
        <p className="text-xs text-gray-400 mt-1">Arahkan kamera ke wajah siswa</p>
      </div>
    );
  }

  const getScoreLabel = (distance: number) => {
    if (distance < 0.3) return { label: "SANGAT COCOK", color: "text-emerald-600 bg-emerald-100" };
    if (distance < 0.4) return { label: "COCOK", color: "text-emerald-600 bg-emerald-100" };
    if (distance < 0.45) return { label: "CUKUP COCOK", color: "text-amber-600 bg-amber-100" };
    return { label: "KURANG COCOK", color: "text-red-600 bg-red-100" };
  };

  const scoreInfo = getScoreLabel(match.distance);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900">Verifikasi Wajah</h3>
        <p className="text-xs text-gray-500 mt-0.5">Konfirmasi identitas siswa sebelum mencatat absensi</p>
      </div>

      {/* Match Info */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-blue-600">
              {match.nama.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{match.nama}</p>
            <p className="text-sm text-gray-500">{match.kelas}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreInfo.color}`}>
                {scoreInfo.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {Math.round(match.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        </div>

        {/* Distance Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Skor Kecocokan (Euclidean Distance)</span>
            <span className="font-mono font-medium text-lg">
              {match.distance.toFixed(3)}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                match.distance < 0.3 ? "bg-emerald-500" : match.distance < 0.45 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (1 - match.distance / 0.6) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0.0 (Sama)</span>
            <span>0.45 (Batas)</span>
            <span>0.6+ (Berbeda)</span>
          </div>
        </div>

        {/* Detail Toggle */}
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="w-full text-left text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-between"
        >
          <span>👁 {showDetail ? "Sembunyikan Detail" : "Lihat Detail Teknis"}</span>
          <svg className={`w-4 h-4 transition-transform ${showDetail ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Detail Section */}
        {showDetail && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Siswa ID</p>
                <p className="font-mono text-gray-900 truncate">{match.siswaId}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Kelas</p>
                <p className="font-medium text-gray-900">{match.kelas}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Distance</p>
                <p className="font-mono text-gray-900">{match.distance.toFixed(4)}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-gray-500">Confidence</p>
                <p className="font-mono text-gray-900">{Math.round(match.confidence * 100)}%</p>
              </div>
            </div>
            <p className="text-gray-500">
              Threshold: 0.45 | {match.distance < 0.45 ? "✅ Lolos" : "❌ Tidak lolos"}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-2">
          <button
            onClick={() => onConfirm()}
            disabled={isLoading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-semibold text-base transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            ✅ YA, BENAR — Catat Absensi
          </button>

          <button
            onClick={onReject}
            disabled={isLoading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium text-base transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            ❌ TIDAK — Scan Ulang
          </button>

          <button
            onClick={onSkip}
            disabled={isLoading}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            ⏭ LEWATI Siswa Ini
          </button>
        </div>
      </div>
    </div>
  );
}