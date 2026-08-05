"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function SiswaDashboard() {
  const { data: session } = useSession();

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Halo, {session?.user?.nama || "Siswa"}!
        </h1>
        <p className="text-gray-500 mt-1">
          Selamat datang di panel siswa AbsensiKu
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/siswa/absen"
          className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-6 text-white hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold">Absen Sekarang</h2>
          </div>
          <p className="text-emerald-100 text-sm">
            Lakukan absen dengan face recognition
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-200 group-hover:gap-3 transition-all">
            <span>Mulai absen</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link
          href="/siswa/riwayat"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Riwayat Absensi</h2>
          </div>
          <p className="text-gray-500 text-sm">
            Lihat histori absensi kamu
          </p>
        </Link>
      </div>

      {/* Today's status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Status Hari Ini
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Belum absen hari ini</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Silakan lakukan absen masuk terlebih dahulu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
