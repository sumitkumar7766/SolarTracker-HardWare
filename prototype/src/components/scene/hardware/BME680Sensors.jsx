import React from 'react';
import { useSimulation } from '../../../context/SimulationContext';

export const SingleBME680 = ({ id, label, i2cAddress, data, position, onClick }) => {
  const {
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'SENSORS';
  const isHovered = hoveredComponentId === id;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id,
        name: `${label} (Bosch 4-in-1 Environmental MEMS)`,
        category: 'Atmospheric Gas & Barometric Sensor',
        description:
          'Bosch Sensortec BME680 integrated environmental sensor combining gas (MOX sensor for volatile organic compounds / IAQ), barometric pressure, ambient temperature, and relative humidity over I2C.',
        specs: [
          { label: 'Identifier', value: label },
          { label: 'I2C Bus Address', value: i2cAddress },
          { label: 'Ambient Temperature', value: `${data.temp}°C` },
          { label: 'Relative Humidity', value: `${data.humidity}%` },
          { label: 'Barometric Pressure', value: `${data.pressure} hPa` },
          { label: 'Air Quality (IAQ Index)', value: `${data.iaq} (0-50 Good)` },
          { label: 'MOX Gas Resistance', value: `${data.gasResistance} kΩ` },
        ],
        status: 'Active & Polling I2C',
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
        setHoveredComponentId(id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setHoveredComponentId(null);
      }}
    >
      {/* 1. Purple Breakout PCB */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.02, 0.14]} />
        <meshStandardMaterial
          color={isHovered ? '#c084fc' : '#7e22ce'}
          roughness={0.35}
          opacity={isDimmed ? 0.3 : 1.0}
          transparent={isDimmed}
          emissive={isHovered ? '#7e22ce' : '#000000'}
          emissiveIntensity={isHovered ? 0.4 : 0}
        />
      </mesh>

      {/* Gold Mounting Hole */}
      <mesh position={[0.05, 0.012, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.005, 10]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} />
      </mesh>

      {/* 2. Metal MEMS Sensor Can */}
      <mesh position={[-0.03, 0.022, 0]} castShadow>
        <boxGeometry args={[0.06, 0.02, 0.06]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Sensor orifice */}
      <mesh position={[-0.03, 0.033, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.005, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* 3. 6-Pin Header */}
      <mesh position={[0, -0.015, -0.05]}>
        <boxGeometry args={[0.12, 0.025, 0.015]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
    </group>
  );
};

export const BME680Sensors = ({ onClick }) => {
  const { bme680_1, bme680_2 } = useSimulation();

  return (
    <group name="DualBME680Group">
      <SingleBME680
        id="bme680_1"
        label="BME680 #1"
        i2cAddress="0x76"
        data={bme680_1}
        position={[-0.22, 0.02, -0.28]}
        onClick={onClick}
      />

      <SingleBME680
        id="bme680_2"
        label="BME680 #2"
        i2cAddress="0x77"
        data={bme680_2}
        position={[-0.04, 0.02, -0.28]}
        onClick={onClick}
      />
    </group>
  );
};
