import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Search,
  Split,
  Activity,
  Zap,
  ArrowUpRight,
  Camera,
  Hand,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { TrackerMechanism } from './TrackerMechanism';
import { SunSystem } from './SunSystem';
import { Environment } from './Environment';
import { ComponentInspector } from './ComponentInspector';
import { CameraControlUnit } from './CameraControlUnit';
import { HandGestureWebcamPanel } from './HandGestureWebcamPanel';

// Searchable Hardware Directory with comfortable framing coordinates
const HARDWARE_CATALOG = [
  { id: 'solar_panel', name: '5-Panel Radial Sunflower Array', category: 'MECHANICAL', camPos: [0, 3.4, 4.4], target: [0, 2.75, 0] },
  { id: 'panel_center', name: 'Central Solar Panel #3', category: 'MECHANICAL', camPos: [0, 4.2, 3.2], target: [0, 4.3, 0] },
  { id: 'panel_top_right', name: 'Upper-Right Solar Panel #4', category: 'MECHANICAL', camPos: [1.8, 3.9, 3.0], target: [1.0, 3.9, 0] },
  { id: 'panel_low_right', name: 'Lower-Right Solar Panel #5', category: 'MECHANICAL', camPos: [2.5, 2.6, 3.0], target: [1.6, 2.6, 0] },
  { id: 'panel_top_left', name: 'Upper-Left Solar Panel #2', category: 'MECHANICAL', camPos: [-1.8, 3.9, 3.0], target: [-1.0, 3.9, 0] },
  { id: 'panel_low_left', name: 'Lower-Left Solar Panel #1', category: 'MECHANICAL', camPos: [-2.5, 2.6, 3.0], target: [-1.6, 2.6, 0] },
  { id: 'esp32', name: 'ESP32 Development Board', category: 'CONTROLLERS', camPos: [2.25, 1.8, 1.8], target: [2.25, 0.88, 0.1] },
  { id: 'rpi5', name: 'Raspberry Pi 5 (8GB RAM)', category: 'CONTROLLERS', camPos: [2.65, 1.8, 1.8], target: [2.65, 0.88, 0.05] },
  { id: 'arduino', name: 'Arduino Mega 2560', category: 'CONTROLLERS', camPos: [2.55, 1.8, 1.5], target: [2.55, 0.88, -0.42] },
  { id: 'bme680_1', name: 'BME680 Sensor #1 (0x76)', category: 'SENSORS', camPos: [2.48, 1.8, 1.6], target: [2.48, 0.88, -0.28] },
  { id: 'bme680_2', name: 'BME680 Sensor #2 (0x77)', category: 'SENSORS', camPos: [2.66, 1.8, 1.6], target: [2.66, 0.88, -0.28] },
  { id: 'rain_sensor', name: 'Rain Drop Sensor Module', category: 'SENSORS', camPos: [2.7, 2.3, 1.8], target: [2.7, 1.7, 0.55] },
  { id: 'dht22', name: 'DHT22 Temp/Humidity Sensor', category: 'SENSORS', camPos: [3.4, 1.8, 1.8], target: [3.4, 0.88, 0.25] },
  { id: 'ina219', name: 'INA219 Power Monitor', category: 'POWER', camPos: [3.12, 1.8, 1.6], target: [3.12, 0.88, -0.16] },
  { id: 'battery_pack', name: '3 × 18650 Battery Pack', category: 'POWER', camPos: [3.15, 1.9, 1.7], target: [3.12, 0.88, 0] },
  { id: 'bms', name: '3S 20A Li-ion BMS', category: 'POWER', camPos: [3.12, 1.8, 1.4], target: [3.12, 0.88, -0.4] },
  { id: 'tp4056', name: 'TP4056 Charger Module', category: 'POWER', camPos: [2.85, 1.8, 1.4], target: [2.85, 0.88, -0.42] },
  { id: 'xl4015', name: 'XL4015 5A Buck Converter', category: 'POWER', camPos: [2.55, 1.8, 1.4], target: [2.55, 0.88, -0.42] },
  { id: 'oled1', name: 'OLED #1 (Temperature)', category: 'DISPLAY', camPos: [2.28, 1.8, 1.8], target: [2.28, 0.88, 0.44] },
  { id: 'oled2', name: 'OLED #2 (Wattage)', category: 'DISPLAY', camPos: [2.52, 1.8, 1.8], target: [2.52, 0.88, 0.44] },
  { id: 'tft_display', name: 'ESP32 2.8" Color TFT Touch', category: 'DISPLAY', camPos: [2.92, 1.8, 1.8], target: [2.92, 0.88, 0.44] },
  { id: 'n20_motor', name: 'N20 DC Gear Motor', category: 'MOTORS', camPos: [1.2, 2.5, 1.2], target: [0.42, 2.05, 0.36] },
  { id: 'mg996r', name: 'MG996R High-Torque Servo', category: 'MOTORS', camPos: [-1.2, 3.2, 1.2], target: [-0.55, 2.75, 0] },
  { id: 'mg90s_1', name: 'MG90S Servo #1', category: 'MOTORS', camPos: [-1.1, 2.7, 1.2], target: [-0.42, 2.2, 0.3] },
  { id: 'mg90s_2', name: 'MG90S Servo #2', category: 'MOTORS', camPos: [1.2, 3.2, 1.2], target: [0.55, 2.75, 0] },
  { id: 'gear_system', name: 'Multi-Gear Compound Train', category: 'MECHANICAL', camPos: [0.8, 2.2, 1.2], target: [0, 1.7, 0.36] },
  { id: 'limit_azimuth', name: 'Azimuth Limit Switch', category: 'MECHANICAL', camPos: [-1.1, 1.0, 1.0], target: [-0.56, 0.4, 0] },
  { id: 'limit_elevation', name: 'Elevation Limit Switch', category: 'MECHANICAL', camPos: [1.4, 3.2, 1.0], target: [0.72, 2.8, -0.16] },
  { id: 'ldr_tl', name: 'LDR Top-Left', category: 'SENSORS', camPos: [-1.2, 3.8, 1.6], target: [-1.82, 3.8, 0.2] },
  { id: 'ldr_tr', name: 'LDR Top-Right', category: 'SENSORS', camPos: [1.2, 3.8, 1.6], target: [1.82, 3.8, 0.2] },
];

// Unified Camera Controller: Smooth Presets, Bounding-Box Centering, Tactile Actions & Hand-Gesture Kinematics
const CameraController = ({
  preset,
  focusedTarget,
  onPresetHandled,
  cameraAction,
  isCameraControlEnabled = true,
  isAutoRotating = false,
  handStateRef,
  isHandMode,
  onSelectComponent,
  onTriggerExploded,
  onTriggerTurntable,
}) => {
  const { camera, scene, raycaster } = useThree();
  const controlsRef = useRef();

  // Animation interpolation state
  const animProgress = useRef(1);
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3(6.8, 4.5, 7.2));
  const endTarget = useRef(new THREE.Vector3(0.8, 2.0, 0));

  // Hand gesture damping velocity
  const handVelocity = useRef({
    theta: 0,
    phi: 0,
    zoom: 0,
    panX: 0,
    panY: 0,
  });
  const lastGestureActionTime = useRef(0);
  const pointerCoord = useRef(new THREE.Vector2());

  // Initiate smooth timed move to target position & target look-at
  const initiateMove = useCallback((toPos, toTarget) => {
    if (!controlsRef.current) return;
    startPos.current.copy(camera.position);
    startTarget.current.copy(controlsRef.current.target);
    endPos.current.set(...toPos);
    endTarget.current.set(...toTarget);
    animProgress.current = 0;
  }, [camera]);

  // Requirement 6: Dynamic Bounding Box centerCamera() Function
  const centerCamera = useCallback(() => {
    if (!controlsRef.current) return;
    const box = new THREE.Box3();
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        box.expandByObject(child);
      }
    });

    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 5.0);
    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraDistance *= 1.35; // Add 35% margin for comfortable framing on any screen ratio

    const targetCamPos = new THREE.Vector3(
      center.x + cameraDistance * 0.72,
      center.y + cameraDistance * 0.48,
      center.z + cameraDistance * 0.76
    );

    initiateMove(
      [targetCamPos.x, targetCamPos.y, targetCamPos.z],
      [center.x, center.y, center.z]
    );
  }, [camera, scene, initiateMove]);

  // Respond to focused search target or preset changes
  useEffect(() => {
    if (focusedTarget) {
      initiateMove(focusedTarget.camPos, focusedTarget.target);
      return;
    }

    switch (preset) {
      case 'FULL SYSTEM':
      case 'RESET':
      case 'CENTER':
        centerCamera();
        break;
      case 'ELECTRONICS':
        initiateMove([2.8, 1.8, 2.2], [2.7, 0.85, 0]);
        break;
      case 'SOLAR PANEL':
        initiateMove([0, 3.4, 4.4], [0, 2.75, 0]);
        break;
      case 'TOP':
        initiateMove([0.01, 9.5, 0.01], [0.8, 2.0, 0]);
        break;
      case 'FRONT':
        initiateMove([0.8, 2.8, 7.2], [0.8, 2.2, 0]);
        break;
      case 'SIDE':
        initiateMove([-7.5, 3.2, 0], [0, 2.2, 0]);
        break;
      default:
        break;
    }
  }, [preset, focusedTarget, centerCamera, initiateMove]);

  // Respond to on-screen CCU D-Pad Actions
  useEffect(() => {
    if (!cameraAction || !controlsRef.current) return;
    const controls = controlsRef.current;

    switch (cameraAction.type) {
      case 'ZOOM_IN': {
        const dir = new THREE.Vector3().subVectors(controls.target, camera.position).normalize();
        const dist = camera.position.distanceTo(controls.target);
        if (dist > 1.2) {
          camera.position.addScaledVector(dir, Math.min(2.0, dist * 0.28));
          controls.update();
        }
        break;
      }
      case 'ZOOM_OUT': {
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        const dist = camera.position.distanceTo(controls.target);
        if (dist < 32) {
          camera.position.addScaledVector(dir, Math.max(1.5, dist * 0.22));
          controls.update();
        }
        break;
      }
      case 'ROTATE_LEFT': {
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta += Math.PI / 12;
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        controls.update();
        break;
      }
      case 'ROTATE_RIGHT': {
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta -= Math.PI / 12;
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        controls.update();
        break;
      }
      case 'ROTATE_UP': {
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.phi = THREE.MathUtils.clamp(spherical.phi - Math.PI / 16, 0.08, Math.PI / 2 - 0.02);
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        controls.update();
        break;
      }
      case 'ROTATE_DOWN': {
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.phi = THREE.MathUtils.clamp(spherical.phi + Math.PI / 16, 0.08, Math.PI / 2 - 0.02);
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        controls.update();
        break;
      }
      case 'PAN_LEFT': {
        const right = new THREE.Vector3();
        camera.matrix.extractBasis(right, new THREE.Vector3(), new THREE.Vector3());
        right.y = 0;
        right.normalize().multiplyScalar(-0.6);
        camera.position.add(right);
        controls.target.add(right);
        controls.update();
        break;
      }
      case 'PAN_RIGHT': {
        const right = new THREE.Vector3();
        camera.matrix.extractBasis(right, new THREE.Vector3(), new THREE.Vector3());
        right.y = 0;
        right.normalize().multiplyScalar(0.6);
        camera.position.add(right);
        controls.target.add(right);
        controls.update();
        break;
      }
      case 'PAN_UP': {
        const up = new THREE.Vector3(0, 0.5, 0);
        camera.position.add(up);
        controls.target.add(up);
        controls.update();
        break;
      }
      case 'PAN_DOWN': {
        const down = new THREE.Vector3(0, -0.5, 0);
        camera.position.add(down);
        controls.target.add(down);
        controls.update();
        break;
      }
      case 'RESET': {
        centerCamera();
        break;
      }
      default:
        break;
    }
  }, [cameraAction, centerCamera, camera]);

  // Cancel programmatic transitions immediately when user scrolls or drags with mouse/touch
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleUserInteractionStart = () => {
      if (animProgress.current < 1) {
        animProgress.current = 1;
        if (onPresetHandled) onPresetHandled();
      }
    };

    controls.addEventListener('start', handleUserInteractionStart);
    return () => {
      controls.removeEventListener('start', handleUserInteractionStart);
    };
  }, [onPresetHandled]);

  // Main Render Frame Loop: Programmatic Easing + Hand Gesture Kinematics
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // 1. Programmatic Interpolation (when clicking search or presets)
    if (animProgress.current < 1) {
      animProgress.current += delta * 2.2;
      if (animProgress.current >= 1) {
        animProgress.current = 1;
        camera.position.copy(endPos.current);
        controls.target.copy(endTarget.current);
        controls.update();
        if (onPresetHandled) onPresetHandled();
      } else {
        const t = 1 - Math.pow(1 - animProgress.current, 3);
        camera.position.lerpVectors(startPos.current, endPos.current, t);
        controls.target.lerpVectors(startTarget.current, endTarget.current, t);
        controls.update();
      }
      return;
    }

    // 2. Hand Gesture Real-Time Control
    if (isHandMode && handStateRef && handStateRef.current) {
      const hand = handStateRef.current;
      const now = Date.now();

      if (!hand.detected || hand.isStopped || hand.gesture === 'STOP') {
        // Immediate hard stop: freeze 3D model camera at that exact point with zero coasting or drift
        handVelocity.current.theta = 0;
        handVelocity.current.phi = 0;
        handVelocity.current.zoom = 0;
        handVelocity.current.panX = 0;
        handVelocity.current.panY = 0;
      } else {
        const g = hand.gesture;

        // 1. 🛑 STOP / FREEZE (Closed Fist)
        if (g === 'STOP') {
          handVelocity.current.theta = 0;
          handVelocity.current.phi = 0;
          handVelocity.current.zoom = 0;
          handVelocity.current.panX = 0;
          handVelocity.current.panY = 0;
        }

        // 2. 🔄 ROTATE (Open Palm)
        if (g === 'ROTATE' && hand.delta) {
          handVelocity.current.theta = -hand.delta.x * 4.2;
          handVelocity.current.phi = -hand.delta.y * 4.2;
        }

        // 3. 🤏 ZOOM IN / 👐 ZOOM OUT (Distinct Zoom Gestures)
        if ((g === 'ZOOM_IN' || g === 'ZOOM_OUT' || g === 'ZOOM') && hand.zoomDelta !== undefined) {
          // positive zoomDelta = ZOOM IN (closer), negative = ZOOM OUT (farther)
          handVelocity.current.zoom = hand.zoomDelta * 2.8;
        }

        // 4. ↔️ PAN (Two Fingers)
        if (g === 'PAN' && hand.delta) {
          handVelocity.current.panX = -hand.delta.x * 4.5;
          handVelocity.current.panY = hand.delta.y * 4.5;
        }

        // 5. 🏠 OVERVIEW / RESET (Thumbs Up)
        if (g === 'OVERVIEW' && now - lastGestureActionTime.current > 1200) {
          lastGestureActionTime.current = now;
          centerCamera();
        }

        // 🤙 EXPLODED VIEW (Shaka)
        if (g === 'EXPLODED' && now - lastGestureActionTime.current > 1500) {
          lastGestureActionTime.current = now;
          if (onTriggerExploded) onTriggerExploded();
        }

        // 🤟 TURNTABLE 360° (Rock)
        if (g === 'TURNTABLE' && now - lastGestureActionTime.current > 1500) {
          lastGestureActionTime.current = now;
          if (onTriggerTurntable) onTriggerTurntable();
        }

        // ☝️ SELECT (One Finger Pointing Raycast)
        if (g === 'SELECT' && hand.pointer && now - lastGestureActionTime.current > 900) {
          lastGestureActionTime.current = now;
          const ndcX = ((1 - hand.pointer.x) * 2) - 1;
          const ndcY = -(hand.pointer.y * 2) + 1;
          pointerCoord.current.set(ndcX, ndcY);

          raycaster.setFromCamera(pointerCoord.current, camera);
          const intersects = raycaster.intersectObjects(scene.children, true);

          if (intersects.length > 0) {
            let hit = intersects[0].object;
            let foundComponent = null;

            while (hit && hit !== scene) {
              if (hit.name) {
                if (hit.name.includes('ArmAndPanel_')) {
                  const id = hit.name.replace('ArmAndPanel_', '');
                  foundComponent = {
                    id,
                    name: 'Solar Panel Module',
                    category: 'Photovoltaic Array',
                    description: 'Selected via ☝️ Hand Gesture Raycasting.',
                    status: 'Active Tracking',
                    statusColor: 'text-emerald-600',
                  };
                  break;
                } else if (hit.name === 'OutdoorIoTWorkstationBesidePanel') {
                  foundComponent = {
                    id: 'rpi5',
                    name: 'IoT Equipment Workstation',
                    category: 'Edge-AI & Telemetry Kiosk',
                    description: 'Workstation console selected via ☝️ Hand Gesture Raycast.',
                    status: 'Online',
                    statusColor: 'text-emerald-600',
                  };
                  break;
                }
              }
              hit = hit.parent;
            }

            if (foundComponent && onSelectComponent) {
              onSelectComponent(foundComponent);
            }
          }
        }
      }

      // Apply Kinematics
      const target = controls.target;

      // Orbit
      if (Math.abs(handVelocity.current.theta) > 0.0001 || Math.abs(handVelocity.current.phi) > 0.0001) {
        const offset = new THREE.Vector3().subVectors(camera.position, target);
        const spherical = new THREE.Spherical().setFromVector3(offset);

        spherical.theta += handVelocity.current.theta * delta * 8;
        spherical.phi = THREE.MathUtils.clamp(
          spherical.phi + handVelocity.current.phi * delta * 8,
          0.08,
          Math.PI / 2 - 0.02
        );

        offset.setFromSpherical(spherical);
        camera.position.copy(target).add(offset);
        controls.update();

        handVelocity.current.theta *= 0.88;
        handVelocity.current.phi *= 0.88;
      }

      // Zoom (dir points from camera toward target = ZOOM IN direction)
      if (Math.abs(handVelocity.current.zoom) > 0.0001) {
        const dir = new THREE.Vector3().subVectors(target, camera.position).normalize();
        const zoomAmount = handVelocity.current.zoom * delta * 14;
        const currentDist = camera.position.distanceTo(target);

        // If zoomAmount > 0 (Zoom IN): clamp to minDistance 1.2
        // If zoomAmount < 0 (Zoom OUT): clamp to maxDistance 32
        if ((zoomAmount > 0 && currentDist > 1.2) || (zoomAmount < 0 && currentDist < 32)) {
          camera.position.addScaledVector(dir, zoomAmount);
          controls.update();
        }
        handVelocity.current.zoom *= 0.84;
      }

      // Pan
      if (Math.abs(handVelocity.current.panX) > 0.0001 || Math.abs(handVelocity.current.panY) > 0.0001) {
        const right = new THREE.Vector3();
        camera.matrix.extractBasis(right, new THREE.Vector3(), new THREE.Vector3());
        right.y = 0;
        right.normalize().multiplyScalar(handVelocity.current.panX * delta * 10);

        const up = new THREE.Vector3(0, handVelocity.current.panY * delta * 10, 0);

        camera.position.add(right).add(up);
        target.add(right).add(up);
        controls.update();

        handVelocity.current.panX *= 0.82;
        handVelocity.current.panY *= 0.82;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={isCameraControlEnabled}
      enableRotate={isCameraControlEnabled}
      enableZoom={isCameraControlEnabled}
      enablePan={isCameraControlEnabled}
      autoRotate={isAutoRotating}
      autoRotateSpeed={1.0}
      enableDamping
      dampingFactor={0.06}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI / 2 - 0.02}
      minDistance={0.2}
      maxDistance={35}
      target={[0.8, 2.0, 0]}
    />
  );
};

export const SolarTrackerCanvas = () => {
  const {
    azimuth,
    elevation,
    trackingEfficiency,
    power,
    simulationRunning,
    simulationPaused,
    trackingMode,
    showElectronics,
    setShowElectronics,
    isExplodedView,
    setIsExplodedView,
    showDataFlow,
    setShowDataFlow,
    showPowerFlow,
    setShowPowerFlow,
    hardwareFilter,
    setHardwareFilter,
    cameraPreset,
    setCameraPreset,
    setSelectedComponent,
  } = useSimulation();

  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [focusedTarget, setFocusedTarget] = useState(null);

  // Dedicated Camera Control Unit (Manual CCU) State
  const [isCameraControlOpen, setIsCameraControlOpen] = useState(false);
  const [isCameraControlEnabled, setIsCameraControlEnabled] = useState(true);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [cameraAction, setCameraAction] = useState(null);

  // Live Webcam Hand Gesture Control State
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isHandMode, setIsHandMode] = useState(true);
  const handStateRef = useRef({ detected: false, gesture: 'NONE' });

  const dispatchCameraAction = useCallback((type) => {
    setCameraAction({ type, timestamp: Date.now() });
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSelectComponentFromScene = (comp) => {
    setSelectedComponent(comp);
    if (comp && comp.id) {
      const match = HARDWARE_CATALOG.find((item) => item.id === comp.id);
      if (match) {
        setFocusedTarget(match);
      }
    }
  };

  const handleSelectSearchItem = (item) => {
    setFocusedTarget(item);
    setShowElectronics(true);
    setSearchQuery(item.name);
    setIsSearching(false);
    const simulatedData = {
      id: item.id,
      name: item.name,
      category: item.category,
      description: `Hardware component ${item.name} located in the physical prototype.`,
      specs: [
        { label: 'Category', value: item.category },
        { label: 'Hardware ID', value: item.id },
        { label: 'Diagnostic Status', value: 'Online & Monitored' },
      ],
      status: 'Active',
      statusColor: 'text-emerald-600',
    };
    setSelectedComponent(simulatedData);
  };

  const filteredHardware = HARDWARE_CATALOG.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] lg:h-[640px] rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100 select-none"
    >
      {/* Search Bar Overlay with Auto-Framing */}
      <div className="absolute top-4 right-4 z-20 w-64 sm:w-80">
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/95 rounded-xl shadow-md border border-slate-200 text-xs backdrop-blur-md">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search 35+ IoT components..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
              }}
              onFocus={() => setIsSearching(true)}
              className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          {isSearching && searchQuery.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 text-xs py-1 z-30">
              {filteredHardware.length === 0 ? (
                <div className="p-3 text-slate-400 text-center">No components found</div>
              ) : (
                filteredHardware.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSearchItem(item)}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <span className="text-[10px] text-slate-400">{item.category}</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating 3D HUD (Top-Left) with Live Camera & Hand Gesture Status Indicators */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto flex flex-col gap-2">
        <div className="glass-card rounded-xl px-4 py-3 shadow-md border border-slate-200/90 text-xs backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  simulationRunning
                    ? simulationPaused
                      ? 'bg-amber-500'
                      : 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <span className="font-bold tracking-wide uppercase text-[11px] text-slate-700">
                {simulationRunning
                  ? simulationPaused
                    ? 'TRACKING PAUSED'
                    : `${trackingMode} DIGITAL TWIN ACTIVE`
                  : 'SYSTEM STANDBY'}
              </span>
            </div>

            {/* Clear Camera Control & Hand Tracking ON/OFF Status Indicator Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-slate-200/80 shadow-2xs">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isWebcamActive
                    ? 'bg-purple-500 animate-ping'
                    : isCameraControlEnabled
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <span
                className={`text-[10px] font-bold ${
                  isWebcamActive
                    ? 'text-purple-700'
                    : isCameraControlEnabled
                    ? 'text-emerald-600'
                    : 'text-slate-500'
                }`}
              >
                {isWebcamActive ? 'Hand AI: LIVE' : isCameraControlEnabled ? 'Camera: ON' : 'Camera: OFF'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="text-slate-400">Azimuth:</span>{' '}
              <span className="font-semibold text-slate-800">
                {azimuth >= 0 ? `+${azimuth.toFixed(1)}°` : `${azimuth.toFixed(1)}°`}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Elevation:</span>{' '}
              <span className="font-semibold text-slate-800">
                {elevation >= 0 ? `+${elevation.toFixed(1)}°` : `${elevation.toFixed(1)}°`}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Efficiency:</span>{' '}
              <span className="font-semibold text-emerald-600">{trackingEfficiency}%</span>
            </div>
            <div>
              <span className="text-slate-400">Power:</span>{' '}
              <span className="font-semibold text-indigo-600">{power} W</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Category Filter Chips (Top-Center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-1 p-1 bg-white/90 rounded-xl shadow-md border border-slate-200 text-[11px] font-semibold backdrop-blur-md">
        {['ALL', 'SENSORS', 'CONTROLLERS', 'MOTORS', 'POWER', 'DISPLAY', 'MECHANICAL'].map((cat) => (
          <button
            key={cat}
            onClick={() => setHardwareFilter(cat)}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              hardwareFilter === cat
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Three.js Canvas */}
      <Canvas
        shadows
        camera={{ position: [6.8, 4.5, 7.2], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <CameraController
          preset={cameraPreset}
          focusedTarget={focusedTarget}
          onPresetHandled={() => {
            setCameraPreset(null);
            setFocusedTarget(null);
          }}
          cameraAction={cameraAction}
          isCameraControlEnabled={isCameraControlEnabled}
          isAutoRotating={isAutoRotating}
          handStateRef={handStateRef}
          isHandMode={isHandMode && isWebcamActive}
          onSelectComponent={handleSelectComponentFromScene}
          onTriggerExploded={() => setIsExplodedView(!isExplodedView)}
          onTriggerTurntable={() => setIsAutoRotating(!isAutoRotating)}
        />
        <Environment />
        <SunSystem />
        <TrackerMechanism onSelectComponent={handleSelectComponentFromScene} />
      </Canvas>

      {/* Live Webcam Hand Gesture HUD Overlay */}
      <HandGestureWebcamPanel
        isActive={isWebcamActive}
        onStopCamera={() => setIsWebcamActive(false)}
        handStateRef={handStateRef}
        isHandMode={isHandMode}
        setIsHandMode={setIsHandMode}
        isCameraControlOpen={isCameraControlOpen}
      />

      {/* Dedicated Manual Camera Control Unit (CCU) Panel */}
      <CameraControlUnit
        isOpen={isCameraControlOpen}
        onClose={() => setIsCameraControlOpen(false)}
        isEnabled={isCameraControlEnabled}
        onToggleEnabled={() => setIsCameraControlEnabled(!isCameraControlEnabled)}
        onAction={dispatchCameraAction}
        isAutoRotating={isAutoRotating}
        onToggleAutoRotate={() => setIsAutoRotating(!isAutoRotating)}
      />

      {/* Bottom Floating Control Bar with Camera Control & Live Webcam Hand Gesture Buttons */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-1 p-1.5 glass-card rounded-xl shadow-lg border border-slate-200/90 text-xs backdrop-blur-md max-w-[95%]">
        {/* Live Webcam Hand Gesture 3D Control Button */}
        <button
          onClick={() => setIsWebcamActive(!isWebcamActive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-xs ${
            isWebcamActive
              ? 'bg-purple-600 text-white shadow-purple-600/30 ring-2 ring-purple-400/50'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
          }`}
          title="Toggle Live Webcam AI Hand Gesture 3D Control"
        >
          <Hand className="w-3.5 h-3.5" />
          <span>{isWebcamActive ? 'Hand AI Active' : 'Hand Gesture 3D'}</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isWebcamActive ? 'bg-emerald-400 animate-ping' : 'bg-purple-400'
            }`}
          />
        </button>

        {/* Dedicated "Camera Control" Button */}
        <button
          onClick={() => setIsCameraControlOpen(!isCameraControlOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-xs ${
            isCameraControlOpen
              ? 'bg-indigo-600 text-white shadow-indigo-600/30'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80'
          }`}
          title="Open interactive Camera Control Unit (Zoom, Orbit, Pan, Reset)"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera Controls</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isCameraControlEnabled ? 'bg-emerald-400' : 'bg-slate-400'
            }`}
          />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* Quick View Presets */}
        <button
          onClick={() => {
            setCameraPreset('FULL SYSTEM');
            setFocusedTarget(null);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-[11px] cursor-pointer"
          title="Full System Overview (Zoom Out)"
        >
          <RotateCcw className="w-3 h-3 text-indigo-600" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => {
            setCameraPreset('SOLAR PANEL');
            setFocusedTarget(null);
          }}
          className="px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-[11px] cursor-pointer"
          title="Zoom to 5-Panel Radial Sunflower Array"
        >
          5-Panel Array
        </button>

        <button
          onClick={() => {
            setCameraPreset('ELECTRONICS');
            setFocusedTarget(null);
          }}
          className="px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-[11px] cursor-pointer"
          title="Zoom to IoT Equipment Workstation Beside Panel"
        >
          IoT Workstation
        </button>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* Exploded View Toggle */}
        <button
          onClick={() => setIsExplodedView(!isExplodedView)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
            isExplodedView ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          title="Separate assemblies for internal engineering inspection"
        >
          <Split className="w-3.5 h-3.5" />
          <span>{isExplodedView ? 'NORMAL' : 'EXPLODED'}</span>
        </button>

        {/* Data & Power Flow Particles */}
        <button
          onClick={() => setShowDataFlow(!showDataFlow)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
            showDataFlow ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Animate real-time data packets along sensor buses"
        >
          <Activity className="w-3 h-3 text-sky-600" />
          <span>Data Flow</span>
        </button>

        <button
          onClick={() => setShowPowerFlow(!showPowerFlow)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
            showPowerFlow ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Animate electrical energy flow from array to battery"
        >
          <Zap className="w-3 h-3 text-amber-600" />
          <span>Power Flow</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* Translucent Enclosure Toggle */}
        <button
          onClick={() => setShowElectronics(!showElectronics)}
          className={`px-2.5 py-1.5 rounded-lg font-medium text-[11px] cursor-pointer ${
            showElectronics ? 'text-purple-700 bg-purple-50 font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Translucent
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Component Click Popover / Inspector */}
      <ComponentInspector onZoomOut={() => setCameraPreset('FULL SYSTEM')} />
    </div>
  );
};
