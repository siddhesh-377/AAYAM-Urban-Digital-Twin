"use client";
// components/aeris/SimulationTimeline.tsx
// Cities: Skylines-inspired continuous urban simulation timeline scrubber

import React, { useEffect, useState } from "react";

export interface TimelineHourState {
  hourIndex: number; // 0 to 23 (or +1h .. +24h)
  displayLabel: string;
  solarState: "NIGHT" | "DAWN" | "DAY" | "DUSK";
  trafficWeight: number; // 0.4 to 1.8 multiplier
  atmosphericStability: "INVERSION" | "NEUTRAL" | "DISPERSIVE";
  pm25DiurnalMultiplier: number;
}

interface SimulationTimelineProps {
  currentHourIndex: number;
  onHourChange: (hourIndex: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  playbackSpeed: 1 | 2 | 5;
  onSpeedChange: (speed: 1 | 2 | 5) => void;
  forecastHorizon?: number; // 0 for today, 1..24 for forecast
  mode?: "OBSERVE" | "FORECAST";
}

// 24-hour diurnal profile based on Pune environmental meteorological patterns
export const PUNE_DIURNAL_TIMELINE: TimelineHourState[] = [
  { hourIndex: 0,  displayLabel: "00:00", solarState: "NIGHT", trafficWeight: 0.35, atmosphericStability: "INVERSION", pm25DiurnalMultiplier: 1.18 },
  { hourIndex: 2,  displayLabel: "02:00", solarState: "NIGHT", trafficWeight: 0.25, atmosphericStability: "INVERSION", pm25DiurnalMultiplier: 1.25 },
  { hourIndex: 4,  displayLabel: "04:00", solarState: "NIGHT", trafficWeight: 0.30, atmosphericStability: "INVERSION", pm25DiurnalMultiplier: 1.30 },
  { hourIndex: 6,  displayLabel: "06:00", solarState: "DAWN",  trafficWeight: 0.85, atmosphericStability: "INVERSION", pm25DiurnalMultiplier: 1.35 },
  { hourIndex: 8,  displayLabel: "08:00", solarState: "DAY",   trafficWeight: 1.70, atmosphericStability: "NEUTRAL",   pm25DiurnalMultiplier: 1.42 },
  { hourIndex: 10, displayLabel: "10:00", solarState: "DAY",   trafficWeight: 1.40, atmosphericStability: "DISPERSIVE",pm25DiurnalMultiplier: 1.15 },
  { hourIndex: 12, displayLabel: "12:00", solarState: "DAY",   trafficWeight: 1.10, atmosphericStability: "DISPERSIVE",pm25DiurnalMultiplier: 0.85 },
  { hourIndex: 14, displayLabel: "14:00", solarState: "DAY",   trafficWeight: 1.15, atmosphericStability: "DISPERSIVE",pm25DiurnalMultiplier: 0.78 },
  { hourIndex: 16, displayLabel: "16:00", solarState: "DAY",   trafficWeight: 1.35, atmosphericStability: "NEUTRAL",   pm25DiurnalMultiplier: 0.95 },
  { hourIndex: 18, displayLabel: "18:00", solarState: "DUSK",  trafficWeight: 1.85, atmosphericStability: "NEUTRAL",   pm25DiurnalMultiplier: 1.38 },
  { hourIndex: 20, displayLabel: "20:00", solarState: "NIGHT", trafficWeight: 1.50, atmosphericStability: "INVERSION", pm25DiurnalMultiplier: 1.45 },
  { hourIndex: 22, displayLabel: "22:00", solarState: "NIGHT", trafficWeight: 0.80, atmosphericStability: "INVERSION", pm25DiurnalMultiplier: 1.28 },
];

export function SimulationTimeline({
  currentHourIndex,
  onHourChange,
  isPlaying,
  onPlayToggle,
  playbackSpeed,
  onSpeedChange,
  mode = "OBSERVE",
}: SimulationTimelineProps) {
  // Find current step
  const activeStep =
    PUNE_DIURNAL_TIMELINE.find((s) => s.hourIndex === currentHourIndex) ||
    PUNE_DIURNAL_TIMELINE[5]; // Default to morning

  return (
    <div className="absolute bottom-4 inset-x-4 md:inset-x-16 lg:inset-x-28 z-[1100] pointer-events-none select-none flex justify-center">
      <div
        className="pointer-events-auto w-full max-w-4xl p-3 rounded-xl border shadow-2xl backdrop-blur-md flex flex-col gap-2 transition-all"
        style={{
          background: "rgba(10, 16, 28, 0.92)",
          borderColor: "rgba(148, 163, 184, 0.22)",
        }}
      >
        {/* Top Scrubber Row */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-300 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              SIMULATION TIMELINE
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold">{activeStep.displayLabel} IST</span>
            <span className="text-[10px] text-slate-400">
              ({activeStep.solarState} · {activeStep.atmosphericStability})
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-400">
              Traffic Flux:{" "}
              <strong className="text-sky-300 font-mono">
                {activeStep.trafficWeight.toFixed(2)}x
              </strong>
            </span>
            <span className="text-slate-400">
              Aerosol Dispersion:{" "}
              <strong className="text-orange-300 font-mono">
                {activeStep.pm25DiurnalMultiplier.toFixed(2)}x
              </strong>
            </span>
          </div>
        </div>

        {/* Interactive Scrub Rail */}
        <div className="relative w-full flex items-center px-1">
          <input
            type="range"
            min={0}
            max={22}
            step={2}
            value={currentHourIndex}
            onChange={(e) => onHourChange(Number(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-emerald-400 hover:accent-emerald-300 transition-all"
          />
        </div>

        {/* Hour markers & Play Controls Row */}
        <div className="flex items-center justify-between pt-1">
          {/* Play/Pause & Speed Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPlayToggle}
              className={`px-3 py-1 rounded text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                isPlaying
                  ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              <span>{isPlaying ? "⏸" : "▶"}</span>
              <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
            </button>

            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                  playbackSpeed === spd
                    ? "bg-slate-700 text-white border border-slate-500"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {spd}X
              </button>
            ))}
          </div>

          {/* Key Time Markers */}
          <div className="flex items-center gap-3 sm:gap-6 text-[10px] font-mono text-slate-400">
            {PUNE_DIURNAL_TIMELINE.map((step) => {
              const isSelected = step.hourIndex === currentHourIndex;
              return (
                <button
                  key={step.hourIndex}
                  onClick={() => onHourChange(step.hourIndex)}
                  className={`hover:text-slate-200 transition-colors ${
                    isSelected ? "text-emerald-400 font-bold scale-110" : ""
                  }`}
                >
                  {step.displayLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
