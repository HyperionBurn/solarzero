"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { motion } from "framer-motion";
import { Target, Search, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { api } from "@/trpc/react";
import type { AppRouter } from "@/server/api/root";

import { OpportunityKpis } from "@/components/opportunities/OpportunityKpis";
import { OpportunityFilters } from "@/components/opportunities/OpportunityFilters";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { Button } from "@/components/ui/button";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type OpportunityListItem = RouterOutputs["opportunity"]["list"]["opportunities"][number];

export default function OpportunitiesDashboard() {
  const [filters, setFilters] = useState({
    scoreBand: [] as string[],
    buildingType: [] as string[],
    status: [] as string[],
    assessed: undefined as boolean | undefined,
    minRoofArea: undefined as number | undefined,
    search: "",
  });

  // Scan states
  const [scanLat, setScanLat] = useState(25.1972); // Near Dubai Mall / Burj Khalifa
  const [scanLng, setScanLng] = useState(55.2744);
  const [scanRadius, setScanRadius] = useState(500);
  const [isScanning, setIsScanning] = useState(false);

  interface AreaScanResult {
    status: string;
    buildingsFound?: number;
    opportunitiesCreated?: number;
    error?: string | null;
  }
  const [scanResult, setScanResult] = useState<AreaScanResult | null>(null);

  // Queries
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = api.opportunity.getStats.useQuery();

  const {
    data: listData,
    isLoading: isListLoading,
    refetch: refetchList,
  } = api.opportunity.list.useQuery({
    scoreBand: filters.scoreBand.length > 0 ? filters.scoreBand : undefined,
    buildingType: filters.buildingType.length > 0 ? filters.buildingType : undefined,
    status: filters.status.length > 0 ? filters.status : undefined,
    assessed: filters.assessed,
    minRoofArea: filters.minRoofArea,
    limit: 100,
  });

  const scanMutation = api.opportunity.scanArea.useMutation();

  const handleClearFilters = () => {
    setFilters({
      scoreBand: [],
      buildingType: [],
      status: [],
      assessed: undefined,
      minRoofArea: undefined,
      search: "",
    });
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    setScanResult(null);

    try {
      const result = await scanMutation.mutateAsync({
        lat: scanLat,
        lng: scanLng,
        radius: scanRadius,
      });
      setScanResult({
        status: result.status,
        buildingsFound: result.buildingsFound,
        opportunitiesCreated: result.opportunitiesCreated,
        error: result.error,
      });
      refetchList();
      refetchStats();
    } catch (err) {
      console.error("Area scan failed:", err);
      const errMsg = err instanceof Error ? err.message : "Unknown error during geographic scan";
      setScanResult({
        status: "failed",
        error: errMsg,
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Filter list on client for search parameter to keep UX snappy
  const opportunities: OpportunityListItem[] = listData?.opportunities ?? [];
  const filteredOpportunities = opportunities.filter((o) => {
    if (!filters.search) return true;
    return o.building.address.toLowerCase().includes(filters.search.toLowerCase());
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-7xl space-y-6 p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600/10 dark:bg-teal-500/15">
            <Target className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Opportunity Atlas</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              UAE-first C&I solar opportunity intelligence and prioritized building pipeline.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchList();
            refetchStats();
          }}
          className="h-9 gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <OpportunityKpis stats={stats} isLoading={isStatsLoading} />

      {/* Workspace Grid */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Side: Discovery Scan Panel */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-4 w-4 text-teal-600" />
              Geographic Scanner
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Scan a latitude/longitude radius to fetch buildings from OpenStreetMap and score solarization potential.
            </p>

            <form onSubmit={handleScan} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={scanLat}
                  onChange={(e) => setScanLat(parseFloat(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={scanLng}
                  onChange={(e) => setScanLng(parseFloat(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Radius (meters)</label>
                <input
                  type="number"
                  min="100"
                  max="2000"
                  required
                  value={scanRadius}
                  onChange={(e) => setScanRadius(parseInt(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isScanning}
                className="w-full h-9 rounded-lg text-xs font-semibold mt-2"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-1.5 h-3.5 w-3.5" />
                    Scan Area
                  </>
                )}
              </Button>
            </form>

            {/* Scan Results Feedback */}
            {scanResult && (
              <div className="mt-4 rounded-lg border border-border/40 bg-muted/30 p-3 text-xs">
                {scanResult.status === "completed" ? (
                  <div className="space-y-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Scan Complete</span>
                    <div className="text-muted-foreground">
                      <div>Buildings Found: {scanResult.buildingsFound}</div>
                      <div>Opportunities Created: {scanResult.opportunitiesCreated}</div>
                    </div>
                  </div>
                ) : scanResult.status === "failed" ? (
                  <div className="space-y-1">
                    <span className="font-semibold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Scan Failed
                    </span>
                    <div className="text-rose-500/80 leading-relaxed">{scanResult.error}</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Filters & Opportunities List */}
        <div className="space-y-4 lg:col-span-3">
          <OpportunityFilters
            filters={filters}
            setFilters={setFilters}
            onClear={handleClearFilters}
          />

          <OpportunityTable
            opportunities={filteredOpportunities}
            isLoading={isListLoading}
            refetch={refetchList}
            refetchStats={refetchStats}
          />
        </div>
      </div>
    </motion.div>
  );
}
