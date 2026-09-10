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
  Layers,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const ControlPanel = () => {
  const {
    simulationRunning,
    simulationPaused,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    trackingMode,
    setTrackingMode,
    manualJog,
    threshold,
    setThreshold,
    isCalibrating,
    calibrationProgress,
    calibrateSensors,
    sunAzimuth,
    setSunAzimuth,
    sunElevation,
    setSunElevation,
    sunIntensity,
    setSunIntensity,
    battery,
    power,
    trackingEfficiency,
    rainState,
    setRainState,
    rpi5Status,
    esp32Status,
    bmsStatus,
    systemStatusText,
    stopReason,
  } = useSimulation();

  return (
    <div className="space-y-4">
      {/* 1. Main Simulation Controls Card */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Tracker Controller
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
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {systemStatusText || 'STOPPED'}
          </span>
        </div>

        {stopReason && (
          <div className="mb-3 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-mono text-amber-800">
            {stopReason}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {!simulationRunning ? (
            <button
              onClick={startSimulation}
              className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START SIMULATION</span>
            </button>
          ) : (
            <button
              onClick={pauseSimulation}
              className={`col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.98] cursor-pointer ${
                simulationPaused
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              <Pause className="w-4 h-4" />
              <span>{simulationPaused ? 'RESUME TRACKING' : 'PAUSE'}</span>
            </button>
          )}

          <button
            onClick={resetSimulation}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors border border-slate-200/80 active:scale-[0.98] cursor-pointer"
            title="Reset system to defaults"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET</span>
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
        {trackingMode === 'MANUAL' && (
          <div className="mt-4 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-900">MANUAL JOG</span>
              <span className="text-[10px] font-medium text-indigo-600">Step: ±4°</span>
            </div>

            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
              <button
                onClick={() => manualJog('elevation', 1)}
                className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Tilt Up (+Elevation)"
              >
                <ArrowUp className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => manualJog('azimuth', -1)}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Rotate Left (-Azimuth)"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-xl bg-indigo-100/50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                  D-PAD
                </div>

                <button
                  onClick={() => manualJog('azimuth', 1)}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Rotate Right (+Azimuth)"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => manualJog('elevation', -1)}
                className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Tilt Down (-Elevation)"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Rain Drop Sensor Simulation Switcher */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-sky-500" />
              Rain Drop Simulation:
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

        {/* Deadband Threshold Slider */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600">
              LDR Deadband Threshold:
            </span>
            <span className="font-mono font-bold text-xs text-indigo-600">
              ±{threshold} ADC
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="180"
            step="5"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
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
                : 'Calibrate LDR Sensor Baseline'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Celestial Sun Position Controls */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Celestial Sun Orbit
          </h2>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">Sun Azimuth (East-West)</span>
              <span className="font-mono font-bold text-slate-800">
                {sunAzimuth >= 0 ? `+${sunAzimuth}°` : `${sunAzimuth}°`}
              </span>
            </div>
            <input
              type="range"
              min="-80"
              max="80"
              step="1"
              value={sunAzimuth}
              onChange={(e) => setSunAzimuth(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">Sun Elevation (Altitude)</span>
              <span className="font-mono font-bold text-slate-800">
                {sunElevation}°
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              step="1"
              value={sunElevation}
              onChange={(e) => setSunElevation(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">Irradiance Intensity</span>
              <span className="font-mono font-bold text-slate-800">
                {(sunIntensity * 100).toFixed(0)}% ({(sunIntensity * 1000).toFixed(0)} W/m²)
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.05"
              value={sunIntensity}
              onChange={(e) => setSunIntensity(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Multi-Controller Health Summary */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Controller & Bus Topology
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              Raspberry Pi 5 (8GB):
            </span>
            <span className="font-semibold text-emerald-600 text-[11px]">AI Online</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              ESP32 Main Core:
            </span>
            <span className="font-semibold text-emerald-600 text-[11px]">FreeRTOS</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-500" />
              Arduino Mega 2560:
            </span>
            <span className="font-semibold text-sky-600 text-[11px]">Standby IO</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              3S BMS Battery Rail:
            </span>
            <span className="font-mono font-bold text-slate-800">{battery}% (12.4V)</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Solar Generation:
            </span>
            <span className="font-mono font-bold text-indigo-600">{power} W ({trackingEfficiency}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
