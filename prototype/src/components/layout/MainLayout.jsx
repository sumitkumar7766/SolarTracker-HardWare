import React, { useState } from 'react';
import { Header } from './Header';
import { SolarTrackerCanvas } from '../scene/SolarTrackerCanvas';
import { ControlPanel } from '../ui/ControlPanel';
import { TelemetryPanel } from '../ui/TelemetryPanel';
import { EnergyWeatherCard } from '../ui/EnergyWeatherCard';
import { AIPredictionCard } from '../ui/AIPredictionCard';
import { RealtimeCharts } from '../ui/RealtimeCharts';
import { SerialMonitor } from '../ui/SerialMonitor';
import { AboutModal } from '../ui/AboutModal';
import { SettingsModal } from '../ui/SettingsModal';

export const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleTabChange = (tabId) => {
    if (tabId === 'about') {
      setIsAboutOpen(true);
    } else if (tabId === 'settings') {
      setIsSettingsOpen(true);
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Header */}
      <Header activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Main Dashboard Body Container */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-5">
        {/* Main 3-Column Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Controls & System Summary (3 cols on 12-col grid) */}
          <div className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
            <ControlPanel />
          </div>

          {/* Center Column: 3D Three.js Digital Twin Viewport (6 cols on 12-col grid) */}
          <div className="lg:col-span-6 xl:col-span-6 order-1 lg:order-2">
            <SolarTrackerCanvas />
          </div>

          {/* Right Column: Sensor Telemetry, Power & Environment (3 cols on 12-col grid) */}
          <div className="lg:col-span-3 xl:col-span-3 order-3 space-y-4">
            <TelemetryPanel />
            <EnergyWeatherCard />
          </div>
        </div>

        {/* Bottom Section: AI Prediction, Real-Time Charts, and Live Serial Monitor */}
        <div className="space-y-4 pt-2">
          {/* AI Decision Prediction Card */}
          <AIPredictionCard />

          {/* Real-time Dynamic Charts */}
          <RealtimeCharts />

          {/* Live Serial UART Console */}
          <SerialMonitor />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-[1680px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">AI Solar Tracker System</span>
            <span>—</span>
            <span>Simulated IoT Digital Twin</span>
          </div>
          <div>
            Built with React, Three.js, React Three Fiber, and Tailwind CSS. Frontend-Only Architecture.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
