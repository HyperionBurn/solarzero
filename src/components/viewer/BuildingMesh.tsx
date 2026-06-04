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

function footprintToShape(footprint: [number, number][], height: number): THREE.Shape {
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

export function BuildingMesh({ footprint, width = 30, depth = 20, height = 12, color = "#CBD5E1" }: BuildingMeshProps) {
  const geometry = useMemo(() => {
    const shape = footprint && footprint.length >= 3 ? footprintToShape(footprint, height) : defaultFootprint(width, depth);
    return new THREE.ExtrudeGeometry(shape, { steps: 1, depth: height, bevelEnabled: false });
  }, [footprint, height, width, depth]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.7, metalness: 0.1 }), [color]);

  // Parapet wall geometry
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

  return (
    <group>
      {/* Main building body */}
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {/* Parapet wall on roof edge */}
      {parapetGeo && (
        <mesh geometry={parapetGeo} position={[0, height, 0]} castShadow>
          <meshStandardMaterial color={new THREE.Color(color)} roughness={0.8} />
        </mesh>
      )}
      {/* AC units on roof */}
      {[1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[width * 0.3 - i * width * 0.15, height + 0.4, depth * 0.35]} castShadow>
          <boxGeometry args={[1.2, 0.6, 0.8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
