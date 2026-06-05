"use client";

import { useRef, useMemo, useEffect } from "react";
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

function buildCellTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cellCols = 12;
  const cellRows = 6;
  const cellW = size / cellCols;
  const cellH = size / cellRows;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#0c1e54");
  grad.addColorStop(0.5, "#1a3a8a");
  grad.addColorStop(1, "#0a1a4a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#050b22";
  ctx.lineWidth = 3;
  for (let r = 0; r < cellRows; r++) {
    for (let c = 0; c < cellCols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

      const shineGrad = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
      shineGrad.addColorStop(0, "rgba(255,255,255,0.08)");
      shineGrad.addColorStop(0.5, "rgba(255,255,255,0.0)");
      shineGrad.addColorStop(1, "rgba(255,255,255,0.05)");
      ctx.fillStyle = shineGrad;
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
    }
  }

  ctx.strokeStyle = "rgba(200, 215, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let r = 0; r < cellRows; r++) {
    for (let c = 0; c < cellCols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      const crossX = x + cellW * 0.1;
      const crossY = y + cellH * 0.5;
      ctx.beginPath();
      ctx.moveTo(x + cellW * 0.15, y + cellH * 0.5);
      ctx.lineTo(x + cellW * 0.85, y + cellH * 0.5);
      ctx.moveTo(x + cellW * 0.5, y + cellH * 0.15);
      ctx.lineTo(x + cellW * 0.5, y + cellH * 0.85);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

const cellTexture = buildCellTexture();

const panelMaterial = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  map: cellTexture,
  roughness: 0.32,
  metalness: 0.55,
  envMapIntensity: 0.85,
});

const tempObject = new THREE.Object3D();

export function PanelGrid({ panelCount, roofWidth, roofDepth, tiltDeg }: PanelGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const panelGeometry = useMemo(
    () => new THREE.BoxGeometry(PANEL_WIDTH, PANEL_THICKNESS, PANEL_HEIGHT),
    [],
  );

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

  useEffect(() => {
    if (!meshRef.current || positions.length === 0) return;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]!;
      tempObject.position.set(...pos.position);
      tempObject.rotation.set(...pos.rotation);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[panelGeometry, panelMaterial, positions.length]}
      frustumCulled={false}
    />
  );
}
