"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Download, Zap, Info, Loader2, CheckSquare, Square, Upload, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

interface AssessmentData {
  id: string;
  systemSizeKwp: number;
  panelCount: number;
  annualProduction: number;
  annualSavingsAed: number;
  npv25yrAed: number;
  paybackYears: number;
}

interface BuildingData {
  id: string;
  address: string;
  lat: number;
  lng: number;
  buildingType: string | null;
  roofAreaM2: number | null;
  assessment: AssessmentData | null;
}

interface RankSnapshotData {
  rankGlobal: number | null;
  rankCampaign: number | null;
  driversJson: unknown;
  blockersJson: unknown;
}

interface OpportunityItem {
  id: string;
  buildingId: string;
  scoreBand: string;
  scoreTotal: number;
  status: string;
  nextAction: string;
  confidence: number;
  building: BuildingData;
  rankSnapshots?: RankSnapshotData[];
}

interface OpportunityTableProps {
  opportunities: OpportunityItem[];
  isLoading: boolean;
  refetch: () => void;
  refetchStats: () => void;
  onClearFilters?: () => void;
}

export function OpportunityTable({ opportunities, isLoading, refetch, refetchStats, onClearFilters }: OpportunityTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkAssessing, setIsBulkAssessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const runAssessment = api.assessment.run.useMutation();
  const rescoreOpportunity = api.opportunity.rescore.useMutation();

  const handleSelectAll = () => {
    const visibleSelectedIds = selectedIds.filter((id) => opportunities.some((o) => o.id === id));
    if (visibleSelectedIds.length === opportunities.length && opportunities.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(opportunities.map((o) => o.id));
    }
  };

  const handleSelectRow = (id: string) => {
    const current = [...selectedIds];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setSelectedIds(current);
  };

  const handleBulkAssess = async () => {
    const selectedOpps = opportunities.filter((o) => selectedIds.includes(o.id));
    const unassessedOpps = selectedOpps.filter((o) => !o.building.assessment);

    if (unassessedOpps.length === 0) return;

    setIsBulkAssessing(true);
    setBulkProgress({ current: 0, total: unassessedOpps.length });

    for (let i = 0; i < unassessedOpps.length; i++) {
      const opp = unassessedOpps[i];
      try {
        await runAssessment.mutateAsync({ buildingId: opp.buildingId });
        await rescoreOpportunity.mutateAsync({ id: opp.id });
      } catch (err) {
        console.error(`Bulk assessment failed for building ${opp.buildingId}:`, err);
      }
      setBulkProgress((p) => ({ ...p, current: i + 1 }));
    }

    setIsBulkAssessing(false);
    setSelectedIds([]);
    refetch();
    refetchStats();
  };

  // CSV Import State & Mutation
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);
  const importContactsCsv = api.opportunity.importContactsCsv.useMutation();

  const escapeCsvValue = (value: string | number | boolean | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  };

  useEffect(() => {
    if (!importResult) return;
    const timer = window.setTimeout(() => setImportResult(null), 6000);
    return () => window.clearTimeout(timer);
  }, [importResult]);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      try {
        const res = await importContactsCsv.mutateAsync({ csvText });
        setImportResult({ success: true, count: res.importedCount });
        refetch();
        refetchStats();
      } catch (err) {
        console.error("CSV Import failed:", err);
        const errMsg = err instanceof Error ? err.message : "Invalid CSV file or format";
        setImportResult({ success: false, count: 0, error: errMsg });
      } finally {
        setIsImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const exportToCsv = () => {
    const headers = [
      "Opportunity ID",
      "Building ID",
      "Address",
      "Latitude",
      "Longitude",
      "Building Type",
      "Roof Area (m2)",
      "Score",
      "Band",
      "Workflow Status",
      "Next Action",
      "Assessed",
      "System Size (kWp)",
      "Annual Production (kWh)",
      "Annual Savings (AED)",
      "NPV (AED)",
      "Payback (Years)",
      "Solarization Confidence",
    ];

    const rows = opportunities.map((o) => [
      o.id,
      o.buildingId,
      o.building.address,
      o.building.lat,
      o.building.lng,
      o.building.buildingType || "unknown",
      o.building.roofAreaM2 || 0,
      o.scoreTotal,
      o.scoreBand,
      o.status,
      o.nextAction,
      !!o.building.assessment,
      o.building.assessment?.systemSizeKwp || "",
      o.building.assessment?.annualProduction || "",
      o.building.assessment?.annualSavingsAed || "",
      o.building.assessment?.npv25yrAed || "",
      o.building.assessment?.paybackYears || "",
      o.confidence,
    ].map((value) => escapeCsvValue(value)));

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `solarzero_opportunities_${opportunities.length}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getBandBadgeClass = (band: string) => {
    switch (band) {
      case "A":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "B":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      case "C":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "D":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      default:
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    }
  };

  const getNextActionBadge = (action: string) => {
    switch (action) {
      case "CONTACT":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "ASSESS":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "VERIFY_SOLARIZATION":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
      case "ENRICH_OWNER":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300";
    }
  };

  const unassessedSelectedCount = opportunities
    .filter((o) => selectedIds.includes(o.id))
    .filter((o) => !o.building.assessment).length;
  const visibleSelectedCount = selectedIds.filter((id) => opportunities.some((o) => o.id === id)).length;
  const allVisibleSelected = opportunities.length > 0 && visibleSelectedCount === opportunities.length;

  return (
    <div className="space-y-4">
      {/* Bulk Actions and Export Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {opportunities.length.toLocaleString()} visible
          </span>
          {visibleSelectedCount > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
              {visibleSelectedCount} selected
            </span>
          )}
          {visibleSelectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs font-semibold"
              type="button"
            >
              Clear selection
            </Button>
          )}
          {unassessedSelectedCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleBulkAssess}
              disabled={isBulkAssessing}
              className="h-8 gap-1.5 text-xs font-semibold"
              type="button"
            >
              {isBulkAssessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Assessing ({bulkProgress.current}/{bulkProgress.total})
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Run Assessment ({unassessedSelectedCount})
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("csv-contact-import-input")?.click()}
            disabled={isImporting}
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
            type="button"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Import Contacts
              </>
            )}
          </Button>
          <input
            type="file"
            id="csv-contact-import-input"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={exportToCsv}
            disabled={opportunities.length === 0}
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV ({opportunities.length})
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Export downloads the rows currently shown in the table.
      </p>

      {/* Import Feedback Alert Banner */}
      {importResult && (
        <div className={`rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ${
          importResult.success
            ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/5 border-rose-500/25 text-rose-500"
        }`}>
          {importResult.success ? (
            <div className="flex-1 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4" /> Contacts Import Succeeded
              </span>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Successfully processed contacts and associated them with <strong>{importResult.count}</strong> matching opportunities. Dynamic rankings have been recalculated.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Contacts Import Failed
              </span>
              <p className="text-rose-500/80 leading-relaxed">
                {importResult.error ?? "Please ensure the CSV is properly formatted with headers: companyName, name, role, email, phone."}
              </p>
            </div>
          )}
          <button
            onClick={() => setImportResult(null)}
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-sm ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
        <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="w-10 px-4 py-3 text-left">
                    <button type="button" onClick={handleSelectAll} aria-label="Select all visible opportunities" className="text-muted-foreground hover:text-foreground">
                      {allVisibleSelected ? (
                        <CheckSquare className="h-4 w-4 text-teal-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Address</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Roof Area</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Sizing / Savings</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Solarization</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Next Action</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-teal-600" />
                      </td>
                    </tr>
                  ))
                ) : opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="h-6 w-6 text-muted-foreground" />
                        <span className="font-semibold text-sm">No opportunities found</span>
                        <span className="text-xs text-muted-foreground max-w-md">
                          No opportunities match the current filters. Reset filters, refresh the list, or scan a new UAE area to discover more rooftops.
                        </span>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                          {onClearFilters && (
                            <Button variant="outline" size="sm" onClick={onClearFilters} type="button" className="h-8 text-xs font-semibold">
                              Reset Filters
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={refetch} type="button" className="h-8 text-xs font-semibold">
                            Refresh
                          </Button>
                          <Link href="/map">
                            <Button variant="secondary" size="sm" type="button" className="h-8 text-xs font-semibold">
                              Open Map
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  opportunities.map((o, idx) => {
                    const isSelected = selectedIds.includes(o.id);
                    const isAssessed = !!o.building.assessment;
                    const sysSize = o.building.assessment?.systemSizeKwp;
                    const savings = o.building.assessment?.annualSavingsAed;

                    return (
                      <motion.tr
                        key={o.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                        className={`border-b border-border/20 transition-colors last:border-0 hover:bg-muted/40 ${
                          isSelected ? "bg-teal-500/[0.03]" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => handleSelectRow(o.id)} aria-label={`Select opportunity for ${o.building.address}`} className="text-muted-foreground hover:text-foreground">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-teal-600" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        {/* Score & Band */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${getBandBadgeClass(o.scoreBand)}`}>
                              {o.scoreBand}
                            </span>
                            <span className="font-semibold text-xs tabular-nums">{o.scoreTotal}</span>
                          </div>
                        </td>

                        {/* Rank */}
                        <td className="px-4 py-3">
                          <span className="font-semibold text-xs tabular-nums text-muted-foreground">
                            {o.rankSnapshots && o.rankSnapshots[0]
                              ? `#${o.rankSnapshots[0].rankGlobal}`
                              : "—"}
                          </span>
                        </td>

                        {/* Address */}
                        <td className="px-4 py-3 max-w-[240px] truncate">
                          <span className="font-medium text-xs text-foreground/90">{o.building.address}</span>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground capitalize">
                            {o.building.buildingType || "commercial"}
                          </span>
                        </td>

                        {/* Area */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-medium tabular-nums">
                            {o.building.roofAreaM2 ? `${o.building.roofAreaM2.toLocaleString()} m²` : "-"}
                          </span>
                        </td>

                        {/* Sizing/Economics */}
                        <td className="px-4 py-3 text-right">
                          {isAssessed ? (
                            <div className="flex flex-col text-right">
                              <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                {sysSize?.toFixed(1)} kWp
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                AED {savings?.toLocaleString()} /yr
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">unassessed</span>
                          )}
                        </td>

                        {/* Solarization Confidence */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            {o.scoreTotal === 0 && o.scoreBand === "REJECT" ? (
                              <span className="text-xs text-muted-foreground">n/a</span>
                            ) : o.nextAction === "VERIFY_SOLARIZATION" ? (
                              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
                                Existing PV
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-semibold tabular-nums">
                                {(o.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Next Action */}
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${getNextActionBadge(o.nextAction)}`}>
                            {o.nextAction}
                          </span>
                        </td>

                        {/* Dossier Link */}
                        <td className="px-4 py-3 text-center">
                          <Link href={`/opportunities/${o.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-semibold">
                              Dossier
                              <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
