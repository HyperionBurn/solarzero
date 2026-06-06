import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { cleanEnvValue } from "./src/lib/env";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ["pdfmake", "@foliojs-fork/fontkit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tiles.maplibre.org",
      },
    ],
    deviceSizes: [640, 750, 1080, 1920],
    imageSizes: [16, 32, 48, 96, 128, 256],
    formats: ["image/webp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*.(svg|png|jpg|jpeg|gif|webp|woff2|woff|css|js)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: cleanEnvValue(process.env.SENTRY_ORG) || undefined,
  project: cleanEnvValue(process.env.SENTRY_PROJECT) || undefined,
  authToken: cleanEnvValue(process.env.SENTRY_AUTH_TOKEN) || undefined,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
