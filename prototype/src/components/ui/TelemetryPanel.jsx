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
    azimuth,
    elevation,
    motorStatus,
    servoStatus,
    threshold,
  } = useSimulation();

  const leftSum = ldr.tl + ldr.bl;
  const rightSum = ldr.tr + ldr.br;
  const topSum = ldr.tl + ldr.tr;
  const bottomSum = ldr.bl + ldr.br;

  const horizontalError = leftSum - rightSum;
  const verticalError = topSum - bottomSum;

  const isHorizThresholdExceeded = Math.abs(horizontalError) > threshold;
  const isVertThresholdExceeded = Math.abs(verticalError) > threshold;

  // Percentage for LDR bars (assuming 0 to 3200 range)
  const getPercent = (val) => Math.min(100, Math.max(0, (val / 2800) * 100));

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
            12-Bit ADC
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
              {ldr.tl}
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
              {ldr.tr}
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
              {ldr.bl}
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
              {ldr.br}
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
                {horizontalError >= 0 ? `+${horizontalError}` : horizontalError}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  isHorizThresholdExceeded
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isHorizThresholdExceeded ? 'CORRECTING' : 'BALANCED'}
              </span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-500 font-medium">ΔV (Top - Bottom)</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono font-bold text-slate-800">
                {verticalError >= 0 ? `+${verticalError}` : verticalError}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  isVertThresholdExceeded
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isVertThresholdExceeded ? 'CORRECTING' : 'BALANCED'}
              </span>
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
          {/* Horizontal Azimuth Axis */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">Horizontal (Azimuth)</span>
              <span className="font-mono font-bold text-indigo-600">
                {azimuth >= 0 ? `+${azimuth.toFixed(1)}°` : `${azimuth.toFixed(1)}°`}
              </span>
            </div>
            {/* Range bar: -90° to +90° */}
            <div className="w-full bg-slate-200 rounded-full h-2 relative">
              <div
                className="absolute top-0 bottom-0 bg-indigo-600 rounded-full transition-all duration-100"
                style={{
                  left: '50%',
                  width: `${(Math.abs(azimuth) / 90) * 50}%`,
                  transform: azimuth < 0 ? 'translateX(-100%)' : 'none',
                }}
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-400" />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span>-90° (West)</span>
              <span>0° (North)</span>
              <span>+90° (East)</span>
            </div>

            {/* N20 Motor Telemetry */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">N20 Motor Drive:</span>
              <span
                className={`font-semibold flex items-center gap-1.5 ${
                  motorStatus === 'RUNNING' ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    motorStatus === 'RUNNING'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                {motorStatus === 'RUNNING' ? 'Engaged (65% PWM)' : 'Standby / Idle'}
              </span>
            </div>
          </div>

          {/* Vertical Elevation Axis */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">Vertical (Elevation)</span>
              <span className="font-mono font-bold text-indigo-600">
                {elevation.toFixed(1)}°
              </span>
            </div>
            {/* Range bar: 0° to 80° */}
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${(elevation / 80) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span>0° (Horizon)</span>
              <span>40°</span>
              <span>80° (Zenith)</span>
            </div>

            {/* Servo Motor Telemetry */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">MG996R Servo:</span>
              <span
                className={`font-semibold flex items-center gap-1.5 ${
                  servoStatus === 'ACTIVE' ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    servoStatus === 'ACTIVE'
                      ? 'bg-indigo-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                {servoStatus === 'ACTIVE' ? 'Positioning (PWM Active)' : 'Holding Position'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
