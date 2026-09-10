import React from 'react';
import { useSimulation } from '../../../context/SimulationContext';

export const Displays = ({ position = [0, 0, 0], onClick }) => {
  const {
    power,
    current,
    voltage,
    temperature,
    humidity,
    trackingEfficiency,
    simulationRunning,
    trackingMode,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'DISPLAY';

  const handleOled1Click = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'oled1',
        name: 'OLED #1 (0.96-inch SSD1306 I2C Display)',
        category: 'Dedicated Atmospheric Display',
        description:
          'Monochrome 128×64 blue/white OLED display driven via I2C interface (address 0x3C). Dedicated to continuous real-time readout of ambient temperature, humidity, and heat index.',
        specs: [
          { label: 'Display Technology', value: '0.96" Monochrome PMOLED' },
          { label: 'Resolution', value: '128 × 64 Pixels' },
          { label: 'Driver IC', value: 'Solomon Systech SSD1306' },
          { label: 'Interface', value: 'I2C Bus (400kHz Fast Mode)' },
          { label: 'Live Readout 1', value: `Temperature: ${temperature}°C` },
          { label: 'Live Readout 2', value: `Humidity: ${humidity}% RH` },
        ],
        status: 'Streaming Display Frames',
        statusColor: 'text-sky-600',
      });
    }
  };

  const handleOled2Click = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'oled2',
        name: 'OLED #2 (0.96-inch SSD1306 I2C Display)',
        category: 'Dedicated Energy Metrics Display',
        description:
          'Second independent 128×64 OLED display communicating on I2C address 0x3D. Dedicated to high-speed electrical telemetry from the INA219 sensor (watts, amps, volts).',
        specs: [
          { label: 'Display Technology', value: '0.96" Monochrome PMOLED' },
          { label: 'Resolution', value: '128 × 64 Pixels' },
          { label: 'Driver IC', value: 'SSD1306 on 0x3D' },
          { label: 'Live Readout 1', value: `Solar Power: ${power} W` },
          { label: 'Live Readout 2', value: `Current: ${current} A @ ${voltage} V` },
          { label: 'Refresh Rate', value: '30 FPS over I2C' },
        ],
        status: 'Streaming Display Frames',
        statusColor: 'text-amber-600',
      });
    }
  };

  const handleTftClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'tft_display',
        name: 'ESP32 2.8-inch ILI9341 Color TFT Touchscreen',
        category: 'Primary Local HMI & Color Dashboard',
        description:
          '2.8-inch 320×240 16-bit RGB full-color TFT LCD module with resistive touchscreen overlay (XPT2046 controller). Displays a rich local UI with real-time solar tracking animation, system health, and touch controls.',
        specs: [
          { label: 'Screen Diagonal', value: '2.8 Inches (65K Colors)' },
          { label: 'Resolution', value: '320 × 240 Pixels' },
          { label: 'LCD Controller', value: 'ILI9341 via 40MHz SPI' },
          { label: 'Touch Controller', value: 'XPT2046 SPI Resistive Touch' },
          { label: 'GUI Framework', value: 'LVGL (Light and Versatile Graphics Library)' },
          { label: 'Active GUI Status', value: simulationRunning ? `${trackingMode} ACTIVE` : 'STANDBY' },
        ],
        status: 'Rendering LVGL Dashboard',
        statusColor: 'text-emerald-600',
      });
    }
  };

  return (
    <group position={position}>
      {/* 1. OLED Display #1 (Atmospheric Telemetry) */}
      <group
        position={[-0.42, 0.05, 0.44]}
        onClick={handleOled1Click}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('oled1');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.015, 0.22]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.4}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
          />
        </mesh>
        {/* OLED Glass Screen with Cyan Emissive Pixel Sheen */}
        <mesh position={[0, 0.012, 0]} castShadow>
          <boxGeometry args={[0.18, 0.01, 0.14]} />
          <meshStandardMaterial
            color="#0369a1"
            emissive="#0284c7"
            emissiveIntensity={hoveredComponentId === 'oled1' ? 0.8 : 0.45}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 2. OLED Display #2 (Energy Telemetry) */}
      <group
        position={[-0.18, 0.05, 0.44]}
        onClick={handleOled2Click}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('oled2');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.015, 0.22]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.4}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
          />
        </mesh>
        {/* OLED Glass Screen with Amber Emissive Pixel Sheen */}
        <mesh position={[0, 0.012, 0]} castShadow>
          <boxGeometry args={[0.18, 0.01, 0.14]} />
          <meshStandardMaterial
            color="#b45309"
            emissive="#d97706"
            emissiveIntensity={hoveredComponentId === 'oled2' ? 0.8 : 0.45}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 3. ESP32 2.8-inch Color TFT Touchscreen Module */}
      <group
        position={[0.22, 0.08, 0.44]}
        onClick={handleTftClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('tft_display');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.48, 0.02, 0.38]} />
          <meshStandardMaterial
            color="#991b1b"
            roughness={0.3}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
          />
        </mesh>

        <mesh position={[0, 0.018, 0]} castShadow>
          <boxGeometry args={[0.44, 0.015, 0.34]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* TFT LCD Glowing Screen Face */}
        <mesh position={[0, 0.028, 0]}>
          <boxGeometry args={[0.41, 0.008, 0.31]} />
          <meshStandardMaterial
            color="#1e1b4b"
            emissive="#312e81"
            emissiveIntensity={hoveredComponentId === 'tft_display' ? 0.9 : 0.6}
            roughness={0.15}
          />
        </mesh>
      </group>
    </group>
  );
};
