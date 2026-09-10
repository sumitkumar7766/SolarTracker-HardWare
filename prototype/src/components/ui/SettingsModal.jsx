import React from 'react';
import { X, Sliders, Settings, Save, RefreshCw } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const SettingsModal = ({ isOpen, onClose }) => {
  const {
    threshold,
    setThreshold,
    sunIntensity,
    setSunIntensity,
    showLabels,
    setShowLabels,
    showSunPath,
    setShowSunPath,
    showElectronics,
    setShowElectronics,
  } = useSimulation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">System Parameters</h3>
              <p className="text-xs text-slate-500">Configure simulation tolerances and graphics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* Threshold */}
          <div>
            <div className="flex justify-between font-medium text-slate-700 mb-1">
              <span>Deadband Threshold (ADC Counts)</span>
              <span className="font-mono font-bold text-indigo-600">±{threshold}</span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Error margin required before triggering horizontal or vertical motor slew.
            </p>
          </div>

          {/* Graphics Toggles */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <span className="font-semibold text-slate-700 block">3D Visual Overlays</span>

            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
              <span className="text-slate-600">Show 3D Component Labels</span>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
              <span className="text-slate-600">Show Sun Path Trajectory Arc</span>
              <input
                type="checkbox"
                checked={showSunPath}
                onChange={(e) => setShowSunPath(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
              <span className="text-slate-600">Transparent Electronics Box</span>
              <input
                type="checkbox"
                checked={showElectronics}
                onChange={(e) => setShowElectronics(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
              />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
