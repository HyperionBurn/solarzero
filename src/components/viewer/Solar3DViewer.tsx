"use client";

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { useTheme } from "next-themes";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { BuildingMesh } from "./BuildingMesh";
import { PanelGrid } from "./PanelGrid";
import { Loader2 } from "lucide-react";

interface Solar3DViewerProps {
  buildingType: string;
  roofAreaM2: number;
  heightMeters: number;
  panelCount: number;
}

function CanvasLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function Solar3DViewer(props: Solar3DViewerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const bgColor = isDark ? "#0f172a" : "#f8fafc";

  return (
    <ErrorBoundary>
      <Canvas
        shadows
        camera={{ position: [40, 20, 40], fov: 45 }}
        style={{ background: bgColor }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <Scene {...props} isDark={isDark} />
        </Suspense>
      </Canvas>
    </ErrorBoundary>
  );
}

const BUILDING_TYPE_COLORS_3D: Record<string, string> = {
  warehouse: "#d4a574",
  office: "#a8c4e2",
  industrial: "#b8b8b8",
  retail: "#a8d8b9",
  commercial: "#c4b5e2",
  residential: "#a8d4cc",
  unknown: "#CBD5E1",
};

function getFootprintDims(buildingType: string, roofAreaM2: number): { width: number; depth: number } {
  const area = roofAreaM2 || 100;
  const sqrtArea = Math.sqrt(area);
  switch (buildingType) {
    case "warehouse": return { width: sqrtArea * 1.6, depth: sqrtArea / 1.6 };
    case "industrial": return { width: sqrtArea * 1.5, depth: sqrtArea / 1.5 };
    case "office": return { width: sqrtArea * 1.2, depth: sqrtArea / 1.2 };
    case "retail": return { width: sqrtArea * 1.3, depth: sqrtArea / 1.3 };
    default: return { width: sqrtArea, depth: sqrtArea };
  }
}

function SolarPanelRoof({ panelCount, dims, buildingHeight }: { panelCount: number; dims: { width: number; depth: number }; buildingHeight: number }) {
  return (
    <group position={[0, buildingHeight + 0.02, 0]} rotation={[0, Math.PI, 0]}>
      <PanelGrid
        panelCount={panelCount}
        roofWidth={dims.width * 0.85}
        roofDepth={dims.depth * 0.85}
        tiltDeg={24}
      />
    </group>
  );
}

function Sun({ isDark }: { isDark: boolean }) {
  const sunTex = useMemo(() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const cx = size / 2;
    const cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    grad.addColorStop(0, "rgba(255, 250, 220, 1)");
    grad.addColorStop(0.15, "rgba(255, 220, 100, 0.95)");
    grad.addColorStop(0.4, "rgba(255, 180, 60, 0.6)");
    grad.addColorStop(0.7, "rgba(255, 140, 30, 0.2)");
    grad.addColorStop(1, "rgba(255, 120, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  if (isDark) return null;
  return (
    <sprite position={[60, 80, -80]} scale={[20, 20, 1]}>
      <spriteMaterial
        map={sunTex}
        transparent
        depthWrite={false}
        depthTest={false}
        fog={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function SkyDome({ isDark }: { isDark: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    if (isDark) {
      g.addColorStop(0, "#020617");
      g.addColorStop(0.4, "#0f172a");
      g.addColorStop(0.7, "#1e3a5f");
      g.addColorStop(1, "#3b5d80");
    } else {
      g.addColorStop(0, "#0c4a6e");
      g.addColorStop(0.35, "#38bdf8");
      g.addColorStop(0.7, "#7dd3fc");
      g.addColorStop(1, "#e0f2fe");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [isDark]);
  return (
    <mesh scale={[400, 400, 400]}>
      <sphereGeometry args={[1, 32, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

function GroundGrid({ isDark }: { isDark: boolean }) {
  const tex = useMemo(() => {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = isDark ? "#0f172a" : "#f1f5f9";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = isDark ? "rgba(148,163,184,0.15)" : "rgba(100,116,139,0.18)";
    ctx.lineWidth = 1;
    const step = size / 32;
    for (let i = 0; i <= 32; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    const center = size / 2;
    ctx.strokeStyle = isDark ? "rgba(13,148,136,0.3)" : "rgba(13,148,136,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, size);
    ctx.moveTo(0, center);
    ctx.lineTo(size, center);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.anisotropy = 8;
    return t;
  }, [isDark]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial map={tex} roughness={0.92} metalness={0.0} />
    </mesh>
  );
}

interface TreeData {
  x: number;
  z: number;
  trunkH: number;
  trunkR: number;
  canopyR: number;
  canopyH: number;
  canopyColor: string;
  rotation: number;
}

function Trees({ dims, isDark }: { dims: { width: number; depth: number }; isDark: boolean }) {
  const trees = useMemo<TreeData[]>(() => {
    const list: TreeData[] = [];
    const margin = 6;
    const bldHalfW = dims.width / 2 + margin;
    const bldHalfD = dims.depth / 2 + margin;

    const canopyColors = isDark
      ? ["#1e3a2f", "#243f33", "#1a3329"]
      : ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#3a7d44"];

    const seedPositions: [number, number][] = [
      [-bldHalfW - 4, -bldHalfD - 2],
      [-bldHalfW + 2, bldHalfD + 4],
      [bldHalfW + 5, -bldHalfD - 3],
      [bldHalfW + 1, bldHalfD + 2],
      [-bldHalfW - 8, 0],
      [bldHalfW + 10, 0],
      [0, -bldHalfD - 8],
      [0, bldHalfD + 10],
      [-bldHalfW - 12, bldHalfD - 4],
      [bldHalfW + 8, -bldHalfD + 4],
      [-bldHalfW + 4, -bldHalfD - 6],
      [bldHalfW - 3, bldHalfD + 6],
      [-bldHalfW - 6, bldHalfD + 8],
      [bldHalfW + 12, bldHalfD - 2],
    ];

    seedPositions.forEach((pos, i) => {
      const t = i * 7919;
      const sizeFactor = 0.7 + ((t % 100) / 100) * 0.7;
      list.push({
        x: pos[0] + (((i * 13) % 7) - 3) * 0.5,
        z: pos[1] + (((i * 17) % 7) - 3) * 0.5,
        trunkH: 2.0 * sizeFactor,
        trunkR: 0.18 * sizeFactor,
        canopyR: 1.6 * sizeFactor,
        canopyH: 3.0 * sizeFactor,
        canopyColor: canopyColors[i % canopyColors.length]!,
        rotation: (i * 0.7) % (Math.PI * 2),
      });
    });

    return list;
  }, [dims, isDark]);

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation={[0, t.rotation, 0]}>
          <mesh position={[0, t.trunkH / 2, 0]} castShadow>
            <cylinderGeometry args={[t.trunkR * 0.8, t.trunkR, t.trunkH, 8]} />
            <meshStandardMaterial color="#5c3a1e" roughness={0.95} metalness={0.05} />
          </mesh>
          <mesh position={[0, t.trunkH + t.canopyH * 0.3, 0]} castShadow>
            <coneGeometry args={[t.canopyR, t.canopyH, 10]} />
            <meshStandardMaterial color={t.canopyColor} roughness={0.85} metalness={0.0} />
          </mesh>
          <mesh position={[0, t.trunkH + t.canopyH * 0.7, 0]} castShadow>
            <coneGeometry args={[t.canopyR * 0.7, t.canopyH * 0.6, 10]} />
            <meshStandardMaterial color={t.canopyColor} roughness={0.85} metalness={0.0} />
          </mesh>
          <mesh position={[0, t.trunkH + t.canopyH * 0.5, t.canopyR * 0.5]}>
            <sphereGeometry args={[t.canopyR * 0.45, 8, 8]} />
            <meshStandardMaterial color={t.canopyColor} roughness={0.85} metalness={0.0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Scene({ buildingType, roofAreaM2, heightMeters, panelCount, isDark }: Solar3DViewerProps & { isDark: boolean }) {
  const dims = getFootprintDims(buildingType, roofAreaM2);
  const bldHeight = heightMeters || 12;
  const envIntensity = isDark ? 0.6 : 1;

  return (
    <>
      <directionalLight
        position={[40, 60, 30]}
        intensity={1.5 * envIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <ambientLight intensity={0.45 * envIntensity} />
      <hemisphereLight args={[isDark ? "#7dd3fc" : "#87CEEB", "#362907", 0.5 * envIntensity]} />
      <directionalLight position={[-30, 25, -20]} intensity={0.3 * envIntensity} color={isDark ? "#7dd3fc" : "#fef3c7"} />

      <SkyDome isDark={isDark} />
      <Sun isDark={isDark} />

      <BuildingMesh height={bldHeight} width={dims.width} depth={dims.depth} color={BUILDING_TYPE_COLORS_3D[buildingType] ?? BUILDING_TYPE_COLORS_3D.unknown} />

      {panelCount > 0 && <SolarPanelRoof panelCount={panelCount} dims={dims} buildingHeight={bldHeight} />}

      <GroundGrid isDark={isDark} />
      <Trees dims={dims} isDark={isDark} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.5}
        minDistance={15}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, bldHeight / 2, 0]}
        autoRotate
        autoRotateSpeed={0.35}
      />
      <Environment preset={isDark ? "night" : "sunset"} />
    </>
  );
}
