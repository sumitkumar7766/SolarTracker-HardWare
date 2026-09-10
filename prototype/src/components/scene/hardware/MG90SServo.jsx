import React from 'react';
import { useSimulation } from '../../../context/SimulationContext';
import { degToRad } from '../../../utils/solarPhysics';

export const MG90SServo = ({
  id,
  label,
  role,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onClick,
}) => {
  const {
    elevation,
    servoStatus,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'MOTORS';
  const isHovered = hoveredComponentId === id;

  const hornRotation = degToRad(elevation - 30);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id,
        name: `${label} (Micro Metal Gear Servo)`,
        category: 'Auxiliary Actuation & Pitch Trim',
        description: `Miniature high-speed metal-gear micro servo. Responsible for ${role}, fine pitch stabilization, and mechanical counter-balancing.`,
        specs: [
          { label: 'Identifier', value: label },
          { label: 'Role in Mechanism', value: role },
          { label: 'Operating Voltage', value: '4.8V - 6.0V DC' },
          { label: 'Gearing', value: 'All-Metal Copper Gears' },
          { label: 'Torque Rating', value: '2.2 kg·cm @ 6V' },
          { label: 'Operating Speed', value: '0.08 sec / 60°' },
          { label: 'Live Horn Angle', value: `${(elevation * 0.8).toFixed(1)}°` },
        ],
        status: servoStatus === 'ACTIVE' ? 'Active Tracking' : 'Holding Trim',
        statusColor: servoStatus === 'ACTIVE' ? 'text-indigo-600' : 'text-slate-500',
      });
    }
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setHoveredComponentId(id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHoveredComponentId(null);
      }}
    >
      {/* 1. Translucent Blue Polycarbonate Body */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.13, 0.24, 0.12]} />
        <meshStandardMaterial
          color={isHovered ? '#60a5fa' : '#2563eb'}
          roughness={0.2}
          metalness={0.1}
          opacity={isDimmed ? 0.3 : 0.85}
          transparent
          emissive={isHovered ? '#2563eb' : '#000000'}
          emissiveIntensity={isHovered ? 0.4 : 0}
        />
      </mesh>

      {/* Top Gear Housing Step */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[0.13, 0.04, 0.12]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>

      {/* 2. Mounting Tabs */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.13, 0.025, 0.2]} />
        <meshStandardMaterial color="#1e40af" />
      </mesh>

      {/* 3. Output Spline Shaft (Brass) */}
      <mesh position={[0.02, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.04, 12]} />
        <meshStandardMaterial color="#d97706" metalness={0.8} />
      </mesh>

      {/* 4. White Servo Horn */}
      <group position={[0.02, 0.19, 0]} rotation={[hornRotation, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.015, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.06]} castShadow>
          <boxGeometry args={[0.025, 0.012, 0.11]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};
