import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  VideoOff,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Move,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';
import {
  getHandLandmarker,
  classifyGesture,
  drawHandLandmarks,
} from '../../utils/handGestureDetector';

export const HandGestureWebcamPanel = ({
  isActive,
  onStopCamera,
  handStateRef,
  isHandMode,
  setIsHandMode,
}) => {
  const [hasPermission, setHasPermission] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [activeGesture, setActiveGesture] = useState({
    gesture: 'NONE',
    symbol: '✋',
    label: 'WAITING FOR HAND',
    actionText: 'SHOW HAND TO CAMERA',
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
        setHasPermission(true);
      } catch (err) {
        console.error('Webcam access error:', err);
        setHasPermission(false);
        setErrorMessage('Camera control unavailable. Use mouse/touch controls instead.');
      }
    }

    setupCameraAndModel();

    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [isActive]);

  const cleanup = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (handStateRef) {
      handStateRef.current = { detected: false, gesture: 'NONE' };
    }
    prevCenter.current = null;
    prevPinch.current = null;
    prevHandScale.current = null;
  };

  // Continuous Detection Loop
  const startDetectionLoop = () => {
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
            const gestureInfo = classifyGesture(landmarks);

            // Compute delta motion
            let delta = { x: 0, y: 0 };
            let zoomDelta = 0;

            // Center motion tracking (for orbit / pan)
            if (gestureInfo.center) {
              if (prevCenter.current) {
                delta = {
                  x: gestureInfo.center.x - prevCenter.current.x,
                  y: gestureInfo.center.y - prevCenter.current.y,
                };
              }
            }

            // Dedicated Zoom Computation: Multi-factor (Finger pinch + Hand scale + Vertical motion)
            if (gestureInfo.gesture === 'ZOOM') {
              let factorCount = 0;

              // Factor A: Finger separation change
              // Squeezing fingers closer -> Zoom IN (+), Spreading fingers apart -> Zoom OUT (-)
              if (gestureInfo.pinchDist !== undefined && prevPinch.current !== null) {
                const fingerDiff = prevPinch.current - gestureInfo.pinchDist;
                if (Math.abs(fingerDiff) > 0.001) {
                  zoomDelta += fingerDiff * 45.0;
                  factorCount++;
                }
              }

              // Factor B: Hand depth/scale change
              // Hand closer to webcam (handScale increases) -> Zoom IN (+), Hand pulled back -> Zoom OUT (-)
              if (gestureInfo.handScale !== undefined && prevHandScale.current !== null) {
                const scaleDiff = gestureInfo.handScale - prevHandScale.current;
                if (Math.abs(scaleDiff) > 0.0015) {
                  zoomDelta += scaleDiff * 55.0;
                  factorCount++;
                }
              }

              // Factor C: Vertical gesture movement while in pinch
              // Moving pinched hand up -> Zoom IN (+), Moving down -> Zoom OUT (-)
              if (prevCenter.current && gestureInfo.center) {
                const yDiff = prevCenter.current.y - gestureInfo.center.y;
                if (Math.abs(yDiff) > 0.002) {
                  zoomDelta += yDiff * 25.0;
                  factorCount++;
                }
              }

              // Update dynamic UI status for Zoom
              if (zoomDelta > 0.08) {
                gestureInfo.actionText = 'ZOOMING IN (+)';
              } else if (zoomDelta < -0.08) {
                gestureInfo.actionText = 'ZOOMING OUT (-)';
              } else {
                gestureInfo.actionText = '🤏 ZOOM (Move Hand / Fingers)';
              }
            }

            // Save history for next frame
            if (gestureInfo.center) {
              prevCenter.current = gestureInfo.center;
            } else {
              prevCenter.current = null;
            }

            if (gestureInfo.pinchDist !== undefined) {
              prevPinch.current = gestureInfo.pinchDist;
            } else {
              prevPinch.current = null;
            }

            if (gestureInfo.handScale !== undefined) {
              prevHandScale.current = gestureInfo.handScale;
            } else {
              prevHandScale.current = null;
            }

            // Update shared ref for 3D Camera Controller
            if (handStateRef) {
              handStateRef.current = {
                detected: true,
                gesture: gestureInfo.gesture,
                delta,
                zoomDelta, // Direct signed zoom drive: positive = zoom in, negative = zoom out
                pointer: gestureInfo.pointer,
                landmarks,
              };
            }

            // Update UI state
            setActiveGesture(gestureInfo);

            // Draw hand landmarks if enabled
            if (showLandmarks && canvas) {
              const ctx = canvas.getContext('2d');
              drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
            } else if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          } else {
            // No hand visible
            if (handStateRef) {
              handStateRef.current = { detected: false, gesture: 'NONE' };
            }
            prevCenter.current = null;
            prevPinch.current = null;
            prevHandScale.current = null;
            setActiveGesture({
              gesture: 'NONE',
              symbol: '✋',
              label: 'SEARCHING FOR HAND',
              actionText: 'HOLD HAND IN FRONT OF CAMERA',
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
  };

  if (!isActive) return null;

  return (
    <>
      {/* 1. Center Screen Visual Hand Symbol Overlay */}
      {isHandMode && activeGesture.gesture !== 'NONE' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center justify-center animate-in fade-in duration-150">
          <div className="flex flex-col items-center gap-1.5 px-6 py-4 rounded-3xl bg-slate-900/85 text-white shadow-2xl backdrop-blur-xl border border-white/20">
            <span className="text-4xl filter drop-shadow-md select-none animate-bounce">
              {activeGesture.symbol}
            </span>
            <div className="font-extrabold text-sm tracking-wider uppercase text-emerald-300 select-none">
              {activeGesture.actionText}
            </div>
            <div className="text-[10px] text-slate-300 font-mono tracking-wide">
              {activeGesture.label}
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
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Detected Gesture:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activeGesture.symbol}</span>
                  <div>
                    <div className="font-extrabold text-slate-800 text-xs">
                      {activeGesture.actionText}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
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
              <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span>✋ Open Palm</span>
                  <span className="font-semibold text-slate-700">Rotate</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🤏 Pinch</span>
                  <span className="font-semibold text-slate-700">Zoom In/Out</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>✌️ Two Fingers</span>
                  <span className="font-semibold text-slate-700">Pan</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>✊ Closed Fist</span>
                  <span className="font-semibold text-slate-700">Center Model</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>☝️ One Finger</span>
                  <span className="font-semibold text-slate-700">Select Item</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>👍 Thumbs Up</span>
                  <span className="font-semibold text-slate-700">Overview</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🤙 Shaka</span>
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
