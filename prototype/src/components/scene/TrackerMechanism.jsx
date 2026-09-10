import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulation } from '../../context/SimulationContext';
import { degToRad } from '../../utils/solarPhysics';
import { BaseStand } from './BaseStand';
import { N20Motor } from './N20Motor';
import { ServoMotor } from './ServoMotor'; // MG996R Main Elevation Servo
import { SolarPanel } from './SolarPanel'; // 5-Panel Radial Sunflower Array
import { LDRSensors } from './LDRSensors';
import { ElectronicsBox } from './ElectronicsBox';
import { WireSystem } from './WireSystem';
import { MultiGearSystem } from './hardware/MultiGearSystem';
import { MG90SServo } from './hardware/MG90SServo';
import { RainSensor } from './hardware/RainSensor';
import { LimitSwitches } from './hardware/LimitSwitches';
import { DataFlowParticles } from './hardware/DataFlowParticles';

export const TrackerMechanism = ({ onSelectComponent }) => {
  const {
    azimuth,
    elevation,
    isExplodedView,
  } = useSimulation();

  const arrayTiltRef = useRef();

  // Convert angles to Three.js Euler rotations
  const azimuthRad = degToRad(-azimuth);
  // Elevation angle from 0° (horizontal/flat) to 80° (steep vertical tilt facing sun)
  const elevationRad = degToRad(80 - elevation);

  // Smooth Exploded View animation
  useFrame((_, delta) => {
    const arrayLift = isExplodedView ? 0.9 : 0;
    if (arrayTiltRef.current) {
      arrayTiltRef.current.position.y += (2.75 + arrayLift - arrayTiltRef.current.position.y) * Math.min(1, delta * 4);
    }
  });

  return (
    <group name="IndustrialSolarTrackerSystem">
      {/* 1. Heavy Industrial Base Tower & Foundation (Static) */}
      <BaseStand />

      {/* 2. IoT Equipment Kiosk & Telemetry Workstation BESIDE the panel (Position: X = +2.8) */}
      <ElectronicsBox onClick={onSelectComponent} position={[2.7, 0.85, 0]} />

      {/* Rain Sensor mounted on outdoor mast of the IoT Workstation beside panel */}
      <RainSensor position={[2.7, 1.7, 0.55]} onClick={onSelectComponent} />

      {/* Safety Limit Switches on Slewing Base and Tilt Hub */}
      <LimitSwitches onClick={onSelectComponent} />

      {/* 3. 360° Horizontal Azimuth Rotating Assembly (Yaw) */}
      <group name="HorizontalAzimuthAssembly" rotation={[0, azimuthRad, 0]}>
        {/* Slewing Bearing Lower Fixed Ring */}
        <mesh position={[0, 2.24, 0]} castShadow>
          <cylinderGeometry args={[0.56, 0.56, 0.08, 36]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Outer Ring Gear Teeth (Slewing Bull Gear) */}
        {Array.from({ length: 32 }, (_, i) => {
          const a = (i * Math.PI * 2) / 32;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.57, 2.24, Math.sin(a) * 0.57]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.02, 0.075, 0.03]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
            </mesh>
          );
        })}

        {/* Slewing Bearing Upper Rotating Flange */}
        <mesh position={[0, 2.32, 0]} castShadow>
          <cylinderGeometry args={[0.58, 0.58, 0.08, 36]} />
          <meshStandardMaterial color="#475569" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* Azimuth Direction Index Arrow (Red) */}
        <mesh position={[0, 2.36, -0.68]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.16, 4]} />
          <meshStandardMaterial color="#ef4444" roughness={0.3} />
        </mesh>

        {/* Drive Pinion & N20 High-Torque Gearmotor Assembly for 360° Rotation */}
        <N20Motor onClick={onSelectComponent} position={[0.42, 2.05, 0.36]} />
        <MultiGearSystem onClick={onSelectComponent} position={[0, 1.7, 0.36]} />

        {/* Auxiliary High-Torque Servo for Azimuth Fine Tracking */}
        <MG90SServo
          id="mg90s_1"
          label="MG90S Servo #1"
          role="Azimuth Anti-Backlash Preload"
          position={[-0.42, 2.2, 0.3]}
          onClick={onSelectComponent}
        />

        {/* 4. Vertical Elevation Tilting Assembly (Pitch) */}
        <group ref={arrayTiltRef} position={[0, 2.75, 0]} rotation={[elevationRad, 0, 0]}>
          {/* Main Heavy-Duty Elevation Pivot Shaft & Bearing Blocks */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.2, 20]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
          </mesh>

          {/* MG996R Primary High-Torque Elevation Drive */}
          <ServoMotor onClick={onSelectComponent} position={[-0.55, 0, 0]} />

          {/* MG90S Auxiliary Pitch Counter-Balance Servo */}
          <MG90SServo
            id="mg90s_2"
            label="MG90S Servo #2"
            role="Elevation Fine Pitch Trim"
            position={[0.55, 0, 0]}
            onClick={onSelectComponent}
          />

          {/* The 5-Panel Radial Sunflower Solar Array */}
          <SolarPanel onClick={onSelectComponent} />

          {/* 4-Quadrant Optical LDR Sensors Mounted at Array Center for Sun Vector Tracking */}
          <LDRSensors onClick={onSelectComponent} />
        </group>
      </group>

      {/* Heavy Industrial Flexible Conduit / Wire Harness connecting Tracker to IoT Kiosk */}
      <WireSystem />

      {/* Animated Data & Power Flow Particles */}
      <DataFlowParticles />
    </group>
  );
};
