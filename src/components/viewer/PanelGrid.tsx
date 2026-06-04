"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
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

const panelMaterial = new THREE.MeshStandardMaterial({
  color: "#1E40AF",
  roughness: 0.5,
  metalness: 0.3,
});

const tempObject = new THREE.Object3D();

/**
 * Grid-packs solar panels onto a rectangular roof surface.
 * Uses InstancedMesh for GPU-efficient rendering — a single draw call
 * regardless of panel count (O(1) GPU cost vs O(n) previously).
 */
export function PanelGrid({ panelCount, roofWidth, roofDepth, tiltDeg }: PanelGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const positions = useMemo(() => {
    const result: { position: [number, number, number]; rotation: [number, number, number] }[] = [];

    const panelWidthWithSpacing = PANEL_WIDTH + 0.05;
    const columns = Math.floor(roofWidth / panelWidthWithSpacing);
    const rowsPerCol = Math.floor((roofDepth - ROW_SPACING) / (PANEL_HEIGHT + ROW_SPACING)) + 1;

    const totalSlots = columns * rowsPerCol;
    const actualCount = Math.min(panelCount, totalSlots);

    if (actualCount <= 0 || columns <= 0) return result;

    const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
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

  // Update instance matrices when positions change
  useFrame(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]!;
      tempObject.position.set(...pos.position);
      tempObject.rotation.set(...pos.rotation);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (positions.length === 0) return null;

  const panelGeometry = useMemo(
    () => new THREE.BoxGeometry(PANEL_WIDTH, PANEL_THICKNESS, PANEL_HEIGHT),
    []
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[panelGeometry, panelMaterial, positions.length]}
      frustumCulled={false}
    />
  );
}
