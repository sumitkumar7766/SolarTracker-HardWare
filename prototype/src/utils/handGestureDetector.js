import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// 21 Landmark Connections for Hand Skeleton
export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];

let landmarkerInstance = null;
let isInitializing = false;

/**
 * Initialize MediaPipe HandLandmarker with local files and CDN fallback
 */
export async function getHandLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return landmarkerInstance;
  }

  isInitializing = true;
  try {
    let vision = null;
    try {
      vision = await FilesetResolver.forVisionTasks('/wasm');
    } catch {
      vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
    }

    try {
      landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch {
      landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }

    return landmarkerInstance;
  } finally {
    isInitializing = false;
  }
}

/**
 * Euclidean distance helper
 */
function dist(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if hand is near webcam frame boundary where tracking degrades
 */
export function isHandNearEdge(landmarks, margin = 0.045) {
  if (!landmarks || landmarks.length < 21) return true;
  const criticalIndices = [0, 4, 8, 9, 12, 16, 20];
  for (const idx of criticalIndices) {
    const pt = landmarks[idx];
    if (pt) {
      if (pt.x < margin || pt.x > 1 - margin || pt.y < margin || pt.y > 1 - margin) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Classify hand gestures from 21 MediaPipe landmarks
 * Features distinct symbols for Zoom In (🔍⁺), Zoom Out (🔍⁻), and Stop (🛑)
 */
export function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: 'NONE',
      confidence: 0,
      label: 'OUT OF CAMERA',
      actionText: '3D MODEL STOPPED',
      symbol: '🛑',
      badgeColor: 'border-red-500/40 text-red-400 bg-red-950/40',
    };
  }

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];

  // Hand scale (size of hand in video frame, proportional to depth/distance from camera)
  const handScale = dist(wrist, middleMcp);

  // Key landmark positions
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];

  // Check finger extension relative to wrist
  const indexExtended = dist(indexTip, wrist) > dist(indexPip, wrist) * 1.15;
  const middleExtended = dist(middleTip, wrist) > dist(middlePip, wrist) * 1.15;
  const ringExtended = dist(ringTip, wrist) > dist(ringPip, wrist) * 1.15;
  const pinkyExtended = dist(pinkyTip, wrist) > dist(pinkyPip, wrist) * 1.15;

  // Thumb extended if far from pinky base
  const thumbExtended = dist(thumbTip, landmarks[17]) > dist(thumbMcp, landmarks[17]) * 1.2;

  // Pinch distance (thumb tip to index tip)
  const pinchDist = dist(thumbTip, indexTip);

  // 1. 🛑 STOP / FREEZE 3D MODEL (Closed Fist)
  // When all fingers are folded into fist, immediately stop & freeze the 3D model
  const isFist = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended;
  const isFistAlternate = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended && (dist(thumbTip, indexPip) < 0.12);
  if (isFist || isFistAlternate) {
    return {
      gesture: 'STOP',
      symbol: '🛑',
      label: 'CLOSED FIST / HOLD',
      actionText: 'STOP 3D MODEL (FROZEN)',
      badgeColor: 'border-red-500/50 text-red-400 bg-red-950/60 shadow-red-500/20',
      handScale,
      center: wrist,
    };
  }

  // 2. 🤏 ZOOM IN (Tight Pinch: Thumb & Index tips touching/close)
  // Fingers pinched tight together, other fingers folded or relaxed
  const isTightPinch = pinchDist < 0.082 && (!ringExtended || !pinkyExtended);
  if (isTightPinch) {
    return {
      gesture: 'ZOOM_IN',
      symbol: '🤏',
      label: 'TIGHT PINCH / MOVE IN',
      actionText: 'ZOOM IN (+)',
      badgeColor: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/60 shadow-cyan-500/20',
      pinchDist,
      handScale,
      center: {
        x: (thumbTip.x + indexTip.x) / 2,
        y: (thumbTip.y + indexTip.y) / 2,
      },
    };
  }

  // 3. 👐 ZOOM OUT (Open Pinch / L-Shape Spread: Thumb & Index apart, middle/ring/pinky folded)
  const isOpenPinch =
    pinchDist >= 0.098 &&
    pinchDist <= 0.28 &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended;
  if (isOpenPinch) {
    return {
      gesture: 'ZOOM_OUT',
      symbol: '👐',
      label: 'OPEN PINCH / PULL BACK',
      actionText: 'ZOOM OUT (-)',
      badgeColor: 'border-blue-500/50 text-blue-300 bg-blue-950/60 shadow-blue-500/20',
      pinchDist,
      handScale,
      center: {
        x: (thumbTip.x + indexTip.x) / 2,
        y: (thumbTip.y + indexTip.y) / 2,
      },
    };
  }

  // 4. 🎯 ONE FINGER POINTING (☝️ INSPECT / SELECT COMPONENT)
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return {
      gesture: 'SELECT',
      symbol: '🎯',
      label: 'POINTING / SELECT',
      actionText: 'INSPECT COMPONENT',
      badgeColor: 'border-amber-500/50 text-amber-300 bg-amber-950/60 shadow-amber-500/20',
      handScale,
      pointer: {
        x: indexTip.x,
        y: indexTip.y,
      },
    };
  }

  // 5. ↔️ TWO FINGERS (✌️ PAN CAMERA)
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return {
      gesture: 'PAN',
      symbol: '↔️',
      label: 'TWO FINGERS / PAN',
      actionText: 'PAN CAMERA',
      badgeColor: 'border-indigo-500/50 text-indigo-300 bg-indigo-950/60 shadow-indigo-500/20',
      handScale,
      center: {
        x: (indexTip.x + middleTip.x) / 2,
        y: (indexTip.y + middleTip.y) / 2,
      },
    };
  }

  // 6. 🏠 THUMBS UP (👍 RESET / OVERVIEW)
  if (
    thumbTip.y < thumbMcp.y &&
    !indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended
  ) {
    return {
      gesture: 'OVERVIEW',
      symbol: '🏠',
      label: 'THUMBS UP / HOME',
      actionText: 'SYSTEM OVERVIEW',
      badgeColor: 'border-purple-500/50 text-purple-300 bg-purple-950/60 shadow-purple-500/20',
      handScale,
      center: thumbTip,
    };
  }

  // 7. 💥 SHAKA / HANG LOOSE (🤙 EXPLODED VIEW)
  if (thumbExtended && pinkyExtended && !indexExtended && !middleExtended && !ringExtended) {
    return {
      gesture: 'EXPLODED',
      symbol: '💥',
      label: 'SHAKA / EXPLODED',
      actionText: 'TOGGLE EXPLODED VIEW',
      badgeColor: 'border-orange-500/50 text-orange-300 bg-orange-950/60 shadow-orange-500/20',
      handScale,
      center: wrist,
    };
  }

  // 8. 💫 ROCK / 360° (🤟 TURNTABLE 360°)
  if (thumbExtended && indexExtended && pinkyExtended && !middleExtended && !ringExtended) {
    return {
      gesture: 'TURNTABLE',
      symbol: '💫',
      label: 'ROCK / 360°',
      actionText: 'TURNTABLE ROTATION',
      badgeColor: 'border-pink-500/50 text-pink-300 bg-pink-950/60 shadow-pink-500/20',
      handScale,
      center: wrist,
    };
  }

  // 9. 🔄 OPEN PALM (✋ ROTATE CAMERA)
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return {
      gesture: 'ROTATE',
      symbol: '🔄',
      label: 'OPEN PALM / ROTATE',
      actionText: 'ROTATE 3D MODEL',
      badgeColor: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/60 shadow-emerald-500/20',
      handScale,
      center: landmarks[9], // middle finger MCP represents palm center
    };
  }

  // Default / Tracking
  return {
    gesture: 'TRACKING',
    symbol: '🖐️',
    label: 'HAND DETECTED',
    actionText: 'READY FOR GESTURE',
    badgeColor: 'border-slate-500/40 text-slate-300 bg-slate-900/60',
    handScale,
    center: landmarks[9],
  };
}

/**
 * Draw hand landmarks and bone links onto an HTML5 Canvas with gesture-responsive styling
 */
export function drawHandLandmarks(ctx, landmarks, width, height, gesture = 'NONE') {
  if (!ctx || !landmarks) return;

  ctx.clearRect(0, 0, width, height);

  // Determine gesture color palette
  let strokeColor = '#38bdf8'; // default cyan-sky
  let dotColor = '#22c55e'; // default green

  switch (gesture) {
    case 'STOP':
      strokeColor = '#ef4444'; // Red for Stop
      dotColor = '#f87171';
      break;
    case 'ZOOM_IN':
      strokeColor = '#06b6d4'; // Bright Cyan for Zoom In
      dotColor = '#67e8f9';
      break;
    case 'ZOOM_OUT':
      strokeColor = '#3b82f6'; // Bright Blue for Zoom Out
      dotColor = '#93c5fd';
      break;
    case 'ROTATE':
      strokeColor = '#10b981'; // Emerald for Rotate
      dotColor = '#34d399';
      break;
    case 'PAN':
      strokeColor = '#818cf8'; // Indigo for Pan
      dotColor = '#a5b4fc';
      break;
    case 'SELECT':
      strokeColor = '#f59e0b'; // Amber for Point
      dotColor = '#fbbf24';
      break;
    case 'OVERVIEW':
      strokeColor = '#c084fc'; // Purple for Overview
      dotColor = '#e9d5ff';
      break;
    default:
      strokeColor = '#38bdf8';
      dotColor = '#22c55e';
      break;
  }

  // 1. Draw Skeleton Lines
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = gesture === 'STOP' ? 3.5 : 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];
    if (p1 && p2) {
      ctx.beginPath();
      // Mirror horizontally for natural webcam user intuition
      ctx.moveTo((1 - p1.x) * width, p1.y * height);
      ctx.lineTo((1 - p2.x) * width, p2.y * height);
      ctx.stroke();
    }
  });

  // 2. Draw Landmark Dots
  landmarks.forEach((p, idx) => {
    const x = (1 - p.x) * width;
    const y = p.y * height;

    const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;

    ctx.beginPath();
    ctx.arc(x, y, isTip ? 4.5 : 2.8, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#ffffff' : dotColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}
