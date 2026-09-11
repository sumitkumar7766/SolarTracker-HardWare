import React from 'react';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const AIPredictionCard = () => {
  const {
    estimatedPanelAzimuth,
    panelElevationDeg,
    power,
    targetPanelAzimuth,
    targetPanelElevation,
    azimuthCorrection,
    elevationCorrection,
    aiPredictedPower,
    aiConfidence,
    aiDecision,
    expectedGain,
    movementCost,
  } = useSimulation();

  const isOptimal = aiDecision.includes('HOLD') || aiDecision.includes('OPTIMAL') || aiDecision.includes('LOCKED');

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              AI Predictive Tracking Engine
            </h2>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">
              Gradient Boosting ML Model (solar_tracker_model.pkl)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>Confidence: {aiConfidence}%</span>
        </div>
      </div>

      {/* Main AI Decision Callout Banner */}
      <div
        className={`p-3 rounded-xl border mb-3 flex items-center justify-between ${
          isOptimal
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isOptimal ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          )}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Tracking Decision
            </span>
            <span className="text-xs sm:text-sm font-extrabold">{aiDecision}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            ML Residuals (Correction)
          </span>
          <span className="font-mono font-extrabold text-xs sm:text-sm text-purple-700">
            ΔAz: {azimuthCorrection > 0 ? '+' : ''}{azimuthCorrection.toFixed(2)}° | ΔEl: {elevationCorrection > 0 ? '+' : ''}{elevationCorrection.toFixed(2)}°
          </span>
        </div>
      </div>

      {/* Predicted Coordinates & Energy Comparison Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Current vs Target Azimuth */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">
            Target Azimuth
          </span>
          <div className="font-mono text-sm font-bold text-slate-800 mt-0.5">
            {targetPanelAzimuth.toFixed(1)}°
          </div>
          <span className="text-[9px] text-slate-400">
            Est. Panel: {estimatedPanelAzimuth.toFixed(1)}°
          </span>
        </div>

        {/* Current vs Target Elevation */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">
            Target Elevation
          </span>
          <div className="font-mono text-sm font-bold text-slate-800 mt-0.5">
            {targetPanelElevation.toFixed(1)}°
          </div>
          <span className="text-[9px] text-slate-400">
            Current Panel: {panelElevationDeg.toFixed(1)}°
          </span>
        </div>

        {/* Predicted Generation */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">
            Generation
          </span>
          <div className="font-mono text-sm font-bold text-indigo-600 mt-0.5">
            {power !== null ? `${power} W` : '--'}
          </div>
          <span className="text-[9px] text-slate-400">
            Active Power Telemetry
          </span>
        </div>

        {/* Slew Energy Cost */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">
            Actuator Slew Cost
          </span>
          <div className="font-mono text-sm font-bold text-slate-700 mt-0.5">
            {movementCost} W
          </div>
          <span className="text-[9px] text-slate-400">
            Deadband: ±1.0°
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100">
        <span>* REAL AI MODEL: Dual-residual prediction with Gradient Boosting Regressor (20 features).</span>
        <span className="font-mono font-semibold text-purple-600">Model: solar_tracker_model.pkl</span>
      </div>
    </div>
  );
};
