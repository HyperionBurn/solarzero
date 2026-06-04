$vars = @{
  "DATABASE_URL" = "postgresql://postgres:JYqsJrbAzM9cext1@db.jlqgkxyjtqxeyzhrdyax.supabase.co:5432/postgres"
  "DIRECT_URL" = "postgresql://postgres:JYqsJrbAzM9cext1@db.jlqgkxyjtqxeyzhrdyax.supabase.co:5432/postgres"
  "NEXTAUTH_URL" = "https://solarzero.vercel.app"
  "NEXTAUTH_SECRET" = "d0197e5202d364faa1d741c1b763fe4a"
  "NEXT_PUBLIC_SUPABASE_URL" = "https://jlqgkxyjtqxeyzhrdyax.supabase.co"
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" = "sb_publishable_aE23Q7S2KhM2zv95ErjSYA_syiPI2ow"
  "SUPABASE_SERVICE_ROLE_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscWdreHlqdHF4ZXl6aHJkeWF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU3MDQyNiwiZXhwIjoyMDk2MTQ2NDI2fQ.zp68L6DVX-BESNpgnlL4nKFtN_k3j5FS-XVAfIXzCLs"
  "UPSTASH_REDIS_URL" = "rediss://default:gQAAAAAAAcB7AAIgcDIzZmExMzBmYmFiYjU0NDA5YTMyZDAyZGE4YzAzODdkOQ@moral-chamois-114811.upstash.io:6379"
  "UPSTASH_REDIS_TOKEN" = "gQAAAAAAAcB7AAIgcDIzZmExMzBmYmFiYjU0NDA5YTMyZDAyZGE4YzAzODdkOQ"
  "SMTP_HOST" = "smtp.resend.com"
  "SMTP_PORT" = "587"
  "SMTP_USER" = "resend"
  "SMTP_PASSWORD" = "re_QbVCecjU_LoqaTFoJkx7PpbJdhe6SDtfY"
  "EMAIL_FROM" = "SolarZero <onboarding@resend.dev>"
  "RESEND_API_KEY" = "re_QbVCecjU_LoqaTFoJkx7PpbJdhe6SDtfY"
  "NEXT_PUBLIC_APP_NAME" = "SolarZero"
  "NEXT_PUBLIC_APP_URL" = "https://solarzero.vercel.app"
  "NEXT_PUBLIC_SENTRY_DSN" = "https://a01c96e3255129b995d76eebd8c0191b@o4511507472711680.ingest.de.sentry.io/4511507502661712"
  "SENTRY_ORG" = "test-370"
  "SENTRY_PROJECT" = "javascript-nextjs"
  "SENTRY_AUTH_TOKEN" = "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"
  "OVERPASS_API_URL" = "https://overpass-api.de/api/interpreter"
  "SOLCAST_API_KEY" = ""
  "NEXT_PUBLIC_MAPBOX_TOKEN" = ""
}

foreach ($key in $vars.Keys) {
  $val = $vars[$key]
  $tmpFile = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmpFile, $val)
  Get-Content $tmpFile | vercel env add $key production --force 2>&1
  Remove-Item $tmpFile
}
