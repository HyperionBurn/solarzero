"use client";

import { Suspense } from "react";
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

function Scene({ buildingType, roofAreaM2, heightMeters, panelCount, isDark }: Solar3DViewerProps & { isDark: boolean }) {
  const dims = getFootprintDims(buildingType, roofAreaM2);
  const bldHeight = heightMeters || 12;
  const groundColor = isDark ? "#1e293b" : "#f1f5f9";
  const envIntensity = isDark ? 0.6 : 1;

  return (
    <>
      <directionalLight
        position={[40, 60, 30]}
        intensity={1.5 * envIntensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ambientLight intensity={0.5 * envIntensity} />
      <hemisphereLight args={["#87CEEB", "#362907", 0.3 * envIntensity]} />

      <BuildingMesh height={bldHeight} width={dims.width} depth={dims.depth} color={BUILDING_TYPE_COLORS_3D[buildingType] ?? BUILDING_TYPE_COLORS_3D.unknown} />

      {panelCount > 0 && <SolarPanelRoof panelCount={panelCount} dims={dims} buildingHeight={bldHeight} />}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color={groundColor} roughness={0.9} />
      </mesh>

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={15}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, bldHeight / 2, 0]}
      />
      <Environment preset="city" />
    </>
  );
}
