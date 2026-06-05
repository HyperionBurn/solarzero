"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Loader2, ArrowLeft, RefreshCw, Zap, Sun, Clock, DollarSign, CheckCircle2, XCircle } from "lucide-react";

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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-2xl space-y-6 p-4 md:p-6"
      >
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
            <div className="rounded-[calc(0.75rem-1px)] bg-card p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!proposal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-2xl px-4 py-16 md:px-6"
      >
        <div className="flex flex-col items-center justify-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Proposal not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">The proposal you are looking for does not exist.</p>
          </div>
          <Button
            onClick={() => router.push("/map")}
            className="h-9 rounded-full px-5 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
          >
            Back to Map
          </Button>
        </div>
      </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-2xl space-y-6 p-4 md:p-6"
    >
      <button
        onClick={() => router.push(proposal.buildingId ? `/buildings/${proposal.buildingId}` : "/map")}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Building
      </button>

      <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-md dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
        <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-3 border-b border-border/40 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Proposal</h2>
              <p className="text-xs text-muted-foreground">
                {proposal.building?.address ?? "Building"} &middot; Assessment Report
              </p>
            </div>
          </div>

          <div className="space-y-5 px-5 py-4">
            {/* Metrics Summary */}
            {proposal.assessment && (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Zap, label: "System Size", value: `${proposal.assessment.systemSizeKwp.toFixed(1)} kWp` },
                  { icon: Sun, label: "Panels", value: `${proposal.assessment.panelCount}` },
                  { icon: Zap, label: "Annual Production", value: `${proposal.assessment.annualProduction.toLocaleString()} kWh` },
                  { icon: DollarSign, label: "Total Cost", value: `AED ${proposal.assessment.totalCostAed.toLocaleString()}` },
                ].map((m, i) => (
                  <div key={i} className="rounded-lg bg-muted/40 p-3 transition-colors hover:bg-muted/60">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      <m.icon className="h-3 w-3 text-primary" />
                      {m.label}
                    </div>
                    <div className="mt-1 text-sm font-bold tracking-tight">{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Status */}
            <div className={`rounded-xl border p-4 ${
              proposal.status === "ready"
                ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20"
                : proposal.status === "failed"
                  ? "border-red-200 bg-red-50/40 dark:border-red-800 dark:bg-red-950/20"
                  : "border-primary/20 bg-primary/[0.02] dark:border-primary/30"
            }`}>
              <div className="flex items-center gap-3">
                {proposal.status === "pending" || proposal.status === "processing" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : proposal.status === "ready" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold capitalize">{statusLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {proposal.status === "ready"
                      ? "Your proposal is ready to download."
                      : proposal.status === "failed"
                        ? "PDF generation failed. Please try again."
                        : "Generating your proposal PDF. This may take a moment."}
                  </p>
                </div>
              </div>
            </div>

            {/* Download */}
            {proposal.status === "ready" && proposal.pdfUrl && (
              <a
                href={proposal.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary/90 active:scale-[0.98]"
              >
                <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                Download Proposal (PDF)
              </a>
            )}

            {proposal.status === "ready" && !proposal.pdfUrl && (
              <Button className="w-full rounded-full" disabled>
                <FileText className="mr-1.5 h-4 w-4" />
                PDF not yet available
              </Button>
            )}

            {proposal.status === "pending" && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Auto-refreshing...
              </div>
            )}

            {proposal.status === "failed" && (
              <div className="space-y-3">
                {retryError && (
                  <p role="alert" className="text-center text-xs text-destructive">{retryError}</p>
                )}
                <Button
                  className="w-full rounded-full text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
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
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
