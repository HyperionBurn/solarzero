"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const Solar3DViewer = dynamic(() => import("@/components/viewer/Solar3DViewer").then((m) => ({ default: m.Solar3DViewer })), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
});
import { Loader2, Download, Play, ArrowLeft, Zap, Sun, DollarSign, TrendingUp, Clock, Leaf, Share2 } from "lucide-react";
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
    } catch {
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

  const typeColor = BUILDING_TYPE_COLORS[building.buildingType ?? ""] ?? "bg-slate-100 text-slate-800 border-slate-300";

  // Pre-compute emirate & utility info (avoid IIFEs in JSX)
  const emirateInfo = (building.lat && building.lng) ? getEmirateConfig(building.lat, building.lng) : null;
  const utilColors: Record<string, string> = {
    DEWA: "bg-blue-100 text-blue-800 border-blue-300",
    ADDC: "bg-green-100 text-green-800 border-green-300",
    SEWA: "bg-orange-100 text-orange-800 border-orange-300",
    FEWA: "bg-gray-100 text-gray-800 border-gray-300",
  };
  const utilityColorClass = emirateInfo ? (utilColors[emirateInfo.utility] ?? "bg-slate-100 text-slate-800 border-slate-300") : "";
  const tariffDisplay = emirateInfo
    ? ` | Tariff: ${emirateInfo.tariffSlabs[0]?.rate?.toFixed(2) ?? "0.32"} AED/kWh (${emirateInfo.utility})`
    : "";

  return (
    <div className="space-y-6 p-6">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 animate-in slide-in-from-right rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
          key={toast.message}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push("/map")} className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Map
          </button>
          <h1 className="text-2xl font-bold">{building.address}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-medium ${typeColor}`}>
              {building.buildingType ?? "Unknown"}
            </span>
            {emirateInfo && (
              <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-medium ${utilityColorClass}`}>
                {emirateInfo.name} · {emirateInfo.utility}
              </span>
            )}
            {building.roofAreaM2 && (
              <span className="text-sm text-muted-foreground">
                Roof Area: {Math.round(building.roofAreaM2)} m²
              </span>
            )}
            {building.heightMeters && (
              <span className="text-sm text-muted-foreground">
                Height: {building.heightMeters}m
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleRunAssessment}
            disabled={assessmentLoading || runAssessment.isPending}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {(assessmentLoading || runAssessment.isPending) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {assessment ? "Re-run Assessment" : "Run Assessment"}
          </Button>
          {assessment && (
            <>
              <Button
                onClick={handleExportProposal}
                disabled={exportLoading || generateProposal.isPending}
                className="w-full sm:w-auto"
              >
                {(exportLoading || generateProposal.isPending) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export Proposal
              </Button>
              <Button onClick={handleShareProposal} disabled={shareLoading} variant="outline" className="w-full sm:w-auto">
                <Share2 className="mr-2 h-4 w-4" />
                Share Proposal
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assessment Results */}
        <div className="space-y-4 lg:col-span-2">
          {assessment ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Solar Assessment Results</CardTitle>
                  <CardDescription>
                    Data source: {assessment.dataSource} | GHI: {Math.round(assessment.ghiAnnual)} kWh/m²/yr{tariffDisplay}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <MetricCard icon={Zap} label="System Size" value={`${assessment.systemSizeKwp.toFixed(1)} kWp`} />
                    <MetricCard icon={Sun} label="Panels" value={`${assessment.panelCount}`} />
                    <MetricCard icon={Zap} label="Annual Production" value={`${Math.round(assessment.annualProduction).toLocaleString()} kWh`} />
                    <MetricCard icon={DollarSign} label="Total Cost" value={`AED ${Math.round(assessment.totalCostAed).toLocaleString()}`} />
                    <MetricCard icon={DollarSign} label="Annual Savings" value={`AED ${Math.round(assessment.annualSavingsAed).toLocaleString()}`} />
                    <MetricCard icon={Clock} label="Payback" value={`${assessment.paybackYears.toFixed(1)} years`} />
                    <MetricCard icon={TrendingUp} label="NPV (25yr)" value={`AED ${Math.round(assessment.npv25yrAed).toLocaleString()}`} />
                    <MetricCard icon={Leaf} label="CO₂ Offset" value={`${assessment.co2OffsetTons.toFixed(1)} tons/yr`} />
                  </div>
                </CardContent>
              </Card>

              {/* Financing Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Financing Options</CardTitle>
                  <CardDescription>
                    Compare PPA, Lease, ESCO, and Direct Purchase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {financingModels.map((model) => (
                      <FinancingModelCard key={model.type} model={model} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sensitivity Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Sensitivity Analysis</CardTitle>
                  <CardDescription>
                    Adjust key variables to see impact on NPV and payback
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  {/* Summary */}
                  {sensitivityResult && assessment && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">NPV</div>
                          <div className="text-lg font-bold">
                            AED {sensitivityResult.adjustedNpv.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Baseline: AED {sensitivityResult.baselineNpv.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">Payback</div>
                          <div className="text-lg font-bold">
                            {sensitivityResult.adjustedPayback.toFixed(1)} yrs
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Baseline: {sensitivityResult.baselinePayback.toFixed(1)} yrs
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
                </CardContent>
              </Card>

              {/* 3D Viewer */}
              <Card>
                <CardHeader>
                  <CardTitle>3D Solar Visualization</CardTitle>
                  <CardDescription>
                    System: {assessment.systemSizeKwp.toFixed(1)} kWp | Panels: {assessment.panelCount}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full overflow-hidden rounded-lg border">
                    <Solar3DViewer
                      buildingType={building.buildingType ?? "commercial"}
                      roofAreaM2={building.roofAreaM2 ?? 100}
                      heightMeters={building.heightMeters ?? 12}
                      panelCount={assessment.panelCount}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <span className="text-xs text-muted-foreground">
                    Drag to rotate | Scroll to zoom | Right-drag to pan
                  </span>
                </CardFooter>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Assessment Yet</CardTitle>
                <CardDescription>
                  Run an assessment to see solar potential for this building.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed">
                  <div className="text-center">
                    <Zap className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Click &quot;Run Assessment&quot; to calculate solar potential
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleRunAssessment} disabled={assessmentLoading} className="w-full">
                  {assessmentLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run Assessment
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Building Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="OSM ID" value={building.osmId ?? "N/A"} />
              <InfoRow label="Type" value={building.buildingType ?? "Unknown"} />
              <InfoRow label="Roof Area" value={building.roofAreaM2 ? `${Math.round(building.roofAreaM2)} m²` : "N/A"} />
              <InfoRow label="Height" value={building.heightMeters ? `${building.heightMeters}m` : "N/A"} />
              {emirateInfo && (
                <>
                  <Separator />
                  <InfoRow label="Emirate" value={emirateInfo.name} />
                  <InfoRow label="Utility" value={emirateInfo.utility} />
                  <InfoRow label="Tariff" value={`${emirateInfo.tariffSlabs[0]?.rate?.toFixed(2) ?? "0.32"} AED/kWh`} />
                  <InfoRow label="Net Metering" value={emirateInfo.netMetering.replace(/_/g, " ")} />
                </>
              )}
              <Separator />
              <InfoRow label="Latitude" value={building.lat.toFixed(5)} />
              <InfoRow label="Longitude" value={building.lng.toFixed(5)} />
            </CardContent>
          </Card>

          {proposal && proposal.status !== "pending" && (
            <Card>
              <CardHeader>
                <CardTitle>Proposal</CardTitle>
                <CardDescription>
                  Status: <span className="font-medium capitalize">{proposal.status}</span>
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => router.push(`/proposals/${proposal.id}`)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  View Proposal
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const FINANCING_COLORS: Record<string, string> = {
  DIRECT: "border-red-200 bg-red-50/50",
  PPA: "border-green-200 bg-green-50/50",
  LEASE: "border-blue-200 bg-blue-50/50",
  ESCO: "border-purple-200 bg-purple-50/50",
};

function FinancingModelCard({ model }: { model: FinancingModel }) {
  const colorClass = FINANCING_COLORS[model.type] ?? "border-gray-200 bg-gray-50/50";
  return (
    <div className={`rounded-lg border p-3 ${colorClass}`}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{model.name}</h3>
        {model.recommended && (
          <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">
            Recommended
          </span>
        )}
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">{model.description}</p>
      <div className="space-y-0.5 text-xs">
        <FinancingRow label="Upfront" value={`AED ${model.upfrontCostAED.toLocaleString()}`} />
        {model.monthlyPaymentAED > 0 && (
          <FinancingRow label="Monthly" value={`AED ${model.monthlyPaymentAED.toLocaleString()}`} />
        )}
        <FinancingRow label="Annual Savings" value={`AED ${model.annualSavingsAED.toLocaleString()}`} />
        <FinancingRow label="25yr NPV" value={`AED ${model.npv25yrAED.toLocaleString()}`} />
      </div>
    </div>
  );
}

function FinancingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
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
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
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
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}


