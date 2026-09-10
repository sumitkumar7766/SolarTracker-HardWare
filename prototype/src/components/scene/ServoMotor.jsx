import React, { useRef } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { degToRad } from '../../utils/solarPhysics';

export const ServoMotor = ({ onClick, position = [-0.6, 1.45, 0] }) => {
  const {
    elevation,
    servoStatus,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'MOTORS';
  const isHovered = hoveredComponentId === 'mg996r';

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'mg996r',
        name: 'MG996R Metal-Gear High-Torque Servo',
        category: 'Vertical Elevation Primary Actuator',
        description:
          'High-torque digital servo motor with copper gears, double ball bearings, and PWM pulse width angle positioning (500µs - 2500µs) directly actuated by ESP32 LEDC PWM channel.',
        specs: [
          { label: 'Operating Voltage', value: '4.8V - 7.2V DC' },
          { label: 'Stall Torque', value: '11.0 kg·cm @ 6V' },
          { label: 'Rotational Range', value: '0° to 180° (Limited to 0° - 80°)' },
          { label: 'Gearing', value: 'Full Metal Copper/Brass' },
          { label: 'Control Signal', value: '50Hz PWM on ESP32 GPIO 18' },
          { label: 'Live Elevation Output', value: `${elevation.toFixed(1)}°` },
        ],
        status: servoStatus === 'ACTIVE' ? 'Actively Positioning' : 'Holding Position',
        statusColor: servoStatus === 'ACTIVE' ? 'text-indigo-600' : 'text-slate-500',
      });
    }
  };

  const hornRotation = degToRad(elevation - 30);

  return (
    <group
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setHoveredComponentId('mg996r');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHoveredComponentId(null);
      }}
    >
      {/* 1. Servo Main Box Casing */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.22, 0.42, 0.2]} />
        <meshStandardMaterial
          color={isHovered ? '#334155' : '#1e293b'}
          roughness={0.4}
          metalness={0.1}
          opacity={isDimmed ? 0.3 : 1.0}
          transparent={isDimmed}
          emissive={isHovered ? '#1e293b' : '#000000'}
          emissiveIntensity={isHovered ? 0.3 : 0}
        />
      </mesh>

      {/* Top gearbox step */}
      <mesh position={[0, 0.23, 0]} castShadow>
        <boxGeometry args={[0.22, 0.06, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* 2. Mounting Flanges */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.22, 0.04, 0.32]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.1, 0.13]}>
        <cylinderGeometry args={[0.015, 0.015, 0.042, 10]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.1, -0.13]}>
        <cylinderGeometry args={[0.015, 0.015, 0.042, 10]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} />
      </mesh>

      {/* 3. Output Spline Shaft */}
      <mesh position={[0.04, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.06, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 4. White Nylon Servo Horn */}
      <group position={[0.04, 0.31, 0]} rotation={[hornRotation, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.01, 0.12]} castShadow>
          <boxGeometry args={[0.04, 0.018, 0.22]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.04, 0.2]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.25, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* 5. 3-Wire Ribbon Cable */}
      <group position={[0, -0.22, 0]}>
        <mesh position={[-0.03, -0.05, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
        <mesh position={[0.03, -0.05, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
          <meshStandardMaterial color="#ea580c" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};
