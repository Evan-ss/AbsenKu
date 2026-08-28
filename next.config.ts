import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix "multiple lockfiles" warning: explicitly set workspace root
  turbopack: {
    root: path.join(__dirname),
  },
  // Enable React strict mode for development
  reactStrictMode: true,

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Allow face-api.js CDN models
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "justadudewhohacks.github.io",
      },
    ],
  },

};

export default nextConfig;
