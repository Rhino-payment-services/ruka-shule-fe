import type { NextConfig } from "next";

const backendURL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    // Same-origin /api proxy so httpOnly cookies are scoped to the FE host.
    return [
      {
        source: "/api/:path*",
        destination: `${backendURL.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
