"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/format";

type Step = "idle" | "scanning" | "success" | "error" | "already-absen";

interface ScanResult {
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
    method?: string;
  };
}

interface ScanHistory {
  id: string;
  nama: string;
  kelas: string;
  status: string;
  waktuMasuk: string;
  method: string;
  timestamp: number;
}

export default function AdminAbsensiRfidPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);

  const handleScan = useCallback(async (uid: string) => {
    if (submitting) return;
    setSubmitting(true);
    setStep("scanning");

    try {
      const res = await fetch("/api/rfid/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
        }),
      });

      const data: ScanResult = await res.json();

      if (!res.ok) {
        setStep("error");
        setErrorMsg(data.message || "Terjadi kesalahan");
        return;
      }

      if (data.match && data.alreadyAbsen) {
        setStep("already-absen");
        if (data.absensi) {
          setScanHistory((prev) => [
            {
              id: data.absensi!.id || `already-${Date.now()}`,
              nama: data.absensi!.nama || "Unknown",
              kelas: data.absensi!.kelas || "—",
              status: "SUDAH_ABSEN",
              waktuMasuk: data.absensi!.waktuMasuk || "",
              method: "RFID",
              timestamp: Date.now(),
            },
            ...prev,
          ]);
        }
      } else if (data.match) {
        setStep("success");
        if (data.absensi) {
          setScanHistory((prev) => [
            {
              id: data.absensi!.id,
              nama: data.absensi!.nama || "Unknown",
              kelas: data.absensi!.kelas || "—",
              status: data.absensi!.status || "HADIR",
              waktuMasuk: data.absensi!.waktuMasuk || "",
              method: data.absensi!.method || "RFID",
              timestamp: Date.now(),
            },
            ...prev,
          ]);
        }
      } else {
        setStep("error");
        setErrorMsg(data.message || "Kartu tidak dikenali");
      }

      setResult(data);
    } catch {
      setStep("error");
      setErrorMsg("Koneksi gagal. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting]);

  const resetScanner = () => {
    setStep("idle");
    setResult(null);
    setErrorMsg("");
  };

  // Otomatis kembali ke mode scan setelah berhasil / sudah absen
  useEffect(() => {
    if (step === "success" || step === "already-absen") {
      const t = setTimeout(() => {
        resetScanner();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header + Back */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Absen RFID Siswa</h1>
          <p className="text-gray-500 mt-1">
            Tap kartu RFID siswa untuk mencatat kehadiran — berlaku untuk semua kelas
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali
        </button>
      </div>

      {/* Scanner + History Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                RFID
              </span>
              <span className="text-sm text-gray-500">
                Absen berlaku untuk semua kelas
              </span>
            </div>

            {/* Scanner Input */}
              <div className="p-6">
                {/* Status notification (success / already absen) */}
                {(step === "success" || step === "already-absen") && result && (
                  <div
                    className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                      step === "already-absen"
                        ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                        : "bg-green-50 border-green-300 text-green-800"
                    }`}
                  >
                    <span className="shrink-0">
                      {step === "already-absen" ? (
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">
                        {step === "already-absen"
                          ? `${result.absensi?.nama || "Siswa"} Sudah Absen`
                          : result.absensi?.nama
                          ? `${result.absensi.nama} — Hadir!`
                          : "Absen berhasil!"}
                      </p>
                      <p className="text-xs mt-0.5 opacity-80">
                        {step === "already-absen"
                          ? `Sudah absen pukul ${result.absensi?.waktuMasuk ? formatTime(result.absensi.waktuMasuk) : "—"}`
                          : `Status: ${result.absensi?.status === "HADIR" ? "Hadir" : "Terlambat"}${result.absensi?.waktuMasuk ? ` — ${formatTime(result.absensi.waktuMasuk)}` : ""}`}
                        {result.absensi?.kelas ? ` • ${result.absensi.kelas}` : ""}
                      </p>
                    </div>
                  </div>
                )}

                {/* Scanner input (selalu tersedia) */}
                {(step === "idle" || step === "success" || step === "already-absen") && (
                  <div className="text-center">
                    <div className="w-24 h-24 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Siap Scan RFID</h3>
                    <p className="text-gray-500 mb-6">Tempelkan kartu RFID siswa ke reader</p>

                    <div className="max-w-md mx-auto">
                      <label className="block text-sm font-medium text-gray-700 mb-2">UID Kartu RFID</label>
                      <input
                        type="text"
                        id="rfid-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget as HTMLInputElement;
                            handleScan(input.value.trim());
                            input.value = "";
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-mono text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                        placeholder="Tempelkan kartu / ketik UID..."
                      />
                      <p className="text-xs text-gray-400 mt-2 text-center">Tekan Enter setelah menempelkan kartu</p>
                    </div>
                  </div>
                )}

                {/* Scanning spinner */}
                {step === "scanning" && (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-3" />
                    <p className="text-sm text-gray-500">Memproses kartu RFID...</p>
                  </div>
                )}

                {/* Error */}
                {step === "error" && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-gray-800 px-4">{errorMsg}</p>
                    <button onClick={resetScanner} className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                      Coba Lagi
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom action area */}
              <div className="p-5 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Tempelkan kartu RFID ke reader atau ketik UID lalu tekan Enter
                </p>
              </div>
            </div>
          </div>

          {/* Scan History Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Riwayat Scan Hari Ini</h3>
              {scanHistory.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400">Belum ada scan</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {scanHistory.map((item) => (
                    <div key={item.id + item.timestamp} className={`p-3 rounded-lg border ${item.status === "SUDAH_ABSEN" ? "bg-yellow-50 border-yellow-200" : item.status === "HADIR" ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.nama}</p>
                          <p className="text-xs text-gray-500">{item.kelas}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === "SUDAH_ABSEN" ? "bg-yellow-100 text-yellow-700" : item.status === "HADIR" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {item.status === "SUDAH_ABSEN" ? "Sudah Absen" : item.status === "HADIR" ? "Hadir" : "Telat"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(item.waktuMasuk)} • {item.method}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}