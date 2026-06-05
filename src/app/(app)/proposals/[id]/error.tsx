"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function ProposalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Proposal page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
        <div className="h-4 w-4 rounded-full bg-red-500" />
      </div>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load this proposal. It may have been removed or a server error occurred.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Go Back
        </Button>
        <Button onClick={reset}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
