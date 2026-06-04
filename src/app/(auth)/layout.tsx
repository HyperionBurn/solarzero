export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-white px-4 dark:from-teal-950 dark:to-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white">
            SZ
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">SolarZero</h1>
          <p className="text-sm text-muted-foreground">Solar Potential Assessment for UAE</p>
        </div>
        {children}
      </div>
    </div>
  );
}
