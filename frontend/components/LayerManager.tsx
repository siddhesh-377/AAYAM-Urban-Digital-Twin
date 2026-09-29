"use client";
// components/LayerManager.tsx — Compact GIS Layer Manager & Map Legend
// Allows users to toggle city, environmental, urban activity, and analytical layers.
// Every layer displays its data status (Observed, Derived, Proxy, Reference).

import React, { useState } from "react";
import { useAyam } from "@/context/AyamContext";
import { StatusBadge } from "@/components/StatusBadge";

export function LayerManager() {
  const { layers, toggleLayer } = useAyam();
  const [isOpen, setIsOpen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  return (
    <div className="absolute top-3 left-3 z-[1100] flex flex-col gap-2 pointer-events-auto">
      {/* Toggle Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all shadow-lg backdrop-blur-md ${
            isOpen
              ? "bg-slate-900 border-sky-500/50 text-sky-400"
              : "bg-[#0a1120]/90 border-slate-700/80 text-slate-200 hover:bg-slate-800"
          }`}
          title="Toggle GIS Layer Controls"
        >
          <span className="text-sm">☰</span>
          <span>LAYERS</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
            {Object.values(layers).filter(Boolean).length}/7
          </span>
        </button>

        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all shadow-lg backdrop-blur-md ${
            showLegend
              ? "bg-slate-900 border-slate-700 text-slate-200"
              : "bg-[#0a1120]/90 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle Map Legend"
        >
          <span>LEGEND</span>
        </button>
      </div>

      {/* Expanded Layer Controls Panel */}
      {isOpen && (
        <div className="w-72 bg-[#090f1d]/98 border border-slate-700/80 rounded-lg shadow-2xl p-3 text-xs text-slate-200 backdrop-blur-xl animate-in fade-in duration-150 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Airshed Geographic Layers
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          {/* Section 1: Environmental Layers */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400/90">
              Environmental Overlays
            </div>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.showHeatmap}
                  onChange={() => toggleLayer("showHeatmap")}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span className="text-xs font-medium">PM2.5 Heat Surface</span>
              </div>
              <StatusBadge status="DERIVED" size="sm" />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.showStations}
                  onChange={() => toggleLayer("showStations")}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span className="text-xs font-medium">Monitoring Stations</span>
              </div>
              <StatusBadge status="OBSERVED" size="sm" />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.showWindField}
                  onChange={() => toggleLayer("showWindField")}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span className="text-xs font-medium">Wind Transport Field</span>
              </div>
              <StatusBadge status="OBSERVED" size="sm" />
            </label>
          </div>

          {/* Section 2: City & Infrastructure */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-800/60">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400/90">
              Urban Infrastructure
            </div>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.show3DBuildings}
                  onChange={() => toggleLayer("show3DBuildings")}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span className="text-xs font-medium">3D Building Geometry</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">LOD-2</span>
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.showBoundaries}
                  onChange={() => toggleLayer("showBoundaries")}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span className="text-xs font-medium">PMC & PCMC Borders</span>
              </div>
              <StatusBadge status="REFERENCE" size="sm" />
            </label>
          </div>

          {/* Section 3: Urban Activity Proxies */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-800/60">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/90">
              Activity & Emission Proxies
            </div>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.showTrafficCorridors}
                  onChange={() => toggleLayer("showTrafficCorridors")}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span className="text-xs font-medium">Arterial Traffic Corridors</span>
              </div>
              <StatusBadge status="PROXY" size="sm" />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.showIndustrialZones}
                  onChange={() => toggleLayer("showIndustrialZones")}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span className="text-xs font-medium">MIDC Industrial Zones</span>
              </div>
              <StatusBadge status="REFERENCE" size="sm" />
            </label>
          </div>
        </div>
      )}

      {/* Map Legend */}
      {showLegend && (
        <div className="w-64 bg-[#090f1d]/95 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 shadow-xl backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PM2.5 Scale (µg/m³)
            </span>
            <span className="text-[9px] font-mono text-slate-400">NAAQS 24h: 60</span>
          </div>

          <div className="space-y-1">
            <div className="w-full h-2 rounded-full overflow-hidden flex">
              <div className="w-1/6 h-full bg-[#22c55e]" title="0-30 Good" />
              <div className="w-1/6 h-full bg-[#eab308]" title="31-60 Moderate" />
              <div className="w-1/6 h-full bg-[#f97316]" title="61-90 Poor / Sensitive" />
              <div className="w-1/6 h-full bg-[#ef4444]" title="91-120 Unhealthy" />
              <div className="w-1/6 h-full bg-[#a855f7]" title="121-250 Severe" />
              <div className="w-1/6 h-full bg-[#991b1b]" title="250+ Hazardous" />
            </div>

            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>0</span>
              <span>30</span>
              <span>60</span>
              <span>90</span>
              <span>120</span>
              <span>250+</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px] text-slate-400 border-t border-slate-800/60 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>≤30 Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>≤60 Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>≤90 Sensitive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>≤120 Unhealthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>&gt;120 Severe</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Corridor Load</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
