import * as Sentry from "@sentry/nextjs";

function normalizeEnv() {
  const keys = [
    "DATABASE_URL", "DIRECT_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET",
    "UPSTASH_REDIS_URL", "UPSTASH_REDIS_TOKEN", "SMTP_HOST", "SMTP_PORT",
    "SMTP_USER", "SMTP_PASSWORD", "RESEND_API_KEY", "EMAIL_FROM",
    "SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT",
    "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY", "OVERPASS_API_URL", "SOLCAST_API_KEY",
    "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_APP_NAME",
  ];
  for (const key of keys) {
    const val = process.env[key];
    if (val !== undefined) process.env[key] = val.trim();
  }
}

export async function register() {
  normalizeEnv();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
