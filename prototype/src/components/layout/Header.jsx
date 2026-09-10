import React, { useState } from 'react';
import {
  Sun,
  Activity,
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Settings,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const Header = ({ activeTab, setActiveTab }) => {
  const {
    simulationRunning,
    simulationPaused,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    trackingMode,
    battery,
  } = useSimulation();

  const [showNotification, setShowNotification] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'simulator', label: '3D Simulator' },
    { id: 'telemetry', label: 'Live Data' },
    { id: 'ai', label: 'AI Prediction' },
    { id: 'settings', label: 'Settings' },
    { id: 'about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_2px_12px_-3px_rgba(15,23,42,0.04)]">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-white flex-shrink-0">
              <Sun className="w-6 h-6 animate-[spin_16s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                  AI Solar Tracker
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 uppercase tracking-wide">
                  v2.4 IoT Twin
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
                AI-Powered IoT-Based Smart Solar Energy Monitoring & Predictive Tracking System
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Quick Simulation Actions & Status Badges */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* System Online Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">System Online</span>
            </div>

            {/* Quick Play/Pause/Reset Controls */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {!simulationRunning ? (
                <button
                  onClick={startSimulation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
                  title="Start Autonomous Tracking Simulation"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Start</span>
                </button>
              ) : (
                <button
                  onClick={pauseSimulation}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors ${
                    simulationPaused
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                  title={simulationPaused ? 'Resume Simulation' : 'Pause Simulation'}
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{simulationPaused ? 'Resume' : 'Pause'}</span>
                </button>
              )}

              <button
                onClick={resetSimulation}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
                title="Reset System to Defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotification(!showNotification)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              title="System Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full"></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
