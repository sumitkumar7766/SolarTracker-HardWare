import React, { useMemo } from 'react';
import * as THREE from 'three';

const WireCurve = ({ points, color, radius = 0.014 }) => {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 36, radius, 8, false);
  }, [points, radius]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
};

export const WireSystem = () => {
  // 1. Heavy Armored Flexible Metal Conduit: Solar Array down the Tower to Ground
  const mainTowerConduit = [
    [0.1, 2.5, -0.2],
    [0.2, 2.0, -0.3],
    [0.35, 1.4, -0.25],
    [0.48, 0.8, -0.1],
    [0.6, 0.38, 0.0],
    [1.4, 0.36, 0.0],
    [2.1, 0.5, 0.0],
    [2.45, 0.75, 0.0],
  ];

  // 2. High-Current DC Solar Bus Cable (Solar Array to INA219 / 3S Battery in Kiosk)
  const solarPowerCableRed = [
    [0.05, 2.6, -0.18],
    [0.18, 1.9, -0.28],
    [0.38, 1.3, -0.22],
    [0.55, 0.75, -0.08],
    [1.1, 0.38, 0.1],
    [1.8, 0.42, 0.1],
    [2.3, 0.65, 0.1],
    [2.65, 0.8, 0.0],
  ];

  // 3. Ground Cable (Black)
  const groundCable = [
    [-0.05, 2.6, -0.18],
    [0.12, 1.9, -0.25],
    [0.32, 1.3, -0.18],
    [0.5, 0.75, -0.05],
    [1.1, 0.35, -0.1],
    [1.8, 0.4, -0.1],
    [2.3, 0.62, -0.1],
    [2.65, 0.78, -0.1],
  ];

  // 4. Actuator PWM Control Signal Bus (ESP32 in Kiosk to N20 & Elevation Servos)
  const motorControlBus = [
    [2.3, 0.8, 0.2],
    [1.7, 0.45, 0.2],
    [0.9, 0.4, 0.15],
    [0.45, 1.2, 0.2],
    [0.38, 1.9, 0.25],
    [0.35, 2.1, 0.32],
  ];

  return (
    <group name="InterconnectionConduits">
      {/* Heavy Flexible Braided Metallic Armored Conduit */}
      <WireCurve points={mainTowerConduit} color="#475569" radius={0.024} />

      {/* High-Current DC Solar Positive Line (Amber / Red) */}
      <WireCurve points={solarPowerCableRed} color="#dc2626" radius={0.012} />

      {/* Ground Return Negative Line (Black) */}
      <WireCurve points={groundCable} color="#0f172a" radius={0.012} />

      {/* Multi-Core Actuator Shielded Signal Cable (Cyan / Purple) */}
      <WireCurve points={motorControlBus} color="#3b82f6" radius={0.014} />
    </group>
  );
};
