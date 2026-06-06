"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { motion } from "framer-motion";
import { Target, Search, AlertCircle, RefreshCw, Layers, Play, Pause } from "lucide-react";
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

  // Campaign State & Hooks
  const [activeTab, setActiveTab] = useState<"scan" | "campaigns">("scan");
  const { data: campaigns, refetch: refetchCampaigns } = api.campaign.list.useQuery();
  const createCampaignMutation = api.campaign.create.useMutation();
  const startCampaignMutation = api.campaign.start.useMutation();
  const pauseCampaignMutation = api.campaign.pause.useMutation();
  const resumeCampaignMutation = api.campaign.resume.useMutation();

  const [campaignName, setCampaignName] = useState("");
  const [campaignEmirate, setCampaignEmirate] = useState("Dubai");
  const [campSouth, setCampSouth] = useState(25.07);
  const [campNorth, setCampNorth] = useState(25.08);
  const [campWest, setCampWest] = useState(55.15);
  const [campEast, setCampEast] = useState(55.16);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCampaign(true);
    setCampaignError(null);
    try {
      await createCampaignMutation.mutateAsync({
        name: campaignName,
        emirate: campaignEmirate,
        bounds: {
          south: campSouth,
          north: campNorth,
          west: campWest,
          east: campEast,
        },
      });
      setCampaignName("");
      refetchCampaigns();
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setCampaignError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleStartCampaign = async (id: string) => {
    try {
      await startCampaignMutation.mutateAsync({ id });
      refetchCampaigns();
    } catch (err) {
      console.error("Failed to start campaign:", err);
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await pauseCampaignMutation.mutateAsync({ id });
      refetchCampaigns();
    } catch (err) {
      console.error("Failed to pause campaign:", err);
    }
  };

  const handleResumeCampaign = async (id: string) => {
    try {
      await resumeCampaignMutation.mutateAsync({ id });
      refetchCampaigns();
    } catch (err) {
      console.error("Failed to resume campaign:", err);
    }
  };

  // Filter list on client for search parameter to keep UX snappy
  const opportunities: OpportunityListItem[] = listData?.opportunities ?? [];
  const filteredOpportunities = opportunities.filter((o) => {
    if (!filters.search) return true;
    const query = filters.search.toLowerCase();
    return [o.building.name, o.building.address]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query));
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
        {/* Left Side: Discovery Scan & Campaign Panel */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
            {/* Tab Headers */}
            <div className="flex border-b border-border/40 pb-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab("scan")}
                className={`flex-1 text-center pb-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === "scan"
                    ? "border-b-2 border-teal-600 text-teal-600 dark:text-teal-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Quick Scan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("campaigns")}
                className={`flex-1 text-center pb-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === "campaigns"
                    ? "border-b-2 border-teal-600 text-teal-600 dark:text-teal-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Campaigns
              </button>
            </div>

            {activeTab === "scan" ? (
              <>
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
              </>
            ) : (
              <div className="space-y-4">
                {/* Form to Create Campaign */}
                <form onSubmit={handleCreateCampaign} className="space-y-3 border-b border-border/40 pb-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    New Scan Campaign
                  </h3>
                  
                  {campaignError && (
                    <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2 text-[10px] text-rose-500">
                      {campaignError}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground">Campaign Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marina Scan"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground">Emirate</label>
                      <select
                        value={campaignEmirate}
                        onChange={(e) => setCampaignEmirate(e.target.value)}
                        className="mt-1 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-500"
                      >
                        <option value="Dubai">Dubai</option>
                        <option value="Abu Dhabi">Abu Dhabi</option>
                        <option value="Sharjah">Sharjah</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground">Step Size</label>
                      <select
                        disabled
                        className="mt-1 w-full rounded-md border border-border/60 bg-muted px-2.5 py-1.5 text-xs outline-none cursor-not-allowed"
                      >
                        <option value="0.005">0.005 (500m Grid)</option>
                      </select>
                    </div>
                  </div>

                  {/* Bounds */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">Bounding Box Coordinates</label>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div>
                        <span className="text-muted-foreground">South Lat</span>
                        <input
                          type="number"
                          step="any"
                          required
                          value={campSouth}
                          onChange={(e) => setCampSouth(parseFloat(e.target.value))}
                          className="w-full rounded border border-border/60 bg-background/50 px-1.5 py-1 text-xs outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground">North Lat</span>
                        <input
                          type="number"
                          step="any"
                          required
                          value={campNorth}
                          onChange={(e) => setCampNorth(parseFloat(e.target.value))}
                          className="w-full rounded border border-border/60 bg-background/50 px-1.5 py-1 text-xs outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground">West Lng</span>
                        <input
                          type="number"
                          step="any"
                          required
                          value={campWest}
                          onChange={(e) => setCampWest(parseFloat(e.target.value))}
                          className="w-full rounded border border-border/60 bg-background/50 px-1.5 py-1 text-xs outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground">East Lng</span>
                        <input
                          type="number"
                          step="any"
                          required
                          value={campEast}
                          onChange={(e) => setCampEast(parseFloat(e.target.value))}
                          className="w-full rounded border border-border/60 bg-background/50 px-1.5 py-1 text-xs outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isCreatingCampaign}
                    className="w-full h-8 rounded-lg text-xs font-semibold mt-1"
                  >
                    {isCreatingCampaign ? "Creating..." : "Create Campaign"}
                  </Button>
                </form>

                {/* Campaigns List */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                    <span>Active Campaigns</span>
                    <button
                      type="button"
                      onClick={() => refetchCampaigns()}
                      className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      Refresh
                    </button>
                  </h3>

                  {campaigns && campaigns.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 font-sans">
                      {campaigns.map((camp) => {
                        const total = camp.stats.totalTiles;
                        const done = camp.stats.completedTiles + camp.stats.failedTiles;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        const statusColor =
                          camp.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : camp.status === "running"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse"
                            : camp.status === "paused"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : camp.status === "failed"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "bg-muted text-muted-foreground border-border/40";

                        return (
                          <div key={camp.id} className="rounded-lg border border-border/40 bg-muted/10 p-2.5 text-xs space-y-2">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold truncate max-w-[120px]" title={camp.name}>
                                {camp.name}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${statusColor}`}>
                                {camp.status}
                              </span>
                            </div>

                            {/* Progress bar */}
                            {total > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-muted-foreground">
                                  <span>Progress: {pct}% ({done}/{total} tiles)</span>
                                  <span>Candidates: {camp.stats.candidatesCount}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
                                  <div
                                    className="h-full bg-teal-600 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Controls */}
                            <div className="flex gap-1.5 pt-1">
                              {camp.status === "draft" && (
                                <button
                                  type="button"
                                  onClick={() => handleStartCampaign(camp.id)}
                                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] py-1 font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Play className="h-2.5 w-2.5" /> Start
                                </button>
                              )}
                              {camp.status === "paused" && (
                                <button
                                  type="button"
                                  onClick={() => handleResumeCampaign(camp.id)}
                                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] py-1 font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Play className="h-2.5 w-2.5" /> Resume
                                </button>
                              )}
                              {(camp.status === "pending" || camp.status === "running") && (
                                <button
                                  type="button"
                                  onClick={() => handlePauseCampaign(camp.id)}
                                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] py-1 font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Pause className="h-2.5 w-2.5" /> Pause
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-[11px]">
                      No scan campaigns configured.
                    </div>
                  )}
                </div>
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
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>
    </motion.div>
  );
}
