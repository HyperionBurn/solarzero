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

interface MapBuilding {
  id: string;
  address: string;
  lat: number;
  lng: number;
  buildingType: string | null;
  roofAreaM2: number | null;
  assessment: {
    id: string;
    systemSizeKwp: number;
    panelCount: number;
  } | null;
  opportunity: {
    id: string;
    scoreTotal: number;
    scoreBand: string;
    nextAction: string;
    reasonsJson: unknown;
    risksJson: unknown;
  } | null;
}

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
  const mapBuildings = buildings as MapBuilding[] | undefined;

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
  }, [resolvedTheme, mapLoaded, isDark]);

  // Fly to coordinates when parent triggers navigation
  useEffect(() => {
    if (!flyTo || !map.current) return;
    map.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: flyTo.zoom ?? 16, duration: 2000 });
  }, [flyTo]);

  // Render building markers styled by opportunity priority
  useEffect(() => {
    const m = map.current;
    if (!m || !mapLoaded || !mapBuildings) return;
    markersRef.current.forEach(mk => mk.remove());
    markersRef.current = [];

    const BAND_COLORS: Record<string, string> = {
      A: "#10B981", // Emerald
      B: "#0D9488", // Teal
      C: "#F59E0B", // Amber
      D: "#F97316", // Orange
      REJECT: "#EF4444", // Rose
      neutral: "#94A3B8"
    };

    mapBuildings.forEach((building) => {
      const opp = building.opportunity;
      const band = opp?.scoreBand ?? "neutral";
      const score = opp?.scoreTotal ?? 0;
      const color = BAND_COLORS[band] ?? BAND_COLORS.neutral;

      const isVerifiedSolar = opp?.nextAction === "VERIFY_SOLARIZATION";
      const isAssessed = !!building.assessment;

      // Outer styling of marker
      let markerBorder = "2.5px solid white";
      if (isVerifiedSolar) {
        markerBorder = "3px solid #6366F1"; // Blue outline for verifying solar
      } else if (isAssessed) {
        markerBorder = "3.5px solid #0f172a"; // Dark outline for assessed buildings
      }

      const el = document.createElement("div");
      el.className = "building-marker";
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:${markerBorder};box-shadow:0 1.5px 7px rgba(0,0,0,0.3);cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);`;
      el.addEventListener("mouseenter", () => {
        el.style.width = "18px";
        el.style.height = "18px";
        el.style.boxShadow = `0 0 0 5px ${color}33, 0 3px 12px rgba(0,0,0,0.4)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.boxShadow = "0 1.5px 7px rgba(0,0,0,0.3)";
      });

      const textColor = isDark ? "#f8fafc" : "#0f172a";
      const mutedColor = isDark ? "#94a3b8" : "#475569";
      const borderThemeColor = isDark ? "#334155" : "#e2e8f0";
      const popupBg = isDark ? "#0f172a" : "#ffffff";

      // Parse reasons and risks
      let reasons: string[] = [];
      let risks: string[] = [];
      if (opp) {
        try {
          reasons = opp.reasonsJson ? JSON.parse(opp.reasonsJson as string) : [];
        } catch {
          reasons = (opp.reasonsJson as string[]) || [];
        }
        try {
          risks = opp.risksJson ? JSON.parse(opp.risksJson as string) : [];
        } catch {
          risks = (opp.risksJson as string[]) || [];
        }
      }

      const reasonsHtml = reasons.slice(0, 2).map(r => `
        <div style="font-size:11px;color:${textColor};margin-bottom:4px;display:flex;gap:4px;line-height:1.4">
          <span style="color:#0d9488">•</span>
          <span>${escapeHtml(r)}</span>
        </div>
      `).join("");

      const riskHtml = risks.length > 0 ? `
        <div style="font-size:11px;color:#f43f5e;margin-top:6px;font-weight:500;display:flex;gap:4px;line-height:1.4">
          <span style="color:#ef4444">⚠</span>
          <span>${escapeHtml(risks[0])}</span>
        </div>
      ` : "";

      const assessmentSectionHtml = building.assessment ? `
        <div style="background:${isDark ? "#134e4a20" : "#f0fdfa"};border-radius:8px;padding:8px 10px;margin-top:8px;border:1px solid ${isDark ? "#115e59" : "#b2f5ea"}">
          <p style="font-size:11px;color:#0d9488;margin:0;font-weight:700">
            ${building.assessment.systemSizeKwp.toFixed(1)} kWp &middot; ${building.assessment.panelCount} panels
          </p>
        </div>
      ` : `
        <div style="background:${isDark ? "#1e293b50" : "#f8fafc"};border-radius:8px;padding:8px 10px;margin-top:8px;border:1px solid ${borderThemeColor}">
          <p style="font-size:11px;color:${mutedColor};margin:0;font-style:italic">
            SolarZero assessment not run
          </p>
        </div>
      `;

      const ctaUrl = opp ? `/opportunities/${opp.id}` : `/buildings/${building.id}`;
      const ctaText = opp ? "Open Dossier" : "View Building";

      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;padding:12px;background:${popupBg};border-radius:12px;width:260px;box-shadow:0 4px 20px rgba(0,0,0,0.15)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            ${opp ? `<span style="font-weight:700;font-size:10px;padding:2.5px 6px;border-radius:4px;background:${color}15;color:${color};border:1px solid ${color}30">BAND ${band}</span>` : `<span style="font-weight:700;font-size:10px;padding:2.5px 6px;border-radius:4px;background:#94a3b815;color:#94a3b8;border:1px solid #94a3b830">UNRANKED</span>`}
            ${opp ? `<span style="font-weight:700;font-size:13px;color:${textColor}">${score} pts</span>` : ""}
          </div>
          <p style="font-weight:700;font-size:13px;margin:0 0 6px;color:${textColor};line-height:1.4">${escapeHtml(building.address ?? "Building")}</p>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <span style="font-size:11px;color:${mutedColor}">Type: ${escapeHtml(building.buildingType ?? "C&I")}</span>
            ${building.roofAreaM2 ? `<span style="font-size:11px;color:${mutedColor}">&middot;</span><span style="font-size:11px;color:${mutedColor}">${Math.round(building.roofAreaM2)} m²</span>` : ""}
          </div>
          
          <div style="margin-top:8px;border-top:1px border-style:solid;border-color:${borderThemeColor};padding-top:8px">
            ${reasonsHtml}
            ${riskHtml}
          </div>
          
          ${assessmentSectionHtml}
          
          <a href="${ctaUrl}" style="display:block;text-align:center;padding:9px 14px;background:#0d9488;color:white;border-radius:9999px;font-size:11px;font-weight:700;text-decoration:none;transition:background 0.2s;margin-top:10px;box-shadow:0 2px 6px rgba(13,148,136,0.2)">
            ${ctaText}
          </a>
        </div>
      `;

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
  }, [mapBuildings, mapLoaded, isDark]);


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
