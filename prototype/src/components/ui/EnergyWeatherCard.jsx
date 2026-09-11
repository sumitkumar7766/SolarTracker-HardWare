import React from 'react';
import {
  Zap,
  BatteryCharging,
  Thermometer,
  Droplets,
  Gauge,
  Wind,
  CloudRain,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const EnergyWeatherCard = () => {
  const {
    voltage,
    current,
    power,
    energyToday,
    temperature,
    humidity,
    heatIndex,
    bme680_1,
    bme680_2,
    rainState,
    cellVoltages,
    xl4015Output,
    bmsStatus,
    luxBracket,
  } = useSimulation();

  return (
    <div className="space-y-4">
      {/* 1. INA219 & Power Subsystem Telemetry */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Power Bus & Battery Telemetry
            </h2>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {luxBracket && (
              <span className="text-[9px] font-mono bg-amber-50 text-amber-800 border border-amber-200/90 px-2 py-0.5 rounded-full font-bold">
                {luxBracket}
              </span>
            )}
            <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
              3S BMS + INA
            </span>
          </div>
        </div>

        {/* 4 Energy Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Bus Voltage
            </span>
            <div className="font-mono text-base font-extrabold text-slate-900 mt-0.5">
              {voltage} <span className="text-xs font-medium text-slate-500">V</span>
            </div>
            <span className="text-[9px] text-slate-400">INA219 I2C 0x40</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Load Current
            </span>
            <div className="font-mono text-base font-extrabold text-slate-900 mt-0.5">
              {current} <span className="text-xs font-medium text-slate-500">A</span>
            </div>
            <span className="text-[9px] text-slate-400">0.1Ω Precision Shunt</span>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
              Solar Power
            </span>
            <div className="font-mono text-base font-extrabold text-indigo-900 mt-0.5">
              {power} <span className="text-xs font-medium text-indigo-600">W</span>
            </div>
            <span className="text-[9px] text-indigo-500 font-medium">Active Generation</span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
              Harvested Today
            </span>
            <div className="font-mono text-base font-extrabold text-emerald-900 mt-0.5">
              {typeof energyToday === 'number' ? energyToday.toFixed(4) : energyToday}{' '}
              <span className="text-xs font-medium text-emerald-600">kWh</span>
            </div>
            <span className="text-[9px] text-emerald-500 font-medium">Integrated Energy</span>
          </div>
        </div>

        {/* 3S 18650 Individual Cell Voltages & Buck Rail */}
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              3S Cell Balancing:
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-semibold">
              BMS: {bmsStatus}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="text-[9px] text-slate-400 block">Cell #1</span>
              <span className="font-bold text-slate-800 text-[11px]">{cellVoltages[0]}V</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="text-[9px] text-slate-400 block">Cell #2</span>
              <span className="font-bold text-slate-800 text-[11px]">{cellVoltages[1]}V</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="text-[9px] text-slate-400 block">Cell #3</span>
              <span className="font-bold text-slate-800 text-[11px]">{cellVoltages[2]}V</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
            <span>XL4015 Buck 5V Rail:</span>
            <span className="font-mono font-bold text-indigo-600">
              {xl4015Output.voltage}V @ {xl4015Output.current}A (Pi 5 Rail)
            </span>
          </div>
        </div>
      </div>

      {/* 2. DHT22 & Dual BME680 Environmental Array */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Environmental Sensor Array
            </h2>
          </div>
          <span className="text-[10px] font-mono bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-semibold">
            DHT22 + 2x BME680
          </span>
        </div>

        {/* Ambient Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1 text-slate-500 mb-0.5">
              <Thermometer className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-semibold uppercase">Temp</span>
            </div>
            <div className="font-mono text-sm font-extrabold text-slate-800">
              {temperature}°C
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1 text-slate-500 mb-0.5">
              <Droplets className="w-3 h-3 text-sky-500" />
              <span className="text-[9px] font-semibold uppercase">Humidity</span>
            </div>
            <div className="font-mono text-sm font-extrabold text-slate-800">
              {humidity}%
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1 text-slate-500 mb-0.5">
              <Gauge className="w-3 h-3 text-purple-500" />
              <span className="text-[9px] font-semibold uppercase">Barometer</span>
            </div>
            <div className="font-mono text-sm font-extrabold text-slate-800">
              {bme680_1.pressure}
            </div>
          </div>
        </div>

        {/* BME680 Dual Comparison & Air Quality */}
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1">
              <Wind className="w-3 h-3 text-emerald-500" />
              BME680 #1 (IAQ Score):
            </span>
            <span className="font-mono font-bold text-emerald-600">
              {bme680_1.iaq} (Good Quality)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1">
              <Wind className="w-3 h-3 text-emerald-500" />
              BME680 #2 (IAQ Score):
            </span>
            <span className="font-mono font-bold text-emerald-600">
              {bme680_2.iaq} (Good Quality)
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-slate-600 flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-sky-500" />
              Rain Drop Sensor:
            </span>
            <span
              className={`font-mono font-bold text-[11px] ${
                rainState === 'NO RAIN' ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {rainState}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
