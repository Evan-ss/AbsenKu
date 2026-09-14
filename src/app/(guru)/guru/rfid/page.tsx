"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/format";

type Step = "select-class" | "idle" | "scanning" | "success" | "error" | "already-absen";

interface Kelas {
  id: string;
  namaKelas: string;
  isWaliKelas?: boolean;
  mataPelajaran?: string[];
}

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

export default function GuruRfidPage() {
  const router = useRouter();

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState("");
  const [selectedKelasNama, setSelectedKelasNama] = useState("");
  const [step, setStep] = useState<Step>("select-class");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);

  // Fetch kelas list on mount
  useEffect(() => {
    async function fetchKelas() {
      try {
        const res = await fetch("/api/guru/kelas");
        const data = await res.json();
        if (res.ok) {
          // Filter only classes where guru is wali kelas
          const waliKelasList = (data.data || []).filter((k: Kelas) => k.isWaliKelas);
          setKelasList(waliKelasList);
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
    setStep("idle");
    setScanHistory([]);
  };

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
          kelasId: selectedKelasId,
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
  }, [submitting, selectedKelasId]);

  const resetScanner = () => {
    setStep("idle");
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Absen RFID Siswa</h1>
        <p className="text-gray-500 mt-1">Tap kartu RFID siswa untuk mencatat kehadiran</p>
      </div>

      {/* Class Selection */}
      {step === "select-class" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pilih Kelas</h2>
          {kelasList.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500">Anda bukan wali kelas untuk kelas manapun</p>
              <p className="text-sm text-gray-400 mt-1">Hanya wali kelas yang bisa melakukan absensi RFID</p>
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
                  <p className="font-semibold text-gray-900">{kelas.namaKelas}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {kelas.mataPelajaran && kelas.mataPelajaran.length > 0
                      ? `Mapel: ${kelas.mataPelajaran.join(", ")}`
                      : "Klik untuk memilih"}
                  </p>
                </button>
              ))}
            </div>
          )}
          {selectedKelasId !== "" && (
            <div className="mt-4">
              <button
                onClick={() => setStep("idle")}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Mulai Scan: {selectedKelasNama}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scanner + History Layout */}
      {step !== "select-class" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Selected class indicator */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Kelas:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedKelasNama}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">RFID</span>
                </div>
                <button onClick={() => setStep("select-class")} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ganti Kelas</button>
              </div>

              {/* Scanner Input */}
              <div className="p-6">
                {step === "idle" && (
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

                {step === "scanning" && (
                  <div className="absolute inset-0 bg-blue-900/60 flex flex-col items-center justify-center text-white rounded-xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-3" />
                    <p className="text-sm">Memproses kartu RFID...</p>
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
                      {result.absensi?.nama ? `${result.absensi.nama} — Hadir!` : "Absen berhasil!"}
                    </p>
                    <p className="text-sm text-green-200 mt-1">
                      Status: <span className="font-medium">{result.absensi?.status === "HADIR" ? "Hadir" : "Terlambat"}</span>
                      {result.absensi?.waktuMasuk && ` — ${formatTime(result.absensi.waktuMasuk)}`}
                    </p>
                    {result.absensi?.kelas && (
                      <p className="text-xs text-green-300 mt-1">{result.absensi.kelas}</p>
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
                    <p className="text-lg font-semibold">{result.absensi?.nama || "Siswa"} Sudah Absen</p>
                    <p className="text-sm text-yellow-200 mt-1">Absen pukul {result.absensi?.waktuMasuk ? formatTime(result.absensi.waktuMasuk) : "—"}</p>
                  </div>
                )}

                {step === "error" && (
                  <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center text-white rounded-xl">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items_center justify-center mb-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-center px-4">{errorMsg}</p>
                    <button onClick={resetScanner} className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">Coba Lagi</button>
                  </div>
                )}
              </div>

              {/* Bottom action area */}
              <div className="p-5 border-t border-gray-100">
                {step === "idle" && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Tempelkan kartu RFID ke reader atau ketik UID lalu tekan Enter</p>
                  </div>
                )}

                {(step === "success" || step === "already-absen") && (
                  <div className="text-center">
                    {result?.absensi?.method && (
                      <div className="text-xs text-gray-500 mb-3">
                        Metode: <span className="font-mono font-medium text-blue-600">{result.absensi.method}</span>
                      </div>
                    )}
                    <button onClick={resetScanner} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                      Scan Siswa Berikutnya
                    </button>
                  </div>
                )}
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
      )}
    </div>
  );
}