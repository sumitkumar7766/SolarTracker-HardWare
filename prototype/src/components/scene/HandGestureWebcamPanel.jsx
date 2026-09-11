import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  VideoOff,
  Eye,
  EyeOff,
  AlertTriangle,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';
import {
  getHandLandmarker,
  classifyGesture,
  drawHandLandmarks,
  isHandNearEdge,
} from '../../utils/handGestureDetector';

export const HandGestureWebcamPanel = ({
  isActive,
  onStopCamera,
  handStateRef,
  isHandMode,
  setIsHandMode,
  isCameraControlOpen = false,
}) => {
  const [errorMessage, setErrorMessage] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [activeGesture, setActiveGesture] = useState({
    gesture: 'NONE',
    symbol: '🛑',
    label: 'WAITING FOR CAMERA',
    actionText: 'STARTING CAMERA...',
  });
  const [isMinimized, setIsMinimized] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastVideoTime = useRef(-1);

  // Previous frame tracking for delta calculations
  const prevCenter = useRef(null);
  const prevPinch = useRef(null);
  const prevHandScale = useRef(null);
  const smoothedDelta = useRef({ x: 0, y: 0 });
  const smoothedZoom = useRef(0);
  const gestureDebounce = useRef({ gesture: 'NONE', count: 0 });

  const cleanup = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (handStateRef) {
      handStateRef.current = {
        detected: false,
        isStopped: true,
        gesture: 'STOP',
        delta: { x: 0, y: 0 },
        zoomDelta: 0,
      };
    }
    prevCenter.current = null;
    prevPinch.current = null;
    prevHandScale.current = null;
    smoothedDelta.current = { x: 0, y: 0 };
    smoothedZoom.current = 0;
    gestureDebounce.current = { gesture: 'NONE', count: 0 };
  }, [handStateRef]);

  // Continuous Detection Loop with Low-Pass Filtering & Instant Edge Freeze
  const startDetectionLoop = useCallback(() => {
    const detect = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (video && video.readyState >= 2 && landmarker) {
        if (video.currentTime !== lastVideoTime.current) {
          lastVideoTime.current = video.currentTime;
          const timestamp = performance.now();

          const result = landmarker.detectForVideo(video, timestamp);

          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            const rawGestureInfo = classifyGesture(landmarks);
            const nearEdge = isHandNearEdge(landmarks, 0.05);

            // 1. Gesture Debouncing & Hysteresis
            let currentGesture = rawGestureInfo.gesture;
            if (currentGesture === 'STOP') {
              // Zero-latency immediate brake on Stop
              gestureDebounce.current = { gesture: 'STOP', count: 3 };
            } else {
              if (gestureDebounce.current.gesture === currentGesture) {
                gestureDebounce.current.count = Math.min(4, gestureDebounce.current.count + 1);
              } else {
                gestureDebounce.current = { gesture: currentGesture, count: 1 };
              }
            }

            const gestureInfo = { ...rawGestureInfo };

            // 2. 🛑 Handle STOP Gesture (Closed Fist) - Instant Hard Freeze
            if (gestureInfo.gesture === 'STOP') {
              smoothedDelta.current = { x: 0, y: 0 };
              smoothedZoom.current = 0;
              prevCenter.current = gestureInfo.center || null;
              prevPinch.current = gestureInfo.pinchDist || null;
              prevHandScale.current = gestureInfo.handScale || null;

              if (handStateRef) {
                handStateRef.current = {
                  detected: true,
                  isStopped: true,
                  gesture: 'STOP',
                  delta: { x: 0, y: 0 },
                  zoomDelta: 0,
                  landmarks,
                };
              }

              setActiveGesture(gestureInfo);

              if (showLandmarks && canvas) {
                const ctx = canvas.getContext('2d');
                drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height, 'STOP');
              } else if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }

              animationFrameId.current = requestAnimationFrame(detect);
              return;
            }

            // 3. Smooth Delta Computation for Orbit / Pan
            let delta = { x: 0, y: 0 };
            if (gestureInfo.center && prevCenter.current) {
              let dx = gestureInfo.center.x - prevCenter.current.x;
              let dy = gestureInfo.center.y - prevCenter.current.y;

              // Near-edge dampening to prevent sudden fling before leaving frame
              if (nearEdge) {
                dx *= 0.15;
                dy *= 0.15;
              }

              // Reject erratic teleport jumps
              if (Math.abs(dx) > 0.09) dx = 0;
              if (Math.abs(dy) > 0.09) dy = 0;

              // Deadzone to eliminate hand tremor / jitter
              const moveDist = Math.hypot(dx, dy);
              if (moveDist < 0.003) {
                dx = 0;
                dy = 0;
              }

              // Exponential Moving Average filter (alpha = 0.36)
              smoothedDelta.current.x = 0.36 * dx + 0.64 * smoothedDelta.current.x;
              smoothedDelta.current.y = 0.36 * dy + 0.64 * smoothedDelta.current.y;

              if (Math.hypot(smoothedDelta.current.x, smoothedDelta.current.y) > 0.0006) {
                delta = { ...smoothedDelta.current };
              }
            }

            // 4. Dedicated Zoom Computation (Zoom In vs Zoom Out)
            let zoomDelta = 0;
            if (gestureInfo.gesture === 'ZOOM_IN') {
              let targetZoom = 0.52; // Steady zoom in speed
              if (prevHandScale.current && gestureInfo.handScale) {
                const scaleDiff = gestureInfo.handScale - prevHandScale.current;
                if (scaleDiff > 0.001) targetZoom += scaleDiff * 25.0;
              }
              if (prevPinch.current && gestureInfo.pinchDist) {
                const pinchDiff = prevPinch.current - gestureInfo.pinchDist;
                if (pinchDiff > 0.001) targetZoom += pinchDiff * 22.0;
              }
              smoothedZoom.current = 0.38 * targetZoom + 0.62 * smoothedZoom.current;
              zoomDelta = smoothedZoom.current;
            } else if (gestureInfo.gesture === 'ZOOM_OUT') {
              let targetZoom = -0.52; // Steady zoom out speed
              if (prevHandScale.current && gestureInfo.handScale) {
                const scaleDiff = gestureInfo.handScale - prevHandScale.current;
                if (scaleDiff < -0.001) targetZoom += scaleDiff * 25.0;
              }
              if (prevPinch.current && gestureInfo.pinchDist) {
                const pinchDiff = prevPinch.current - gestureInfo.pinchDist;
                if (pinchDiff < -0.001) targetZoom += pinchDiff * 22.0;
              }
              smoothedZoom.current = 0.38 * targetZoom + 0.62 * smoothedZoom.current;
              zoomDelta = smoothedZoom.current;
            } else {
              smoothedZoom.current *= 0.4;
            }

            // Save history for next frame
            if (gestureInfo.center) prevCenter.current = gestureInfo.center;
            if (gestureInfo.pinchDist !== undefined) prevPinch.current = gestureInfo.pinchDist;
            if (gestureInfo.handScale !== undefined) prevHandScale.current = gestureInfo.handScale;

            // Update shared ref for 3D Camera Controller
            if (handStateRef) {
              handStateRef.current = {
                detected: true,
                isStopped: false,
                gesture: gestureInfo.gesture,
                delta,
                zoomDelta,
                pointer: gestureInfo.pointer,
                landmarks,
              };
            }

            setActiveGesture(gestureInfo);

            if (showLandmarks && canvas) {
              const ctx = canvas.getContext('2d');
              drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height, gestureInfo.gesture);
            } else if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          } else {
            // Hand is OUT OF CAMERA -> Freeze 3D model immediately at this exact position
            if (handStateRef) {
              handStateRef.current = {
                detected: false,
                isStopped: true,
                gesture: 'STOP',
                delta: { x: 0, y: 0 },
                zoomDelta: 0,
              };
            }

            prevCenter.current = null;
            prevPinch.current = null;
            prevHandScale.current = null;
            smoothedDelta.current = { x: 0, y: 0 };
            smoothedZoom.current = 0;
            gestureDebounce.current = { gesture: 'NONE', count: 0 };

            setActiveGesture({
              gesture: 'NONE',
              symbol: '🛑',
              label: 'OUT OF CAMERA',
              actionText: '3D MODEL STOPPED (LOCKED)',
              badgeColor: 'border-red-500/50 text-red-400 bg-red-950/80 shadow-red-500/30',
            });

            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(detect);
    };

    animationFrameId.current = requestAnimationFrame(detect);
  }, [handStateRef, showLandmarks]);

  // Initialize Webcam and MediaPipe HandLandmarker
  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    let isCancelled = false;

    async function setupCameraAndModel() {
      setIsModelLoading(true);
      setErrorMessage(null);

      // 1. Initialize MediaPipe Model
      try {
        const landmarker = await getHandLandmarker();
        if (isCancelled) return;
        landmarkerRef.current = landmarker;
        setIsModelLoading(false);
      } catch (err) {
        console.error('Failed to load hand landmarker model:', err);
        setErrorMessage('Failed to load hand tracking AI model. Check network connection.');
        setIsModelLoading(false);
        return;
      }

      // 2. Request Webcam Stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(() => {});
            startDetectionLoop();
          };
        }
      } catch (err) {
        console.error('Webcam access error:', err);
        setErrorMessage('Camera control unavailable. Use mouse/touch controls instead.');
      }
    }

    setupCameraAndModel();

    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [isActive, cleanup, startDetectionLoop]);

  if (!isActive) return null;

  return (
    <>
      {/* 1. Visual Hand Symbol Overlay Alert (Positioned Bottom-Right) */}
      {isHandMode && (
        <div
          className={`absolute ${
            isCameraControlOpen ? 'bottom-[390px]' : 'bottom-20'
          } right-4 pointer-events-none z-30 flex flex-col items-end animate-in fade-in duration-150`}
        >
          <div
            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-950/85 text-white shadow-2xl backdrop-blur-xl border transition-all duration-200 ${
              activeGesture.gesture === 'STOP' || activeGesture.gesture === 'NONE'
                ? 'border-red-500/50 shadow-red-500/20'
                : activeGesture.gesture === 'ZOOM_IN'
                ? 'border-cyan-500/50 shadow-cyan-500/20'
                : activeGesture.gesture === 'ZOOM_OUT'
                ? 'border-blue-500/50 shadow-blue-500/20'
                : activeGesture.gesture === 'ROTATE'
                ? 'border-emerald-500/50 shadow-emerald-500/20'
                : activeGesture.gesture === 'PAN'
                ? 'border-indigo-500/50 shadow-indigo-500/20'
                : 'border-white/20'
            }`}
          >
            <span
              className={`text-2xl filter drop-shadow-md select-none ${
                activeGesture.gesture === 'STOP' || activeGesture.gesture === 'NONE'
                  ? 'animate-pulse'
                  : 'animate-bounce'
              }`}
            >
              {activeGesture.symbol}
            </span>
            <div className="flex flex-col text-left">
              <div
                className={`font-extrabold text-xs tracking-wider uppercase select-none ${
                  activeGesture.gesture === 'STOP' || activeGesture.gesture === 'NONE'
                    ? 'text-red-400'
                    : activeGesture.gesture === 'ZOOM_IN'
                    ? 'text-cyan-300'
                    : activeGesture.gesture === 'ZOOM_OUT'
                    ? 'text-blue-300'
                    : activeGesture.gesture === 'ROTATE'
                    ? 'text-emerald-300'
                    : activeGesture.gesture === 'PAN'
                    ? 'text-indigo-300'
                    : activeGesture.gesture === 'SELECT'
                    ? 'text-amber-300'
                    : 'text-slate-200'
                }`}
              >
                {activeGesture.actionText}
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wide">
                {activeGesture.label}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Webcam Preview & Live Gesture Indicator Panel (Bottom-Left) */}
      <div className="absolute bottom-20 left-4 z-30 w-64 glass-card rounded-2xl overflow-hidden shadow-2xl border border-indigo-200/90 backdrop-blur-xl animate-in fade-in duration-200 select-none">
        {/* Header with Title & Status */}
        <div className="flex items-center justify-between px-3 py-2 bg-white/90 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-800 text-[11px]">
              CAMERA CONTROL
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
            <button
              onClick={onStopCamera}
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
              title="Stop Camera"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Fallback Banner if Camera Denied */}
        {errorMessage && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[11px]">Camera Unavailable</div>
              <p className="text-[10px] mt-0.5 text-amber-700">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {!isMinimized && (
          <>
            {/* Live Webcam & Canvas Landmark Preview */}
            <div className="relative w-full h-36 bg-slate-950 flex items-center justify-center overflow-hidden">
              {isModelLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 text-white text-xs gap-2">
                  <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-[11px] font-medium">Starting MediaPipe AI...</span>
                </div>
              )}

              {/* Video Element (mirrored) */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Landmark Canvas Overlay */}
              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Live Tracking Indicator Badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-[9px] font-mono text-white flex items-center gap-1 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE</span>
              </div>
            </div>

            {/* Gesture Status Card */}
            <div className="p-3 space-y-2 text-xs bg-white/70">
              <div
                className={`p-2 rounded-xl border transition-all ${
                  activeGesture.gesture === 'STOP' || activeGesture.gesture === 'NONE'
                    ? 'bg-red-50/80 border-red-200'
                    : activeGesture.gesture === 'ZOOM_IN'
                    ? 'bg-cyan-50/80 border-cyan-200'
                    : activeGesture.gesture === 'ZOOM_OUT'
                    ? 'bg-blue-50/80 border-blue-200'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Detected Gesture:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activeGesture.symbol}</span>
                  <div>
                    <div
                      className={`font-extrabold text-xs ${
                        activeGesture.gesture === 'STOP' || activeGesture.gesture === 'NONE'
                          ? 'text-red-700'
                          : activeGesture.gesture === 'ZOOM_IN'
                          ? 'text-cyan-700'
                          : activeGesture.gesture === 'ZOOM_OUT'
                          ? 'text-blue-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {activeGesture.actionText}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {activeGesture.label}
                    </div>
                  </div>
                </div>
              </div>

              {/* Camera Mode Switcher (Mouse vs Hand Gesture) */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  CAMERA MODE
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setIsHandMode(false)}
                    className={`py-1 rounded-md transition-all cursor-pointer ${
                      !isHandMode
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mouse
                  </button>
                  <button
                    onClick={() => setIsHandMode(true)}
                    className={`py-1 rounded-md transition-all cursor-pointer ${
                      isHandMode
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hand Gesture
                  </button>
                </div>
              </div>

              {/* Landmark Setting Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                <span className="text-slate-600 font-medium">Show Hand Tracking</span>
                <button
                  onClick={() => setShowLandmarks(!showLandmarks)}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    showLandmarks
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                  title={showLandmarks ? 'Hide Hand Skeleton' : 'Show Hand Skeleton'}
                >
                  {showLandmarks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Gesture Guide Cheatsheet */}
              <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Gesture Controls:</span>
                  <span className="text-[9px] text-emerald-600 font-normal">Smoothed AI</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1 rounded bg-red-50/50">
                  <span className="text-red-700 font-medium">🛑 Fist / Exit</span>
                  <span className="font-bold text-red-800">STOP 3D Model (Lock)</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1 rounded bg-cyan-50/50">
                  <span className="text-cyan-800 font-medium">🤏 Tight Pinch</span>
                  <span className="font-bold text-cyan-800">Zoom In (+)</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1 rounded bg-blue-50/50">
                  <span className="text-blue-800 font-medium">👐 Open Pinch</span>
                  <span className="font-bold text-blue-800">Zoom Out (-)</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span>🔄 Open Palm</span>
                  <span className="font-semibold text-slate-700">Rotate 3D Model</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span>↔️ Two Fingers</span>
                  <span className="font-semibold text-slate-700">Pan Camera</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span>🎯 One Finger</span>
                  <span className="font-semibold text-slate-700">Inspect Item</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span>🏠 Thumbs Up</span>
                  <span className="font-semibold text-slate-700">System Overview</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-1">
                  <span>💥 Shaka</span>
                  <span className="font-semibold text-slate-700">Exploded View</span>
                </div>
              </div>

              {/* Stop Camera Button */}
              <button
                onClick={onStopCamera}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors cursor-pointer mt-2"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>STOP CAMERA</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
