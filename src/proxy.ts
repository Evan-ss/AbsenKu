import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Proteksi rute admin
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Proteksi rute siswa
    if (path.startsWith("/siswa") && token?.role !== "SISWA") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Proteksi rute guru
    if (path.startsWith("/guru") && token?.role !== "GURU") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/siswa/:path*", "/guru/:path*"],
};
