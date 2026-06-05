"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function MapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Map page error:", error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <div className="h-4 w-4 rounded-full bg-red-500" />
      </div>
      <h2 className="text-lg font-semibold">Map failed to load</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        The map could not be rendered. This is usually a temporary issue with the tile service.
      </p>
      <Button onClick={reset}>
        <RefreshCw className="mr-1.5 h-4 w-4" />
        Reload Map
      </Button>
    </div>
  );
}
