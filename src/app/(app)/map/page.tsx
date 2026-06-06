"use client";

import { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { SearchBar } from "@/components/map/SearchBar";
import { Loader2, X, Building2 } from "lucide-react";
import dynamic from "next/dynamic";

const MapViewDynamic = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function MapPage() {
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildingCount, setBuildingCount] = useState<number | null>(null);
  const [lastSearchLabel, setLastSearchLabel] = useState<string | null>(null);

  const scanArea = api.opportunity.scanArea.useMutation();

  const handleSearchSelect = useCallback(
    async (result: { place_name: string; center: [number, number] }) => {
      const [lng, lat] = result.center;
      setError(null);
      setLastSearchLabel(result.place_name);
      setDiscovering(true);
      try {
        const run = await scanArea.mutateAsync({ lat, lng, radius: 300 });
        if (run.status === "failed") {
          throw new Error(run.error || "Geographic scan failed");
        }
        setBuildingCount(run.buildingsFound);
        setFlyTo({ lat, lng, zoom: 16 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to scan area");
        setBuildingCount(null);
        setFlyTo({ lat, lng, zoom: 15 });
      } finally {
        setDiscovering(false);
      }
    },
    [scanArea],
  );

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-2 right-2 top-2 z-20 sm:left-4 sm:right-auto sm:top-4">
        <h1 className="text-lg font-bold text-white drop-shadow-lg sm:text-2xl">SolarZero Atlas</h1>
        <p className="mt-1 max-w-md text-[11px] leading-relaxed text-white/80 drop-shadow-sm">
          Search a UAE location, scan a 300m radius, and turn the map into a live discovery queue.
        </p>
        {discovering && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin" />
            Scanning & scoring {lastSearchLabel ? `${lastSearchLabel}...` : "area..."}
          </div>
        )}
        {!discovering && buildingCount !== null && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
            <Building2 className="h-3 w-3" />
            {buildingCount} building{buildingCount !== 1 ? "s" : ""} scored
            {lastSearchLabel && <span className="text-white/70">in {lastSearchLabel}</span>}
            <button
              type="button"
              onClick={() => {
                setBuildingCount(null);
                setError(null);
                setLastSearchLabel(null);
                setFlyTo(null);
              }}
              className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              Clear
            </button>
          </div>
        )}
        {error && (
          <div role="alert" className="mt-2 flex items-center gap-2 rounded-md bg-red-500/80 px-3 py-1.5 text-xs text-white backdrop-blur">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="ml-1 rounded p-0.5 hover:bg-white/20">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

      </div>

      <div className="absolute left-2 right-2 top-20 z-20 sm:left-4 sm:right-auto sm:top-24">
        <SearchBar onSelect={handleSearchSelect} />
      </div>

      <MapViewDynamic flyTo={flyTo} />
    </div>
  );
}
