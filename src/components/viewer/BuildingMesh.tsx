"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface BuildingMeshProps {
  footprint?: [number, number][];
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
}

function footprintToShape(footprint: [number, number][]): THREE.Shape {
  const base = footprint[0]!;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((base[0] * Math.PI) / 180);
  const points = footprint.map(([lng, lat]) => {
    return new THREE.Vector2((lng - base[0]) * mPerDegLng, (lat - base[1]) * mPerDegLat);
  });
  const shape = new THREE.Shape();
  if (points.length > 0) {
    shape.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i]!.x, points[i]!.y);
    shape.closePath();
  }
  return shape;
}

function defaultFootprint(width: number, depth: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.lineTo(width / 2, -depth / 2);
  shape.lineTo(width / 2, depth / 2);
  shape.lineTo(-width / 2, depth / 2);
  shape.closePath();
  return shape;
}

function buildWindowTexture(rows: number, cols: number): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, w, h);

  const cellW = w / cols;
  const cellH = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + 4;
      const y = r * cellH + 4;
      const ww = cellW - 8;
      const hh = cellH - 8;
      const grad = ctx.createLinearGradient(x, y, x, y + hh);
      grad.addColorStop(0, "#7dd3fc");
      grad.addColorStop(0.5, "#38bdf8");
      grad.addColorStop(1, "#0284c7");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, ww, hh);
      ctx.strokeStyle = "#0c4a6e";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, ww, hh);
      ctx.beginPath();
      ctx.moveTo(x + ww / 2, y);
      ctx.lineTo(x + ww / 2, y + hh);
      ctx.moveTo(x, y + hh / 2);
      ctx.lineTo(x + ww, y + hh / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const windowTexture = buildWindowTexture(3, 6);

export function BuildingMesh({ footprint, width = 30, depth = 20, height = 12, color = "#CBD5E1" }: BuildingMeshProps) {
  const geometry = useMemo(() => {
    const shape = footprint && footprint.length >= 3 ? footprintToShape(footprint) : defaultFootprint(width, depth);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, depth: height, bevelEnabled: false });
  }, [footprint, height, width, depth]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.7, metalness: 0.05 }), [color]);

  const parapetGeo = useMemo(() => {
    const w = footprint?.length ? 0 : width;
    const d = footprint?.length ? 0 : depth;
    if (!w) return null;
    const pShape = new THREE.Shape();
    pShape.moveTo(-w / 2 - 0.2, -d / 2 - 0.2);
    pShape.lineTo(w / 2 + 0.2, -d / 2 - 0.2);
    pShape.lineTo(w / 2 + 0.2, d / 2 + 0.2);
    pShape.lineTo(-w / 2 - 0.2, d / 2 + 0.2);
    pShape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-w / 2, -d / 2);
    hole.lineTo(w / 2, -d / 2);
    hole.lineTo(w / 2, d / 2);
    hole.lineTo(-w / 2, d / 2);
    hole.closePath();
    pShape.holes.push(hole);
    return new THREE.ExtrudeGeometry(pShape, { steps: 1, depth: 0.4, bevelEnabled: false });
  }, [width, depth, footprint]);

  const isRectangular = !footprint || footprint.length < 3;
  const windowRowCount = Math.max(2, Math.floor(height / 4));
  const windowCols = Math.max(3, Math.floor(width / 5));
  const windowDepthCols = Math.max(2, Math.floor(depth / 5));

  return (
    <group>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {parapetGeo && (
        <mesh geometry={parapetGeo} position={[0, height, 0]} castShadow>
          <meshStandardMaterial color={new THREE.Color(color)} roughness={0.8} />
        </mesh>
      )}

      {isRectangular && (
        <>
          {Array.from({ length: windowRowCount }).map((_, row) =>
            Array.from({ length: windowCols }).map((_, col) => {
              const x = -width / 2 + (col + 0.5) * (width / windowCols);
              const y = (row + 0.5) * (height / windowRowCount);
              return (
                <mesh key={`fwd-${row}-${col}`} position={[x, y, depth / 2 + 0.02]}>
                  <planeGeometry args={[width / windowCols * 0.7, height / windowRowCount * 0.65]} />
                  <meshStandardMaterial map={windowTexture} emissive="#7dd3fc" emissiveIntensity={0.15} roughness={0.3} metalness={0.1} />
                </mesh>
              );
            })
          )}

          {Array.from({ length: windowRowCount }).map((_, row) =>
            Array.from({ length: windowCols }).map((_, col) => {
              const x = -width / 2 + (col + 0.5) * (width / windowCols);
              const y = (row + 0.5) * (height / windowRowCount);
              return (
                <mesh key={`back-${row}-${col}`} position={[x, y, -depth / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[width / windowCols * 0.7, height / windowRowCount * 0.65]} />
                  <meshStandardMaterial map={windowTexture} emissive="#7dd3fc" emissiveIntensity={0.15} roughness={0.3} metalness={0.1} />
                </mesh>
              );
            })
          )}

          {Array.from({ length: windowRowCount }).map((_, row) =>
            Array.from({ length: windowDepthCols }).map((_, col) => {
              const z = -depth / 2 + (col + 0.5) * (depth / windowDepthCols);
              const y = (row + 0.5) * (height / windowRowCount);
              return (
                <mesh key={`left-${row}-${col}`} position={[-width / 2 - 0.02, y, z]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[depth / windowDepthCols * 0.7, height / windowRowCount * 0.65]} />
                  <meshStandardMaterial map={windowTexture} emissive="#7dd3fc" emissiveIntensity={0.15} roughness={0.3} metalness={0.1} />
                </mesh>
              );
            })
          )}

          {Array.from({ length: windowRowCount }).map((_, row) =>
            Array.from({ length: windowDepthCols }).map((_, col) => {
              const z = -depth / 2 + (col + 0.5) * (depth / windowDepthCols);
              const y = (row + 0.5) * (height / windowRowCount);
              return (
                <mesh key={`right-${row}-${col}`} position={[width / 2 + 0.02, y, z]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[depth / windowDepthCols * 0.7, height / windowRowCount * 0.65]} />
                  <meshStandardMaterial map={windowTexture} emissive="#7dd3fc" emissiveIntensity={0.15} roughness={0.3} metalness={0.1} />
                </mesh>
              );
            })
          )}

          <mesh position={[0, height * 0.18, depth / 2 + 0.05]}>
            <planeGeometry args={[2.4, height * 0.35]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0, height * 0.5, depth / 2 + 0.06]}>
            <planeGeometry args={[2.5, 0.08]} />
            <meshStandardMaterial color="#0d9488" emissive="#0d9488" emissiveIntensity={0.3} roughness={0.5} />
          </mesh>
        </>
      )}

      <ACUnits width={width} depth={depth} height={height} />
    </group>
  );
}

function ACUnits({ width, depth, height }: { width: number; depth: number; height: number }) {
  const positions = useMemo(() => {
    const list: [number, number, number][] = [];
    const cols = 3;
    const rows = 2;
    const margin = 0.3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -width * 0.35 + c * (width * 0.7 / (cols - 1));
        const z = -depth * 0.3 + r * (depth * 0.6 / (rows - 1));
        list.push([x, height + 0.5 + 0.0001, z + margin]);
      }
    }
    return list;
  }, [width, depth, height]);

  return (
    <>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <mesh castShadow>
            <boxGeometry args={[1.6, 1.0, 1.2]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.6} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.61]}>
            <planeGeometry args={[1.4, 0.8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.7} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.615]}>
            <planeGeometry args={[1.2, 0.5]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.35, 0.45, 0.15, 16]} />
            <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}
