import React from 'react';
import { useSimulation } from '../../context/SimulationContext';

const LDR_POSITIONS = {
  tl: { pos: [-1.82, 1.08, 0.08], name: 'LDR Top-Left', code: 'TL', gpio: 'GPIO 32' },
  tr: { pos: [1.82, 1.08, 0.08], name: 'LDR Top-Right', code: 'TR', gpio: 'GPIO 33' },
  bl: { pos: [-1.82, -1.08, 0.08], name: 'LDR Bottom-Left', code: 'BL', gpio: 'GPIO 34' },
  br: { pos: [1.82, -1.08, 0.08], name: 'LDR Bottom-Right', code: 'BR', gpio: 'GPIO 35' },
};

export const LDRSensors = ({ onClick }) => {
  const {
    ldr,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'SENSORS';

  const handleModuleClick = (key, info, e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: `ldr_${key}`,
        name: `${info.name} (${info.code})`,
        category: 'Analog Optical Sensor',
        description:
          'Cadmium Sulfide (CdS) 5mm Photoresistor module paired with 10kΩ voltage divider circuit feeding into ESP32 12-bit ADC SAR channel.',
        specs: [
          { label: 'Identifier', value: info.code },
          { label: 'ESP32 Channel', value: info.gpio },
          { label: 'Live ADC Value', value: `${ldr[key]} counts` },
          { label: 'Calculated Lux', value: `~${(ldr[key] * 2.4).toFixed(0)} Lux` },
          { label: 'Peak Spectral Sensitivity', value: '540 nm (Visible Green/Yellow)' },
          { label: 'Response Time', value: '20 ms' },
        ],
        status: 'Active & Calibrated',
        statusColor: 'text-emerald-600',
      });
    }
  };

  return (
    <group name="LDRSensorsGroup">
      {Object.entries(LDR_POSITIONS).map(([key, info]) => {
        const val = ldr[key];
        const isHot = val > 2000;
        const isHovered = hoveredComponentId === `ldr_${key}`;

        return (
          <group
            key={key}
            position={info.pos}
            onClick={(e) => handleModuleClick(key, info, e)}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              setHoveredComponentId(`ldr_${key}`);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'auto';
              setHoveredComponentId(null);
            }}
          >
            {/* 1. Miniature Breakout PCB */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.22, 0.22, 0.03]} />
              <meshStandardMaterial
                color={isHovered ? '#3b82f6' : '#1e40af'}
                roughness={0.4}
                metalness={0.2}
                opacity={isDimmed ? 0.3 : 1.0}
                transparent={isDimmed}
                emissive={isHovered ? '#1e40af' : '#000000'}
                emissiveIntensity={isHovered ? 0.4 : 0}
              />
            </mesh>

            {/* Corner mounting screw hole */}
            <mesh position={[0.07, 0.07, 0.016]}>
              <cylinderGeometry args={[0.018, 0.018, 0.005, 12]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* 2. Photoresistor Ceramic Disc */}
            <mesh position={[0, 0, 0.03]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
              <meshStandardMaterial color="#fed7aa" roughness={0.6} />
            </mesh>

            {/* CdS active wave track */}
            <mesh position={[0, 0, 0.042]}>
              <planeGeometry args={[0.07, 0.07]} />
              <meshStandardMaterial
                color={isHot ? '#ea580c' : '#c2410c'}
                emissive={isHot ? '#ea580c' : '#000000'}
                emissiveIntensity={isHot ? 0.35 : 0}
                roughness={0.3}
              />
            </mesh>

            {/* Lead wire pins */}
            <mesh position={[-0.025, 0, 0.02]}>
              <cylinderGeometry args={[0.006, 0.006, 0.03, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0.025, 0, 0.02]}>
              <cylinderGeometry args={[0.006, 0.006, 0.03, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Directional shadow baffle wall */}
            <mesh position={[key.includes('l') ? 0.12 : -0.12, 0, 0.04]} castShadow>
              <boxGeometry args={[0.015, 0.18, 0.06]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
