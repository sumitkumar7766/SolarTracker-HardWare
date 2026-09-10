import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const GestureCameraController = ({
  controlsRef,
  handStateRef,
  isHandMode,
  onSelectComponent,
  onTriggerExploded,
  onTriggerTurntable,
  onResetView,
}) => {
  const { camera, scene, raycaster } = useThree();

  // Damping velocity state for smooth camera inertia
  const velocity = useRef({
    theta: 0,
    phi: 0,
    zoom: 0,
    panX: 0,
    panY: 0,
  });

  const lastActionTime = useRef(0);
  const pointerCoord = useRef(new THREE.Vector2());

  useFrame((_, delta) => {
    if (!isHandMode || !controlsRef.current) return;
    const controls = controlsRef.current;
    const hand = handStateRef.current;

    if (!hand || !hand.detected) {
      // Apply smooth deceleration inertia when hand drops
      velocity.current.theta *= 0.88;
      velocity.current.phi *= 0.88;
      velocity.current.zoom *= 0.85;
      velocity.current.panX *= 0.85;
      velocity.current.panY *= 0.85;
    } else {
      const g = hand.gesture;
      const now = Date.now();

      // 1. ✋ ROTATE (Open Palm)
      if (g === 'ROTATE' && hand.delta) {
        // Sensitivity scaling
        const rotSpeed = 3.8;
        velocity.current.theta = -hand.delta.x * rotSpeed;
        velocity.current.phi = -hand.delta.y * rotSpeed;
      }

      // 2. 🤏 ZOOM (Pinch)
      if (g === 'ZOOM' && hand.pinchDelta !== undefined) {
        const zoomSpeed = 7.5;
        velocity.current.zoom = -hand.pinchDelta * zoomSpeed;
      }

      // 3. ✌️ PAN (Two Fingers)
      if (g === 'PAN' && hand.delta) {
        const panSpeed = 4.2;
        velocity.current.panX = -hand.delta.x * panSpeed;
        velocity.current.panY = hand.delta.y * panSpeed;
      }

      // 4. ✊ CENTER (Closed Fist) - Smooth reset to full view
      if (g === 'CENTER' && now - lastActionTime.current > 1200) {
        lastActionTime.current = now;
        if (onResetView) onResetView();
      }

      // 5. 👍 OVERVIEW (Thumbs Up)
      if (g === 'OVERVIEW' && now - lastActionTime.current > 1200) {
        lastActionTime.current = now;
        if (onResetView) onResetView();
      }

      // 6. 🤙 EXPLODED VIEW (Shaka / Hang Loose)
      if (g === 'EXPLODED' && now - lastActionTime.current > 1500) {
        lastActionTime.current = now;
        if (onTriggerExploded) onTriggerExploded();
      }

      // 7. 🤟 TURNTABLE 360° (Rock Sign)
      if (g === 'TURNTABLE' && now - lastActionTime.current > 1500) {
        lastActionTime.current = now;
        if (onTriggerTurntable) onTriggerTurntable();
      }

      // 8. ☝️ SELECT (One Finger Pointing Raycast)
      if (g === 'SELECT' && hand.pointer && now - lastActionTime.current > 900) {
        lastActionTime.current = now;
        // Map pointer [0, 1] to normalized device coordinates [-1, 1] (mirrored for webcam intuition)
        const ndcX = ((1 - hand.pointer.x) * 2) - 1;
        const ndcY = -(hand.pointer.y * 2) + 1;
        pointerCoord.current.set(ndcX, ndcY);

        raycaster.setFromCamera(pointerCoord.current, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
          // Find first meaningful interactive component in ancestry
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

    // --- Apply Damped Kinematics to Camera & Controls ---
    const target = controls.target;

    // A. Apply Orbit Yaw & Pitch
    if (Math.abs(velocity.current.theta) > 0.0001 || Math.abs(velocity.current.phi) > 0.0001) {
      const offset = new THREE.Vector3().subVectors(camera.position, target);
      const spherical = new THREE.Spherical().setFromVector3(offset);

      spherical.theta += velocity.current.theta * delta * 8;
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi + velocity.current.phi * delta * 8,
        0.08,
        Math.PI / 2 - 0.02
      );

      offset.setFromSpherical(spherical);
      camera.position.copy(target).add(offset);
      controls.update();

      // Damping friction
      velocity.current.theta *= 0.88;
      velocity.current.phi *= 0.88;
    }

    // B. Apply Zoom
    if (Math.abs(velocity.current.zoom) > 0.0001) {
      const dir = new THREE.Vector3().subVectors(camera.position, target).normalize();
      const zoomAmount = velocity.current.zoom * delta * 12;
      const currentDist = camera.position.distanceTo(target);

      // Clamp distance between 1.2 and 28
      if ((zoomAmount > 0 && currentDist < 28) || (zoomAmount < 0 && currentDist > 1.2)) {
        camera.position.addScaledVector(dir, zoomAmount);
        controls.update();
      }
      velocity.current.zoom *= 0.82;
    }

    // C. Apply Pan
    if (Math.abs(velocity.current.panX) > 0.0001 || Math.abs(velocity.current.panY) > 0.0001) {
      const right = new THREE.Vector3();
      camera.matrix.extractBasis(right, new THREE.Vector3(), new THREE.Vector3());
      right.y = 0;
      right.normalize().multiplyScalar(velocity.current.panX * delta * 10);

      const up = new THREE.Vector3(0, velocity.current.panY * delta * 10, 0);

      camera.position.add(right).add(up);
      target.add(right).add(up);
      controls.update();

      velocity.current.panX *= 0.82;
      velocity.current.panY *= 0.82;
    }
  });

  return null;
};
