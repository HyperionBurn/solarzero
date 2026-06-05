"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function ProposalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const { data: proposal, isLoading, refetch } = api.proposal.getById.useQuery(
    { id },
    { enabled: !!id, refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 2000 : false;
    } }
  );

  const regenerateProposal = api.proposal.generate.useMutation();

  const handleRetry = async () => {
    if (!proposal?.buildingId) return;
    setRetryLoading(true);
    setRetryError(null);
    try {
      await regenerateProposal.mutateAsync({ buildingId: proposal.buildingId });
      await refetch();
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : "Failed to regenerate proposal");
    } finally {
      setRetryLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-lg text-muted-foreground">Proposal not found</p>
        <Button onClick={() => router.push("/map")}>Back to Map</Button>
      </div>
    );
  }

  const statusLabel =
    proposal.status === "pending"
      ? "Preparing..."
      : proposal.status === "processing"
        ? "Generating PDF..."
        : proposal.status === "ready"
          ? "Ready"
          : proposal.status === "failed"
            ? "Failed"
            : proposal.status;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <button
        onClick={() => router.push(proposal.buildingId ? `/buildings/${proposal.buildingId}` : "/map")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Building
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Proposal
          </CardTitle>
          <CardDescription>
            {proposal.building?.address ?? "Building"} | Assessment Report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics Summary */}
          {proposal.assessment && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-4">
              <div>
                <p className="text-xs text-muted-foreground">System Size</p>
                <p className="text-sm font-semibold">{proposal.assessment.systemSizeKwp.toFixed(1)} kWp</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Panels</p>
                <p className="text-sm font-semibold">{proposal.assessment.panelCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual Production</p>
                <p className="text-sm font-semibold">{proposal.assessment.annualProduction.toLocaleString()} kWh</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-sm font-semibold">AED {proposal.assessment.totalCostAed.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-3 rounded-lg border p-4">
            {(proposal.status === "pending" || proposal.status === "processing") && (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {proposal.status === "ready" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </div>
            )}
            {proposal.status === "failed" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                <div className="h-2 w-2 rounded-full bg-red-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium capitalize">{statusLabel}</p>
              <p className="text-xs text-muted-foreground">
                {proposal.status === "ready"
                  ? "Your proposal is ready to download."
                  : proposal.status === "failed"
                    ? "PDF generation failed. Please try again."
                    : "We are generating your proposal PDF. This may take a moment."}
              </p>
            </div>
          </div>

          {/* Download */}
          {proposal.status === "ready" && proposal.pdfUrl && (
            <a
              href={proposal.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Download Proposal (PDF)
            </a>
          )}

          {proposal.status === "ready" && !proposal.pdfUrl && (
            <Button className="w-full" disabled>
              <FileText className="mr-1.5 h-4 w-4" />
              PDF not yet available
            </Button>
          )}

          {proposal.status === "pending" && (
            <p className="text-center text-xs text-muted-foreground">
              Auto-refreshing every 3 seconds...
            </p>
          )}

          {proposal.status === "failed" && (
            <>
              {retryError && (
                <p role="alert" className="text-xs text-destructive text-center">{retryError}</p>
              )}
              <Button
                className="w-full"
                variant="outline"
                onClick={handleRetry}
                disabled={retryLoading}
              >
                {retryLoading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Retry Generation
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
