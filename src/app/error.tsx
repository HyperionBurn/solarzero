"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <span className="text-3xl">&#9888;</span>
      </div>
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
