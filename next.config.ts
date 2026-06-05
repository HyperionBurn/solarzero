import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { cleanEnvValue } from "./src/lib/env";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdfmake", "@foliojs-fork/fontkit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tiles.maplibre.org",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
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
