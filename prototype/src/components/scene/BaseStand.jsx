import React from 'react';

export const BaseStand = () => {
  // 12 Gusset stiffener triangular plates radiating around the tapered base
  const gussets = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 12;
    return {
      angle,
      x: Math.cos(angle) * 0.72,
      z: Math.sin(angle) * 0.72,
    };
  });

  // 16 Perimeter anchor bolts
  const anchorBolts = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 16;
    return {
      x: Math.cos(angle) * 1.02,
      z: Math.sin(angle) * 1.02,
    };
  });

  return (
    <group name="IndustrialBasePylon">
      {/* 1. Heavy Square Reinforced Foundation Plinth */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.2, 0.3, 3.2]} />
        <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Textured Diamond / Steel Top Plate on Foundation */}
      <mesh position={[0, 0.305, 0]} receiveShadow>
        <boxGeometry args={[3.0, 0.015, 3.0]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* 2. Heavy Circular Flanged Base Ring */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.12, 1.15, 0.08, 36]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 16 Perimeter Foundation Anchor Studs & Heavy Hex Nuts */}
      {anchorBolts.map((bolt, i) => (
        <group key={i} position={[bolt.x, 0.4, bolt.z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.028, 0.028, 0.06, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.04, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* 3. Conical Flared Base Skirt */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.96, 0.55, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* 12 Reinforced Triangular Gusset Plates */}
      {gussets.map((g, i) => (
        <group key={i} position={[0, 0.42, 0]} rotation={[0, g.angle, 0]}>
          <mesh position={[0.72, 0.16, 0]} castShadow>
            <boxGeometry args={[0.42, 0.44, 0.035]} />
            <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Gusset bolt details */}
          <mesh position={[0.82, 0.06, 0.02]}>
            <cylinderGeometry args={[0.015, 0.015, 0.01, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
          <mesh position={[0.62, 0.28, 0.02]}>
            <cylinderGeometry args={[0.015, 0.015, 0.01, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* 4. Lower Tower Flanged Mid-Ring Joint */}
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.08, 32]} />
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Mid-flange bolts */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI * 2) / 12;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.56, 0.99, Math.sin(a) * 0.56]}>
            <cylinderGeometry args={[0.018, 0.018, 0.025, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
        );
      })}

      {/* 5. Tapered Main Tubular Tower Column */}
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.52, 1.15, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* Inspection hatch with hex bolts on tower face */}
      <mesh position={[0, 1.35, 0.48]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.26, 0.44, 0.02]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 6. Upper Tower Flanged Collar */}
      <mesh position={[0, 2.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.54, 0.46, 0.09, 32]} />
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Collar bolts */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI * 2) / 12;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, 2.19, Math.sin(a) * 0.5]}>
            <cylinderGeometry args={[0.016, 0.016, 0.02, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
};
