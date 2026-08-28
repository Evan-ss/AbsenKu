"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface KelasGuru {
  id: string;
  namaKelas: string;
  waliKelas: string | null;
  totalSiswa: number;
  sudahAbsen: number;
  suratMenunggu: number;
}

export default function GuruKelasListPage() {
  const [kelasList, setKelasList] = useState<KelasGuru[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/guru/kelas");
      const data = await res.json();
      if (res.ok) setKelasList(data.data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kelas Saya</h1>
        <p className="text-gray-500 mt-1">
          Daftar kelas yang menjadi tanggung jawab Anda
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
        </div>
      ) : kelasList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500">Belum ada kelas yang ditugaskan</p>
          <p className="text-sm text-gray-400 mt-1">
            Hubungi admin untuk menugaskan Anda ke kelas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {kelasList.map((kelas) => {
            const persenAbsen =
              kelas.totalSiswa > 0
                ? Math.round((kelas.sudahAbsen / kelas.totalSiswa) * 100)
                : 0;

            return (
              <Link
                key={kelas.id}
                href={`/guru/kelas/${kelas.id}`}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-amber-300 hover:shadow-lg transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                      <span className="text-lg font-bold text-amber-600">
                        {kelas.namaKelas.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                        {kelas.namaKelas}
                      </h3>
                      {kelas.waliKelas && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Wali: {kelas.waliKelas}
                        </p>
                      )}
                    </div>
                  </div>
                  {kelas.suratMenunggu > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {kelas.suratMenunggu}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Kehadiran Hari Ini</span>
                      <span className="font-semibold text-gray-700">
                        {kelas.sudahAbsen}/{kelas.totalSiswa}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          persenAbsen >= 80
                            ? "bg-emerald-500"
                            : persenAbsen >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${persenAbsen}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {persenAbsen}% hadir
                    </p>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {kelas.totalSiswa} siswa
                    </div>
                    <span className="text-xs text-amber-600 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Lihat Detail
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
