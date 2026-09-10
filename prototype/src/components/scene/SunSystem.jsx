import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulation } from '../../context/SimulationContext';
import { getSunPosition, degToRad } from '../../utils/solarPhysics';

export const SunSystem = () => {
  const {
    sunAzimuth,
    sunElevation,
    sunIntensity,
    showSunPath,
    trackingEfficiency,
    setSelectedComponent,
  } = useSimulation();

  const raysRef = useRef();

  // Calculate 3D position of Sun
  const sunPos = useMemo(
    () => getSunPosition(sunAzimuth, sunElevation, 15),
    [sunAzimuth, sunElevation]
  );

  // Generate 3D Sun Path Arc (from dawn to dusk across the sky)
  const pathPoints = useMemo(() => {
    const pts = [];
    for (let h = 6; h <= 18; h += 0.25) {
      const frac = (h - 6) / 12; // 0 to 1
      const az = -80 + frac * 160;
      const el = 15 + Math.sin(frac * Math.PI) * 60;
      pts.push(new THREE.Vector3(...getSunPosition(az, el, 15)));
    }
    return pts;
  }, []);

  const pathGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(pathPoints);
  }, [pathPoints]);

  // Subtle animated pulsing beam opacity based on tracking alignment
  useFrame(({ clock }) => {
    if (raysRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 3) * 0.1;
      const baseAlpha = 0.15 + (trackingEfficiency / 100) * 0.25;
      raysRef.current.material.opacity = Math.max(0.08, baseAlpha + pulse);
    }
  });

  const handleSunClick = (e) => {
    e.stopPropagation();
    setSelectedComponent({
      name: 'Simulated Celestial Sun',
      category: 'Natural Energy Source',
      description:
        'Solar radiation emitter simulating diurnal trajectory, atmospheric air mass attenuation, and direct normal irradiance (DNI).',
      specs: [
        { label: 'Current Solar Azimuth', value: `${sunAzimuth}°` },
        { label: 'Current Solar Elevation', value: `${sunElevation}°` },
        { label: 'Direct Irradiance Intensity', value: `${(sunIntensity * 1000).toFixed(0)} W/m²` },
        { label: 'Incident Angle Alignment', value: `${trackingEfficiency}%` },
        { label: 'Diurnal Status', value: sunElevation > 10 ? 'Daylight (Active Harvesting)' : 'Twilight / Night' },
      ],
      status: 'Illuminating Photovoltaic Target',
      statusColor: 'text-amber-600',
    });
  };

  // Sun Ray geometry targeting solar panel center [0, 1.8, 0]
  const rayGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const target = new THREE.Vector3(0, 1.8, 0);
    const sunV = new THREE.Vector3(...sunPos);

    // 5 rays (center + 4 corners)
    const vertices = [];
    vertices.push(sunV.x, sunV.y, sunV.z, target.x, target.y, target.z);
    vertices.push(sunV.x, sunV.y, sunV.z, target.x - 1.8, target.y + 1.1, target.z);
    vertices.push(sunV.x, sunV.y, sunV.z, target.x + 1.8, target.y + 1.1, target.z);
    vertices.push(sunV.x, sunV.y, sunV.z, target.x - 1.8, target.y - 1.1, target.z);
    vertices.push(sunV.x, sunV.y, sunV.z, target.x + 1.8, target.y - 1.1, target.z);

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geo;
  }, [sunPos]);

  return (
    <group name="SunSystemGroup">
      {/* 1. Curved 3D Sun Path Arc in Sky */}
      {showSunPath && (
        <line geometry={pathGeometry}>
          <lineDashedMaterial
            color="#f59e0b"
            dashSize={0.4}
            gapSize={0.2}
            transparent
            opacity={0.45}
            linewidth={2}
          />
        </line>
      )}

      {/* 2. Sun Body (Emissive Glowing Sphere) */}
      <group position={sunPos} onClick={handleSunClick}>
        {/* Core sphere */}
        <mesh castShadow={false}>
          <sphereGeometry args={[0.75, 32, 32]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>

        {/* Corona glow outer shell */}
        <mesh>
          <sphereGeometry args={[1.05, 24, 24]} />
          <meshBasicMaterial
            color="#fef08a"
            transparent
            opacity={0.35}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Corona outer aura */}
        <mesh>
          <sphereGeometry args={[1.4, 24, 24]} />
          <meshBasicMaterial
            color="#fed7aa"
            transparent
            opacity={0.18}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Primary Point Light radiating from Sun */}
        <pointLight
          color="#fffbeb"
          intensity={1.8 * sunIntensity}
          distance={40}
          decay={1.2}
        />

        {/* Directional Key Light with soft shadow map */}
        <directionalLight
          position={[0, 0, 0]}
          target-position={[0, 1.8, 0]}
          intensity={2.2 * sunIntensity}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={35}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
          shadow-bias={-0.0005}
        />
      </group>

      {/* 3. Animated Translucent Sun Rays Streaming to Tracker */}
      <lineSegments ref={raysRef} geometry={rayGeometry}>
        <lineBasicMaterial
          color={trackingEfficiency > 85 ? '#f59e0b' : '#38bdf8'}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
};
