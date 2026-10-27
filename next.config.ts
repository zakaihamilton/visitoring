import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Prevent native form posts from fixture pages even before React hydrates.
      {
        source: "/ui-preview",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; form-action 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
