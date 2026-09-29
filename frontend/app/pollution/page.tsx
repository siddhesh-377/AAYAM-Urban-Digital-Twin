"use client";
// app/pollution/page.tsx — AYAM Spatial Pollution Monitor
// Professional spatial monitoring of PM2.5 across Pune and PCMC.
// Clearly distinguishes direct ground station observations from continuous derived surfaces.

import React, { useEffect, useState } from "react";
import { PuneMap } from "@/components/PuneMap";
import { StatusBadge } from "@/components/StatusBadge";
import { LayerManager } from "@/components/LayerManager";
import { api, Observation, getPm25Category, formatTimestamp } from "@/lib/api";
import { useAyam } from "@/context/AyamContext";

export default function PollutionPage() {
  const {
    selectedRegion,
    setSelectedStationId,
    setSelectedStation,
    setIsLocationDrawerOpen,
    layers,
    setLayer,
  } = useAyam();

  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedPollutant, setSelectedPollutant] = useState<"PM25" | "PM10" | "NO2">("PM25");
  const [timeWindow, setTimeWindow] = useState<"CURRENT" | "24H" | "7D">("CURRENT");
  const [surfaceMode, setSurfaceMode] = useState<"HEATMAP" | "STATIONS_ONLY">("HEATMAP");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStations() {
      try {
        setIsLoading(true);
        const res = await api.overview();
        setObservations(res.stations || []);
      } catch (err) {
        console.error("[AYAM Pollution] Failed to load observations:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStations();
  }, []);

  const handleStationClick = (stationId: string) => {
    setSelectedStationId(stationId);
    const st = observations.find((o) => o.station_id === stationId) || null;
    setSelectedStation(st);
    setIsLocationDrawerOpen(true);
  };

  // Sync surfaceMode with layer state
  useEffect(() => {
    if (surfaceMode === "HEATMAP") {
      setLayer("showHeatmap", true);
    } else {
      setLayer("showHeatmap", false);
    }
  }, [surfaceMode, setLayer]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-5.25rem)] overflow-hidden bg-[#070c14]">
      {/* Top Controls: Pollutant, Time Window, and Surface Mode */}
      <div className="z-[1100] px-4 py-2 border-b border-slate-800/80 bg-[#080e18]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pollutant Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
              Pollutant:
            </span>
            <div className="flex rounded-md bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
              <button
                onClick={() => setSelectedPollutant("PM25")}
                className={`px-2.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                  selectedPollutant === "PM25"
                    ? "bg-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>PM2.5</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </button>
              <button
                onClick={() => setSelectedPollutant("PM10")}
                className={`px-2.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                  selectedPollutant === "PM10"
                    ? "bg-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>PM10</span>
                <span className="text-[9px] text-slate-400">(N/A)</span>
              </button>
              <button
                onClick={() => setSelectedPollutant("NO2")}
                className={`px-2.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                  selectedPollutant === "NO2"
                    ? "bg-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>NO₂</span>
                <span className="text-[9px] text-slate-400">(N/A)</span>
              </button>
            </div>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Surface Representation */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
              Display Mode:
            </span>
            <div className="flex rounded-md bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
              <button
                onClick={() => setSurfaceMode("HEATMAP")}
                className={`px-2.5 py-0.5 rounded transition-all ${
                  surfaceMode === "HEATMAP"
                    ? "bg-sky-950 text-sky-300 font-bold border border-sky-600/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Derived Heat Surface
              </button>
              <button
                onClick={() => setSurfaceMode("STATIONS_ONLY")}
                className={`px-2.5 py-0.5 rounded transition-all ${
                  surfaceMode === "STATIONS_ONLY"
                    ? "bg-emerald-950 text-emerald-300 font-bold border border-emerald-600/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Direct Sensors Only
              </button>
            </div>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Time Window */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
              Cadence:
            </span>
            <div className="flex rounded-md bg-slate-900 border border-slate-800 p-0.5">
              {(["CURRENT", "24H", "7D"] as const).map((tw) => (
                <button
                  key={tw}
                  onClick={() => setTimeWindow(tw)}
                  className={`px-2 py-0.5 rounded ${
                    timeWindow === tw ? "bg-slate-700 text-white font-bold" : "text-slate-400"
                  }`}
                >
                  {tw}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {surfaceMode === "HEATMAP" ? (
            <StatusBadge status="DERIVED" size="sm" />
          ) : (
            <StatusBadge status="OBSERVED" size="sm" />
          )}
        </div>
      </div>

      {/* Surface Methodology Disclaimer Banner */}
      {surfaceMode === "HEATMAP" && (
        <div className="z-[1050] bg-cyan-950/40 border-b border-cyan-800/30 px-4 py-1 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>ℹ</span>
            <span>
              Continuous PM2.5 field is modeled using spatial inverse-distance weighting (IDW) interpolation from ground sensors.
              Values between monitoring stations are <strong>DERIVED</strong> approximations, not direct ground measurements.
            </span>
          </div>
          <span className="text-[10px] text-cyan-400 underline cursor-pointer">
            View Interpolation Math
          </span>
        </div>
      )}

      {selectedPollutant !== "PM25" && (
        <div className="z-[1050] bg-amber-950/40 border-b border-amber-800/30 px-4 py-1 text-[11px] font-mono text-amber-300 flex items-center gap-2">
          <span>⚠</span>
          <span>
            {selectedPollutant} sensor feeds are currently unvalidated for Pune airshed stations. Displaying PM2.5 baseline instead. No fabricated {selectedPollutant} values are shown.
          </span>
        </div>
      )}

      {/* Main Content: Split Map & Station Observation Registry */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* Map Area */}
        <div className="flex-1 relative h-full min-h-[400px]">
          <PuneMap
            observations={observations}
            onStationClick={handleStationClick}
            onHotspotClick={handleStationClick}
            showIndustrial={layers.showIndustrialZones}
            showCorridors={layers.showTrafficCorridors}
            showWindField={layers.showWindField}
            show3DBuildings={layers.show3DBuildings}
          />
          <LayerManager />
        </div>

        {/* Station Observations Table Panel */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#090f1d] flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Ground Stations Network
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {observations.length} Validated Sensors Reporting
              </p>
            </div>
            <StatusBadge status="OBSERVED" size="sm" />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 text-xs">
            {observations.map((st) => {
              const cat = getPm25Category(st.pm25);
              const isPcmc = st.station_id.includes("BHOSARI") || st.station_id.includes("WAKAD");

              return (
                <button
                  key={st.station_id}
                  onClick={() => handleStationClick(st.station_id)}
                  className="w-full text-left p-3 hover:bg-slate-800/50 transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                        {isPcmc ? "PCMC" : "PMC"}
                      </span>
                      <span className="font-semibold text-slate-200 group-hover:text-sky-300 transition-colors truncate">
                        {st.station_name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <span>Source: {st.source}</span>
                      <span>•</span>
                      <span>{formatTimestamp(st.timestamp)}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="font-mono text-base font-bold" style={{ color: cat.color }}>
                        {st.pm25.toFixed(1)}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">µg/m³</span>
                    </div>
                    <div
                      className="text-[9px] font-mono font-semibold px-1 rounded inline-block"
                      style={{ color: cat.color, backgroundColor: cat.bgColor }}
                    >
                      {cat.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Table Footer: NAAQS Benchmark Reference */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[10px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>National Standard (NAAQS 24h):</span>
              <span className="text-slate-200 font-bold">60 µg/m³</span>
            </div>
            <div className="flex justify-between">
              <span>WHO Guideline (24h):</span>
              <span className="text-slate-200 font-bold">15 µg/m³</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
