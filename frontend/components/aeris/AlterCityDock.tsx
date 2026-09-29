"use client";

import React, { useState } from "react";
import type { ScenarioRequest, ScenarioResponse } from "@/lib/types";

interface AlterCityDockProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (req: ScenarioRequest) => Promise<ScenarioResponse | null>;
  isSimulating: boolean;
  scenarioResult: ScenarioResponse | null;
  onResetScenario: () => void;
  compareMode: "after" | "split" | "baseline";
  setCompareMode: (mode: "after" | "split" | "baseline") => void;
  onAskGemini?: (result: ScenarioResponse) => void;
}

export function AlterCityDock({
  isOpen,
  onClose,
  onSimulate,
  isSimulating,
  scenarioResult,
  onResetScenario,
  compareMode,
  setCompareMode,
  onAskGemini,
}: AlterCityDockProps) {
  const [trafficReduction, setTrafficReduction] = useState(25);
  const [industrialReduction, setIndustrialReduction] = useState(20);
  const [greenCoverage, setGreenCoverage] = useState(10);
  const [durationHours, setDurationHours] = useState<number>(3);
  const [selectedCorridor, setSelectedCorridor] = useState("karve_road");
  const [selectedZone, setSelectedZone] = useState("bhosari_midc");

  if (!isOpen) return null;

  const handleRun = async () => {
    const req: ScenarioRequest = {
      scenario_name: `Intervention_${selectedCorridor}_-${trafficReduction}%_T`,
      traffic_reduction_pct: trafficReduction,
      industrial_reduction_pct: industrialReduction,
      green_buffer_increase_pct: greenCoverage,
      target_zones: [selectedZone, selectedCorridor],
      duration_hours: durationHours,
    };
    await onSimulate(req);
  };

  return (
    <aside
      aria-label="Simulation controls"
      className="absolute top-16 right-5 z-30 w-80 md:w-96 rounded-xl bg-slate-950/92 backdrop-blur-md border border-slate-800 text-slate-200 shadow-2xl p-4 transition-all duration-300 font-mono text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-400 animate-pulse" />
          <span className="font-semibold text-slate-100 tracking-wider text-xs">
            ALTER THE CITY
          </span>
          <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded font-mono">
            SCENARIO
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/50 hover:bg-slate-800 transition text-[11px]"
        >
          ✕
        </button>
      </div>

      {/* Corridor & Target Zones */}
      <div className="mt-3 space-y-3">
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
            Primary Target Corridor
          </label>
          <select
            value={selectedCorridor}
            onChange={(e) => setSelectedCorridor(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
          >
            <option value="karve_road">Karve Road Corridor (Deccan → Kothrud)</option>
            <option value="fc_road">FC Road & JM Road Commercial Grid</option>
            <option value="pune_solapur">Pune-Solapur Highway (Hadapsar Segment)</option>
            <option value="mumbai_bangalore">Mumbai-Bengaluru Bypass (Wakad → Chandani)</option>
            <option value="nagar_road">Nagar Road Industrial Arterial (Viman Nagar)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
            Industrial Cluster Focus
          </label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
          >
            <option value="bhosari_midc">Bhosari & PCMC MIDC Cluster</option>
            <option value="hadapsar_industrial">Hadapsar Industrial Estate</option>
            <option value="chakan_midc">Chakan Auto-Hub Buffer Zone</option>
            <option value="all_midc">Citywide Coordinated Industrial Curtailment</option>
          </select>
        </div>

        {/* Sliders */}
        <div className="space-y-3 pt-2 border-t border-slate-800/60">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300">TRAFFIC RESTRICTION</span>
              <span className="text-amber-400 font-bold">{trafficReduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={trafficReduction}
              onChange={(e) => setTrafficReduction(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
              <span>0% Normal</span>
              <span>40% Diversion</span>
              <span>80% EV Only</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300">INDUSTRIAL EMISSION CONTROL</span>
              <span className="text-emerald-400 font-bold">{industrialReduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={industrialReduction}
              onChange={(e) => setIndustrialReduction(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
              <span>0% Baselines</span>
              <span>30% Scrubber</span>
              <span>60% Curtailment</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300">URBAN GREEN CANOPY BUFFER</span>
              <span className="text-teal-400 font-bold">{greenCoverage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="5"
              value={greenCoverage}
              onChange={(e) => setGreenCoverage(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Simulation Horizon */}
        <div className="pt-2 border-t border-slate-800/60">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
            Intervention Duration Horizon
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 3, 6, 12].map((dur) => (
              <button
                key={dur}
                onClick={() => setDurationHours(dur)}
                className={`py-1 rounded text-center font-mono text-[11px] transition ${
                  durationHours === dur
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {dur}H
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleRun}
            disabled={isSimulating}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold tracking-wide transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>COMPUTING XGBOOST SCENARIO...</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>RUN SIMULATION</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scenario Results / Spatial Consequence Inspection */}
      {scenarioResult && (
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <span>✓</span>
              Modeled Consequence Computed
            </span>
            <button
              onClick={onResetScenario}
              className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              ↺ Reset
            </button>
          </div>

          <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Baseline City Mean:</span>
              <span className="text-slate-200 font-semibold">
                {scenarioResult.baseline_pm25.toFixed(1)} µg/m³
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Scenario City Mean:</span>
              <span className="text-emerald-400 font-bold">
                {scenarioResult.scenario_pm25.toFixed(1)} µg/m³
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">Net Estimated Delta:</span>
              <span className="text-emerald-400 font-bold">
                -{scenarioResult.percent_change.toFixed(1)}% (
                {scenarioResult.absolute_change.toFixed(1)} µg/m³)
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/60 text-[10px]">
              <span className="text-slate-400">Confidence Band:</span>
              <span
                className={`px-1.5 py-0.2 rounded font-semibold ${
                  scenarioResult.confidence_level === "high"
                    ? "text-emerald-400 bg-emerald-950/60 border border-emerald-800"
                    : scenarioResult.confidence_level === "medium"
                    ? "text-amber-400 bg-amber-950/60 border border-amber-800"
                    : "text-rose-400 bg-rose-950/60 border border-rose-800"
                }`}
              >
                {scenarioResult.confidence_level.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Spatial Comparison View Controls */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Spatial Comparison on Map
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setCompareMode("baseline")}
                className={`py-1 rounded text-center font-mono text-[10px] transition ${
                  compareMode === "baseline"
                    ? "bg-slate-700 text-white font-bold"
                    : "bg-slate-900 border border-slate-800 text-slate-400"
                }`}
              >
                Baseline
              </button>
              <button
                onClick={() => setCompareMode("after")}
                className={`py-1 rounded text-center font-mono text-[10px] transition ${
                  compareMode === "after"
                    ? "bg-emerald-600 text-white font-bold"
                    : "bg-slate-900 border border-slate-800 text-slate-400"
                }`}
              >
                Scenario Map
              </button>
              <button
                onClick={() => setCompareMode("split")}
                className={`py-1 rounded text-center font-mono text-[10px] transition ${
                  compareMode === "split"
                    ? "bg-amber-600 text-white font-bold"
                    : "bg-slate-900 border border-slate-800 text-slate-400"
                }`}
              >
                Delta Field
              </button>
            </div>
          </div>

          {/* AI Briefing Trigger */}
          {onAskGemini && (
            <button
              onClick={() => onAskGemini(scenarioResult)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 font-semibold text-[11px] transition"
            >
              <span>✨</span>
              Explain This Scenario with Gemini
            </button>
          )}

          <div className="text-[9px] text-slate-500 italic leading-tight">
            * Model-derived counterfactual prediction from XGBoost surrogate model. Does not represent unmeasured empirical reality.
          </div>
        </div>
      )}
    </aside>
  );
}
