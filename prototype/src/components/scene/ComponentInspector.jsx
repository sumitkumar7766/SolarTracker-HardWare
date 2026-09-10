import React from 'react';
import { X, Cpu, Wrench, Activity, Zap, Shield, Eye, CheckCircle2, ZoomOut } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const ComponentInspector = ({ onZoomOut }) => {
  const { selectedComponent, setSelectedComponent, focusComponent, setCameraPreset } = useSimulation();

  if (!selectedComponent) return null;

  const handleZoomOut = () => {
    if (onZoomOut) {
      onZoomOut();
    } else {
      setCameraPreset('FULL SYSTEM');
    }
  };

  return (
    <div className="absolute top-16 right-4 z-30 w-84 sm:w-96 glass-card rounded-2xl p-5 shadow-2xl border border-indigo-200/90 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
      {/* Top Bar with Icon, Category, Name and Close */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              {selectedComponent.category || 'Hardware Module'}
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              {selectedComponent.name}
            </h3>
          </div>
        </div>
        <button
          onClick={() => setSelectedComponent(null)}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 my-3 leading-relaxed">
        {selectedComponent.description}
      </p>

      {/* Diagnostic Status Pill */}
      <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Diagnostic State:</span>
        <span className={`font-semibold flex items-center gap-1.5 ${selectedComponent.statusColor || 'text-emerald-600'}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {selectedComponent.status || 'Active & Online'}
        </span>
      </div>

      {/* Specifications & Live Telemetry Grid */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {selectedComponent.specs?.map((spec, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-100 text-xs hover:border-slate-200 transition-colors"
          >
            <span className="text-slate-500 font-medium">{spec.label}</span>
            <span className="font-mono font-bold text-slate-800">{spec.value}</span>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={handleZoomOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-xs"
          title="Zoom camera back out to full system overview"
        >
          <ZoomOut className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zoom Out</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedComponent(null)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
