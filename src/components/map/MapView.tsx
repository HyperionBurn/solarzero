"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
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

// Free CARTO tile styles — no API key needed
const FREE_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  streets: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

const BOUNDS_DEBOUNCE_MS = 400;

export default function MapView({ center = [55.2708, 25.2048], zoom = 12, pitch = 45, flyTo }: MapViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeStyle = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [bounds, setBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);

  const { data: buildings } = api.building.list.useQuery(
    bounds ?? { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 },
    { enabled: !!bounds }
  );

  // Debounced bounds update — prevents marker flickering on rapid pan/zoom
  const scheduleBoundsUpdate = useCallback(() => {
    if (boundsTimer.current) clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(() => {
      const m = map.current;
      if (!m) return;
      const b = m.getBounds();
      if (!b) return;
      setBounds({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
    }, BOUNDS_DEBOUNCE_MS);
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const styleUrl = isDark ? FREE_STYLES.dark : FREE_STYLES.light;
    activeStyle.current = styleUrl;
    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center,
      zoom,
      pitch,
    });

    m.addControl(new maplibregl.NavigationControl(), "top-right");

    m.on("load", () => {
      // Enable 3D building extrusion if supported (gracefully degrade if map style lacks layer)
      try { m.setPaintProperty("building", "fill-extrusion-height", ["get", "render_height"]); } catch { /* layer may not exist in free tile style */ }
      try { m.setPaintProperty("building", "fill-extrusion-color", "#cbd5e1"); } catch { /* layer may not exist in free tile style */ }
      try { m.setPaintProperty("building", "fill-extrusion-opacity", 0.6); } catch { /* layer may not exist in free tile style */ }
      setLoading(false);
      setMapLoaded(true);
      scheduleBoundsUpdate();
    });

    m.on("moveend", scheduleBoundsUpdate);

    map.current = m;
    return () => { m.remove(); };
    // Intentional: only mount/unmount, never re-create on theme change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoothly swap map style on theme change — no full recreation
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded) return;
    const nextStyle = isDark ? FREE_STYLES.dark : FREE_STYLES.light;
    if (activeStyle.current !== nextStyle) {
      activeStyle.current = nextStyle;
      m.setStyle(nextStyle);
    }
  }, [resolvedTheme, mapLoaded]);

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
      el.style.cssText = `width:13px;height:13px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25), 0 0 0 0 rgba(13,148,136,0);cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);`;
      el.addEventListener("mouseenter", () => { el.style.width = "18px"; el.style.height = "18px"; el.style.boxShadow = `0 0 0 4px ${color}33, 0 2px 10px rgba(0,0,0,0.35)`; });
      el.addEventListener("mouseleave", () => { el.style.width = "13px"; el.style.height = "13px"; el.style.boxShadow = "0 1px 6px rgba(0,0,0,0.25), 0 0 0 0 rgba(13,148,136,0)"; });

      const textColor = isDark ? "#e2e8f0" : "#0f172a";
      const mutedColor = isDark ? "#94a3b8" : "#64748b";
      const popupBg = isDark ? "#0f172a" : "#ffffff";
      const html = `<div style="font-family:system-ui,sans-serif;padding:8px;background:${popupBg};border-radius:12px">
        <p style="font-weight:600;font-size:14px;margin:0 0 6px;color:${textColor}">${escapeHtml(building.address ?? "Building")}</p>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color}"></span>
          <span style="font-size:12px;color:${mutedColor}">${escapeHtml(building.buildingType ?? "Unknown")}</span>
          ${building.roofAreaM2 ? `<span style="font-size:12px;color:${mutedColor}">&middot;</span><span style="font-size:12px;color:${mutedColor}">${Math.round(building.roofAreaM2)} m²</span>` : ""}
        </div>
        ${building.assessment ? `<div style="background:${isDark ? "#134e4a20" : "#f0fdfa"};border-radius:8px;padding:8px 10px;margin-bottom:10px;border:1px solid ${isDark ? "#134e4a" : "#ccfbf1"}"><p style="font-size:12px;color:#0d9488;margin:0;font-weight:600">${building.assessment.systemSizeKwp.toFixed(1)} kWp &middot; ${building.assessment.panelCount} panels</p></div>` : ""}
        <a href="/buildings/${building.id}" style="display:block;text-align:center;padding:9px 14px;background:#0d9488;color:white;border-radius:9999px;font-size:12px;font-weight:600;text-decoration:none;transition:background 0.2s">${building.assessment ? "View Details" : "Assess this Building"}</a>
      </div>`;

      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: false,
        closeOnClick: false,
        maxWidth: "300px",
        className: isDark ? "map-popup-dark" : "map-popup-light",
      }).setHTML(html);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        markersRef.current.forEach((mk) => mk.getPopup()?.remove());
        const popup2 = marker.getPopup();
        if (popup2 && popup2.isOpen()) {
          popup2.remove();
        } else {
          marker.togglePopup();
        }
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([building.lng, building.lat]).setPopup(popup).addTo(m);
      markersRef.current.push(marker);
    });

    const closePopups = () => markersRef.current.forEach((mk) => mk.getPopup()?.remove());
    m.on("click", closePopups);
    return () => { m.off("click", closePopups); };
  }, [buildings, mapLoaded, isDark]);

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
