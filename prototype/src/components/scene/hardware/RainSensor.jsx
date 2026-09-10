import React from 'react';
import { useSimulation } from '../../../context/SimulationContext';

export const RainSensor = ({ position = [0.85, 1.35, 0.2], onClick }) => {
  const {
    rainState,
    rainMoisture,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'SENSORS';
  const isHovered = hoveredComponentId === 'rain_sensor';

  const isRaining = rainState !== 'NO RAIN';

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'rain_sensor',
        name: 'FC-37 Rain Drop & Precipitation Sensor',
        category: 'Atmospheric Precipitation Detector',
        description:
          'High-sensitivity nickel-plated serpentine collection grid paired with an LM393 dual comparator module. Triggers an automatic panel stowing routine (tilting vertical to prevent dirt/mud accumulation) during heavy rainfall.',
        specs: [
          { label: 'Current State', value: rainState },
          { label: 'Analog Moisture Reading', value: `${rainMoisture} ADC (0-4095)` },
          { label: 'Comparator Driver', value: 'LM393 with 10kΩ Potentiometer' },
          { label: 'Digital Out (DO)', value: isRaining ? 'HIGH (Rain Triggered)' : 'LOW (Dry)' },
          { label: 'Stow Mode Trigger', value: rainState === 'HEAVY RAIN' ? 'Active (Stow Solar Panel)' : 'Inactive' },
          { label: 'Plating Finish', value: 'Double-Sided FR-4 Nickel Interlaced' },
        ],
        status: isRaining ? 'Precipitation Detected' : 'Clear / Dry Surface',
        statusColor: isRaining ? 'text-amber-600' : 'text-emerald-600',
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
        setHoveredComponentId('rain_sensor');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHoveredComponentId(null);
      }}
    >
      {/* 1. Angled Outdoor Rain Collection Plate */}
      <group rotation={[0.4, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.02, 0.42]} />
          <meshStandardMaterial
            color={isHovered ? '#38bdf8' : '#0284c7'}
            roughness={0.4}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
            emissive={isHovered ? '#0284c7' : '#000000'}
            emissiveIntensity={isHovered ? 0.35 : 0}
          />
        </mesh>

        {/* Interlaced Nickel Serpentine Comb Traces */}
        {[-0.12, -0.06, 0, 0.06, 0.12].map((x, i) => (
          <mesh key={i} position={[x, 0.012, 0]}>
            <planeGeometry args={[0.03, 0.36]} />
            <meshStandardMaterial
              color="#cbd5e1"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        ))}

        {/* Simulated Water Droplets (visible if raining) */}
        {isRaining && (
          <group position={[0, 0.02, 0]}>
            {[
              [-0.08, 0.01, -0.1],
              [0.05, 0.01, -0.04],
              [-0.04, 0.01, 0.08],
              [0.09, 0.01, 0.12],
            ].map(([x, y, z], idx) => (
              <mesh key={idx} position={[x, y, z]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshPhysicalMaterial
                  color="#e0f2fe"
                  transmission={0.9}
                  roughness={0.1}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            ))}
          </group>
        )}

        <mesh position={[0, 0.03, -0.18]} castShadow>
          <boxGeometry args={[0.1, 0.04, 0.04]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* 2. LM393 Comparator Amplifier Driver Board */}
      <group position={[0, -0.22, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.16, 0.02, 0.28]} />
          <meshStandardMaterial color="#1e40af" roughness={0.3} />
        </mesh>

        <mesh position={[0, 0.018, 0]}>
          <boxGeometry args={[0.06, 0.015, 0.08]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        <mesh position={[0, 0.03, 0.08]}>
          <boxGeometry args={[0.06, 0.035, 0.06]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>

        <mesh position={[-0.04, 0.02, -0.08]}>
          <cylinderGeometry args={[0.008, 0.008, 0.01, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.04, 0.02, -0.08]}>
          <cylinderGeometry args={[0.008, 0.008, 0.01, 8]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={isRaining ? 1.5 : 0.1}
          />
        </mesh>
      </group>
    </group>
  );
};
