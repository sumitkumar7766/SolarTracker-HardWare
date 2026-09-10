import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulation } from '../../../context/SimulationContext';

export const MultiGearSystem = ({ position = [0, 0, 0], onClick }) => {
  const {
    motorStatus,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const pinionRef = useRef();
  const intermediateGearRef = useRef();
  const countershaftRef = useRef();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'MECHANICAL';
  const isHovered = hoveredComponentId === 'gear_system';

  useFrame((_, delta) => {
    if (motorStatus === 'RUNNING') {
      const speed = delta * 12;
      if (pinionRef.current) pinionRef.current.rotation.y += speed;
      if (intermediateGearRef.current) intermediateGearRef.current.rotation.y -= speed * 0.4;
      if (countershaftRef.current) countershaftRef.current.rotation.y -= speed * 0.4;
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'gear_system',
        name: 'Multi-Stage Planetary & Spur Gear Reduction Train',
        category: 'Mechanical Transmission & Slewing Drive',
        description:
          'Precision CNC-machined brass and steel compound spur gear system. Steps down the high-speed N20 motor (600 RPM) to smooth high-torque azimuth slewing rotation (1:298 total mechanical reduction).',
        specs: [
          { label: 'Primary Pinion', value: '12-Tooth Brass Spur (Module 0.5)' },
          { label: 'Compound Gear', value: '36T / 14T Dual Reduction' },
          { label: 'Slewing Ring Gear', value: '96-Tooth Internal Slew Ring' },
          { label: 'Total Reduction Ratio', value: '1:298 Mechanical Advantage' },
          { label: 'Backlash Specification', value: '< 0.15° Precision Meshed' },
          { label: 'Current State', value: motorStatus === 'RUNNING' ? 'Dynamic Meshing' : 'Locked in Position' },
        ],
        status: motorStatus === 'RUNNING' ? 'Driving Slewing Ring' : 'Holding Mechanical Lock',
        statusColor: motorStatus === 'RUNNING' ? 'text-emerald-600' : 'text-slate-500',
      });
    }
  };

  return (
    <group
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setHoveredComponentId('gear_system');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHoveredComponentId(null);
      }}
    >
      {/* 1. Intermediate Transmission Gearbox Bracket */}
      <mesh position={[0.42, 0.32, 0]} castShadow>
        <boxGeometry args={[0.24, 0.04, 0.28]} />
        <meshStandardMaterial
          color={isHovered ? '#64748b' : '#475569'}
          metalness={0.8}
          roughness={0.3}
          opacity={isDimmed ? 0.3 : 1.0}
          transparent={isDimmed}
        />
      </mesh>

      {/* 2. Primary Pinion Gear */}
      <group ref={pinionRef} position={[0.34, 0.35, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.25} />
        </mesh>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <mesh key={deg} rotation={[0, (deg * Math.PI) / 180, 0]}>
            <boxGeometry args={[0.012, 0.038, 0.13]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* 3. Compound Countershaft Gear */}
      <group ref={intermediateGearRef} position={[0.46, 0.35, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.03, 20]} />
          <meshStandardMaterial color="#b45309" metalness={0.85} roughness={0.2} />
        </mesh>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <mesh key={deg} rotation={[0, (deg * Math.PI) / 180, 0]}>
            <boxGeometry args={[0.015, 0.028, 0.19]} />
            <meshStandardMaterial color="#b45309" metalness={0.85} />
          </mesh>
        ))}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.85} />
        </mesh>
      </group>

      {/* 4. Pillow Block Ball Bearings */}
      <group position={[0.46, 0.28, 0]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <torusGeometry args={[0.035, 0.01, 8, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
        </mesh>
      </group>
    </group>
  );
};
