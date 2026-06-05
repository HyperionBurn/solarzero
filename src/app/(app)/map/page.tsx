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

  const discoverArea = api.building.discoverArea.useMutation();

  const handleSearchSelect = useCallback(
    async (result: { place_name: string; center: [number, number] }) => {
      const [lng, lat] = result.center;
      setError(null);
      setDiscovering(true);
      try {
        const buildings = await discoverArea.mutateAsync({ lat, lng, radius: 200 });
        setBuildingCount(buildings.length);
        setFlyTo({ lat, lng, zoom: 16 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to discover buildings");
        setBuildingCount(null);
        setFlyTo({ lat, lng, zoom: 15 });
      } finally {
        setDiscovering(false);
      }
    },
    [discoverArea],
  );

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-2 right-2 top-2 z-20 sm:left-4 sm:right-auto sm:top-4">
        <h1 className="text-lg font-bold text-white drop-shadow-lg sm:text-2xl">SolarZero</h1>
        {discovering && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin" />
            Discovering buildings...
          </div>
        )}
        {!discovering && buildingCount !== null && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
            <Building2 className="h-3 w-3" />
            {buildingCount} building{buildingCount !== 1 ? "s" : ""} found
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
