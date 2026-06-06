"use client";

import { use, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, animate } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  Zap,
  Sun,
  DollarSign,
  TrendingUp,
  Loader2,
  Play,
  Download,
  Share2,
  Copy,
  FileCheck,
  FileText,
  Sparkles,
  PlusCircle,
  X,
  MessageSquare
} from "lucide-react";

import { getEmirateConfig } from "@/lib/regulatory/emirates";
import { calculateAllFinancingModels, type FinancingModel } from "@/lib/engine/financing";
import { calculateSensitivity, CONSERVATIVE, EXPECTED, OPTIMISTIC, type SensitivityVariables } from "@/lib/engine/sensitivity";

const PRESETS = { CONSERVATIVE, EXPECTED, OPTIMISTIC };

const Solar3DViewer = dynamic(
  () => import("@/components/viewer/Solar3DViewer").then((m) => ({ default: m.Solar3DViewer })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
  }
);

// Helpers
const getParsedJsonArray = (val: unknown): string[] => {
  if (!val) return [];
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return [val]; }
  }
  if (Array.isArray(val)) return val as string[];
  return [];
};

interface OpportunityEvidenceItem {
  id: string;
  status: string;
  source: string;
  confidence: number;
  notes: string | null;
  createdAt: Date | string;
}

interface OpportunityNoteItem {
  id: string;
  body: string;
  createdBy: string | null;
  createdAt: Date | string;
}


export default function OpportunityDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  // Local tabs
  const [activeTab, setActiveTab] = useState<"intel" | "occupancy" | "finance" | "3d" | "notes">("intel");

  // Enrichment Form
  const [enrichCompanyName, setEnrichCompanyName] = useState("");
  const [enrichRelationship, setEnrichRelationship] = useState("occupant");
  const [enrichContactName, setEnrichContactName] = useState("");
  const [enrichContactRole, setEnrichContactRole] = useState("");
  const [enrichContactEmail, setEnrichContactEmail] = useState("");
  const [enrichContactPhone, setEnrichContactPhone] = useState("");
  const [isSubmittingEnrichment, setIsSubmittingEnrichment] = useState(false);

  // Outreach Form
  const [outreachType, setOutreachType] = useState("call");
  const [outreachStatus, setOutreachStatus] = useState("completed");
  const [outreachNotes, setOutreachNotes] = useState("");
  const [isLoggingOutreach, setIsLoggingOutreach] = useState(false);

  // Local mutation states
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Evidence Form
  const [evidenceStatus, setEvidenceStatus] = useState<"solar_present" | "solar_absent" | "unknown">("solar_absent");
  const [evidenceSource, setEvidenceSource] = useState<"manual" | "imported" | "osm" | "vision">("manual");
  const [evidenceConfidence, setEvidenceConfidence] = useState(0.9);
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);

  // Notes Form
  const [noteBody, setNoteBody] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Sensitivity preset
  const [sensitivityVars, setSensitivityVars] = useState<SensitivityVariables>(PRESETS.EXPECTED);

  // Queries
  const { data: opportunity, isLoading, error, refetch } = api.opportunity.getById.useQuery({ id });

  // Mutations
  const runAssessment = api.assessment.run.useMutation();
  const rescoreOpportunity = api.opportunity.rescore.useMutation();
  const generateProposal = api.proposal.generate.useMutation();
  const addEvidenceMutation = api.opportunity.addSolarizationEvidence.useMutation();
  const updateStatusMutation = api.opportunity.updateStatus.useMutation();
  const addNoteMutation = api.opportunity.addNote.useMutation();

  const requestVerificationMutation = api.opportunity.requestVerification.useMutation();
  const completeVerificationMutation = api.opportunity.completeVerification.useMutation();
  const addManualEnrichmentMutation = api.opportunity.addManualEnrichment.useMutation();
  const addOutreachActivityMutation = api.opportunity.addOutreachActivity.useMutation();

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRunAssessment = async () => {
    if (!opportunity) return;
    setAssessmentLoading(true);
    try {
      await runAssessment.mutateAsync({ buildingId: opportunity.buildingId });
      await rescoreOpportunity.mutateAsync({ id: opportunity.id });
      await refetch();
      showToast("Technical/financial assessment completed successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Assessment failed.", "error");
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleExportProposal = async () => {
    if (!opportunity) return;
    setExportLoading(true);
    try {
      const result = await generateProposal.mutateAsync({ buildingId: opportunity.buildingId });
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
    if (!opportunity) return;
    setShareLoading(true);
    try {
      const result = await generateProposal.mutateAsync({ buildingId: opportunity.buildingId });
      if (result?.id) {
        await navigator.clipboard.writeText(`${window.location.origin}/p/${result.id}`);
        showToast("Proposal link copied to clipboard!", "success");
      }
    } catch {
      showToast("Failed to create share link.", "error");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Dossier link copied to clipboard!", "success");
    } catch {
      showToast("Failed to copy dossier link.", "error");
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingEvidence(true);
    try {
      await addEvidenceMutation.mutateAsync({
        opportunityId: id,
        status: evidenceStatus,
        source: evidenceSource,
        confidence: evidenceConfidence,
        notes: evidenceNotes || undefined,
      });
      setEvidenceNotes("");
      await refetch();
      showToast("Solarization evidence added and score updated.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add evidence.", "error");
    } finally {
      setIsAddingEvidence(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setIsAddingNote(true);
    try {
      await addNoteMutation.mutateAsync({
        opportunityId: id,
        body: noteBody,
      });
      setNoteBody("");
      await refetch();
      showToast("Internal note successfully saved.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add note.", "error");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!opportunity) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: opportunity.id,
        status: newStatus,
        priority: opportunity.priority,
      });
      await refetch();
      showToast(`Workflow status updated to: ${newStatus}`, "success");
    } catch {
      showToast("Failed to update workflow status.", "error");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!opportunity) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: opportunity.id,
        status: opportunity.status,
        priority: newPriority,
      });
      await refetch();
      showToast(`Lead priority updated to: ${newPriority}`, "success");
    } catch {
      showToast("Failed to update lead priority.", "error");
    }
  };

  const handleRequestVerification = async () => {
    try {
      await requestVerificationMutation.mutateAsync({
        opportunityId: id,
        providerId: "manual_imagery_audit",
      });
      await refetch();
      showToast("Verification audit task queued successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to queue verification.", "error");
    }
  };

  const handleCompleteVerification = async (taskId: string, hasSolar: boolean) => {
    try {
      await completeVerificationMutation.mutateAsync({
        taskId,
        hasSolar,
        confidence: 0.95,
        notes: `Audited via satellite review. Result: ${hasSolar ? "Solarized" : "Unsolarized"}.`,
      });
      await refetch();
      showToast("Verification audit completed. Opportunity rescored.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to complete audit.", "error");
    }
  };

  const handleAddEnrichment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrichCompanyName.trim()) return;
    setIsSubmittingEnrichment(true);
    try {
      await addManualEnrichmentMutation.mutateAsync({
        opportunityId: id,
        companyName: enrichCompanyName,
        relationship: enrichRelationship,
        name: enrichContactName || undefined,
        role: enrichContactRole || undefined,
        email: enrichContactEmail || undefined,
        phone: enrichContactPhone || undefined,
      });
      setEnrichCompanyName("");
      setEnrichContactName("");
      setEnrichContactRole("");
      setEnrichContactEmail("");
      setEnrichContactPhone("");
      await refetch();
      showToast("Occupancy and contact details successfully saved.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add occupant details.", "error");
    } finally {
      setIsSubmittingEnrichment(false);
    }
  };

  const handleLogOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outreachNotes.trim()) return;
    setIsLoggingOutreach(true);
    try {
      await addOutreachActivityMutation.mutateAsync({
        opportunityId: id,
        type: outreachType,
        status: outreachStatus,
        notes: outreachNotes,
      });
      setOutreachNotes("");
      await refetch();
      showToast("Outreach activity logged successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to log outreach activity.", "error");
    } finally {
      setIsLoggingOutreach(false);
    }
  };


  if (isLoading) {
    return (
      <div className="animate-fadeIn space-y-6 p-6">
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-9 w-96 rounded-lg" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <Skeleton className="h-96 lg:col-span-3 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Opportunity dossier not found</h2>
        <Button className="mt-6" onClick={() => router.push("/opportunities")}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const { building } = opportunity;
  const { assessment } = building;
  const evidenceTimeline = (opportunity as { evidence?: OpportunityEvidenceItem[] }).evidence ?? [];
  const noteTimeline = (opportunity as { notes?: OpportunityNoteItem[] }).notes ?? [];

  const emirateInfo = getEmirateConfig(building.lat, building.lng);

  // Parse scores
  const scoreHistory = opportunity.scores ?? [];
  const latestScores = scoreHistory[0] ?? {
    roofFitScore: 0,
    economicsScore: 0,
    buildingTypeScore: 0,
    unsolarizedScore: 0,
    dataCompletenessScore: 0,
    regulatoryScore: 0,
  };

  const reasons = getParsedJsonArray(opportunity.reasonsJson);
  const risks = getParsedJsonArray(opportunity.risksJson);

  // Sizing & Finance calculations
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

  const getBandBadgeClass = (band: string) => {
    switch (band) {
      case "A": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "B": return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      case "C": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "D": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      default: return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="space-y-6 p-4 md:p-6"
    >
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className={`fixed right-4 top-4 z-50 overflow-hidden rounded-xl border shadow-lg backdrop-blur-xl ${
              toast.type === "success" ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"
            }`}
          >
            <div className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium ${
              toast.type === "success" ? "bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200" : "bg-red-50/90 text-red-800 dark:bg-red-950/80 dark:text-red-200"
            }`}>
              <span className="flex-1">{toast.message}</span>
              <button onClick={() => setToast(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border/40 pb-5">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => router.push("/opportunities")}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to pipeline
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{building.address}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${getBandBadgeClass(opportunity.scoreBand)}`}>
              BAND {opportunity.scoreBand}
            </span>
            {opportunity.rankSnapshots && opportunity.rankSnapshots[0] && (
              <span className="inline-flex items-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2.5 py-0.5 text-xs font-bold">
                Rank #{opportunity.rankSnapshots[0].rankGlobal}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Score: <strong className="text-foreground">{opportunity.scoreTotal}</strong></span>
            <span>&middot;</span>
            <span>Confidence: <strong className="text-foreground">{(opportunity.confidence * 100).toFixed(0)}%</strong></span>
            <span>&middot;</span>
            <span>Next Action: <strong className="text-teal-600 dark:text-teal-400 capitalize">{opportunity.nextAction.replace(/_/g, " ")}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleRunAssessment}
            disabled={assessmentLoading || runAssessment.isPending}
            variant="secondary"
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            {assessmentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {assessment ? "Re-run Assessment" : "Run SolarZero Assessment"}
          </Button>

          {assessment && (
            <>
              <Button
                onClick={handleExportProposal}
                disabled={exportLoading}
                className="h-9 gap-1.5 text-xs font-semibold"
              >
                {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                View Proposal PDF
              </Button>
              <Button onClick={handleCopyLink} variant="outline" className="h-9 gap-1.5 px-3 text-xs font-semibold">
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </Button>
              <Button onClick={handleShareProposal} disabled={shareLoading} variant="outline" className="h-9 px-3">
                {shareLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Side: Detail Tabs and Forms */}
        <div className="space-y-6 lg:col-span-3">
          {/* Tabs Navigation */}
          <div className="flex border-b border-border/40">
            {(["intel", "occupancy", "finance", "3d", "notes"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? "border-teal-500 text-teal-600 dark:text-teal-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "intel" ? "Opportunity Intelligence" : tab === "occupancy" ? "Occupancy & Contacts" : tab === "finance" ? "Financials" : tab === "3d" ? "3D Visualization" : "Activity & Notes"}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div>
            {activeTab === "intel" && (
              <div className="space-y-6">
                {/* Score Breakdown Subgrid */}
                <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-6">
                  <SubScoreCard label="Roof Fit" score={latestScores.roofFitScore} weight="30%" />
                  <SubScoreCard label="Economics" score={latestScores.economicsScore} weight="25%" />
                  <SubScoreCard label="Building Type" score={latestScores.buildingTypeScore} weight="15%" />
                  <SubScoreCard label="Unsolarized" score={latestScores.unsolarizedScore} weight="15%" />
                  <SubScoreCard label="Completeness" score={latestScores.dataCompletenessScore} weight="10%" />
                  <SubScoreCard label="Regulatory" score={latestScores.regulatoryScore} weight="5%" />
                </div>

                {/* Reasons and Risks Panel */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Reasons */}
                  <Card className="p-4 border-border/40">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Supporting Reasons</h3>
                    <div className="mt-3 space-y-2.5">
                      {reasons.length > 0 ? (
                        reasons.map((r, i) => (
                          <div key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/80">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No reasons compiled.</span>
                      )}
                    </div>
                  </Card>

                  {/* Risks */}
                  <Card className="p-4 border-border/40">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500">Regulatory & Deal Risks</h3>
                    <div className="mt-3 space-y-2.5">
                      {risks.length > 0 ? (
                        risks.map((r, i) => (
                          <div key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/80">
                            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="h-4 w-4" /> No high priority risks flagged
                        </span>
                      )}
                    </div>
                  </Card>
                </div>

                {/* SignalGraph Data Connectors */}
                <Card className="p-5 border-border/40 bg-muted/10">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-foreground/90 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                        SolarZero SignalGraph™
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Consensus data signals from federated geospatial, solar resource, and regulatory connectors.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-2 py-0.5 rounded border border-border/60">
                      Active
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/30 text-muted-foreground font-semibold">
                          <th className="pb-2 font-semibold">Signal Source</th>
                          <th className="pb-2 font-semibold">License / Access</th>
                          <th className="pb-2 font-semibold">Signal Type</th>
                          <th className="pb-2 font-semibold">Observed / Fetched</th>
                          <th className="pb-2 font-semibold text-right">Confidence</th>
                          <th className="pb-2 font-semibold text-right">Value Payload</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {(() => {
                          interface LocalSignal {
                            id: string;
                            connectorId: string;
                            signalType: string;
                            sourceName: string;
                            license: string | null;
                            confidence: number;
                            fetchedAt: Date | string;
                            payloadJson: unknown;
                          }
                          const signals = (opportunity as { signals?: LocalSignal[] })?.signals;
                          return signals && signals.length > 0 ? (
                            signals.map((sig) => {
                              const rawPayload = sig.payloadJson ? (typeof sig.payloadJson === "string" ? JSON.parse(sig.payloadJson) : sig.payloadJson) : {};
                              const payload = rawPayload as Record<string, unknown>;
                              
                              // Render a nice value preview
                              let valPreview = "-";
                              if (sig.signalType === "BUILDING_FOOTPRINT") {
                                const roofArea = payload.roofAreaM2 as number | undefined;
                                const buildingType = payload.buildingType as string | undefined;
                                valPreview = `${roofArea?.toLocaleString() || 0} m² (${buildingType || "C&I"})`;
                              } else if (sig.signalType === "ROOF_AREA") {
                                const roofArea = payload.roofAreaM2 as number | undefined;
                                valPreview = `${roofArea?.toLocaleString() || 0} m² (ML detected)`;
                              } else if (sig.signalType === "SOLAR_RESOURCE") {
                                const annualGhi = payload.annualGhiKwhM2Year as number | undefined;
                                const annualYield = payload.annualYieldKwhPerKwp as number | undefined;
                                if (annualGhi) {
                                  valPreview = `${Math.round(annualGhi).toLocaleString()} kWh/m²/yr`;
                                } else if (annualYield) {
                                  valPreview = `${annualYield.toLocaleString()} kWh/kWp/yr`;
                                }
                              } else if (sig.signalType === "TARIFF") {
                                const rate = payload.tariffRateAedKwh as number | undefined;
                                const utility = payload.utility as string | undefined;
                                valPreview = `${rate?.toFixed(2) || "0.00"} AED/kWh (${utility || "DEWA"})`;
                              } else if (sig.signalType === "REGULATORY_RULE") {
                                const allowExport = payload.allowExport as boolean | undefined;
                                const limit = payload.substationLimitKwp as number | undefined;
                                valPreview = `${allowExport ? "Exports Allowed" : "No Grid Export"} (Sub: ${limit || 0} kWp)`;
                              } else {
                                valPreview = JSON.stringify(payload);
                              }

                              // Format fetch date
                              const fetchedDate = new Date(sig.fetchedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              });

                              return (
                                <tr key={sig.id} className="hover:bg-muted/30">
                                  <td className="py-2.5 font-medium text-foreground/80">{sig.sourceName}</td>
                                  <td className="py-2.5 text-muted-foreground">
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/40 font-mono">
                                      {sig.license || "Public"}
                                    </span>
                                  </td>
                                  <td className="py-2.5">
                                    <span className="text-[10px] font-semibold text-teal-600 bg-teal-500/10 px-1.5 py-0.5 rounded uppercase">
                                      {sig.signalType.replace("_", " ")}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-muted-foreground">{fetchedDate}</td>
                                  <td className="py-2.5 text-right font-semibold tabular-nums text-foreground/80">
                                    {(sig.confidence * 100).toFixed(0)}%
                                  </td>
                                  <td className="py-2.5 text-right font-medium text-foreground/90 tabular-nums">
                                    {valPreview}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-muted-foreground italic">
                                No SignalGraph connector runs found. Rescore the opportunity to initiate.
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Rank V2 Drivers & Blockers */}
                {opportunity.rankSnapshots && opportunity.rankSnapshots[0] && (
                  <Card className="p-5 border-border/40 bg-gradient-to-r from-teal-500/[0.02] to-rose-500/[0.02]">
                    <h3 className="text-sm font-bold tracking-tight text-foreground/90 mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-500" />
                      Prioritized Rank V2 Insights (Global Rank #{opportunity.rankSnapshots[0].rankGlobal})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Positive Score Drivers</h4>
                        <div className="space-y-2">
                          {(() => {
                            const latest = opportunity.rankSnapshots[0];
                            const drivers = latest.driversJson
                              ? (typeof latest.driversJson === "string" ? JSON.parse(latest.driversJson) : latest.driversJson)
                              : [];
                            return Array.isArray(drivers) && drivers.length > 0 ? (
                              drivers.map((drv: string, idx: number) => (
                                <div key={idx} className="flex gap-2 text-xs leading-relaxed text-foreground/80 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{drv}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No positive rank drivers identified.</span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">Risk Blockers & Penalties</h4>
                        <div className="space-y-2">
                          {(() => {
                            const latest = opportunity.rankSnapshots[0];
                            const blockers = latest.blockersJson
                              ? (typeof latest.blockersJson === "string" ? JSON.parse(latest.blockersJson) : latest.blockersJson)
                              : [];
                            return Array.isArray(blockers) && blockers.length > 0 ? (
                              blockers.map((blk: string, idx: number) => (
                                <div key={idx} className="flex gap-2 text-xs leading-relaxed text-foreground/80 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                  <span>{blk}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No risk blockers or scoring penalties found.</span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Solarization Evidence Timeline and Submission */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Submission Form */}
                  <Card className="p-4 border-border/40 md:col-span-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Verification Evidence</h3>
                    <form onSubmit={handleAddEvidence} className="mt-4 space-y-3.5">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Solarization Status</label>
                        <select
                          value={evidenceStatus}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEvidenceStatus(e.target.value as "solar_present" | "solar_absent" | "unknown")}
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2 py-1.5 text-xs outline-none focus:border-teal-500"
                        >
                          <option value="solar_absent">Unsolarized (Absent)</option>
                          <option value="solar_present">Solarized (Present)</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Evidence Source</label>
                        <select
                          value={evidenceSource}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEvidenceSource(e.target.value as "manual" | "imported" | "osm" | "vision")}
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2 py-1.5 text-xs outline-none focus:border-teal-500"
                        >
                          <option value="manual">Manual Assessment / Review</option>
                          <option value="imported">CRM / Imported Records</option>
                          <option value="osm">OpenStreetMap Tag</option>
                        </select>
                      </div>


                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Confidence Level ({(evidenceConfidence * 100).toFixed(0)}%)</label>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={evidenceConfidence}
                          onChange={(e) => setEvidenceConfidence(parseFloat(e.target.value))}
                          className="mt-1 w-full premium-range"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Reviewer Notes</label>
                        <textarea
                          rows={2}
                          value={evidenceNotes}
                          onChange={(e) => setEvidenceNotes(e.target.value)}
                          placeholder="Satellite view shows clear roof..."
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500 text-foreground font-sans"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isAddingEvidence}
                        className="w-full h-8 gap-1 text-xs font-semibold"
                      >
                        {isAddingEvidence ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                        Add Evidence
                      </Button>
                    </form>
                  </Card>

                  {/* Evidence Timeline */}
                  <Card className="p-4 border-border/40 md:col-span-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Auditable Evidence Timeline</h3>
                    <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {evidenceTimeline.length > 0 ? (
                        evidenceTimeline.map((ev) => (
                          <div key={ev.id} className="rounded-lg border border-border/20 bg-muted/20 p-3 text-xs leading-relaxed">
                            <div className="flex items-center justify-between border-b border-border/10 pb-1.5 mb-1.5">
                              <span className={`font-semibold px-2 py-0.5 rounded ${
                                ev.status === "solar_present" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                              }`}>
                                {ev.status === "solar_present" ? "Solar Present" : "Solar Absent"}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {new Date(ev.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span>Source: <strong className="capitalize">{ev.source}</strong> (Confidence: {(ev.confidence * 100).toFixed(0)}%)</span>
                              {ev.notes && <p className="mt-1 text-muted-foreground italic">Notes: {ev.notes}</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                          No audit records found. Defaulting to building-model values.
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Verification Tasks & Audits Queue */}
                  <Card className="p-4 border-border/40 md:col-span-1">
                    <div className="flex items-center justify-between border-b border-border/20 pb-2.5 mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verification Task Queue</h3>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={handleRequestVerification}
                        className="h-7 text-[10px]"
                        disabled={requestVerificationMutation.isPending}
                      >
                        {requestVerificationMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3 w-3" />}
                        Request Audit
                      </Button>
                    </div>
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {opportunity.verificationTasks && opportunity.verificationTasks.length > 0 ? (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        opportunity.verificationTasks.map((task: any) => {
                          const result = task.resultJson ? (typeof task.resultJson === "string" ? JSON.parse(task.resultJson) : task.resultJson) : null;
                          return (
                            <div key={task.id} className="rounded-lg border border-border/20 bg-muted/10 p-2.5 text-xs">
                              <div className="flex items-center justify-between font-medium">
                                <span>Provider: <strong className="font-semibold text-foreground/80">{task.providerId}</strong></span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  task.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
                                }`}>
                                  {task.status}
                                </span>
                              </div>
                              <div className="mt-1 text-muted-foreground text-[10px] flex justify-between">
                                <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                                {task.completedAt && <span>Completed: {new Date(task.completedAt).toLocaleDateString()}</span>}
                              </div>
                              {task.status === "pending" && (
                                <div className="mt-2.5 pt-2 border-t border-border/10 flex gap-2">
                                  <Button
                                    size="xs"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[10px] flex-1"
                                    onClick={() => handleCompleteVerification(task.id, false)}
                                  >
                                    Confirm Unsolarized
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    className="h-7 text-[10px] flex-1"
                                    onClick={() => handleCompleteVerification(task.id, true)}
                                  >
                                    Mark Solarized
                                  </Button>
                                </div>
                              )}
                              {result && (
                                <div className="mt-2 bg-muted/40 p-2 rounded text-[11px] text-foreground/80">
                                  <div>Result: <strong>{result.hasSolar ? "Solar Present" : "Solar Absent"}</strong> (Conf: {(result.confidence * 100).toFixed(0)}%)</div>
                                  {result.notes && <div className="text-muted-foreground italic mt-0.5">Notes: {result.notes}</div>}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-xs text-muted-foreground italic">
                          No verification tasks queued.
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "occupancy" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Left 2 Cols: Directory */}
                  <div className="md:col-span-2 space-y-6">
                    <Card className="p-5 border-border/40">
                      <h3 className="text-sm font-bold tracking-tight mb-4 text-foreground/90 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-teal-500" />
                        Occupant Companies & Entities
                      </h3>
                      <div className="space-y-3">
                        {opportunity.companySignals && opportunity.companySignals.length > 0 ? (
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          opportunity.companySignals.map((sig: any) => (
                            <div key={sig.id} className="p-3.5 rounded-xl border border-border/20 bg-muted/10 flex items-start justify-between">
                              <div>
                                <div className="font-semibold text-sm text-foreground/90">{sig.companyName}</div>
                                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1">
                                  <span>Relationship: <strong className="text-foreground/80 capitalize">{sig.relationship}</strong></span>
                                  <span>&middot;</span>
                                  <span>Source: <strong className="text-foreground/80 capitalize">{sig.source}</strong></span>
                                  <span>&middot;</span>
                                  <span>Confidence: <strong className="text-foreground/80">{(sig.confidence * 100).toFixed(0)}%</strong></span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-xs text-muted-foreground italic border border-dashed rounded-xl">
                            No occupancy details recorded yet. Use the form to enrich.
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card className="p-5 border-border/40">
                      <h3 className="text-sm font-bold tracking-tight mb-4 text-foreground/90 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-teal-500" />
                        Contact Directory
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {opportunity.contactSignals && opportunity.contactSignals.length > 0 ? (
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          opportunity.contactSignals.map((contact: any) => (
                            <div key={contact.id} className="p-3.5 rounded-xl border border-border/20 bg-muted/5 space-y-2">
                              <div>
                                <div className="font-semibold text-xs text-foreground/90">{contact.name || "Unnamed Contact"}</div>
                                {contact.role && <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">{contact.role}</div>}
                              </div>
                              <div className="space-y-1 text-[11px] text-muted-foreground">
                                {contact.email && <div className="truncate">Email: <span className="text-foreground/80 font-mono">{contact.email}</span></div>}
                                {contact.phone && <div>Phone: <span className="text-foreground/80 font-mono">{contact.phone}</span></div>}
                                <div className="pt-1.5 border-t border-border/10 flex justify-between text-[9px]">
                                  <span>Source: <strong className="capitalize">{contact.source}</strong></span>
                                  <span>Policy: <strong className="capitalize">{contact.sourcePolicy}</strong></span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-8 text-xs text-muted-foreground italic border border-dashed rounded-xl">
                            No direct contacts enriched yet.
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Right Col: Add Manual Enrichment Form */}
                  <Card className="p-5 border-border/40 md:col-span-1 h-fit">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Contact Enrichment</h3>
                    <form onSubmit={handleAddEnrichment} className="mt-4 space-y-3.5">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Company Name *</label>
                        <input
                          type="text"
                          required
                          value={enrichCompanyName}
                          onChange={(e) => setEnrichCompanyName(e.target.value)}
                          placeholder="e.g. Al Futtaim Logistics"
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Relationship</label>
                        <select
                          value={enrichRelationship}
                          onChange={(e) => setEnrichRelationship(e.target.value)}
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500 text-foreground"
                        >
                          <option value="occupant">Occupant / Tenant</option>
                          <option value="owner">Property Owner</option>
                          <option value="operator">Facility Operator</option>
                        </select>
                      </div>

                      <div className="my-2 border-t border-border/10" />

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Contact Name</label>
                        <input
                          type="text"
                          value={enrichContactName}
                          onChange={(e) => setEnrichContactName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Role / Designation</label>
                        <input
                          type="text"
                          value={enrichContactRole}
                          onChange={(e) => setEnrichContactRole(e.target.value)}
                          placeholder="e.g. Facility Manager"
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Email Address</label>
                        <input
                          type="email"
                          value={enrichContactEmail}
                          onChange={(e) => setEnrichContactEmail(e.target.value)}
                          placeholder="manager@company.ae"
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500 text-foreground"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Phone Number</label>
                        <input
                          type="tel"
                          value={enrichContactPhone}
                          onChange={(e) => setEnrichContactPhone(e.target.value)}
                          placeholder="+971 50 123 4567"
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500 text-foreground"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmittingEnrichment}
                        className="w-full h-8 gap-1 text-xs font-semibold"
                      >
                        {isSubmittingEnrichment ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                        Save Occupant Details
                      </Button>
                    </form>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "finance" && (
              <div className="space-y-6 animate-fadeIn">
                {assessment ? (
                  <>
                    {/* Performance Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <MetricCard icon={Zap} label="System Size" value={`${assessment.systemSizeKwp.toFixed(1)} kWp`} />
                      <MetricCard icon={Sun} label="Total Panels" value={`${assessment.panelCount}`} />
                      <MetricCard icon={DollarSign} label="Payback Period" value={`${assessment.paybackYears} years`} />
                      <MetricCard icon={TrendingUp} label="25yr NPV" value={`AED ${assessment.npv25yrAed.toLocaleString()}`} />
                    </div>

                    {/* Financial models */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {financingModels.map((model) => (
                        <FinancingModelCard key={model.type} model={model} />
                      ))}
                    </div>

                    {/* Sensitivity analysis */}
                    <Card className="p-4 border-border/40">
                      <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
                        <h3 className="text-sm font-semibold">Sensitivity Variables</h3>
                        <div className="flex gap-2">
                          {(["CONSERVATIVE", "EXPECTED", "OPTIMISTIC"] as const).map((preset) => (
                            <Button
                              key={preset}
                              variant={sensitivityVars === PRESETS[preset] ? "default" : "outline"}
                              size="xs"
                              onClick={() => setSensitivityVars(PRESETS[preset])}
                              className="h-7 px-2.5 text-[10px]"
                            >
                              {preset.charAt(0) + preset.slice(1).toLowerCase()}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <SliderRow
                          label="DEWA Tariff Variance"
                          value={sensitivityVars.tariffPercent}
                          min={-30}
                          max={30}
                          step={1}
                          unit="%"
                          onChange={(v) => setSensitivityVars({ ...sensitivityVars, tariffPercent: v })}
                        />
                        <SliderRow
                          label="CAPEX Variance"
                          value={sensitivityVars.costPercent}
                          min={-20}
                          max={20}
                          step={1}
                          unit="%"
                          onChange={(v) => setSensitivityVars({ ...sensitivityVars, costPercent: v })}
                        />
                        <SliderRow
                          label="Panel Degradation Variance"
                          value={sensitivityVars.degradationPercent}
                          min={-50}
                          max={50}
                          step={1}
                          unit="%"
                          onChange={(v) => setSensitivityVars({ ...sensitivityVars, degradationPercent: v })}
                        />
                        <SliderRow
                          label="Discount Rate Variance"
                          value={sensitivityVars.discountRatePercent}
                          min={-30}
                          max={30}
                          step={1}
                          unit="%"
                          onChange={(v) => setSensitivityVars({ ...sensitivityVars, discountRatePercent: v })}
                        />
                      </div>

                      {sensitivityResult && (
                        <div className="mt-6 border-t border-border/20 pt-4 grid grid-cols-2 gap-4">
                          <div className="rounded-lg bg-muted/40 p-3 text-xs">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sensitivity Adjusted NPV</span>
                            <div className="mt-1 text-lg font-bold text-teal-600 dark:text-teal-400">
                              AED {sensitivityResult.adjustedNpv.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Baseline: AED {assessment.npv25yrAed.toLocaleString()}</div>
                          </div>

                          <div className="rounded-lg bg-muted/40 p-3 text-xs">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sensitivity Adjusted Payback</span>
                            <div className="mt-1 text-lg font-bold text-teal-600 dark:text-teal-400">
                              {sensitivityResult.adjustedPayback.toFixed(1)} years
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Baseline: {assessment.paybackYears.toFixed(1)} years</div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </>
                ) : (
                  <NoAssessmentEmptyState onRun={handleRunAssessment} loading={assessmentLoading} />
                )}
              </div>
            )}

            {activeTab === "3d" && (
              <div className="space-y-4 animate-fadeIn">
                {assessment ? (
                  <Card className="overflow-hidden border-border/40">
                    <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
                      <div>
                        <h3 className="text-sm font-semibold">3D Solar System Projection</h3>
                        <p className="text-[11px] text-muted-foreground">Interactive 3D structural model</p>
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <Solar3DViewer
                        buildingType={building.buildingType ?? "commercial"}
                        roofAreaM2={building.roofAreaM2 ?? 100}
                        heightMeters={building.heightMeters ?? 12}
                        panelCount={assessment.panelCount}
                      />
                    </div>
                    <div className="border-t border-border/40 bg-muted/10 px-5 py-2">
                      <span className="text-[10px] text-muted-foreground/60">
                        Drag to rotate camera &middot; Scroll to zoom viewport &middot; Right-drag to pan structural bounds
                      </span>
                    </div>
                  </Card>
                ) : (
                  <NoAssessmentEmptyState onRun={handleRunAssessment} loading={assessmentLoading} />
                )}
              </div>
            )}

            {activeTab === "notes" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Notes Input form */}
                  <Card className="p-4 border-border/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Create Internal Note</h3>
                    <form onSubmit={handleAddNote} className="mt-3 space-y-2">
                      <textarea
                        rows={3}
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        placeholder="Enter details on outreach status, customer objections, or engineering notes..."
                        className="w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500 text-foreground"
                      />
                      <Button
                        type="submit"
                        disabled={isAddingNote || !noteBody.trim()}
                        className="h-8 gap-1 text-xs font-semibold ml-auto flex"
                      >
                        {isAddingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                        Add Note
                      </Button>
                    </form>
                  </Card>

                  {/* Outreach activity log form */}
                  <Card className="p-4 border-border/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Log Outreach Activity</h3>
                    <form onSubmit={handleLogOutreach} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground">Activity Type</label>
                        <select
                          value={outreachType}
                          onChange={(e) => setOutreachType(e.target.value)}
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs outline-none focus:border-teal-500 text-foreground"
                        >
                          <option value="call">Call</option>
                          <option value="email">Email</option>
                          <option value="meeting">Meeting</option>
                          <option value="proposal">Proposal Presentation</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground">Status</label>
                        <select
                          value={outreachStatus}
                          onChange={(e) => setOutreachStatus(e.target.value)}
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs outline-none focus:border-teal-500 text-foreground"
                        >
                          <option value="completed">Completed</option>
                          <option value="planned">Planned</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-semibold text-muted-foreground">Outreach Notes / Outcome</label>
                        <textarea
                          rows={2}
                          value={outreachNotes}
                          onChange={(e) => setOutreachNotes(e.target.value)}
                          placeholder="Discussed grid net-metering concerns, client was highly interested..."
                          className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs outline-none focus:border-teal-500 text-foreground"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={isLoggingOutreach || !outreachNotes.trim()}
                          className="h-8 gap-1 text-xs font-semibold"
                        >
                          {isLoggingOutreach ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Log Activity
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>

                {/* Combined activity timeline */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unified Activity Timeline</h3>
                  <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/40">
                    {(() => {
                      const noteTimelineLocal = noteTimeline.map(n => ({
                        id: n.id,
                        type: "note",
                        title: "Internal Note added",
                        body: n.body,
                        actor: n.createdBy || "system",
                        date: new Date(n.createdAt),
                      }));
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const outreachTimeline = (opportunity.outreachActivities ?? []).map((o: any) => ({
                        id: o.id,
                        type: "outreach",
                        title: `Outreach Activity: ${o.type} (${o.status})`,
                        body: o.notes,
                        actor: o.actor || "system",
                        date: new Date(o.createdAt),
                      }));
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const verificationTimeline = (opportunity.verificationTasks ?? []).map((v: any) => ({
                        id: v.id,
                        type: "verification",
                        title: `Verification Task: ${v.providerId} (${v.status})`,
                        body: v.resultJson
                          ? (typeof v.resultJson === "string" ? JSON.parse(v.resultJson) : v.resultJson).notes
                          : `Task created with priority ${v.priority}`,
                        actor: "system",
                        date: new Date(v.createdAt),
                      }));
                      const activities = [...noteTimelineLocal, ...outreachTimeline, ...verificationTimeline].sort((a, b) => b.date.getTime() - a.date.getTime());

                      return activities.length > 0 ? (
                        activities.map((act) => (
                          <div key={act.id} className="relative pl-8 flex gap-3 text-xs leading-relaxed">
                            {/* Timeline Dot/Icon */}
                            <div className={`absolute left-0 top-0.5 h-7 w-7 rounded-full border flex items-center justify-center shadow-sm ${
                              act.type === "note"
                                ? "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400"
                                : act.type === "outreach"
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                            }`}>
                              {act.type === "note" ? (
                                <MessageSquare className="h-3.5 w-3.5" />
                              ) : act.type === "outreach" ? (
                                <Zap className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </div>

                            <Card className="flex-1 p-3.5 border-border/40 hover:border-border/80 transition-all bg-card/50">
                              <div className="flex items-center justify-between border-b border-border/10 pb-1.5 mb-1.5 text-muted-foreground">
                                <div className="font-semibold text-foreground/95">{act.title}</div>
                                <div className="text-[10px] tabular-nums">{act.date.toLocaleString()}</div>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-1.5">
                                <span>Logged by: <strong className="text-foreground/80">{act.actor}</strong></span>
                              </div>
                              {act.body && <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{act.body}</p>}
                            </Card>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-lg bg-card">
                          No activity notes or outreach actions recorded.
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sidebar, Sizing Constraints & Workflow selectors */}
        <div className="space-y-5">
          {/* Workflow Status panel */}
          <Card className="p-4 border-border/40 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pipeline Controls</h3>
            
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Workflow Stage</label>
              <select
                value={opportunity.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2 py-1.5 text-xs outline-none focus:border-teal-500 capitalize text-foreground"
              >
                <option value="new">New Opportunity</option>
                <option value="needs_verification">Needs Verification</option>
                <option value="qualified">Qualified</option>
                <option value="contacted">Contacted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Lead Priority</label>
              <select
                value={opportunity.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2 py-1.5 text-xs outline-none focus:border-teal-500 capitalize"
              >
                <option value="unreviewed">Unreviewed</option>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
              </select>
            </div>
          </Card>

          {/* Building Info Panel */}
          <Card className="border-border/40 shadow-sm">
            <div className="border-b border-border/40 px-4 py-3 bg-muted/10">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Opportunity Metadata</h3>
            </div>
            <div className="px-4 py-1.5">
              <SidebarRow label="OSM ID" value={building.osmId ?? "N/A"} />
              <SidebarRow label="Emirate" value={emirateInfo.name} />
              <SidebarRow label="Utility" value={emirateInfo.utility} />
              <SidebarRow label="Roof Footprint" value={building.roofAreaM2 ? `${Math.round(building.roofAreaM2).toLocaleString()} m²` : "N/A"} />
              <SidebarRow label="Height" value={building.heightMeters ? `${building.heightMeters}m` : "N/A"} />
              <div className="my-1.5 border-t border-border/20" />
              <SidebarRow label="Latitude" value={building.lat.toFixed(5)} />
              <SidebarRow label="Longitude" value={building.lng.toFixed(5)} />
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// Subcomponents
function SubScoreCard({ label, score, weight }: { label: string; score: number; weight: string }) {
  return (
    <Card className="p-3 text-center border-border/40">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5 text-lg font-bold tracking-tight">{score}%</div>
      <span className="text-[9px] text-muted-foreground/60">Weight: {weight}</span>
    </Card>
  );
}

function NoAssessmentEmptyState({ onRun, loading }: { onRun: () => void; loading: boolean }) {
  return (
    <Card className="px-6 py-12 border-border/40">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600/10">
          <Zap className="h-7 w-7 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Technical/Financial Assessment Not Run</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Generate panel arrays, capex projections, savings, NPV, and payback periods using our UAE hybrid engine.
          </p>
        </div>
        <Button onClick={onRun} disabled={loading} className="h-9 gap-1.5 text-xs font-semibold rounded-full px-5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run SolarZero Assessment
        </Button>
      </div>
    </Card>
  );
}

function AnimatedValue({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.0,
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
    <Card className="p-3 border-border/40">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-bold tracking-tight">
        {numericVal !== null ? (
          hasPrefix ? (
            <><span className="text-muted-foreground/60 text-xs">AED </span><AnimatedValue value={numericVal} decimals={value.includes(".") ? 1 : 0} />{rawVal && <> {rawVal}</>}</>
          ) : (
            <AnimatedValue value={numericVal} decimals={value.includes(".") ? 1 : 0} suffix={rawVal ? ` ${rawVal}` : ""} />
          )
        ) : (
          value
        )}
      </div>
    </Card>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-foreground/90">{value}</span>
    </div>
  );
}

const FINANCING_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  DIRECT: {
    bg: "bg-red-500/5", text: "text-red-500", border: "border-red-500/10",
    icon: DollarSign,
  },
  PPA: {
    bg: "bg-emerald-500/5", text: "text-emerald-500", border: "border-emerald-500/10",
    icon: FileText,
  },
  LEASE: {
    bg: "bg-blue-500/5", text: "text-blue-500", border: "border-blue-500/10",
    icon: FileCheck,
  },
  ESCO: {
    bg: "bg-purple-500/5", text: "text-purple-500", border: "border-purple-500/10",
    icon: Sparkles,
  },
};

function FinancingModelCard({ model }: { model: FinancingModel }) {
  const config = FINANCING_CONFIG[model.type];
  const Icon = config?.icon ?? Sparkles;
  const cardStyle = config ?? { bg: "bg-slate-500/5", text: "text-slate-500", border: "border-slate-500/10" };
  return (
    <Card className={`p-4 border-border/40 shadow-sm ${cardStyle.border}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${cardStyle.bg} ${cardStyle.text}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">{model.name}</h3>
        </div>
        {model.recommended && (
          <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-600">
            Recommended
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/80 leading-relaxed mb-3">{model.description}</p>
      <div className="space-y-1.5 border-t border-border/10 pt-2.5">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Upfront Capex</span><span className="font-semibold">AED {model.upfrontCostAED.toLocaleString()}</span></div>
        {model.monthlyPaymentAED > 0 && (
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Monthly Payment</span><span className="font-semibold">AED {model.monthlyPaymentAED.toLocaleString()}</span></div>
        )}
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Annual Savings</span><span className="font-semibold text-teal-600">AED {model.annualSavingsAED.toLocaleString()}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">25-Yr NPV</span><span className="font-semibold text-teal-600">AED {model.npv25yrAED.toLocaleString()}</span></div>
      </div>
    </Card>
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
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`rounded px-1.5 py-0.5 font-bold tabular-nums text-[10px] ${
          isCustomized ? "bg-teal-500/10 text-teal-600" : "bg-muted text-muted-foreground"
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
        className="premium-range w-full"
      />
    </div>
  );
}
