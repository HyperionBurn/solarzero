"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("App error:", error); }, [error]);

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
          {error.digest && <p className="mt-1 text-xs text-muted-foreground">Error ID: {error.digest}</p>}
        </div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
