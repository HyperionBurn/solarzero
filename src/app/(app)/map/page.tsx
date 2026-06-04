"use client";

import { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { SearchBar } from "@/components/map/SearchBar";
import { Loader2 } from "lucide-react";
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

  const discoverArea = api.building.discoverArea.useMutation();

  const handleSearchSelect = useCallback(
    async (result: { place_name: string; center: [number, number] }) => {
      const [lng, lat] = result.center;
      setError(null);
      setDiscovering(true);
      try {
        await discoverArea.mutateAsync({ lat, lng, radius: 200 });
        setFlyTo({ lat, lng, zoom: 16 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to discover buildings");
        setFlyTo({ lat, lng, zoom: 15 });
      } finally {
        setDiscovering(false);
      }
    },
    [discoverArea],
  );

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-4 top-4 z-20">
        <h1 className="text-2xl font-bold text-white drop-shadow-lg">SolarZero</h1>
        {discovering && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin" />
            Discovering buildings...
          </div>
        )}
        {error && (
          <div className="mt-2 max-w-xs rounded-md bg-red-500/80 px-3 py-1.5 text-xs text-white backdrop-blur">
            {error}
          </div>
        )}
      </div>

      <div className="absolute left-4 top-24 z-20">
        <SearchBar onSelect={handleSearchSelect} />
      </div>

      <MapViewDynamic flyTo={flyTo} />
    </div>
  );
}
