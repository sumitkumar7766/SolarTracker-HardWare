import React, { useState } from 'react';
import {
  Camera,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Move,
  RotateCcw,
  Sparkles,
  X,
  Crosshair,
  Sliders,
  Maximize2,
} from 'lucide-react';

export const CameraControlUnit = ({
  isOpen,
  onClose,
  isEnabled,
  onToggleEnabled,
  onAction,
  isAutoRotating,
  onToggleAutoRotate,
}) => {
  const [controlMode, setControlMode] = useState('ROTATE'); // 'ROTATE' | 'PAN'

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-20 right-4 z-30 w-72 glass-card rounded-2xl p-4 shadow-2xl border border-indigo-200/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 select-none">
      {/* 1. Header with Camera Icon, Title, Status & Close Button */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 leading-none">
              Camera Control Unit
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span
                className={`text-[10px] font-bold ${
                  isEnabled ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                {isEnabled ? 'Camera Control: ON' : 'Camera Control: OFF'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleEnabled}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
              isEnabled
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Toggle camera control lock"
          >
            {isEnabled ? 'ACTIVE' : 'LOCKED'}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Hide Camera Control Unit"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Sub-mode Selector: Rotate / Orbit vs Pan */}
      <div className="grid grid-cols-2 gap-1.5 my-3 bg-slate-100 p-1 rounded-xl text-xs font-bold">
        <button
          onClick={() => setControlMode('ROTATE')}
          className={`py-1 rounded-lg transition-all cursor-pointer ${
            controlMode === 'ROTATE'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Orbit View
        </button>
        <button
          onClick={() => setControlMode('PAN')}
          className={`py-1 rounded-lg transition-all cursor-pointer ${
            controlMode === 'PAN'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pan View
        </button>
      </div>

      {/* 3. D-Pad for Directional Camera Control */}
      <div className="flex flex-col items-center justify-center gap-1 py-1">
        {/* Up Button */}
        <button
          onClick={() => onAction(controlMode === 'ROTATE' ? 'ROTATE_UP' : 'PAN_UP')}
          disabled={!isEnabled}
          className="w-10 h-9 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          title={controlMode === 'ROTATE' ? 'Rotate Camera Up' : 'Pan Camera Up'}
        >
          <ChevronUp className="w-5 h-5 text-indigo-600" />
        </button>

        {/* Left, Center Mode Badge, Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAction(controlMode === 'ROTATE' ? 'ROTATE_LEFT' : 'PAN_LEFT')}
            disabled={!isEnabled}
            className="w-10 h-9 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            title={controlMode === 'ROTATE' ? 'Rotate Camera Left' : 'Pan Camera Left'}
          >
            <ChevronLeft className="w-5 h-5 text-indigo-600" />
          </button>

          <div className="w-12 h-9 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
            {controlMode}
          </div>

          <button
            onClick={() => onAction(controlMode === 'ROTATE' ? 'ROTATE_RIGHT' : 'PAN_RIGHT')}
            disabled={!isEnabled}
            className="w-10 h-9 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            title={controlMode === 'ROTATE' ? 'Rotate Camera Right' : 'Pan Camera Right'}
          >
            <ChevronRight className="w-5 h-5 text-indigo-600" />
          </button>
        </div>

        {/* Down Button */}
        <button
          onClick={() => onAction(controlMode === 'ROTATE' ? 'ROTATE_DOWN' : 'PAN_DOWN')}
          disabled={!isEnabled}
          className="w-10 h-9 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          title={controlMode === 'ROTATE' ? 'Rotate Camera Down' : 'Pan Camera Down'}
        >
          <ChevronDown className="w-5 h-5 text-indigo-600" />
        </button>
      </div>

      {/* 4. Zoom Controls & Reset View */}
      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
        <button
          onClick={() => onAction('ZOOM_IN')}
          disabled={!isEnabled}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zoom In</span>
        </button>

        <button
          onClick={() => onAction('ZOOM_OUT')}
          disabled={!isEnabled}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-indigo-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5 text-indigo-600" />
          <span>Zoom Out</span>
        </button>
      </div>

      {/* 5. Utility Actions: Reset & Auto-Rotate */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => onAction('RESET')}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
          title="Reset Camera to Overview"
        >
          <RotateCcw className="w-3 h-3 text-indigo-600" />
          <span>Reset View</span>
        </button>

        <button
          onClick={onToggleAutoRotate}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
            isAutoRotating
              ? 'bg-amber-100 text-amber-900 border border-amber-200 font-bold'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="Toggle Turntable 360° Auto-Rotation"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>{isAutoRotating ? 'Rotating' : 'Turntable'}</span>
        </button>
      </div>
    </div>
  );
};
