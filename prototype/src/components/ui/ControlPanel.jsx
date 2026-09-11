import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sun,
  BatteryCharging,
  Cpu,
  Zap,
  CheckCircle2,
  Gauge,
  Sparkles,
  CloudRain,
  Shield,
  ShieldAlert,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const ControlPanel = () => {
  const {
    simulationRunning,
    startTracking,
    stopTracking,
    emergencyStop,
    trackingMode,
    setTrackingMode,
    manualJog,
    threshold,
    setThreshold,
    isCalibrating,
    calibrationProgress,
    calibrateSensors,
    rawSunAzimuth,
    rawSunElevation,
    sunIntensity,
    rainState,
    setRainState,
    rpi5Status,
    esp32Status,
    esp32Connected,
    motorEnabled,
    systemStatusText,
    stopReason,
    motorAzimuthStatus,
    motorElevationStatus,
  } = useSimulation();

  return (
    <div className="space-y-4">
      {/* 1. Main Tracking Controls Card */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Tracking Controller
            </h2>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              systemStatusText === 'TRACKING'
                ? 'bg-emerald-100 text-emerald-800'
                : systemStatusText === 'TRACKING_LOCKED'
                ? 'bg-indigo-100 text-indigo-800'
                : systemStatusText === 'NO_SUN'
                ? 'bg-amber-100 text-amber-800'
                : systemStatusText === 'EMERGENCY_STOP'
                ? 'bg-red-100 text-red-800 font-extrabold'
                : systemStatusText === 'ESP32_DISCONNECTED'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {systemStatusText || 'STOPPED'}
          </span>
        </div>

        {stopReason && (
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-mono text-amber-800">
            {stopReason}
          </div>
        )}

        {/* Safety Mode Banner */}
        {!motorEnabled && (
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-800 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Safety Test Mode Active (MOTOR_ENABLED=false)</span>
          </div>
        )}

        {/* Primary Action Buttons: TRACK SUN & STOP */}
        <div className="grid grid-cols-2 gap-2">
          {!simulationRunning ? (
            <button
              onClick={startTracking}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              title="Start Autonomous AI Solar Tracking"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>TRACK SUN</span>
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.98] cursor-pointer bg-slate-800 hover:bg-slate-900 text-white"
              title="Halt Automatic Tracking"
            >
              <Pause className="w-4 h-4" />
              <span>STOP TRACKING</span>
            </button>
          )}

          {/* Emergency Stop Button */}
          <button
            onClick={emergencyStop}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-sm shadow-red-600/20 active:scale-[0.98] cursor-pointer"
            title="Immediately send STOP command to ESP32 motors"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>EMERGENCY STOP</span>
          </button>
        </div>

        {/* Tracking Mode Switcher */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="text-xs font-semibold text-slate-500 block mb-2">
            TRACKING MODE
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTrackingMode('AUTO')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                trackingMode === 'AUTO'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AUTO TRACKING
            </button>
            <button
              onClick={() => setTrackingMode('MANUAL')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                trackingMode === 'MANUAL'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MANUAL D-PAD
            </button>
          </div>
        </div>

        {/* Manual D-Pad Jog Controls */}
        <div className="mt-4 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-900">MANUAL JOG</span>
            <span className="text-[10px] font-medium text-indigo-600">
              {trackingMode === 'MANUAL' ? 'Step: ±1°' : 'LOCKED IN AUTO'}
            </span>
          </div>

          {trackingMode !== 'MANUAL' && (
            <div className="mb-2 p-1.5 rounded-lg bg-indigo-100/60 text-[10px] text-indigo-800 text-center font-medium">
              Switch mode to MANUAL to enable manual motor jog buttons.
            </div>
          )}

          <div className={`flex flex-col items-center justify-center gap-1.5 py-1 ${trackingMode !== 'MANUAL' ? 'opacity-40 pointer-events-none' : ''}`}>
            <button
              onClick={() => manualJog('elevation', 1)}
              disabled={trackingMode !== 'MANUAL'}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              title="Tilt Up (+Elevation)"
            >
              <ArrowUp className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => manualJog('azimuth', -1)}
                disabled={trackingMode !== 'MANUAL'}
                className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                title="Rotate Left (-Azimuth)"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 rounded-xl bg-indigo-100/50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                D-PAD
              </div>

              <button
                onClick={() => manualJog('azimuth', 1)}
                disabled={trackingMode !== 'MANUAL'}
                className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                title="Rotate Right (+Azimuth)"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => manualJog('elevation', -1)}
              disabled={trackingMode !== 'MANUAL'}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              title="Tilt Down (-Elevation)"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rain Drop Sensor Simulation Switcher */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-sky-500" />
              Rain Drop Mode:
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                rainState === 'NO RAIN'
                  ? 'bg-emerald-100 text-emerald-800'
                  : rainState === 'LIGHT RAIN'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {rainState}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
            {['NO RAIN', 'LIGHT RAIN', 'HEAVY RAIN'].map((mode) => (
              <button
                key={mode}
                onClick={() => setRainState(mode)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  rainState === mode
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.replace(' RAIN', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Deadband Threshold */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600">
              Angular Deadband (Tolerance):
            </span>
            <span className="font-mono font-bold text-xs text-indigo-600">
              ±1.0°
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Locked when |ΔAz| ≤ 1.0° & |ΔEl| ≤ 1.0°
          </p>
        </div>

        {/* Calibrate Sensors Button */}
        <div className="mt-4">
          <button
            onClick={calibrateSensors}
            disabled={isCalibrating}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
              isCalibrating
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {isCalibrating
                ? `Calibrating LDR Sensors (${calibrationProgress}%)...`
                : 'Calibrate Sensor Baseline'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Real Astronomical Sun Position Card (pvlib Asia/Kolkata) */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Real Astronomical Sun
            </h2>
          </div>
          <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
            pvlib
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <span className="text-slate-600 font-medium">Solar Azimuth:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {rawSunAzimuth.toFixed(2)}°
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <span className="text-slate-600 font-medium">Solar Elevation:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {rawSunElevation.toFixed(2)}°
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Location: 23.25°N, 77.50°E</span>
            <span className="font-semibold text-slate-700">Asia/Kolkata</span>
          </div>
        </div>
      </div>

      {/* 3. Hardware Controller & Bus Topology */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Controller & Bus Topology
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              FastAPI / ML Engine:
            </span>
            <span className="font-semibold text-emerald-600 text-[11px] font-mono">
              ONLINE
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              ESP32 Firmware:
            </span>
            <span
              className={`font-semibold text-[11px] font-mono ${
                esp32Connected ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {esp32Connected ? 'USB SERIAL 115200' : 'WAITING'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-500" />
              Azimuth Motor (GPIO 25):
            </span>
            <span className="font-semibold text-[11px] font-mono text-indigo-700">
              {motorAzimuthStatus}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-500" />
              Elevation Motor (GPIO 26):
            </span>
            <span className="font-semibold text-[11px] font-mono text-indigo-700">
              {motorElevationStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
