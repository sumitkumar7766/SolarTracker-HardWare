import React from 'react';
import { useSimulation } from '../../../context/SimulationContext';

export const ArduinoMega = ({ position = [0, 0, 0], onClick }) => {
  const {
    arduinoStatus,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'CONTROLLERS';
  const isHovered = hoveredComponentId === 'arduino';

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'arduino',
        name: 'Arduino Mega 2560 Rev3',
        category: 'Auxiliary Hardware I/O Controller',
        description:
          'ATmega2560 8-bit AVR microcontroller operating at 16MHz. Provides hardware interrupt handling for mechanical safety limit switches, multi-channel auxiliary sensor aggregation, and failsafe motor interlock logic.',
        specs: [
          { label: 'Microcontroller', value: 'Microchip ATmega2560 (16 MHz)' },
          { label: 'Digital I/O Pins', value: '54 Pins (15 PWM outputs)' },
          { label: 'Analog Input Pins', value: '16 Channels (10-bit ADC)' },
          { label: 'Flash Memory', value: '256 KB (8 KB for bootloader)' },
          { label: 'SRAM / EEPROM', value: '8 KB SRAM / 4 KB EEPROM' },
          { label: 'Safety Interlocks', value: 'Hardware Limit Switch ISRs Armed' },
          { label: 'Current State', value: arduinoStatus },
        ],
        status: 'Standby / Watchdog Active',
        statusColor: 'text-sky-600',
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
        setHoveredComponentId('arduino');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHoveredComponentId(null);
      }}
    >
      {/* 1. Classic Arduino Royal Blue PCB */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.025, 0.36]} />
        <meshStandardMaterial
          color={isHovered ? '#38bdf8' : '#0284c7'}
          roughness={0.35}
          metalness={0.15}
          opacity={isDimmed ? 0.3 : 1.0}
          transparent={isDimmed}
          emissive={isHovered ? '#0284c7' : '#000000'}
          emissiveIntensity={isHovered ? 0.35 : 0}
        />
      </mesh>

      {/* 2. Silver USB Type-B Receptacle */}
      <mesh position={[-0.32, 0.05, -0.1]} castShadow>
        <boxGeometry args={[0.09, 0.075, 0.09]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* 3. Black 2.1mm DC Barrel Jack */}
      <mesh position={[-0.31, 0.045, 0.1]} castShadow>
        <boxGeometry args={[0.1, 0.07, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* 4. ATmega2560 TQFP-100 Microcontroller Chip */}
      <mesh position={[0.06, 0.02, 0.02]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.015, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} />
      </mesh>

      {/* ATmega16U2 USB-Serial Interface Chip */}
      <mesh position={[-0.18, 0.02, -0.06]}>
        <boxGeometry args={[0.06, 0.012, 0.06]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} />
      </mesh>

      {/* 16MHz Crystal Oscillator Can */}
      <mesh position={[-0.12, 0.025, -0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.05, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>

      {/* 5. Extended Dual-Row Header Pins */}
      <mesh position={[0.33, 0.035, 0]}>
        <boxGeometry args={[0.03, 0.04, 0.32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>

      {/* Top Header Row */}
      <mesh position={[0.04, 0.035, -0.16]}>
        <boxGeometry args={[0.42, 0.04, 0.025]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>

      {/* Bottom Header Rows */}
      <mesh position={[0.04, 0.035, 0.16]}>
        <boxGeometry args={[0.42, 0.04, 0.025]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>

      {/* Reset Pushbutton */}
      <mesh position={[-0.24, 0.03, -0.14]}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 10]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
    </group>
  );
};
