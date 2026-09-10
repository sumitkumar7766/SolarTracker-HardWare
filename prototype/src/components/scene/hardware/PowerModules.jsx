import React from 'react';
import { useSimulation } from '../../../context/SimulationContext';

export const PowerModules = ({ position = [0, 0, 0], onClick }) => {
  const {
    battery,
    cellVoltages,
    voltage,
    bmsStatus,
    tp4056Status,
    xl4015Output,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'POWER';

  const handleBatteryClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'battery_pack',
        name: '3S 18650 Lithium-Ion Battery Bank (3 Cells in Series)',
        category: 'Energy Storage & High-Current Supply',
        description:
          'Three high-drain 18650 3.7V 2600mAh lithium-ion cells connected in series (11.1V nominal, 12.6V peak charge). Powers the N20 gearmotor and high-torque MG996R servos with dedicated buffer capacity.',
        specs: [
          { label: 'Configuration', value: '3S1P (11.1V Nom / 12.6V Max)' },
          { label: 'Total Capacity', value: '2600 mAh (28.86 Wh)' },
          { label: 'State of Charge (SoC)', value: `${battery}%` },
          { label: 'Cell #1 Voltage', value: `${cellVoltages[0]} V` },
          { label: 'Cell #2 Voltage', value: `${cellVoltages[1]} V` },
          { label: 'Cell #3 Voltage', value: `${cellVoltages[2]} V` },
          { label: 'Pack Voltage', value: `${voltage} V` },
        ],
        status: 'Active / Nominal Discharge',
        statusColor: 'text-emerald-600',
      });
    }
  };

  const handleBmsClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'bms',
        name: '3S 20A Li-ion Battery Management System (BMS)',
        category: 'Cell Balancing & Protection Module',
        description:
          'Dedicated multi-cell protection board featuring individual cell voltage monitoring, passive cell balancing, short-circuit protection, over-current cutoff, and low-voltage undervoltage lockout.',
        specs: [
          { label: 'Max Continuous Current', value: '20 A' },
          { label: 'Overcharge Detection', value: '4.25V ± 0.05V per cell' },
          { label: 'Overdischarge Cutoff', value: '2.50V ± 0.08V per cell' },
          { label: 'Balancing Current', value: '42 mA Passive Shunt' },
          { label: 'Current State', value: bmsStatus },
        ],
        status: 'BMS Protection Armed',
        statusColor: 'text-emerald-600',
      });
    }
  };

  const handleTp4056Click = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'tp4056',
        name: 'TP4056 Single-Cell Lithium Charger Module',
        category: 'Auxiliary USB Bench Charging Circuit',
        description:
          '1A standalone linear Li-ion battery charger IC with Type-C input and dual LED indicators. Integrated for auxiliary single-cell testing and low-voltage maintenance.',
        specs: [
          { label: 'Charging Method', value: 'Constant-Current / Constant-Voltage' },
          { label: 'Charge Current', value: '1.0 A Max (Configurable)' },
          { label: 'Input Interface', value: 'USB Type-C (5V Input)' },
          { label: 'Full Charge Voltage', value: '4.2V ± 1.5%' },
          { label: 'Current State', value: tp4056Status },
        ],
        status: 'Standby Float Mode',
        statusColor: 'text-sky-600',
      });
    }
  };

  const handleXl4015Click = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id: 'xl4015',
        name: 'XL4015 5A DC-DC Step-Down (Buck) Converter',
        category: 'High-Efficiency Voltage Regulation Rail',
        description:
          'High-power 180kHz fixed-frequency PWM step-down buck converter with onboard aluminum heatsink. Regulates 11.1V–12.6V battery bus down to a rock-solid 5.12V 5A rail for the Raspberry Pi 5, ESP32, and color displays.',
        specs: [
          { label: 'Input Voltage Range', value: '8V - 36V DC' },
          { label: 'Output Voltage Rail', value: `${xl4015Output.voltage} V DC (Tuned)` },
          { label: 'Output Load Current', value: `${xl4015Output.current} A` },
          { label: 'Conversion Efficiency', value: 'Up to 96%' },
          { label: 'Switching Frequency', value: '180 kHz' },
          { label: 'Heatsink Solution', value: 'Anodized Aluminum Fin' },
        ],
        status: 'Regulating 5.14V Rail Active',
        statusColor: 'text-indigo-600',
      });
    }
  };

  return (
    <group position={position}>
      {/* 1. 3-Cell 18650 Battery Pack & Cradle Holder */}
      <group
        position={[0.42, 0.05, 0]}
        onClick={handleBatteryClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('battery_pack');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        {/* Black Plastic 3-Slot Battery Sled */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.08, 0.58]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.8}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
          />
        </mesh>

        {/* 3 Individual 18650 Cylindrical Cells */}
        {[-0.14, 0, 0.14].map((x, idx) => (
          <group key={idx} position={[x, 0.06, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
              <meshStandardMaterial
                color={hoveredComponentId === 'battery_pack' ? '#10b981' : '#059669'}
                metalness={0.2}
                roughness={0.3}
                opacity={isDimmed ? 0.3 : 1.0}
                transparent={isDimmed}
                emissive={hoveredComponentId === 'battery_pack' ? '#059669' : '#000000'}
                emissiveIntensity={hoveredComponentId === 'battery_pack' ? 0.3 : 0}
              />
            </mesh>
            <mesh position={[0, 0, -0.26]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
            <mesh position={[0, 0, 0.255]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.055, 0.055, 0.01, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 2. 3S BMS */}
      <group
        position={[0.42, 0.04, -0.4]}
        onClick={handleBmsClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('bms');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.02, 0.16]} />
          <meshStandardMaterial
            color={hoveredComponentId === 'bms' ? '#10b981' : '#047857'}
            roughness={0.3}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
            emissive={hoveredComponentId === 'bms' ? '#047857' : '#000000'}
            emissiveIntensity={hoveredComponentId === 'bms' ? 0.3 : 0}
          />
        </mesh>
        {[-0.08, 0, 0.08].map((x, i) => (
          <mesh key={i} position={[x, 0.018, 0]}>
            <boxGeometry args={[0.05, 0.015, 0.06]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        ))}
      </group>

      {/* 3. TP4056 Charger Module */}
      <group
        position={[0.15, 0.03, -0.42]}
        onClick={handleTp4056Click}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('tp4056');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.18, 0.02, 0.14]} />
          <meshStandardMaterial
            color={hoveredComponentId === 'tp4056' ? '#3b82f6' : '#1d4ed8'}
            roughness={0.3}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
            emissive={hoveredComponentId === 'tp4056' ? '#1d4ed8' : '#000000'}
            emissiveIntensity={hoveredComponentId === 'tp4056' ? 0.3 : 0}
          />
        </mesh>
        <mesh position={[0, 0.02, -0.06]}>
          <boxGeometry args={[0.06, 0.025, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </mesh>
        <mesh position={[-0.04, 0.018, 0.02]}>
          <boxGeometry args={[0.015, 0.01, 0.015]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.04, 0.018, 0.02]}>
          <boxGeometry args={[0.015, 0.01, 0.015]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* 4. XL4015 DC-DC Buck Converter */}
      <group
        position={[-0.15, 0.04, -0.42]}
        onClick={handleXl4015Click}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('xl4015');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.02, 0.18]} />
          <meshStandardMaterial
            color={hoveredComponentId === 'xl4015' ? '#3b82f6' : '#2563eb'}
            roughness={0.3}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
            emissive={hoveredComponentId === 'xl4015' ? '#2563eb' : '#000000'}
            emissiveIntensity={hoveredComponentId === 'xl4015' ? 0.3 : 0}
          />
        </mesh>
        <mesh position={[-0.04, 0.035, 0]} castShadow>
          <boxGeometry args={[0.09, 0.04, 0.11]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0.06, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.035, 0.014, 10, 16]} />
          <meshStandardMaterial color="#b45309" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.08, 0.035, 0.05]}>
          <boxGeometry args={[0.04, 0.04, 0.04]} />
          <meshStandardMaterial color="#1d4ed8" />
        </mesh>
      </group>
    </group>
  );
};
