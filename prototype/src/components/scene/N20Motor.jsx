import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulation } from '../../context/SimulationContext';

export const N20Motor = ({ onClick, position = [0.45, 0.45, 0] }) => {
  const {
    motorStatus,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();
  const shaftRef = useRef();
  const gearRef = useRef();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'MOTORS';
  const isHovered = hoveredComponentId === 'n20_motor';

  // Animate motor shaft and pinion gear when motor is active
  useFrame((_, delta) => {
    if (motorStatus === 'RUNNING') {
      if (shaftRef.current) shaftRef.current.rotation.y += delta * 12;
      if (gearRef.current) gearRef.current.rotation.z += delta * 12;
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'n20_motor',
        name: 'N20 DC Micro Metal Gearmotor (12V 600 RPM)',
        category: 'Horizontal Azimuth Drive Actuator',
        description:
          'High-torque miniature DC motor with integrated all-metal reduction spur gearbox (1:298 ratio). Drives the 360° slew bearing for horizontal azimuth tracking.',
        specs: [
          { label: 'Operating Voltage', value: '6.0V - 12.0V DC' },
          { label: 'Gearbox Ratio', value: '1:298 All-Metal Spur' },
          { label: 'Rated Speed', value: '600 RPM No-Load @ 12V' },
          { label: 'Stall Torque', value: '2.4 kg·cm' },
          { label: 'Driver Interface', value: 'L298N / Dual H-Bridge PWM' },
          { label: 'Current State', value: motorStatus === 'RUNNING' ? 'Running (65% PWM)' : 'Standby / Idle' },
        ],
        status: motorStatus === 'RUNNING' ? 'Actively Rotating' : 'Standby',
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
        setHoveredComponentId('n20_motor');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHoveredComponentId(null);
      }}
    >
      {/* 1. Cylindrical Motor Body */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.28, 16]} />
        <meshStandardMaterial
          color={isHovered ? '#cbd5e1' : '#94a3b8'}
          metalness={0.85}
          roughness={0.2}
          opacity={isDimmed ? 0.3 : 1.0}
          transparent={isDimmed}
          emissive={isHovered ? '#64748b' : '#000000'}
          emissiveIntensity={isHovered ? 0.3 : 0}
        />
      </mesh>

      {/* Rear plastic cap & power terminals */}
      <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.088, 0.088, 0.03, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh position={[-0.17, 0.03, 0]}>
        <boxGeometry args={[0.02, 0.015, 0.01]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[-0.17, -0.03, 0]}>
        <boxGeometry args={[0.02, 0.015, 0.01]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* 2. Rectangular Brass Gearbox Housing */}
      <mesh position={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.16, 0.14]} />
        <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* 3. Output D-Shaft (Steel) */}
      <group ref={shaftRef} position={[0.29, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.12, 12]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* 4. Drive Pinion Gear */}
      <group ref={gearRef} position={[0.34, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 16]} />
          <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.25} />
        </mesh>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <mesh
            key={angle}
            rotation={[0, 0, (angle * Math.PI) / 180]}
            position={[0, 0, 0]}
          >
            <boxGeometry args={[0.015, 0.16, 0.038]} />
            <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}
      </group>

      {/* 5. Sheet Metal L-Bracket Mounting */}
      <mesh position={[0.08, -0.1, 0]} castShadow>
        <boxGeometry args={[0.36, 0.04, 0.22]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[-0.08, -0.03, 0]} castShadow>
        <boxGeometry args={[0.04, 0.16, 0.22]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
};
