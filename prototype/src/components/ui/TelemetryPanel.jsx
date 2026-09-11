import React from 'react';
import {
  Activity,
  Compass,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  Cpu,
  RotateCw,
  Zap,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const TelemetryPanel = () => {
  const {
    ldr,
    estimatedPanelAzimuth,
    panelElevationDeg,
    azimuth,
    elevation,
    motorAzimuthStatus,
    motorElevationStatus,
    motorStatus,
    servoStatus,
    threshold,
    esp32Connected,
  } = useSimulation();

  const hasLdr =
    esp32Connected &&
    ldr.tl !== null &&
    ldr.tr !== null &&
    ldr.bl !== null &&
    ldr.br !== null;

  const leftSum = hasLdr ? ldr.tl + ldr.bl : 0;
  const rightSum = hasLdr ? ldr.tr + ldr.br : 0;
  const topSum = hasLdr ? ldr.tl + ldr.tr : 0;
  const bottomSum = hasLdr ? ldr.bl + ldr.br : 0;

  const horizontalError = hasLdr ? leftSum - rightSum : null;
  const verticalError = hasLdr ? topSum - bottomSum : null;

  const isHorizThresholdExceeded = hasLdr && Math.abs(horizontalError) > threshold;
  const isVertThresholdExceeded = hasLdr && Math.abs(verticalError) > threshold;

  // Percentage for LDR bars (assuming 0 to 4095 range)
  const getPercent = (val) =>
    typeof val === 'number' ? Math.min(100, Math.max(0, (val / 4095) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* 1. LDR 4-Quadrant Optical Matrix Card */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              LDR Sensor Array
            </h2>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {esp32Connected ? '12-Bit ADC (Live)' : 'Waiting for ESP32...'}
          </span>
        </div>

        {/* 4 Quadrant Grid Layout */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Top-Left */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">LDR TL (Top)</span>
              <span className="text-[9px] font-mono text-slate-400">GPIO 34</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-900">
              {ldr.tl !== null ? ldr.tl : '--'}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150"
                style={{ width: `${getPercent(ldr.tl)}%` }}
              />
            </div>
          </div>

          {/* Top-Right */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">LDR TR (Right)</span>
              <span className="text-[9px] font-mono text-slate-400">GPIO 33</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-900">
              {ldr.tr !== null ? ldr.tr : '--'}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150"
                style={{ width: `${getPercent(ldr.tr)}%` }}
              />
            </div>
          </div>

          {/* Bottom-Left */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">LDR BL (Left)</span>
              <span className="text-[9px] font-mono text-slate-400">GPIO 32</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-900">
              {ldr.bl !== null ? ldr.bl : '--'}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150"
                style={{ width: `${getPercent(ldr.bl)}%` }}
              />
            </div>
          </div>

          {/* Bottom-Right */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">LDR BR (Bottom)</span>
              <span className="text-[9px] font-mono text-slate-400">GPIO 35</span>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-900">
              {ldr.br !== null ? ldr.br : '--'}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150"
                style={{ width: `${getPercent(ldr.br)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Differential Tracking Error Diagnostics */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-500 font-medium">ΔH (Left - Right)</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono font-bold text-slate-800">
                {horizontalError !== null ? (horizontalError >= 0 ? `+${horizontalError}` : horizontalError) : '--'}
              </span>
              {hasLdr && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    isHorizThresholdExceeded
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isHorizThresholdExceeded ? 'CORRECTING' : 'BALANCED'}
                </span>
              )}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-500 font-medium">ΔV (Top - Bottom)</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono font-bold text-slate-800">
                {verticalError !== null ? (verticalError >= 0 ? `+${verticalError}` : verticalError) : '--'}
              </span>
              {hasLdr && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    isVertThresholdExceeded
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isVertThresholdExceeded ? 'CORRECTING' : 'BALANCED'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Dual-Axis & Motor Status Card */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Axis & Motor Status
            </h2>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
            Dual-Axis
          </span>
        </div>

        <div className="space-y-3">
          {/* Horizontal Azimuth Axis (Section 7: Clearly labeled Estimated Panel Azimuth) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">Estimated Panel Azimuth</span>
              <span className="font-mono font-bold text-indigo-600">
                {estimatedPanelAzimuth.toFixed(1)}°
              </span>
            </div>
            {/* Visual range bar: 0° to 360° */}
            <div className="w-full bg-slate-200 rounded-full h-2 relative overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-150"
                style={{ width: `${(estimatedPanelAzimuth / 360.0) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span>0° (N)</span>
              <span>90° (E)</span>
              <span>180° (S)</span>
              <span>270° (W)</span>
              <span>360°</span>
            </div>

            {/* Azimuth Motor Telemetry */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Azimuth MG995 (GPIO 25):</span>
              <span
                className={`font-semibold font-mono flex items-center gap-1.5 ${
                  motorAzimuthStatus !== 'STOP' ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    motorAzimuthStatus !== 'STOP'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                {motorAzimuthStatus}
              </span>
            </div>
          </div>

          {/* Vertical Elevation Axis (Section 6: Panel Elevation 10-170°) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">Panel Elevation</span>
              <span className="font-mono font-bold text-indigo-600">
                {panelElevationDeg.toFixed(1)}°
              </span>
            </div>
            {/* Range bar: 10° to 170° */}
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, ((panelElevationDeg - 10) / 160.0) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span>10° (Min)</span>
              <span>90° (Zenith / Up)</span>
              <span>170° (Max)</span>
            </div>

            {/* Elevation Motor Telemetry */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Elevation MG995 (GPIO 26):</span>
              <span
                className={`font-semibold font-mono flex items-center gap-1.5 ${
                  motorElevationStatus !== 'HOLD' ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    motorElevationStatus !== 'HOLD'
                      ? 'bg-indigo-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                {motorElevationStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
