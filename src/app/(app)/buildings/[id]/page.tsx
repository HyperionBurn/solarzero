"use client";

import { use, useState, useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Solar3DViewer = dynamic(() => import("@/components/viewer/Solar3DViewer").then((m) => ({ default: m.Solar3DViewer })), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
});
import { Loader2, Download, Play, ArrowLeft, Zap, Sun, DollarSign, TrendingUp, Clock, Leaf, Share2, FileText, FileCheck, Sparkles, Building2 } from "lucide-react";
import { getEmirateConfig } from "@/lib/regulatory/emirates";
import { calculateAllFinancingModels, type FinancingModel } from "@/lib/engine/financing";
import { calculateSensitivity, CONSERVATIVE, EXPECTED, OPTIMISTIC, type SensitivityVariables } from "@/lib/engine/sensitivity";

const PRESETS = { CONSERVATIVE, EXPECTED, OPTIMISTIC };

const BUILDING_TYPE_COLORS: Record<string, string> = {
  warehouse: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700",
  office: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700",
  industrial: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/40 dark:text-gray-200 dark:border-gray-600",
  retail: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700",
  commercial: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700",
  residential: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-700",
};

export default function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [sensitivityVars, setSensitivityVars] = useState<SensitivityVariables>(PRESETS.EXPECTED);
  const [shareLoading, setShareLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: building, isLoading: buildingLoading, error: buildingError } = api.building.getById.useQuery({ id });
  const { data: assessment, refetch: refetchAssessment } = api.assessment.getByBuilding.useQuery({ buildingId: id });
  const runAssessment = api.assessment.run.useMutation();
  const generateProposal = api.proposal.generate.useMutation();
  const { data: proposal } = api.proposal.getByBuilding.useQuery({ buildingId: id });

  const financingModels = assessment ? calculateAllFinancingModels({
    totalCostAed: assessment.totalCostAed,
    annualProductionKwh: assessment.annualProduction,
    annualSavingsAed: assessment.annualSavingsAed,
    paybackYears: assessment.paybackYears,
    npv25yrAed: assessment.npv25yrAed,
    co2OffsetTons: assessment.co2OffsetTons,
    dewaTariffAed: assessment.dewaTariffAed,
  }) : [];

  const sensitivityResult = assessment ? calculateSensitivity({
    totalCostAed: assessment.totalCostAed,
    annualSavingsAed: assessment.annualSavingsAed,
    annualProductionKwh: assessment.annualProduction,
    npv25yrAed: assessment.npv25yrAed,
    paybackYears: assessment.paybackYears,
    dewaTariffAed: assessment.dewaTariffAed,
  }, sensitivityVars) : null;

  const handleRunAssessment = async () => {
    setAssessmentLoading(true);
    try {
      await runAssessment.mutateAsync({ buildingId: id });
      await refetchAssessment();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Assessment failed. Please try again.", "error");
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleExportProposal = async () => {
    setExportLoading(true);
    try {
      const result = await generateProposal.mutateAsync({ buildingId: id });
      if (result?.id) {
        router.push(`/proposals/${result.id}`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate proposal.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const handleShareProposal = async () => {
    setShareLoading(true);
    try {
      const result = await generateProposal.mutateAsync({ buildingId: id });
      if (result?.id) {
        await navigator.clipboard.writeText(`${window.location.origin}/p/${result.id}`);
        showToast("Proposal link copied to clipboard!", "success");
      }
    } catch (err) {
      console.error("Share proposal failed:", err);
      showToast("Failed to create share link. Please try again.", "error");
    } finally {
      setShareLoading(false);
    }
  };

  if (buildingLoading) {
    return (
      <div className="animate-fadeIn space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-96 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </div>
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (buildingError || !building) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <Building2 className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Building not found</h2>
        <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
          The requested building could not be located. It may have been removed or the link might be incorrect.
        </p>
        <Button className="mt-6 h-9 rounded-lg px-5 text-xs font-semibold active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" onClick={() => router.push("/map")}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Map
        </Button>
      </div>
    );
  }

  const typeColor = BUILDING_TYPE_COLORS[building.buildingType ?? ""] ?? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300";

  // Pre-compute emirate & utility info (avoid IIFEs in JSX)
  const emirateInfo = (building.lat && building.lng) ? getEmirateConfig(building.lat, building.lng) : null;
  const utilColors: Record<string, string> = {
    DEWA: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700",
    ADDC: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700",
    SEWA: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700",
    FEWA: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/40 dark:text-gray-200 dark:border-gray-600",
  };
  const utilityColorClass = emirateInfo ? (utilColors[emirateInfo.utility] ?? "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/40 dark:text-slate-200") : "";
  const tariffDisplay = emirateInfo
    ? ` | Tariff: ${emirateInfo.tariffSlabs[0]?.rate?.toFixed(2) ?? "0.32"} AED/kWh (${emirateInfo.utility})`
    : "";

  const springFast = { type: "spring" as const, stiffness: 400, damping: 28 };
  const springGentle = { type: "spring" as const, stiffness: 260, damping: 24 };
  const springBouncy = { type: "spring" as const, stiffness: 500, damping: 22, bounce: 0.25 };
  const fadeUp = (d: number) => ({ initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { ...springGentle, delay: d } });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
      className="space-y-6 p-6"
    >
      {toast && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          className={`fixed right-4 top-4 z-50 overflow-hidden rounded-xl border shadow-lg backdrop-blur-xl ${
            toast.type === "success"
              ? "border-emerald-200 dark:border-emerald-800"
              : "border-red-200 dark:border-red-800"
          }`}
          key={toast.message}
        >
          <div className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200"
              : "bg-red-50/90 text-red-800 dark:bg-red-950/80 dark:text-red-200"
          }`}>
            {toast.type === "success" ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              </div>
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
                <svg className="h-3 w-3 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
            )}
            <span className="flex-1">{toast.message}</span>
          </div>
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 4, ease: "linear" }}
            className={`h-0.5 ${
              toast.type === "success"
                ? "bg-emerald-500/50 dark:bg-emerald-400/50"
                : "bg-red-500/50 dark:bg-red-400/50"
            }`}
          />
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => router.push("/map")}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.97]"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Map
          </button>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{building.address}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] shadow-xs transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] ${typeColor}`}>
              {building.buildingType ?? "Unknown"}
            </span>
            {emirateInfo && (
              <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] shadow-xs transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] ${utilityColorClass}`}>
                {emirateInfo.name} · {emirateInfo.utility}
              </span>
            )}
            {building.roofAreaM2 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-medium tabular-nums">{Math.round(building.roofAreaM2).toLocaleString()}</span> m² roof
              </span>
            )}
            {building.heightMeters && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-medium tabular-nums">{building.heightMeters}</span> m height
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRunAssessment}
            disabled={assessmentLoading || runAssessment.isPending}
            variant="secondary"
            className="h-9 rounded-lg px-4 text-xs font-semibold active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            {(assessmentLoading || runAssessment.isPending) ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-3.5 w-3.5" />
            )}
            {assessment ? "Re-run Assessment" : "Run Assessment"}
          </Button>
          {assessment && (
            <>
              <Button
                onClick={handleExportProposal}
                disabled={exportLoading || generateProposal.isPending}
                className="h-9 rounded-lg px-4 text-xs font-semibold active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                {(exportLoading || generateProposal.isPending) ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                Export Proposal
              </Button>
              <Button onClick={handleShareProposal} disabled={shareLoading} variant="outline" className="h-9 rounded-lg px-3">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assessment content */}
        <div className="space-y-4 lg:col-span-2">
          {assessment ? (
            <>
              {/* Solar Assessment Results */}
              <motion.div {...fadeUp(0)} className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
                  <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-tight">Solar Assessment Results</h3>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                        Data source: {assessment.dataSource} &middot; GHI: {Math.round(assessment.ghiAnnual)} kWh/m&sup2;/yr{tariffDisplay}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Sun className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
                    <MetricCard icon={Zap} label="System Size" value={`${assessment.systemSizeKwp.toFixed(1)} kWp`} />
                    <MetricCard icon={Sun} label="Panels" value={`${assessment.panelCount}`} />
                    <MetricCard icon={Zap} label="Annual Production" value={`${Math.round(assessment.annualProduction).toLocaleString()} kWh`} />
                    <MetricCard icon={DollarSign} label="Total Cost" value={`AED ${Math.round(assessment.totalCostAed).toLocaleString()}`} />
                    <MetricCard icon={DollarSign} label="Annual Savings" value={`AED ${Math.round(assessment.annualSavingsAed).toLocaleString()}`} />
                    <MetricCard icon={Clock} label="Payback" value={`${assessment.paybackYears.toFixed(1)} years`} />
                    <MetricCard icon={TrendingUp} label="NPV (25yr)" value={`AED ${Math.round(assessment.npv25yrAed).toLocaleString()}`} />
                    <MetricCard icon={Leaf} label="CO₂ Offset" value={`${assessment.co2OffsetTons.toFixed(1)} tons/yr`} />
                  </div>
                </div>
              </motion.div>

              {/* Financing Options */}
              <motion.div {...fadeUp(0.1)} className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
                  <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-tight">Financing Options</h3>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                        Compare PPA, Lease, ESCO, and Direct Purchase
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
                    {financingModels.map((model) => (
                      <FinancingModelCard key={model.type} model={model} />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Sensitivity Analysis */}
              <motion.div {...fadeUp(0.2)} className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
                  <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-tight">Sensitivity Analysis</h3>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                        Adjust key variables to see impact on NPV and payback
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6 px-5 py-4">
                    {/* Preset Buttons */}
                    <div className="flex gap-2">
                      {(["CONSERVATIVE", "EXPECTED", "OPTIMISTIC"] as const).map((preset) => (
                        <Button
                          key={preset}
                          variant={sensitivityVars === PRESETS[preset] ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSensitivityVars(PRESETS[preset])}
                        >
                          {preset.charAt(0) + preset.slice(1).toLowerCase()}
                        </Button>
                      ))}
                    </div>

                    {/* Sliders */}
                    <div className="space-y-4">
                      <SliderRow
                        label="DEWA Tariff"
                        value={sensitivityVars.tariffPercent}
                        min={-30}
                        max={30}
                        step={1}
                        unit="%"
                        onChange={(v) => setSensitivityVars({ ...sensitivityVars, tariffPercent: v })}
                      />
                      <SliderRow
                        label="Installation Cost"
                        value={sensitivityVars.costPercent}
                        min={-20}
                        max={20}
                        step={1}
                        unit="%"
                        onChange={(v) => setSensitivityVars({ ...sensitivityVars, costPercent: v })}
                      />
                      <SliderRow
                        label="Panel Degradation"
                        value={sensitivityVars.degradationPercent}
                        min={-50}
                        max={50}
                        step={1}
                        unit="%"
                        onChange={(v) => setSensitivityVars({ ...sensitivityVars, degradationPercent: v })}
                      />
                      <SliderRow
                        label="Discount Rate"
                        value={sensitivityVars.discountRatePercent}
                        min={-30}
                        max={30}
                        step={1}
                        unit="%"
                        onChange={(v) => setSensitivityVars({ ...sensitivityVars, discountRatePercent: v })}
                      />
                    </div>

                    {/* Summary + Tornado */}
                    {sensitivityResult && assessment && (
                      <>
                        <div className="border-t border-border/40" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                            <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">NPV</span>
                              <div className="mt-1.5 text-lg font-bold leading-none tracking-tight"><span className="text-muted-foreground/60">AED </span><AnimatedValue value={sensitivityResult.adjustedNpv} /></div>
                              <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/60">Baseline: AED {sensitivityResult.baselineNpv.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                            <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Payback</span>
                              <div className="mt-1.5 text-lg font-bold leading-none tracking-tight"><AnimatedValue value={sensitivityResult.adjustedPayback} decimals={1} suffix=" yrs" /></div>
                              <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/60">Baseline: {sensitivityResult.baselinePayback.toFixed(1)} yrs</div>
                            </div>
                          </div>
                        </div>

                        {/* Tornado Chart */}
                        <div>
                          <h4 className="mb-3 text-[15px] font-semibold tracking-tight">Tornado Chart — Variable Impact</h4>
                          <div className="space-y-2">
                            {sensitivityResult.tornadoData.map((item) => {
                              const maxImpact = sensitivityResult.tornadoData[0]!.impact || 1;
                              const barWidth = (item.impact / maxImpact) * 100;
                              return (
                                <div key={item.variable}>
                                  <div className="mb-0.5 flex justify-between text-xs">
                                    <span className="font-medium">{item.label}</span>
                                    <span className="text-muted-foreground">
                                      AED {Math.abs(item.impact).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="h-5 w-full overflow-hidden rounded bg-muted">
                                    <motion.div
                                      className="h-full rounded bg-gradient-to-r from-amber-400 to-emerald-400"
                                      initial={{ width: "0%" }}
                                      whileInView={{ width: `${Math.max(barWidth, 4)}%` }}
                                      viewport={{ once: true }}
                                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* 3D Viewer */}
              <motion.div {...fadeUp(0.3)} className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
                  <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                    <div>
                      <h3 className="text-[15px] font-semibold tracking-tight">3D Solar Visualization</h3>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                        System: {assessment.systemSizeKwp.toFixed(1)} kWp &middot; Panels: {assessment.panelCount}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Sun className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="h-[400px] w-full overflow-hidden">
                    <Solar3DViewer
                      buildingType={building.buildingType ?? "commercial"}
                      roofAreaM2={building.roofAreaM2 ?? 100}
                      heightMeters={building.heightMeters ?? 12}
                      panelCount={assessment.panelCount}
                    />
                  </div>
                  <div className="border-t border-border/40 px-5 py-2.5">
                    <span className="text-[10px] text-muted-foreground/50">
                      Drag to rotate &middot; Scroll to zoom &middot; Right-drag to pan
                    </span>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div {...fadeUp(0)} className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
              <div className="rounded-[calc(0.75rem-1px)] bg-card px-6 py-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold tracking-tight">No Assessment Yet</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Run an assessment to see solar potential for this building.
                    </p>
                  </div>
                  <Button
                    onClick={handleRunAssessment}
                    disabled={assessmentLoading}
                    className="h-9 rounded-full px-5 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
                  >
                    {assessmentLoading ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Run Assessment
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <motion.div {...fadeUp(0.35)} className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
            <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
              <div className="border-b border-border/40 px-4 py-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Building Info</h3>
              </div>
              <div className="px-4 py-1">
                <SidebarRow label="OSM ID" value={building.osmId ?? "N/A"} />
                <SidebarRow label="Type" value={building.buildingType ?? "Unknown"} />
                <SidebarRow label="Roof Area" value={building.roofAreaM2 ? `${Math.round(building.roofAreaM2)} m²` : "N/A"} />
                <SidebarRow label="Height" value={building.heightMeters ? `${building.heightMeters}m` : "N/A"} />
                {emirateInfo && (
                  <>
                    <div className="my-1.5 border-t border-border/20" />
                    <SidebarRow label="Emirate" value={emirateInfo.name} />
                    <SidebarRow label="Utility" value={emirateInfo.utility} />
                    <SidebarRow label="Tariff" value={`${emirateInfo.tariffSlabs[0]?.rate?.toFixed(2) ?? "0.32"} AED/kWh`} />
                    <SidebarRow label="Net Metering" value={emirateInfo.netMetering.replace(/_/g, " ")} />
                  </>
                )}
                <div className="my-1.5 border-t border-border/20" />
                <SidebarRow label="Latitude" value={building.lat.toFixed(5)} />
                <SidebarRow label="Longitude" value={building.lng.toFixed(5)} />
              </div>
            </div>
          </motion.div>

          {proposal && proposal.status !== "pending" && (
            <motion.div {...fadeUp(0.45)} className="group shimmer-border rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md dark:from-amber-500/10 dark:to-transparent dark:ring-white/[0.04]">
              <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold">Proposal</p>
                    <p className="text-[11px] text-muted-foreground">
                      Status: <span className="font-medium capitalize text-primary">{proposal.status}</span>
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                    <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <Button
                  className="mt-3 h-8 w-full rounded-lg text-[11px] font-semibold active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  onClick={() => router.push(`/proposals/${proposal.id}`)}
                >
                  View Proposal
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedValue({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayed(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref}>
      {prefix}{displayed.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  const numericMatch = value.match(/^(?:AED?\s*)?([\d,]+(?:\.\d+)?)/);
  const hasPrefix = value.startsWith("AED ");
  const numericVal = numericMatch ? parseFloat(numericMatch[1]!.replace(/,/g, "")) : null;
  const rawVal = numericMatch ? value.replace(numericMatch[0], "").trim() : value;

  return (
    <div className="group shimmer-border rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
      <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary/15 dark:bg-primary/15">
            <Icon className="h-3 w-3 text-primary" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        </div>
        <div className="text-sm font-bold leading-snug tracking-tight">
          {numericVal !== null ? (
            hasPrefix ? (
              <><span className="text-muted-foreground/60">AED </span><AnimatedValue value={numericVal} decimals={value.includes(".") ? 1 : 0} />{rawVal && <> {rawVal}</>}</>
            ) : (
              <AnimatedValue value={numericVal} decimals={value.includes(".") ? 1 : 0} suffix={rawVal ? ` ${rawVal}` : ""} />
            )
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

const FINANCING_CONFIG: Record<string, { gradient: string; icon: React.ComponentType<{ className?: string }> }> = {
  DIRECT: {
    gradient: "from-red-500/15 via-transparent to-red-500/5 dark:from-red-500/10 dark:to-transparent",
    icon: DollarSign,
  },
  PPA: {
    gradient: "from-green-500/15 via-transparent to-green-500/5 dark:from-green-500/10 dark:to-transparent",
    icon: FileText,
  },
  LEASE: {
    gradient: "from-blue-500/15 via-transparent to-blue-500/5 dark:from-blue-500/10 dark:to-transparent",
    icon: FileCheck,
  },
  ESCO: {
    gradient: "from-purple-500/15 via-transparent to-purple-500/5 dark:from-purple-500/10 dark:to-transparent",
    icon: Sparkles,
  },
};

function FinancingModelCard({ model }: { model: FinancingModel }) {
  const config = FINANCING_CONFIG[model.type];
  const Icon = config?.icon ?? Building2;
  const gradClass = config?.gradient ?? "from-gray-500/15 via-transparent to-gray-500/5 dark:from-gray-500/10 dark:to-transparent";
  return (
    <div className={`group shimmer-border rounded-xl bg-gradient-to-br ${gradClass} p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md dark:ring-white/[0.04]`}>
      <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] transition-shadow duration-500 group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_0_50px_-20px_hsl(var(--primary)/0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_50px_-20px_hsl(var(--primary)/0.15)]">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary/15 dark:bg-primary/15">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-[15px] font-semibold tracking-tight">{model.name}</h3>
          </div>
          {model.recommended && (
            <motion.span
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary dark:bg-primary/20"
            >
              Recommended
            </motion.span>
          )}
        </div>
        <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground/80">{model.description}</p>
        <div className="space-y-1.5">
          <FinancingRow label="Upfront" value={`AED ${model.upfrontCostAED.toLocaleString()}`} />
          {model.monthlyPaymentAED > 0 && (
            <FinancingRow label="Monthly" value={`AED ${model.monthlyPaymentAED.toLocaleString()}`} />
          )}
          <FinancingRow label="Annual Savings" value={`AED ${model.annualSavingsAED.toLocaleString()}`} highlight />
          <FinancingRow label="25yr NPV" value={`AED ${model.npv25yrAED.toLocaleString()}`} highlight />
        </div>
      </div>
    </div>
  );
}

function FinancingRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const isCustomized = value !== 0;
  return (
    <div className="group">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[12px] font-semibold tabular-nums leading-none transition-all duration-300 ${
          isCustomized
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}>
          {value > 0 ? "+" : ""}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="premium-range"
        style={{ '--pct': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/60">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}


