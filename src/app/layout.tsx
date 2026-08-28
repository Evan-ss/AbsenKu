import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SweetAlertProvider } from "@/components/sweet-alert";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AbsensiKu — Aplikasi Absensi Siswa",
  description:
    "Aplikasi absensi siswa berbasis face recognition untuk sekolah",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script src="/clean-ext.js" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <SweetAlertProvider>{children}</SweetAlertProvider>
        </Providers>
      </body>
    </html>
  );
}
