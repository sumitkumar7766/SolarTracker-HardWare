import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulation } from '../../../context/SimulationContext';

export const RaspberryPi5 = ({ position = [0, 0, 0], onClick }) => {
  const {
    rpi5Status,
    simulationRunning,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const fanRef = useRef();

  useFrame((_, delta) => {
    if (fanRef.current && simulationRunning) {
      fanRef.current.rotation.y += delta * 15;
    }
  });

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'CONTROLLERS';
  const isHovered = hoveredComponentId === 'rpi5';

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'rpi5',
        name: 'Raspberry Pi 5 (8GB RAM)',
        category: 'Edge-AI & Analytics Gateway',
        description:
          'Quad-core 64-bit Arm Cortex-A76 processor @ 2.4GHz with VideoCore VII GPU. Hosts edge neural network models for predictive solar ephemeris calculations, astronomical time-series analytics, and local MQTT telemetry broker.',
        specs: [
          { label: 'Processor', value: 'Broadcom BCM2712 Quad-Core A76 @ 2.4GHz' },
          { label: 'System Memory', value: '8GB LPDDR4X-4267 SDRAM' },
          { label: 'Thermal Solution', value: 'Active Cooler (Aluminum Heatsink + PWM Fan)' },
          { label: 'Networking', value: 'Gigabit Ethernet + Dual-Band 802.11ac Wi-Fi' },
          { label: 'Power Input', value: '5V/5A via USB-C (from XL4015 Buck Rail)' },
          { label: 'AI Inference Tasks', value: 'Diurnal Sun Tracking Neural Regressor' },
          { label: 'Current State', value: rpi5Status },
        ],
        status: 'Online & Running Edge AI',
        statusColor: 'text-emerald-600',
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
        setHoveredComponentId('rpi5');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHoveredComponentId(null);
      }}
    >
      {/* 1. Classic Raspberry Pi Green PCB */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.58, 0.025, 0.42]} />
        <meshStandardMaterial
          color={isHovered ? '#22c55e' : '#15803d'}
          roughness={0.4}
          metalness={0.1}
          opacity={isDimmed ? 0.3 : 1.0}
          transparent={isDimmed}
          emissive={isHovered ? '#15803d' : '#000000'}
          emissiveIntensity={isHovered ? 0.4 : 0}
        />
      </mesh>

      {/* 4 Corner Mounting Holes */}
      {[
        [-0.26, 0.015, -0.18],
        [0.26, 0.015, -0.18],
        [-0.26, 0.015, 0.18],
        [0.26, 0.015, 0.18],
      ].map(([x, y, z], idx) => (
        <mesh key={idx} position={[x, y, z]}>
          <cylinderGeometry args={[0.016, 0.016, 0.005, 12]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} />
        </mesh>
      ))}

      {/* 2. Active Cooler */}
      <mesh position={[-0.05, 0.035, 0.02]} castShadow>
        <boxGeometry args={[0.22, 0.045, 0.22]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Miniature Cooling Fan */}
      <group position={[-0.05, 0.065, 0.02]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.015, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        <group ref={fanRef}>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <mesh key={angle} rotation={[0, (angle * Math.PI) / 180, 0.2]}>
              <boxGeometry args={[0.07, 0.005, 0.015]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          ))}
        </group>
      </group>

      {/* 3. Dual Stacked USB 3.0 Ports */}
      <group position={[0.29, 0.045, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.065, 0.1]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0.041, 0, 0]}>
          <planeGeometry args={[0.01, 0.05]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
      </group>

      {/* Dual Stacked USB 2.0 Ports */}
      <group position={[0.29, 0.045, -0.06]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.065, 0.1]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* Gigabit Ethernet Jack */}
      <mesh position={[0.29, 0.045, -0.16]} castShadow>
        <boxGeometry args={[0.09, 0.07, 0.09]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* 4. 40-Pin GPIO Header */}
      <mesh position={[-0.04, 0.035, -0.18]} castShadow>
        <boxGeometry args={[0.42, 0.04, 0.035]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>

      {/* 5. Dual Micro-HDMI Ports & USB-C Power Jack */}
      <mesh position={[-0.14, 0.02, 0.21]}>
        <boxGeometry args={[0.045, 0.02, 0.02]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      <mesh position={[-0.06, 0.02, 0.21]}>
        <boxGeometry args={[0.045, 0.02, 0.02]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      <mesh position={[0.18, 0.02, 0.21]}>
        <boxGeometry args={[0.05, 0.022, 0.02]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
    </group>
  );
};
