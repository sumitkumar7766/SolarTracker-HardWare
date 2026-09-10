import React, { useMemo } from 'react';
import * as THREE from 'three';

// Low-poly stylized tree
const LowPolyTree = ({ position, scale = 1 }) => {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 1.2, 7]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {/* Foliage Cone layers */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <coneGeometry args={[0.8, 1.2, 7]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[0.6, 1.0, 7]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <coneGeometry args={[0.4, 0.8, 7]} />
        <meshStandardMaterial color="#22c55e" roughness={0.8} />
      </mesh>
    </group>
  );
};

export const Environment = () => {
  // Trees scattered around the periphery
  const trees = useMemo(() => [
    { pos: [-9, 0, -8], scale: 1.2 },
    { pos: [-11, 0, -5], scale: 1.4 },
    { pos: [-8, 0, -11], scale: 1.0 },
    { pos: [9, 0, -9], scale: 1.3 },
    { pos: [12, 0, -6], scale: 1.1 },
    { pos: [10, 0, -12], scale: 1.5 },
    { pos: [-10, 0, 7], scale: 1.2 },
    { pos: [11, 0, 8], scale: 1.3 },
  ], []);

  // Distant low-poly rolling hills
  const hills = useMemo(() => [
    { pos: [-14, -1, -16], radius: 9, height: 4.5, color: '#86efac' },
    { pos: [0, -1.5, -20], radius: 12, height: 6.0, color: '#bbf7d0' },
    { pos: [16, -1, -17], radius: 10, height: 5.0, color: '#86efac' },
  ], []);

  return (
    <group name="OutdoorEnvironment">
      {/* 1. Balanced Sky & Ground Ambient Hemisphere Lighting */}
      <hemisphereLight
        skyColor="#f0f9ff"
        groundColor="#dcfce7"
        intensity={0.85}
      />
      <ambientLight color="#ffffff" intensity={0.4} />

      {/* 2. Concrete Testing Lab Foundation Pad */}
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <cylinderGeometry args={[3.2, 3.4, 0.04, 32]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
      </mesh>
      {/* Outer yellow safety boundary stripe ring */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.1, 3.25, 32]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.5} />
      </mesh>

      {/* 3. Outdoor Grassy Meadow Ground Plane */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#ecfdf5" roughness={0.9} />
      </mesh>

      {/* Subtle fine ground grid overlay */}
      <gridHelper
        args={[30, 30, '#cbd5e1', '#f1f5f9']}
        position={[0, 0.005, 0]}
      />

      {/* 4. Trees */}
      {trees.map((t, idx) => (
        <LowPolyTree key={idx} position={t.pos} scale={t.scale} />
      ))}

      {/* 5. Distant Rolling Green Hills */}
      {hills.map((h, idx) => (
        <mesh key={idx} position={h.pos}>
          <coneGeometry args={[h.radius, h.height, 12]} />
          <meshStandardMaterial color={h.color} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};
