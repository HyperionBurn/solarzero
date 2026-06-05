"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
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
  warehouse: "bg-orange-100 text-orange-800 border-orange-300",
  office: "bg-blue-100 text-blue-800 border-blue-300",
  industrial: "bg-gray-100 text-gray-800 border-gray-300",
  retail: "bg-green-100 text-green-800 border-green-300",
  commercial: "bg-purple-100 text-purple-800 border-purple-300",
  residential: "bg-teal-100 text-teal-800 border-teal-300",
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
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (buildingError || !building) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <h2 className="text-xl font-semibold">Building not found</h2>
        <p className="mt-2 text-muted-foreground">The requested building could not be found.</p>
        <Button className="mt-4" onClick={() => router.push("/map")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Map
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6 p-6"
    >
      {toast && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-xl ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200"
              : "border-red-200 bg-red-50/90 text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200"
          }`}
          key={toast.message}
        >
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
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => router.push("/map")}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Map
          </button>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{building.address}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ${typeColor}`}>
              {building.buildingType ?? "Unknown"}
            </span>
            {emirateInfo && (
              <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ${utilityColorClass}`}>
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
            className="h-9 rounded-lg px-4 text-xs font-semibold"
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
                className="h-9 rounded-lg px-4 text-xs font-semibold"
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
              <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold">Solar Assessment Results</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Data source: {assessment.dataSource} | GHI: {Math.round(assessment.ghiAnnual)} kWh/m²/yr{tariffDisplay}
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
              </div>

              {/* Financing Options */}
              <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold">Financing Options</h3>
                      <p className="text-[11px] text-muted-foreground">
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
              </div>

              {/* Sensitivity Analysis */}
              <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold">Sensitivity Analysis</h3>
                      <p className="text-[11px] text-muted-foreground">
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
                          <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                            <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">NPV</span>
                              <div className="mt-1 text-base font-bold tracking-tight">AED {sensitivityResult.adjustedNpv.toLocaleString()}</div>
                              <div className="mt-0.5 text-[10px] text-muted-foreground/60">Baseline: AED {sensitivityResult.baselineNpv.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                            <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Payback</span>
                              <div className="mt-1 text-base font-bold tracking-tight">{sensitivityResult.adjustedPayback.toFixed(1)} yrs</div>
                              <div className="mt-0.5 text-[10px] text-muted-foreground/60">Baseline: {sensitivityResult.baselinePayback.toFixed(1)} yrs</div>
                            </div>
                          </div>
                        </div>

                        {/* Tornado Chart */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold">Tornado Chart — Variable Impact</h4>
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
                                    <div
                                      className="h-full rounded bg-gradient-to-r from-amber-400 to-emerald-400"
                                      style={{ width: `${Math.max(barWidth, 4)}%` }}
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
              </div>

              {/* 3D Viewer */}
              <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
                <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold">3D Solar Visualization</h3>
                      <p className="text-[11px] text-muted-foreground">
                        System: {assessment.systemSizeKwp.toFixed(1)} kWp | Panels: {assessment.panelCount}
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
                    <span className="text-[10px] text-muted-foreground/60">
                      Drag to rotate · Scroll to zoom · Right-drag to pan
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-md dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
              <div className="rounded-[calc(0.75rem-1px)] bg-card px-6 py-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">No Assessment Yet</h3>
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
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
            <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="border-b border-border/40 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Building Info</h3>
              </div>
              <div className="divide-y divide-border/40 px-4 py-2">
                <SidebarRow label="OSM ID" value={building.osmId ?? "N/A"} />
                <SidebarRow label="Type" value={building.buildingType ?? "Unknown"} />
                <SidebarRow label="Roof Area" value={building.roofAreaM2 ? `${Math.round(building.roofAreaM2)} m²` : "N/A"} />
                <SidebarRow label="Height" value={building.heightMeters ? `${building.heightMeters}m` : "N/A"} />
                {emirateInfo && (
                  <>
                    <div className="my-1 border-t border-border/20" />
                    <SidebarRow label="Emirate" value={emirateInfo.name} />
                    <SidebarRow label="Utility" value={emirateInfo.utility} />
                    <SidebarRow label="Tariff" value={`${emirateInfo.tariffSlabs[0]?.rate?.toFixed(2) ?? "0.32"} AED/kWh`} />
                    <SidebarRow label="Net Metering" value={emirateInfo.netMetering.replace(/_/g, " ")} />
                  </>
                )}
                <div className="my-1 border-t border-border/20" />
                <SidebarRow label="Latitude" value={building.lat.toFixed(5)} />
                <SidebarRow label="Longitude" value={building.lng.toFixed(5)} />
              </div>
            </div>
          </div>

          {proposal && proposal.status !== "pending" && (
            <div className="group rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-md dark:from-amber-500/10 dark:to-transparent dark:ring-white/[0.04]">
              <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Proposal</p>
                    <p className="text-[11px] text-muted-foreground">
                      Status: <span className="font-medium capitalize text-primary">{proposal.status}</span>
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                    <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <Button
                  className="mt-3 h-8 w-full rounded-lg text-[11px] font-semibold"
                  onClick={() => router.push(`/proposals/${proposal.id}`)}
                >
                  View Proposal
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
      <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 transition-colors group-hover:bg-primary/15 dark:bg-primary/15">
            <Icon className="h-3 w-3 text-primary" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
        </div>
        <div className="text-sm font-bold tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
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
    <div className={`group rounded-xl bg-gradient-to-br ${gradClass} p-[1px] shadow-xs ring-1 ring-black/[0.02] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md dark:ring-white/[0.04]`}>
      <div className="rounded-[calc(0.75rem-1px)] bg-card px-4 py-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15 dark:bg-primary/15">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">{model.name}</h3>
          </div>
          {model.recommended && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary dark:bg-primary/20">
              Recommended
            </span>
          )}
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{model.description}</p>
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
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</span>
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
        <span className="text-xs font-medium">{label}</span>
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-all duration-300 ${
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
        className="premium-range accent-primary"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/60">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}


