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
 * Classify hand gestures from 21 MediaPipe landmarks
 */
export function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: 'NONE', confidence: 0, label: 'NO HAND', symbol: '✋' };
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
  const indexMcp = landmarks[5];
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

  // 1. PINCH / ZOOM (🤏 ZOOM)
  // Generous pinch threshold: thumb & index close together, ring & pinky not both fully extended
  const isPinchShape = pinchDist < 0.15 && (!ringExtended || !pinkyExtended);
  const isTightPinch = pinchDist < 0.085;

  if (isPinchShape || isTightPinch) {
    return {
      gesture: 'ZOOM',
      symbol: '🤏',
      label: 'PINCH / ZOOM',
      actionText: 'ZOOM CAMERA',
      pinchDist,
      handScale,
      center: {
        x: (thumbTip.x + indexTip.x) / 2,
        y: (thumbTip.y + indexTip.y) / 2,
      },
    };
  }

  // 2. CLOSED FIST (✊ CENTER CAMERA)
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
    return {
      gesture: 'CENTER',
      symbol: '✊',
      label: 'CLOSED FIST',
      actionText: 'CENTER CAMERA',
      handScale,
      center: wrist,
    };
  }

  // 3. ONE FINGER POINTING (☝️ SELECT COMPONENT)
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return {
      gesture: 'SELECT',
      symbol: '☝️',
      label: 'POINTING / SELECT',
      actionText: 'SELECT COMPONENT',
      handScale,
      pointer: {
        x: indexTip.x,
        y: indexTip.y,
      },
    };
  }

  // 4. TWO FINGERS (✌️ PAN CAMERA)
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return {
      gesture: 'PAN',
      symbol: '✌️',
      label: 'TWO FINGERS / PAN',
      actionText: 'PAN CAMERA',
      handScale,
      center: {
        x: (indexTip.x + middleTip.x) / 2,
        y: (indexTip.y + middleTip.y) / 2,
      },
    };
  }

  // 5. THUMBS UP (👍 RESET / OVERVIEW)
  if (
    thumbTip.y < thumbMcp.y &&
    !indexExtended &&
    !middleExtended &&
    !ringExtended &&
    !pinkyExtended
  ) {
    return {
      gesture: 'OVERVIEW',
      symbol: '👍',
      label: 'THUMBS UP',
      actionText: 'SYSTEM OVERVIEW',
      handScale,
      center: thumbTip,
    };
  }

  // 6. SHAKA / HANG LOOSE (🤙 EXPLODED VIEW)
  if (thumbExtended && pinkyExtended && !indexExtended && !middleExtended && !ringExtended) {
    return {
      gesture: 'EXPLODED',
      symbol: '🤙',
      label: 'SHAKA / EXPLODE',
      actionText: 'TOGGLE EXPLODED VIEW',
      handScale,
      center: wrist,
    };
  }

  // 7. ROCK / TURNTABLE (🤟 TURNTABLE 360°)
  if (thumbExtended && indexExtended && pinkyExtended && !middleExtended && !ringExtended) {
    return {
      gesture: 'TURNTABLE',
      symbol: '🤟',
      label: 'ROCK / 360°',
      actionText: 'TURNTABLE ROTATION',
      handScale,
      center: wrist,
    };
  }

  // 8. OPEN PALM (✋ ROTATE CAMERA)
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return {
      gesture: 'ROTATE',
      symbol: '✋',
      label: 'OPEN PALM / ROTATE',
      actionText: 'ROTATE MODEL',
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
    handScale,
    center: landmarks[9],
  };
}

/**
 * Draw hand landmarks and bone links onto an HTML5 Canvas
 */
export function drawHandLandmarks(ctx, landmarks, width, height) {
  if (!ctx || !landmarks) return;

  ctx.clearRect(0, 0, width, height);

  // 1. Draw Skeleton Lines
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
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

    ctx.beginPath();
    ctx.arc(x, y, idx === 4 || idx === 8 || idx === 12 ? 4.5 : 3.0, 0, Math.PI * 2);
    ctx.fillStyle = idx === 8 ? '#ef4444' : idx === 4 ? '#f59e0b' : '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}
