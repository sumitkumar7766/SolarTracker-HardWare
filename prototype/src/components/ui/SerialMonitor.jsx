import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Filter,
  ArrowDown,
  Pause,
  Play,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const SerialMonitor = () => {
  const { serialLogs, clearSerialLogs } = useSimulation();
  const [filter, setFilter] = useState('all'); // 'all' | 'sensor' | 'power' | 'ai' | 'action'
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const consoleContainerRef = useRef(null);

  // Auto-scroll ONLY the terminal container internally without affecting window scroll
  useEffect(() => {
    if (autoScroll && consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [serialLogs, autoScroll]);

  const filteredLogs = serialLogs.filter((log) => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const handleCopy = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLogBadge = (type) => {
    switch (type) {
      case 'sensor':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">ADC</span>;
      case 'power':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">PWR</span>;
      case 'ai':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">AI</span>;
      case 'action':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">ACT</span>;
      case 'warning':
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">WARN</span>;
      default:
        return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">SYS</span>;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Live UART Serial Monitor
          </h2>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
            115200 Baud
          </span>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
            {['all', 'sensor', 'power', 'ai', 'action'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-md capitalize transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer ml-1 select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
            />
            <span>Auto-Scroll Logs</span>
          </label>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200/80 cursor-pointer"
            title="Copy Logs to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={clearSerialLogs}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200/80 cursor-pointer"
            title="Clear Serial Buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Log Console - Scrolled internally without affecting the webpage window */}
      <div
        ref={consoleContainerRef}
        className="w-full h-48 bg-slate-900/95 text-slate-100 rounded-xl p-3 font-mono text-[11px] leading-relaxed overflow-y-auto shadow-inner border border-slate-800 scroll-smooth"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            No UART output matching filter.
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((item) => (
              <div key={item.id} className="flex items-start gap-2 hover:bg-slate-800/60 px-1 py-0.5 rounded">
                <span className="text-slate-500 select-none">[{item.timestamp}]</span>
                <span className="select-none">{getLogBadge(item.type)}</span>
                <span
                  className={`break-all ${
                    item.type === 'action'
                      ? 'text-emerald-300 font-semibold'
                      : item.type === 'ai'
                      ? 'text-purple-300'
                      : item.type === 'power'
                      ? 'text-amber-300'
                      : item.type === 'sensor'
                      ? 'text-sky-300'
                      : 'text-slate-300'
                  }`}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
