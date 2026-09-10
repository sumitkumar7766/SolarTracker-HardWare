import React from 'react';
import { X, Sun, CheckCircle, Cpu, Zap, Shield, BookOpen } from 'lucide-react';

export const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">About AI Solar Tracker</h3>
              <p className="text-xs text-slate-500">
                Smart Solar Energy Monitoring & Predictive Tracking System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          <p>
            The <strong>AI Solar Tracker</strong> is a high-fidelity cyber-physical digital twin designed to demonstrate dual-axis autonomous solar tracking, IoT sensor telemetry, and simulated predictive energy optimization.
          </p>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-1.5">
            <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              Core Architecture & Hardware Topology
            </h4>
            <ul className="space-y-1 text-indigo-800 text-[11px] list-disc list-inside">
              <li><strong>Solar Panel:</strong> 24-cell monocrystalline array with 22W nominal rating</li>
              <li><strong>Azimuth Drive:</strong> N20 DC micro metal gear motor with 1:298 gear reduction</li>
              <li><strong>Elevation Drive:</strong> MG996R metal gear digital servo with PWM angle control</li>
              <li><strong>Sensors:</strong> 4x CdS photoresistors (TL, TR, BL, BR) with shadow baffles</li>
              <li><strong>Embedded Core:</strong> ESP32 240MHz dual-core microcontroller with FreeRTOS</li>
              <li><strong>Energy Monitoring:</strong> INA219 high-side I2C current and power monitor</li>
              <li><strong>Environmental Telemetry:</strong> DHT22 ambient temperature and humidity sensor</li>
            </ul>
          </div>

          <p>
            <strong>Tracking Algorithm:</strong> Calculates differential error between quadrant sums (Left vs Right for azimuth, Top vs Bottom for elevation) with a deadband threshold to eliminate mechanical motor hunt.
          </p>

          <p>
            <strong>AI Prediction Engine:</strong> Simulates an edge-AI model balancing predicted solar irradiance against the electrical cost of motor movement, ensuring optimal net energy capture throughout diurnal cycles.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
