"use client";
// components/aeris/TopHUD.tsx
// Minimal scientific HUD for the AYAM Pune–PCMC Urban Environmental Digital Twin

import React from "react";

export type AyamMode = "OBSERVE" | "ALTER_CITY" | "FORECAST" | "HISTORY";

interface TopHUDProps {
  activeMode: AyamMode;
  onModeChange: (mode: AyamMode) => void;
  currentTimeString: string;
  isLive: boolean;
  selectedStationName?: string | null;
  onResetView?: () => void;
}

export function TopHUD({
  activeMode,
  onModeChange,
  currentTimeString,
  isLive,
  selectedStationName,
  onResetView,
}: TopHUDProps) {
  return (
    <header className="absolute top-0 inset-x-0 z-[1100] h-12 px-4 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Minimal Product & Airshed Identity */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-lg"
          style={{
            background: "rgba(10, 15, 26, 0.88)",
            borderColor: "rgba(148, 163, 184, 0.18)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-black tracking-widest text-white">
              AYAM
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">/</span>

          <span className="text-[11px] font-semibold tracking-wide text-slate-200">
            PUNE–PCMC AIRSHED
          </span>

          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            18.5204°N 73.8567°E
          </span>
        </div>

        {selectedStationName && (
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border backdrop-blur-md text-[11px] font-medium text-sky-300 animate-fade-in"
            style={{
              background: "rgba(14, 25, 45, 0.85)",
              borderColor: "rgba(56, 189, 248, 0.3)",
            }}
          >
            <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">FOCUS:</span>
            <span>{selectedStationName}</span>
          </div>
        )}
      </div>

      {/* Center: Contextual Mode Switcher */}
      <nav
        className="pointer-events-auto flex items-center gap-1 p-1 rounded-lg border backdrop-blur-md shadow-xl"
        style={{
          background: "rgba(10, 15, 26, 0.92)",
          borderColor: "rgba(148, 163, 184, 0.2)",
        }}
      >
        <button
          onClick={() => onModeChange("OBSERVE")}
          className={`px-3 py-1 rounded text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 ${
            activeMode === "OBSERVE"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <span className="text-[10px]">◉</span>
          <span>OBSERVE</span>
        </button>

        <button
          onClick={() => onModeChange("ALTER_CITY")}
          className={`px-3 py-1 rounded text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 ${
            activeMode === "ALTER_CITY"
              ? "bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <span className="text-[10px]">⚙</span>
          <span>ALTER CITY</span>
        </button>

        <button
          onClick={() => onModeChange("FORECAST")}
          className={`px-3 py-1 rounded text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 ${
            activeMode === "FORECAST"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <span className="text-[10px]">↗</span>
          <span>FORECAST +24H</span>
        </button>

        <button
          onClick={() => onModeChange("HISTORY")}
          className={`px-3 py-1 rounded text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 ${
            activeMode === "HISTORY"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <span className="text-[10px]">⏱</span>
          <span>HISTORY & AUDIT</span>
        </button>
      </nav>

      {/* Right: City Simulation State & Perspective Reset */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-md text-xs font-mono"
          style={{
            background: "rgba(10, 15, 26, 0.88)",
            borderColor: "rgba(148, 163, 184, 0.18)",
          }}
        >
          <span className="text-slate-400">TIME:</span>
          <span className="text-emerald-400 font-bold">{currentTimeString} IST</span>
          {isLive && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/40 font-bold">
              LIVE
            </span>
          )}
        </div>

        {onResetView && (
          <button
            onClick={onResetView}
            title="Reset perspective to Pune center"
            className="p-2 rounded-lg border backdrop-blur-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors shadow-lg"
            style={{
              background: "rgba(10, 15, 26, 0.88)",
              borderColor: "rgba(148, 163, 184, 0.18)",
            }}
          >
            <span className="text-xs">🎯</span>
          </button>
        )}
      </div>
    </header>
  );
}
