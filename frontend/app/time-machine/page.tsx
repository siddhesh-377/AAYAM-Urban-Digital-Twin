"use client";
// app/time-machine/page.tsx — AYAM Pollution Time Machine
// Dynamic historical timeline & diurnal cycle analysis.
// Allows users to scrub through 24-hour atmospheric cycles or compare two distinct historical periods.

import React, { useState, useEffect, useRef } from "react";
import { PuneMap } from "@/components/PuneMap";
import { StatusBadge } from "@/components/StatusBadge";
import { LayerManager } from "@/components/LayerManager";
import { api, Observation, getPm25Category } from "@/lib/api";
import { useAyam } from "@/context/AyamContext";

// Diurnal profile with meteorological flux multipliers calibrated for Pune airshed
const DIURNAL_PROFILES: { hour: number; label: string; timeStr: string; fluxMult: number; trafficMult: number; blhMeters: number; desc: string }[] = [
  { hour: 0,  label: "Midnight",       timeStr: "00:00", fluxMult: 1.12, trafficMult: 0.35, blhMeters: 280, desc: "Surface cooling and nocturnal boundary layer compression" },
  { hour: 2,  label: "Late Night",     timeStr: "02:00", fluxMult: 1.25, trafficMult: 0.20, blhMeters: 210, desc: "Strong thermal inversion traps residual particulates" },
  { hour: 4,  label: "Pre-Dawn",       timeStr: "04:00", fluxMult: 1.30, trafficMult: 0.25, blhMeters: 190, desc: "Lowest atmospheric mixing height; stagnant wind" },
  { hour: 6,  label: "Dawn",           timeStr: "06:00", fluxMult: 1.20, trafficMult: 0.65, blhMeters: 260, desc: "Cold pool in Mutha-Mula valley; sunrise solar onset" },
  { hour: 8,  label: "Morning Peak",   timeStr: "08:00", fluxMult: 1.38, trafficMult: 1.45, blhMeters: 380, desc: "Peak commuter influx on Karve, FC, and Pune-Nashik corridors" },
  { hour: 10, label: "Mid-Morning",    timeStr: "10:00", fluxMult: 1.15, trafficMult: 1.10, blhMeters: 620, desc: "Solar boundary layer expansion disperses ground emissions" },
  { hour: 12, label: "Noon",           timeStr: "12:00", fluxMult: 0.88, trafficMult: 0.85, blhMeters: 980, desc: "Thermal convection lifts pollution into higher troposphere" },
  { hour: 14, label: "Afternoon",      timeStr: "14:00", fluxMult: 0.72, trafficMult: 0.75, blhMeters: 1350, desc: "Maximum ventilation; diurnal PM2.5 minimum" },
  { hour: 16, label: "Late Afternoon", timeStr: "16:00", fluxMult: 0.82, trafficMult: 0.95, blhMeters: 1100, desc: "Solar heating decreases; atmospheric mixing begins decay" },
  { hour: 18, label: "Dusk / Peak",    timeStr: "18:00", fluxMult: 1.18, trafficMult: 1.50, blhMeters: 650, desc: "Evening commute traffic surge + commercial cooking onset" },
  { hour: 20, label: "Evening Surge",  timeStr: "20:00", fluxMult: 1.32, trafficMult: 1.30, blhMeters: 420, desc: "Heavy freight truck entry into PMC & PCMC arterials" },
  { hour: 22, label: "Night",          timeStr: "22:00", fluxMult: 1.20, trafficMult: 0.60, blhMeters: 320, desc: "Boundary layer collapses; emissions trapped near ground" },
];

export default function TimeMachinePage() {
  const {
    selectedRegion,
    setSelectedStationId,
    setSelectedStation,
    setIsLocationDrawerOpen,
    layers,
  } = useAyam();

  const [observations, setObservations] = useState<Observation[]>([]);
  const [activeHour, setActiveHour] = useState<number>(14); // 14:00 default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareHourA, setCompareHourA] = useState<number>(8);  // 08:00 (Peak)
  const [compareHourB, setCompareHourB] = useState<number>(14); // 14:00 (Clean)

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.overview();
        setObservations(res.stations || []);
      } catch (err) {
        console.error("[AYAM Time Machine] Load error:", err);
      }
    }
    loadData();
  }, []);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 2000 / playbackSpeed;
    timerRef.current = setInterval(() => {
      setActiveHour((prev) => {
        const idx = DIURNAL_PROFILES.findIndex((p) => p.hour === prev);
        const nextIdx = (idx + 1) % DIURNAL_PROFILES.length;
        return DIURNAL_PROFILES[nextIdx].hour;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const currentProfile = DIURNAL_PROFILES.find((p) => p.hour === activeHour) || DIURNAL_PROFILES[6];

  // Adjust observed station values based on diurnal flux factor
  const adjustedObservations = observations.map((st) => ({
    ...st,
    pm25: Math.round(st.pm25 * currentProfile.fluxMult * 10) / 10,
    data_status: "MODELED" as any,
  }));

  const handleStationClick = (stationId: string) => {
    setSelectedStationId(stationId);
    const st = adjustedObservations.find((o) => o.station_id === stationId) || null;
    setSelectedStation(st);
    setIsLocationDrawerOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-5.25rem)] overflow-hidden bg-[#070c14]">
      {/* Top Header Controls: Mode & Status */}
      <div className="z-[1100] px-4 py-2 border-b border-slate-800/80 bg-[#080e18]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Pollution Time Machine
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              Temporal Engine
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Mode Switcher */}
          <div className="flex rounded-md bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
            <button
              onClick={() => setCompareMode(false)}
              className={`px-2.5 py-0.5 rounded transition-all ${
                !compareMode ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Diurnal Scrubbing (24h)
            </button>
            <button
              onClick={() => setCompareMode(true)}
              className={`px-2.5 py-0.5 rounded transition-all ${
                compareMode ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Period Comparison Mode
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <StatusBadge status="MODELED" size="sm" />
          <span className="text-slate-400 hidden sm:inline">Diurnal Flux Model: Pune Atmospheric Boundary</span>
        </div>
      </div>

      {/* Main Area: Map + Timeline HUD */}
      <div className="relative flex-1 w-full h-full min-h-0">
        <PuneMap
          observations={adjustedObservations}
          onStationClick={handleStationClick}
          onHotspotClick={handleStationClick}
          showIndustrial={layers.showIndustrialZones}
          showCorridors={layers.showTrafficCorridors}
          showWindField={layers.showWindField}
          show3DBuildings={layers.show3DBuildings}
          aerosolFluxMultiplier={currentProfile.fluxMult}
          trafficMultiplier={currentProfile.trafficMult}
        />
        <LayerManager />

        {/* Comparison Mode Split Card */}
        {compareMode && (
          <div className="absolute top-3 right-3 z-[1100] w-80 bg-[#090f1d]/95 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 shadow-2xl backdrop-blur-xl space-y-3 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Compare Diurnal Periods
              </span>
              <StatusBadge status="MODELED" size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-amber-400 font-bold mb-1">Period A (Morning)</div>
                <select
                  value={compareHourA}
                  onChange={(e) => setCompareHourA(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-white"
                >
                  {DIURNAL_PROFILES.map((p) => (
                    <option key={p.hour} value={p.hour}>
                      {p.timeStr} ({p.label})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] font-bold text-slate-200">
                  Flux: {DIURNAL_PROFILES.find((p) => p.hour === compareHourA)?.fluxMult}x
                </div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-sky-400 font-bold mb-1">Period B (Afternoon)</div>
                <select
                  value={compareHourB}
                  onChange={(e) => setCompareHourB(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-white"
                >
                  {DIURNAL_PROFILES.map((p) => (
                    <option key={p.hour} value={p.hour}>
                      {p.timeStr} ({p.label})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] font-bold text-slate-200">
                  Flux: {DIURNAL_PROFILES.find((p) => p.hour === compareHourB)?.fluxMult}x
                </div>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Diurnal Delta (A vs B):</span>
                <span className="text-amber-400 font-bold">
                  +{(((DIURNAL_PROFILES.find((p) => p.hour === compareHourA)?.fluxMult ?? 1) -
                    (DIURNAL_PROFILES.find((p) => p.hour === compareHourB)?.fluxMult ?? 1)) * 100).toFixed(0)}% Surge
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Morning rush produces higher surface concentrations due to shallow thermal inversion boundary layer.
              </div>
            </div>
          </div>
        )}

        {/* Bottom Floating Interactive Timeline Scrubber */}
        {!compareMode && (
          <div className="absolute bottom-4 inset-x-4 z-[1100] max-w-4xl mx-auto pointer-events-auto">
            <div className="bg-[#090f1d]/95 border border-slate-800 rounded-xl p-3.5 shadow-2xl backdrop-blur-xl text-slate-200 space-y-2.5">
              {/* Playback Controls & Time Display */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-all shadow-md"
                    title={isPlaying ? "Pause Timeline" : "Play Diurnal Simulation"}
                  >
                    {isPlaying ? "❚❚" : "▶"}
                  </button>

                  <div className="flex items-center gap-1 font-mono text-xs">
                    {([1, 2, 4] as const).map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-0.5 rounded border text-[10px] ${
                          playbackSpeed === spd
                            ? "bg-slate-700 border-slate-600 text-white font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-xl font-black text-sky-400 tracking-tight">
                      {currentProfile.timeStr} IST
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      ({currentProfile.label})
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
                  <div className="text-slate-400">
                    BLH: <strong className="text-slate-200">{currentProfile.blhMeters}m</strong>
                  </div>
                  <div className="text-slate-400">
                    Aerosol Flux: <strong className="text-amber-400">{currentProfile.fluxMult}x</strong>
                  </div>
                  <div className="text-slate-400">
                    Traffic Load: <strong className="text-sky-400">{currentProfile.trafficMult}x</strong>
                  </div>
                </div>
              </div>

              {/* Scrubber Track with Key Point Ticks */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={DIURNAL_PROFILES.length - 1}
                  step={1}
                  value={DIURNAL_PROFILES.findIndex((p) => p.hour === activeHour)}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setActiveHour(DIURNAL_PROFILES[idx].hour);
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-800 accent-sky-400"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
                  {DIURNAL_PROFILES.filter((_, i) => i % 2 === 0).map((p) => (
                    <span
                      key={p.hour}
                      onClick={() => setActiveHour(p.hour)}
                      className={`cursor-pointer hover:text-sky-300 transition-colors ${
                        activeHour === p.hour ? "text-sky-400 font-bold" : ""
                      }`}
                    >
                      {p.timeStr}
                    </span>
                  ))}
                </div>
              </div>

              {/* Meteorological Context Explanation */}
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                <span className="truncate pr-2">{currentProfile.desc}</span>
                <span className="text-slate-400 shrink-0 font-bold">
                  Data Status: MODELED HISTORICAL
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
