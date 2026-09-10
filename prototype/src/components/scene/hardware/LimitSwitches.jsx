import React from 'react';
import { useSimulation } from '../../../context/SimulationContext';

export const LimitSwitches = ({ onClick }) => {
  const {
    limitSwitches,
    hardwareFilter,
    hoveredComponentId,
    setHoveredComponentId,
  } = useSimulation();

  const isDimmed = hardwareFilter !== 'ALL' && hardwareFilter !== 'MECHANICAL';

  const handleSwitchClick = (id, name, axis, status, e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        id,
        name,
        category: 'Mechanical Safety Limit Interlock',
        description:
          'Normally-closed (NC) snap-action miniature microswitch with simulated roller lever arm. Connected directly to hardware interrupt pins to immediately cut motor power when end-of-travel bounds are reached.',
        specs: [
          { label: 'Monitored Axis', value: axis },
          { label: 'Contact Configuration', value: 'SPDT (1NO + 1NC) Microswitch' },
          { label: 'Rating', value: '5A @ 125V AC / 3A @ 24V DC' },
          { label: 'Current Switch State', value: status ? 'TRIGGERED (End-of-Travel)' : 'Open / Clear' },
          { label: 'Safety Cutoff Action', value: 'Halts Stepper/Servo PWM Instantly' },
        ],
        status: status ? 'LIMIT REACHED / INTERRUPT' : 'Armed & Clear',
        statusColor: status ? 'text-red-600' : 'text-emerald-600',
      });
    }
  };

  const isAzTriggered = limitSwitches.azimuthMin || limitSwitches.azimuthMax;
  const isElTriggered = limitSwitches.elevationMin || limitSwitches.elevationMax;

  return (
    <group name="SafetyLimitSwitchesGroup">
      {/* 1. Azimuth Limit Switch on Base Slewing Hub */}
      <group
        position={[-0.56, 0.28, 0]}
        onClick={(e) =>
          handleSwitchClick(
            'limit_azimuth',
            'Azimuth Mechanical Limit Switch (±90°)',
            'Horizontal Yaw Axis (-90° to +90°)',
            isAzTriggered,
            e
          )
        }
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('limit_azimuth');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.05, 0.12]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.7}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
          />
        </mesh>
        <mesh
          position={[-0.04, 0.02, 0]}
          rotation={[0, 0, isAzTriggered ? -0.2 : 0.2]}
        >
          <boxGeometry args={[0.01, 0.04, 0.1]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </mesh>
        <mesh position={[-0.05, 0.04, 0.04]}>
          <cylinderGeometry args={[0.012, 0.012, 0.01, 8]} />
          <meshStandardMaterial color={isAzTriggered ? '#ef4444' : '#64748b'} />
        </mesh>
      </group>

      {/* 2. Elevation Limit Switch on Fork Pivot Arm */}
      <group
        position={[0.72, 2.12, -0.16]}
        onClick={(e) =>
          handleSwitchClick(
            'limit_elevation',
            'Elevation Mechanical Limit Switch (0° / 80°)',
            'Vertical Tilt Pitch Axis (0° to 80°)',
            isElTriggered,
            e
          )
        }
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHoveredComponentId('limit_elevation');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHoveredComponentId(null);
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.05, 0.12]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.7}
            opacity={isDimmed ? 0.3 : 1.0}
            transparent={isDimmed}
          />
        </mesh>
        <mesh
          position={[0, 0.02, 0.05]}
          rotation={[isElTriggered ? -0.2 : 0.2, 0, 0]}
        >
          <boxGeometry args={[0.06, 0.01, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
};
