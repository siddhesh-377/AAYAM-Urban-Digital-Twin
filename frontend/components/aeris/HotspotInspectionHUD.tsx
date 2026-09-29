"use client";
// components/aeris/HotspotInspectionHUD.tsx
// Compact contextual inspection card when a user clicks a station or hotspot

import React from "react";
import type { Observation, ForecastPoint } from "@/lib/api";
import { getPm25Category, formatTimestamp } from "@/lib/api";

interface HotspotInspectionHUDProps {
  observation?: Observation;
  station?: Observation;
  onClose: () => void;
  onAnalyze: (stationId: string) => void;
  onForecast: (stationId: string) => void;
  onSimulate: (stationId: string) => void;
  forecastPoints?: ForecastPoint[];
}

export function HotspotInspectionHUD({
  observation,
  station,
  onClose,
  onAnalyze,
  onForecast,
  onSimulate,
  forecastPoints,
}: HotspotInspectionHUDProps) {
  const target = observation || station;
  if (!target) return null;

  const cat = getPm25Category(target.pm25);

  return (
    <div
      className="absolute top-16 left-4 sm:left-8 z-[1200] w-80 p-4 rounded-xl border shadow-2xl backdrop-blur-md animate-fade-in text-slate-100 select-none font-mono text-xs"
      style={{
        background: "rgba(10, 16, 28, 0.94)",
        borderColor: "rgba(56, 189, 248, 0.35)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-2 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              NODE INSPECTION
            </span>
          </div>
          <h2 className="text-sm font-bold text-white leading-tight font-sans">{target.station_name}</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {target.lat.toFixed(4)}°N · {target.lon.toFixed(4)}°E
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Primary PM2.5 Metric */}
      <div className="py-3 flex items-center justify-between border-b border-slate-700/50 my-1">
        <div>
          <span className="text-[10px] uppercase text-slate-400">Observed Concentration</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-3xl font-black" style={{ color: cat.color }}>
              {target.pm25.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">µg/m³</span>
          </div>
        </div>

        <div className="text-right">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded shadow-sm"
            style={{ background: cat.bgColor, color: cat.color }}
          >
            {cat.label}
          </span>
          <div className="mt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
              OBSERVED
            </span>
          </div>
        </div>
      </div>

      {/* Metadata Details */}
      <div className="space-y-1.5 py-2 text-[11px] text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Source:</span>
          <span className="text-slate-200">{target.source || "OpenAQ / CPCB Pune"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Timestamp:</span>
          <span className="text-slate-200">{formatTimestamp(target.timestamp)} IST</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Limit Thresholds:</span>
          <span className="text-slate-400">NAAQS 60 · WHO 15 µg/m³</span>
        </div>
      </div>

      {/* 6h Mini Forecast Strip if available */}
      {forecastPoints && forecastPoints.length > 0 && (
        <div className="pt-2 pb-1 border-t border-slate-700/40">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
            <span>MODEL FORECAST (+6H)</span>
            <span className="text-sky-400">XGBoost v1.4</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {forecastPoints.slice(0, 6).map((f) => (
              <div key={f.step_ahead} className="text-center bg-slate-900/60 p-1 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block">+{f.step_ahead}h</span>
                <span className="text-[10px] font-bold text-slate-200 block">{f.pm25.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-700/60 mt-1">
        <button
          onClick={() => onAnalyze(target.station_id)}
          className="py-1.5 px-1 rounded text-center text-[10px] font-bold tracking-wider text-sky-300 bg-sky-950/80 border border-sky-500/40 hover:bg-sky-900/60 transition-all flex flex-col items-center justify-center gap-0.5 shadow-md"
        >
          <span>⊟</span>
          <span>ANALYZE</span>
        </button>

        <button
          onClick={() => onForecast(target.station_id)}
          className="py-1.5 px-1 rounded text-center text-[10px] font-bold tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-900/60 transition-all flex flex-col items-center justify-center gap-0.5 shadow-md"
        >
          <span>↗</span>
          <span>FORECAST</span>
        </button>

        <button
          onClick={() => onSimulate(target.station_id)}
          className="py-1.5 px-1 rounded text-center text-[10px] font-bold tracking-wider text-purple-300 bg-purple-950/80 border border-purple-500/40 hover:bg-purple-900/60 transition-all flex flex-col items-center justify-center gap-0.5 shadow-md"
        >
          <span>⊕</span>
          <span>SIMULATE</span>
        </button>
      </div>
    </div>
  );
}
