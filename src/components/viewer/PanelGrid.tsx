"use client";

import { useRef, useMemo, useEffect } from "react";
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

const panelMaterial = new THREE.MeshPhysicalMaterial({
  color: "#dce8ff",
  map: cellTexture,
  roughness: 0.42,
  metalness: 0.35,
  envMapIntensity: 1.1,
  clearcoat: 0.85,
  clearcoatRoughness: 0.08,
  reflectivity: 0.5,
  sheen: 0.4,
  sheenColor: new THREE.Color("#7dd3fc"),
  sheenRoughness: 0.4,
  emissive: new THREE.Color("#1e3a8a"),
  emissiveIntensity: 0.04,
});

const frameMaterial = new THREE.MeshStandardMaterial({
  color: "#9ca3af",
  roughness: 0.4,
  metalness: 0.92,
});

const frameEdgeGeometry = (() => {
  const t = 0.025;
  const h = 0.05;
  const w = PANEL_WIDTH;
  const l = PANEL_HEIGHT;
  const geos: THREE.BufferGeometry[] = [];

  const top = new THREE.BoxGeometry(w + 0.02, h, t);
  top.translate(0, h / 2, -l / 2 + t / 2);
  geos.push(top);
  const bot = new THREE.BoxGeometry(w + 0.02, h, t);
  bot.translate(0, h / 2, l / 2 - t / 2);
  geos.push(bot);
  const left = new THREE.BoxGeometry(t, h, l);
  left.translate(-w / 2 + t / 2, h / 2, 0);
  geos.push(left);
  const right = new THREE.BoxGeometry(t, h, l);
  right.translate(w / 2 - t / 2, h / 2, 0);
  geos.push(right);

  return geos;
})();

const bracketGeometry = (() => {
  const bracketW = 0.06;
  const bracketH = 0.35;
  const bracketD = 0.06;
  const positions = [
    { x: -PANEL_WIDTH * 0.35, z: -PANEL_HEIGHT * 0.4 },
    { x: PANEL_WIDTH * 0.35, z: -PANEL_HEIGHT * 0.4 },
    { x: -PANEL_WIDTH * 0.35, z: PANEL_HEIGHT * 0.4 },
    { x: PANEL_WIDTH * 0.35, z: PANEL_HEIGHT * 0.4 },
  ];
  return positions.map((p) => {
    const g = new THREE.BoxGeometry(bracketW, bracketH, bracketD);
    g.translate(p.x, -bracketH / 2 - 0.01, p.z);
    return g;
  });
})();

const railGeometry = (() => {
  const railW = PANEL_WIDTH + 0.1;
  const railH = 0.04;
  const railD = 0.04;
  const positions = [
    { x: 0, z: -PANEL_HEIGHT * 0.4 },
    { x: 0, z: PANEL_HEIGHT * 0.4 },
  ];
  return positions.map((p) => {
    const g = new THREE.BoxGeometry(railW, railH, railD);
    g.translate(p.x, -railH / 2 - 0.005, p.z);
    return g;
  });
})();

const tempObject = new THREE.Object3D();

export function PanelGrid({ panelCount, roofWidth, roofDepth, tiltDeg }: PanelGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const frameRefs = useRef<(THREE.InstancedMesh | null)[]>([null, null, null, null]);
  const bracketRefs = useRef<(THREE.InstancedMesh | null)[]>(bracketGeometry.map(() => null));
  const railRefs = useRef<(THREE.InstancedMesh | null)[]>(railGeometry.map(() => null));
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

    for (let f = 0; f < frameEdgeGeometry.length; f++) {
      const fr = frameRefs.current[f];
      if (!fr) continue;
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]!;
        tempObject.position.set(...pos.position);
        tempObject.rotation.set(...pos.rotation);
        tempObject.updateMatrix();
        fr.setMatrixAt(i, tempObject.matrix);
      }
      fr.instanceMatrix.needsUpdate = true;
    }

    for (let b = 0; b < bracketGeometry.length; b++) {
      const br = bracketRefs.current[b];
      if (!br) continue;
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]!;
        tempObject.position.set(...pos.position);
        tempObject.rotation.set(...pos.rotation);
        tempObject.updateMatrix();
        br.setMatrixAt(i, tempObject.matrix);
      }
      br.instanceMatrix.needsUpdate = true;
    }

    for (let r = 0; r < railGeometry.length; r++) {
      const rl = railRefs.current[r];
      if (!rl) continue;
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]!;
        tempObject.position.set(...pos.position);
        tempObject.rotation.set(...pos.rotation);
        tempObject.updateMatrix();
        rl.setMatrixAt(i, tempObject.matrix);
      }
      rl.instanceMatrix.needsUpdate = true;
    }
  }, [positions]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    panelMaterial.emissiveIntensity = 0.04 + Math.sin(t * 0.6) * 0.025 + Math.sin(t * 0.31) * 0.012;
  });

  if (positions.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[panelGeometry, panelMaterial, positions.length]}
        frustumCulled={false}
      />
      {frameEdgeGeometry.map((geo, i) => (
        <instancedMesh
          key={`frame-${i}`}
          ref={(el) => { frameRefs.current[i] = el; }}
          args={[geo, frameMaterial, positions.length]}
          frustumCulled={false}
        />
      ))}
      {bracketGeometry.map((geo, i) => (
        <instancedMesh
          key={`bracket-${i}`}
          ref={(el) => { bracketRefs.current[i] = el; }}
          args={[geo, frameMaterial, positions.length]}
          frustumCulled={false}
        />
      ))}
      {railGeometry.map((geo, i) => (
        <instancedMesh
          key={`rail-${i}`}
          ref={(el) => { railRefs.current[i] = el; }}
          args={[geo, frameMaterial, positions.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
