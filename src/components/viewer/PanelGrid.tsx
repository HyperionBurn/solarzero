"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface PanelGridProps {
  panelCount: number;
  roofWidth: number;
  roofDepth: number;
  tiltDeg: number;
}

const PANEL_WIDTH = 2.279; // meters
const PANEL_HEIGHT = 1.134; // meters
const PANEL_THICKNESS = 0.04; // meters
const ROW_SPACING = 1.5; // meters

/**
 * Grid-packs solar panels onto a rectangular roof surface.
 * Each panel is a thin box rotated to the specified tilt angle.
 * Material: deep blue (#1E40AF) with slight metalness.
 */
export function PanelGrid({ panelCount, roofWidth, roofDepth, tiltDeg }: PanelGridProps) {
  const meshes = useMemo(() => {
    const result: { position: [number, number, number]; rotation: [number, number, number] }[] = [];

    // Calculate grid layout
    const panelWidthWithSpacing = PANEL_WIDTH + 0.05; // small lateral gap
    const columns = Math.floor(roofWidth / panelWidthWithSpacing);
    const rowsPerCol = Math.floor((roofDepth - ROW_SPACING) / (PANEL_HEIGHT + ROW_SPACING)) + 1;

    const totalSlots = columns * rowsPerCol;
    const actualCount = Math.min(panelCount, totalSlots);

    if (actualCount <= 0 || columns <= 0) return result;

    const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
    // Calculate how much the panel bottom rises when tilted around X axis
    // Panel center must be raised so the bottom edge sits on roof surface
    const tiltOffsetY = Math.abs((PANEL_HEIGHT / 2) * Math.sin(tiltRad));

    const startX = -(columns * panelWidthWithSpacing) / 2 + panelWidthWithSpacing / 2;
    const startZ = -roofDepth / 2 + PANEL_HEIGHT / 2;

    let placed = 0;
    for (let row = 0; row < rowsPerCol && placed < actualCount; row++) {
      for (let col = 0; col < columns && placed < actualCount; col++) {
        const x = startX + col * panelWidthWithSpacing;
        const z = startZ + row * (PANEL_HEIGHT + ROW_SPACING);
        result.push({
          position: [x, tiltOffsetY, z],
          rotation: [tiltRad, 0, 0],
        });
        placed++;
      }
    }

    return result;
  }, [panelCount, roofWidth, roofDepth, tiltDeg]);

  const panelGeometry = useMemo(
    () => new THREE.BoxGeometry(PANEL_WIDTH, PANEL_THICKNESS, PANEL_HEIGHT),
    []
  );

  return (
    <group>
      {meshes.map((m, i) => (
        <mesh
          key={i}
          geometry={panelGeometry}
          position={m.position}
          rotation={m.rotation}
        >
          <meshStandardMaterial
            color="#1E40AF"
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}
