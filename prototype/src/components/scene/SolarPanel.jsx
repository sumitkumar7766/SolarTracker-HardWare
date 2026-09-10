import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulation } from '../../context/SimulationContext';
import { degToRad } from '../../utils/solarPhysics';

// Specifications for the 5 radial petals / arms
// Angles in the radial fan plane (degrees from center vertical):
const RADIAL_PANELS = [
  { id: 'panel_center', label: 'Central Solar Panel #3', angleDeg: 0, armLength: 1.55 },
  { id: 'panel_top_right', label: 'Upper-Right Solar Panel #4', angleDeg: 38, armLength: 1.62 },
  { id: 'panel_low_right', label: 'Lower-Right Solar Panel #5', angleDeg: 76, armLength: 1.68 },
  { id: 'panel_top_left', label: 'Upper-Left Solar Panel #2', angleDeg: -38, armLength: 1.62 },
  { id: 'panel_low_left', label: 'Lower-Left Solar Panel #1', angleDeg: -76, armLength: 1.68 },
];

export const SolarPanel = ({ onClick }) => {
  const {
    elevation,
    trackingEfficiency,
    power,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  // Procedural 4 columns x 6 rows solar cell grid for each of the 5 panels
  const cells = useMemo(() => {
    const list = [];
    const cols = 4;
    const rows = 6;
    const totalW = 1.0;
    const totalH = 1.48;
    const cellW = totalW / cols;
    const cellH = totalH / rows;
    const gap = 0.015;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -totalW / 2 + cellW / 2 + c * cellW;
        const y = -totalH / 2 + cellH / 2 + r * cellH;
        list.push({
          id: `${r}-${c}`,
          position: [x, y, 0.035],
          w: cellW - gap,
          h: cellH - gap,
        });
      }
    }
    return list;
  }, []);

  const handlePanelClick = (panelInfo, e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: panelInfo.id,
        name: `${panelInfo.label} (Industrial Monocrystalline Array)`,
        category: 'Articulated Radial Photovoltaic Array',
        description:
          'High-efficiency monocrystalline solar panel mounted on an industrial articulated boom arm with hydraulic/electric linear actuator. Part of the 5-panel radial sunflower tracking array designed for storm-proof high-wind durability and continuous dual-axis tracking.',
        specs: [
          { label: 'Array Configuration', value: '5-Panel Radial Sunflower Architecture' },
          { label: 'Cell Technology', value: 'High-Efficiency Monocrystalline Silicon' },
          { label: 'Combined Array Peak', value: '110 W (5 × 22W Modules)' },
          { label: 'Current Array Power', value: `${power} W` },
          { label: 'Current Efficiency', value: `${trackingEfficiency}%` },
          { label: 'Actuator Type', value: 'Heavy-Duty Industrial Linear Actuator' },
          { label: 'Arm Articulation Angle', value: `${panelInfo.angleDeg}° Radial Spread` },
          { label: 'Current Tilt Angle', value: `${elevation.toFixed(1)}° Elevation` },
        ],
        status: 'Optimal Sun Interception',
        statusColor: 'text-emerald-600',
      });
    }
  };

  return (
    <group name="RadialSunflowerSolarArray">
      {/* 1. Central Faceted Multi-Angle Mechanical Crown Hub */}
      <group position={[0, 0, 0]}>
        {/* Faceted Hub Core */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.52, 0.58, 0.46, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Chamfered Top Dome Cap with Hex Bolting Pattern */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.52, 0.12, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Center Kingpin Flange Bolt */}
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Hub perimeter flange bolts */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI * 2) / 8;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.44, 0.28, Math.sin(a) * 0.44]}>
              <cylinderGeometry args={[0.018, 0.018, 0.025, 6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          );
        })}
      </group>

      {/* 2. The 5 Radial Cantilever Actuator Arms & Solar Panels */}
      {RADIAL_PANELS.map((p) => {
        const rad = degToRad(p.angleDeg);
        const isHovered = hoveredComponentId === p.id || hoveredComponentId === 'solar_panel';

        // Direction vectors in the fan plane (X: horizontal spread, Y: vertical spread)
        const dirX = Math.sin(rad);
        const dirY = Math.cos(rad);

        // Position of the panel center at the end of the boom arm
        const panelPosX = dirX * p.armLength;
        const panelPosY = dirY * p.armLength;

        return (
          <group key={p.id} name={`ArmAndPanel_${p.id}`}>
            {/* --- Radial Boom Arm & Linear Actuator Cylinder --- */}
            <group position={[0, 0.05, 0]}>
              {/* Hub Mounting Socket Collar */}
              <mesh
                position={[dirX * 0.52, dirY * 0.52, 0]}
                rotation={[0, 0, -rad]}
                castShadow
              >
                <cylinderGeometry args={[0.11, 0.11, 0.16, 16]} />
                <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
              </mesh>

              {/* Main Outer Actuator Cylinder Sleeve (Heavy Dark Steel) */}
              <mesh
                position={[dirX * 0.88, dirY * 0.88, 0]}
                rotation={[0, 0, -rad]}
                castShadow
              >
                <cylinderGeometry args={[0.082, 0.082, 0.6, 18]} />
                <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
              </mesh>

              {/* Inner Chrome Hydraulic / Linear Actuator Piston Rod */}
              <mesh
                position={[dirX * 1.22, dirY * 1.22, 0]}
                rotation={[0, 0, -rad]}
                castShadow
              >
                <cylinderGeometry args={[0.052, 0.052, 0.44, 18]} />
                <meshStandardMaterial color="#f1f5f9" metalness={0.95} roughness={0.1} />
              </mesh>

              {/* Heavy-Duty End Clevis Joint & Pivot Hinge Bracket */}
              <group position={[dirX * (p.armLength - 0.18), dirY * (p.armLength - 0.18), 0]}>
                <mesh rotation={[0, 0, -rad]} castShadow>
                  <boxGeometry args={[0.14, 0.14, 0.16]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.25} />
                </mesh>
                {/* Pivot Cross-Pin */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.024, 0.024, 0.2, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
                </mesh>
              </group>
            </group>

            {/* --- The Individual Monocrystalline Solar Panel --- */}
            <group
              position={[panelPosX, panelPosY, 0.1]}
              rotation={[0, 0, -rad]}
              onClick={(e) => handlePanelClick(p, e)}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
                setHoveredComponentId(p.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'auto';
                setHoveredComponentId(null);
              }}
            >
              {/* Deep Anodized Aluminum Outer Bezel Frame */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[1.08, 1.56, 0.09]} />
                <meshStandardMaterial
                  color={isHovered ? '#e2e8f0' : '#94a3b8'}
                  metalness={0.88}
                  roughness={0.22}
                  emissive={isHovered ? '#3b82f6' : '#000000'}
                  emissiveIntensity={isHovered ? 0.35 : 0}
                />
              </mesh>

              {/* Inner Frame Chamfer / Inset Border */}
              <mesh position={[0, 0, 0.038]} receiveShadow>
                <boxGeometry args={[1.03, 1.51, 0.018]} />
                <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
              </mesh>

              {/* Dark Blue Photovoltaic Substrate / Glass Layer */}
              <mesh position={[0, 0, 0.042]} receiveShadow>
                <boxGeometry args={[1.0, 1.48, 0.01]} />
                <meshPhysicalMaterial
                  color="#091833"
                  roughness={0.12}
                  metalness={0.4}
                  reflectivity={0.95}
                  clearcoat={1.0}
                  clearcoatRoughness={0.1}
                />
              </mesh>

              {/* 4x6 Monocrystalline Silicon Cells Grid with Busbars */}
              {cells.map((cell) => (
                <group key={cell.id} position={cell.position}>
                  <mesh receiveShadow>
                    <planeGeometry args={[cell.w, cell.h]} />
                    <meshPhysicalMaterial
                      color="#1d4ed8"
                      roughness={0.2}
                      metalness={0.7}
                      reflectivity={0.85}
                      clearcoat={0.95}
                    />
                  </mesh>
                  {/* Busbar contacts */}
                  <mesh position={[0, 0, 0.001]}>
                    <planeGeometry args={[cell.w * 0.95, 0.008]} />
                    <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, cell.h * 0.28, 0.001]}>
                    <planeGeometry args={[cell.w * 0.95, 0.004]} />
                    <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, -cell.h * 0.28, 0.001]}>
                    <planeGeometry args={[cell.w * 0.95, 0.004]} />
                    <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.2} />
                  </mesh>
                </group>
              ))}

              {/* Rear Structural Bracing Ribs on Back of Panel */}
              <mesh position={[0, 0, -0.065]} castShadow>
                <boxGeometry args={[0.92, 0.12, 0.05]} />
                <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.42, -0.065]} castShadow>
                <boxGeometry args={[0.92, 0.08, 0.05]} />
                <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.42, -0.065]} castShadow>
                <boxGeometry args={[0.92, 0.08, 0.05]} />
                <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};
