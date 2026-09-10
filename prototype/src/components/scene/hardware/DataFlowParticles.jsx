import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulation } from '../../../context/SimulationContext';

const ParticlePath = ({ points, color = '#38bdf8', speed = 1.5, size = 0.035, count = 4 }) => {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  }, [points]);

  const meshRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const progress = (t * 0.25 + i / count) % 1;
      const pos = curve.getPointAt(progress);
      mesh.position.copy(pos);
    });
  });

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(el) => (meshRefs.current[i] = el)}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
};

export const DataFlowParticles = () => {
  const { showDataFlow, showPowerFlow } = useSimulation();

  // 1. Data Flow Routes:
  // LDR Sensor to ESP32 (located at the workstation beside panel: X = +2.7)
  const ldrToEsp32 = [
    [0.0, 2.8, 0.1],
    [0.15, 2.2, -0.1],
    [0.45, 1.2, 0.1],
    [1.4, 0.45, 0.1],
    [2.25, 0.85, 0.1],
  ];

  // ESP32 to Raspberry Pi 5 inside the workstation
  const esp32ToRpi = [
    [2.25, 0.85, 0.1],
    [2.45, 0.86, 0.05],
    [2.65, 0.87, 0.05],
  ];

  // ESP32 commands to Azimuth & Elevation Motors
  const esp32ToMotors = [
    [2.25, 0.85, 0.1],
    [1.5, 0.45, 0.1],
    [0.6, 1.2, 0.2],
    [0.42, 2.05, 0.36],
  ];

  // 2. Power Flow Routes:
  // Solar Array generation down through conduit into INA219 in Kiosk
  const panelToIna = [
    [0.0, 2.7, -0.1],
    [0.2, 2.0, -0.2],
    [0.45, 1.2, -0.1],
    [1.2, 0.4, 0.0],
    [2.2, 0.7, 0.0],
    [2.9, 0.85, -0.16],
  ];

  // INA219 to BMS & 3S Battery pack
  const inaToBattery = [
    [2.9, 0.85, -0.16],
    [2.95, 0.86, 0.0],
    [3.12, 0.88, 0.0],
  ];

  // Battery to XL4015 Buck Converter
  const batteryToXl4015 = [
    [3.12, 0.88, 0.0],
    [2.8, 0.88, -0.3],
    [2.55, 0.88, -0.42],
  ];

  return (
    <group name="AnimatedFlowVisualizers">
      {/* Data Flow Particles (Glowing Cyan & Purple) */}
      {showDataFlow && (
        <>
          <ParticlePath points={ldrToEsp32} color="#38bdf8" speed={2.0} size={0.03} count={3} />
          <ParticlePath points={esp32ToRpi} color="#a855f7" speed={2.5} size={0.035} count={3} />
          <ParticlePath points={esp32ToMotors} color="#06b6d4" speed={2.2} size={0.03} count={3} />
        </>
      )}

      {/* Power Flow Particles (Glowing Amber & Emerald) */}
      {showPowerFlow && (
        <>
          <ParticlePath points={panelToIna} color="#f59e0b" speed={2.5} size={0.04} count={4} />
          <ParticlePath points={inaToBattery} color="#10b981" speed={2.0} size={0.038} count={4} />
          <ParticlePath points={batteryToXl4015} color="#eab308" speed={2.2} size={0.035} count={3} />
        </>
      )}
    </group>
  );
};
