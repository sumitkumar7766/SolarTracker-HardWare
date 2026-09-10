import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulation } from '../../context/SimulationContext';
import { RaspberryPi5 } from './hardware/RaspberryPi5';
import { ArduinoMega } from './hardware/ArduinoMega';
import { BME680Sensors } from './hardware/BME680Sensors';
import { Displays } from './hardware/Displays';
import { PowerModules } from './hardware/PowerModules';

export const ElectronicsBox = ({ onClick, position = [2.7, 0.85, 0] }) => {
  const {
    simulationRunning,
    simulationPaused,
    showElectronics,
    isExplodedView,
    voltage,
    current,
    power,
    temperature,
    humidity,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const ledRef = useRef();
  const lidRef = useRef();
  const trayRef = useRef();

  useFrame(({ clock }, delta) => {
    if (ledRef.current) {
      if (simulationRunning && !simulationPaused) {
        const t = clock.getElapsedTime() * 6;
        ledRef.current.intensity = (Math.sin(t) + 1) * 0.7;
      } else {
        ledRef.current.intensity = 0.3;
      }
    }

    const targetLidY = isExplodedView ? 0.9 : 0.22;
    const targetTrayZ = isExplodedView ? 0.5 : 0.0;
    if (lidRef.current) {
      lidRef.current.position.y += (targetLidY - lidRef.current.position.y) * Math.min(1, delta * 4);
    }
    if (trayRef.current) {
      trayRef.current.position.z += (targetTrayZ - trayRef.current.position.z) * Math.min(1, delta * 4);
    }
  });

  const isEsp32Dimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'CONTROLLERS';
  const isInaDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'POWER';
  const isDhtDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'SENSORS';

  const handleESP32Click = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'esp32',
        name: 'ESP32-WROOM-32 IoT Microcontroller',
        category: 'Main Embedded Control Core',
        description:
          'Tensilica Xtensa Dual-Core 32-bit LX6 processor @ 240MHz with integrated Wi-Fi and Bluetooth. Direct sensor acquisition engine (4x LDRs, INA219, DHT22, BME680s, Rain sensor) and FreeRTOS PWM driver.',
        specs: [
          { label: 'Processor', value: 'Dual-Core LX6 @ 240MHz' },
          { label: 'Firmware OS', value: 'FreeRTOS Multi-Tasking' },
          { label: 'ADC Channels', value: 'GPIO 32, 33, 34, 35 (12-bit)' },
          { label: 'PWM Timers', value: 'LEDC PWM for N20 & Servos' },
          { label: 'Telemetry Bus', value: 'High-Speed Serial to RPi5' },
        ],
        status: simulationRunning ? 'FreeRTOS Tasks Active' : 'Standby',
        statusColor: simulationRunning ? 'text-emerald-600' : 'text-slate-500',
      });
    }
  };

  const handleINA219Click = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'ina219',
        name: 'INA219 High-Side Precision Power Monitor',
        category: 'Precision Energy Telemetry',
        description:
          'Zero-drift, bidirectional current and power monitor IC communicating via I2C (address 0x40). Senses differential drop across a 0.1Ω 1% precision shunt resistor.',
        specs: [
          { label: 'I2C Address', value: '0x40' },
          { label: 'Live Voltage', value: `${voltage} V` },
          { label: 'Live Current', value: `${current} A` },
          { label: 'Instant Power', value: `${power} W` },
          { label: 'Accuracy', value: '±1% Dynamic Range' },
        ],
        status: 'Streaming I2C Packets',
        statusColor: 'text-emerald-600',
      });
    }
  };

  const handleDHT22Click = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'dht22',
        name: 'DHT22 / AM2302 Environmental Sensor',
        category: 'Atmospheric Diagnostics',
        description:
          'Capacitive humidity sensor and thermistor with custom single-wire digital protocol. Provides ambient temperature and humidity for solar panel thermal efficiency derating.',
        specs: [
          { label: 'Live Temperature', value: `${temperature} °C` },
          { label: 'Live Humidity', value: `${humidity} % RH` },
          { label: 'Sampling Interface', value: 'Single-Wire Digital on GPIO 4' },
          { label: 'Thermal Derating', value: '-0.4%/°C above 25°C' },
        ],
        status: 'Online & Polling',
        statusColor: 'text-emerald-600',
      });
    }
  };

  return (
    <group position={position} name="OutdoorIoTWorkstationBesidePanel">
      {/* 1. Pedestal Support Stand Holding Equipment Beside the Panel */}
      <group position={[0, -0.45, 0]}>
        {/* Concrete Ground Anchor Footing */}
        <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.14, 1.2]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
        {/* Twin Extruded Aluminum Support Legs */}
        <mesh position={[-0.55, 0.1, 0]} castShadow>
          <boxGeometry args={[0.08, 0.65, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.55, 0.1, 0]} castShadow>
          <boxGeometry args={[0.08, 0.65, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* 2. Weatherproof IP67 Polycarbonate Enclosure Box Base */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.45, 1.4]} />
        <meshPhysicalMaterial
          color={showElectronics ? '#e0e7ff' : '#cbd5e1'}
          transparent
          opacity={showElectronics || isExplodedView ? 0.18 : 0.45}
          roughness={0.15}
          metalness={0.1}
          transmission={showElectronics || isExplodedView ? 0.9 : 0.65}
          ior={1.4}
        />
      </mesh>

      {/* Weatherproof Hinged Transparent Lid / Cover */}
      <group ref={lidRef} position={[0, 0.225, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.94, 0.025, 1.44]} />
          <meshPhysicalMaterial
            color="#e0e7ff"
            transparent
            opacity={showElectronics || isExplodedView ? 0.2 : 0.55}
            roughness={0.1}
            transmission={0.8}
          />
        </mesh>
      </group>

      {/* 3. Internal Sliding Electronics Mounting Tray with all IoT Hardware */}
      <group ref={trayRef} position={[0, -0.05, 0]}>
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <boxGeometry args={[1.8, 0.015, 1.3]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>

        {/* Component 1: ESP32 Development Board */}
        <group
          position={[-0.45, 0.02, 0.1]}
          onClick={handleESP32Click}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
            setHoveredComponentId('esp32');
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'auto';
            setHoveredComponentId(null);
          }}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.025, 0.52]} />
            <meshStandardMaterial
              color="#0f172a"
              roughness={0.3}
              opacity={isEsp32Dimmed ? 0.3 : 1.0}
              transparent={isEsp32Dimmed}
              emissive={hoveredComponentId === 'esp32' ? '#3b82f6' : '#000000'}
              emissiveIntensity={hoveredComponentId === 'esp32' ? 0.4 : 0}
            />
          </mesh>
          <mesh position={[0, 0.025, -0.08]} castShadow>
            <boxGeometry args={[0.22, 0.03, 0.24]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[0.08, 0.025, 0.12]}>
            <boxGeometry args={[0.02, 0.015, 0.02]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} />
          </mesh>
          <pointLight ref={ledRef} position={[0.08, 0.06, 0.12]} color="#22c55e" distance={0.6} intensity={0.5} />
        </group>

        {/* Component 2: Raspberry Pi 5 8GB */}
        <RaspberryPi5 position={[-0.05, 0.02, 0.05]} onClick={onClick} />

        {/* Component 3: Arduino Mega 2560 */}
        <ArduinoMega position={[-0.15, 0.02, -0.42]} onClick={onClick} />

        {/* Component 4: Dual BME680 Sensor Modules */}
        <BME680Sensors onClick={onClick} />

        {/* Component 5: INA219 Energy Sensor */}
        <group
          position={[0.42, 0.02, -0.16]}
          onClick={handleINA219Click}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
            setHoveredComponentId('ina219');
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'auto';
            setHoveredComponentId(null);
          }}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.22, 0.02, 0.22]} />
            <meshStandardMaterial
              color="#6b21a8"
              roughness={0.3}
              opacity={isInaDimmed ? 0.3 : 1.0}
              transparent={isInaDimmed}
              emissive={hoveredComponentId === 'ina219' ? '#a855f7' : '#000000'}
              emissiveIntensity={hoveredComponentId === 'ina219' ? 0.4 : 0}
            />
          </mesh>
          <mesh position={[-0.05, 0.04, 0]} castShadow>
            <boxGeometry args={[0.08, 0.07, 0.14]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
          <mesh position={[0.05, 0.02, 0]} castShadow>
            <boxGeometry args={[0.05, 0.02, 0.07]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Component 6: DHT22 White Sensor Casing */}
        <group
          position={[0.7, 0.03, 0.25]}
          onClick={handleDHT22Click}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
            setHoveredComponentId('dht22');
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'auto';
            setHoveredComponentId(null);
          }}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.16, 0.22, 0.1]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.3}
              opacity={isDhtDimmed ? 0.3 : 1.0}
              transparent={isDhtDimmed}
              emissive={hoveredComponentId === 'dht22' ? '#38bdf8' : '#000000'}
              emissiveIntensity={hoveredComponentId === 'dht22' ? 0.35 : 0}
            />
          </mesh>
          {[-0.05, 0, 0.05].map((offset, idx) => (
            <mesh key={idx} position={[0, offset, 0.051]}>
              <planeGeometry args={[0.11, 0.015]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          ))}
        </group>

        {/* Component 7: Power Modules (3x 18650, 3S BMS, TP4056, XL4015) */}
        <PowerModules onClick={onClick} />

        {/* Component 8: Displays (OLED #1, OLED #2, 2.8" TFT Touch) */}
        <Displays onClick={onClick} />
      </group>
    </group>
  );
};
