"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "@/trpc/react";
import { escapeHtml } from "@/lib/utils";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
}

const BUILDING_TYPE_COLORS: Record<string, string> = {
  warehouse: "#F97316", office: "#3B82F6", industrial: "#6B7280",
  retail: "#22C55E", commercial: "#8B5CF6", residential: "#14B8A6", unknown: "#94A3B8",
};

// Free OpenStreetMap tile styles — no API key needed
const FREE_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  streets: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

export default function MapView({ center = [55.2708, 25.2048], zoom = 12, pitch = 45, flyTo }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [bounds, setBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);

  const { data: buildings } = api.building.list.useQuery(
    bounds ?? { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 },
    { enabled: !!bounds }
  );

  const updateBounds = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const b = m.getBounds();
    if (!b) return;
    setBounds({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: FREE_STYLES.light,
      center,
      zoom,
      pitch,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      const m = map.current!;
      // Enable 3D building extrusion if supported
      try { m.setPaintProperty("building", "fill-extrusion-height", ["get", "render_height"]); } catch {}
      try { m.setPaintProperty("building", "fill-extrusion-color", "#cbd5e1"); } catch {}
      try { m.setPaintProperty("building", "fill-extrusion-opacity", 0.6); } catch {}
      setLoading(false);
      setMapLoaded(true);
      updateBounds();
    });

    map.current.on("moveend", updateBounds);

    return () => { map.current?.remove(); };
  }, []);

  // Fly to coordinates when parent triggers navigation
  useEffect(() => {
    if (!flyTo || !map.current) return;
    map.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: flyTo.zoom ?? 16, duration: 2000 });
  }, [flyTo]);

  // Render building markers
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || !buildings) return;
    markersRef.current.forEach(mk => mk.remove());
    markersRef.current = [];

    buildings.forEach((building) => {
      const color = BUILDING_TYPE_COLORS[building.buildingType ?? "unknown"] ?? BUILDING_TYPE_COLORS.unknown;
      const el = document.createElement("div");
      el.className = "building-marker";
      el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;transition:width 0.15s,height 0.15s,box-shadow 0.15s;`;
      el.addEventListener("mouseenter", () => { el.style.width = "16px"; el.style.height = "16px"; el.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)"; });
      el.addEventListener("mouseleave", () => { el.style.width = "12px"; el.style.height = "12px"; el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)"; });

      const html = `<div style="font-family:system-ui,sans-serif;padding:4px">
        <p style="font-weight:600;font-size:13px;margin:0 0 4px;color:#0f172a">${escapeHtml(building.address ?? "Building")}</p>
        <p style="font-size:12px;color:#64748b;margin:0 0 4px">Type: <span style="color:${color};font-weight:600">${escapeHtml(building.buildingType ?? "Unknown")}</span>${building.roofAreaM2 ? ` &middot; ${Math.round(building.roofAreaM2)} m²` : ""}</p>
        ${building.assessment ? `<p style="font-size:12px;color:#0d9488;margin:0 0 8px">Assessed: ${building.assessment.systemSizeKwp.toFixed(1)} kWp &middot; ${building.assessment.panelCount} panels</p>` : ""}
        <a href="/buildings/${building.id}" style="display:inline-block;padding:6px 14px;background:#0d9488;color:white;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">Assess this Building</a>
      </div>`;

      const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "280px" }).setHTML(html);
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([building.lng, building.lat]).setPopup(popup).addTo(m);
      markersRef.current.push(marker);
    });
  }, [buildings, mapLoaded]);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
