"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { BuildingMesh } from "./BuildingMesh";
import { PanelGrid } from "./PanelGrid";

interface Solar3DViewerProps {
  /** Building type for footprint approximation */
  buildingType: string;
  /** Roof area in m² (used to derive footprint) */
  roofAreaM2: number;
  /** Building height in meters */
  heightMeters: number;
  /** Number of solar panels */
  panelCount: number;
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
    <group position={[0, buildingHeight + 0.02, 0]}>
      <PanelGrid
        panelCount={panelCount}
        roofWidth={dims.width * 0.85}
        roofDepth={dims.depth * 0.85}
        tiltDeg={24}
      />
    </group>
  );
}

function Scene({ buildingType, roofAreaM2, heightMeters, panelCount }: Solar3DViewerProps) {
  const dims = getFootprintDims(buildingType, roofAreaM2);
  const bldHeight = heightMeters || 12;

  return (
    <>
      <directionalLight
        position={[40, 60, 30]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#87CEEB", "#362907", 0.3]} />

      <BuildingMesh height={bldHeight} width={dims.width} depth={dims.depth} color={BUILDING_TYPE_COLORS_3D[buildingType] ?? BUILDING_TYPE_COLORS_3D.unknown} />

      {panelCount > 0 && <SolarPanelRoof panelCount={panelCount} dims={dims} buildingHeight={bldHeight} />}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
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

export function Solar3DViewer(props: Solar3DViewerProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [40, 20, 40], fov: 45 }}
      style={{ background: "#f8fafc" }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
