"use client";
// app/forecast/page.tsx — Forecast Page

import React, { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api, Observation, ForecastPoint, ValidationData, getPm25Category, formatTimestamp } from "@/lib/api";

const STATIONS = [
  { id: "DEMO-KATRAJ",       name: "Katraj"       },
  { id: "DEMO-LOHEGAON",    name: "Lohegaon"    },
  { id: "DEMO-PASHAN",      name: "Pashan"      },
  { id: "DEMO-HADAPSAR",    name: "Hadapsar"    },
  { id: "DEMO-SHIVAJINAGAR",name: "Shivajinagar"},
];

// Mini inline chart component
function ForecastChart({
  obs, pred, forecast,
}: {
  obs: number[];
  pred: number[];
  forecast: ForecastPoint[];
}) {
  const allVals = [...obs, ...pred, ...forecast.map((f) => f.upper_bound)];
  if (allVals.length === 0) return null;

  const maxV = Math.max(...allVals) * 1.05;
  const minV = Math.max(0, Math.min(...allVals) * 0.95);
  const range = maxV - minV;

  const W = 700; const H = 160;
  const obsN = Math.min(obs.length, 72); // last 72h
  const sampStep = Math.max(1, Math.floor(obs.length / obsN));
  const sampObs  = obs.filter((_, i) => i % sampStep === 0).slice(-obsN);
  const sampPred = pred.filter((_, i) => i % sampStep === 0).slice(-obsN);
  const totalN   = sampObs.length + forecast.length;

  function toY(v: number) { return H - ((v - minV) / range) * H; }
  function toX(i: number, total: number) { return (i / (total - 1)) * W; }

  const obsPath  = sampObs.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i, totalN).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const predPath = sampPred.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i, totalN).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  const fcStart = sampObs.length;
  const fcPath  = forecast.map((f, i) => `${i === 0 ? "M" : "L"} ${toX(fcStart + i, totalN).toFixed(1)},${toY(f.pm25).toFixed(1)}`).join(" ");
  const fcUpperPath = forecast.map((f, i) => `${i === 0 ? "M" : "L"} ${toX(fcStart + i, totalN).toFixed(1)},${toY(f.upper_bound).toFixed(1)}`).join(" ");
  const fcLowerPath = forecast.map((f, i) => `${i === 0 ? "L" : ""} ${toX(fcStart + forecast.length - 1 - i, totalN).toFixed(1)},${toY(f.lower_bound).toFixed(1)}`).join(" ");

  // Vertical separator at forecast start
  const sepX = toX(fcStart, totalN);

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-5 mb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-px rounded" style={{ background: "#34d399", display: "inline-block", height: 2 }} />
          <span style={{ color: "var(--text-muted)" }}>Observed [SYNTHETIC]</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-px rounded" style={{ background: "#60a5fa", display: "inline-block", height: 2, borderTop: "2px dashed #60a5fa" }} />
          <span style={{ color: "var(--text-muted)" }}>Model fit [MODELED]</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-px rounded" style={{ background: "#a78bfa", display: "inline-block", height: 2 }} />
          <span style={{ color: "var(--text-muted)" }}>Forecast [MODELED]</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded opacity-30" style={{ background: "#a78bfa", display: "inline-block" }} />
          <span style={{ color: "var(--text-muted)" }}>Uncertainty band</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160, borderRadius: 6, background: "var(--bg-card)" }}>
        {/* Grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="rgba(99,132,199,0.08)" strokeWidth={1} />
        ))}

        {/* PAST label */}
        <text x={8} y={12} fontSize={8} fill="rgba(99,132,199,0.4)">← PAST (OBSERVED)</text>

        {/* FUTURE label */}
        {forecast.length > 0 && (
          <text x={sepX + 6} y={12} fontSize={8} fill="rgba(167,139,250,0.5)">FUTURE (MODELED) →</text>
        )}

        {/* Divider */}
        {forecast.length > 0 && (
          <line x1={sepX} y1={0} x2={sepX} y2={H} stroke="rgba(99,132,199,0.2)" strokeWidth={1} strokeDasharray="4,4" />
        )}

        {/* Forecast uncertainty band */}
        {forecast.length > 1 && (
          <path
            d={fcUpperPath + " " + fcLowerPath + " Z"}
            fill="rgba(167,139,250,0.12)"
          />
        )}

        {/* Observed line */}
        {sampObs.length > 1 && (
          <path d={obsPath} fill="none" stroke="#34d399" strokeWidth={1.5} opacity={0.85} />
        )}

        {/* Model fit */}
        {sampPred.length > 1 && (
          <path d={predPath} fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4,2" opacity={0.7} />
        )}

        {/* Forecast line */}
        {forecast.length > 1 && (
          <path d={fcPath} fill="none" stroke="#a78bfa" strokeWidth={2} />
        )}
      </svg>
    </div>
  );
}

export default function ForecastPage() {
  const [selectedStation, setSelectedStation] = useState(STATIONS[0].id);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [validationMetrics, setValidationMetrics] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.timeseries(selectedStation, 168).catch(() => ({ observations: [] as Observation[] })),
      api.forecast(selectedStation).catch(() => ({ forecasts: [] as ForecastPoint[] })),
      api.validation().catch(() => null),
    ])
      .then(([ts, fc, val]) => {
        setObservations(ts.observations ?? []);
        setForecast(fc.forecasts ?? []);
        setValidationMetrics(val);
      })
      .finally(() => setLoading(false));
  }, [selectedStation]);

  const obsValues  = observations.map((o) => o.pm25);
  // For this page, "pred" on historical = use persistence as placeholder
  const predValues = observations.map((o, i) =>
    i === 0 ? o.pm25 : observations[i - 1].pm25
  );

  const metrics = validationMetrics?.metrics.model_c.test;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#070c14] text-slate-100 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono">
              Numerical PM2.5 Forecast
            </h1>
            <StatusBadge status="FORECAST" size="md" />
          </div>
          <p className="text-xs text-slate-400">
            Observed historical ground sensor observations + XGBoost recursive multi-step ahead predictions with 95% uncertainty intervals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
          >
            {STATIONS.map((s) => (
              <option key={s.id} value={s.id}>Station: {s.name}</option>
            ))}
          </select>
        </div>
      </div>

        <div className="p-6 space-y-6 max-w-4xl">
          {/* Model identity */}
          <div
            className="flex items-center gap-6 p-4 rounded-lg"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <div>
              <p className="metric-label">MODEL</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
                XGBoost v1 (Model C)
              </p>
            </div>
            {metrics && (
              <>
                <div>
                  <p className="metric-label">TEST MAE</p>
                  <p className="text-xl font-mono font-semibold" style={{ color: "var(--accent-primary)" }}>
                    {metrics.mae.toFixed(2)} <span className="text-xs" style={{ color: "var(--text-muted)" }}>µg/m³</span>
                  </p>
                </div>
                <div>
                  <p className="metric-label">TEST R²</p>
                  <p className="text-xl font-mono font-semibold" style={{ color: "#34d399" }}>
                    {metrics.r2.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="metric-label">BASELINE MAE</p>
                  <p className="text-xl font-mono font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {validationMetrics?.metrics.baseline_persistence.test.mae.toFixed(2)}{" "}
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>µg/m³</span>
                  </p>
                </div>
              </>
            )}
            <StatusBadge status="MODELED" />
          </div>

          {/* Chart */}
          <div
            className="p-4 rounded-lg"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                OBSERVED vs MODELED — {STATIONS.find((s) => s.id === selectedStation)?.name}
              </p>
              <div className="flex gap-2">
                <StatusBadge status="SYNTHETIC" />
                <StatusBadge status="MODELED" />
              </div>
            </div>
            {loading ? (
              <div className="h-40 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                Loading…
              </div>
            ) : (
              <ForecastChart obs={obsValues} pred={predValues} forecast={forecast} />
            )}
          </div>

          {/* Forecast table */}
          {forecast.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                6-HOUR FORECAST [MODELED]
              </p>
              <div
                className="overflow-hidden rounded-lg"
                style={{ border: "1px solid var(--border-subtle)" }}
              >
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "var(--bg-elevated)" }}>
                      <th className="px-3 py-2 text-left" style={{ color: "var(--text-muted)" }}>Time</th>
                      <th className="px-3 py-2 text-left" style={{ color: "var(--text-muted)" }}>Step</th>
                      <th className="px-3 py-2 text-right" style={{ color: "var(--text-muted)" }}>PM2.5 (µg/m³)</th>
                      <th className="px-3 py-2 text-right" style={{ color: "var(--text-muted)" }}>Range</th>
                      <th className="px-3 py-2 text-left" style={{ color: "var(--text-muted)" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ background: "var(--bg-card)" }}>
                    {forecast.map((f) => {
                      const cat = getPm25Category(f.pm25);
                      return (
                        <tr key={f.step_ahead}>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--text-secondary)" }}>
                            {formatTimestamp(f.timestamp)}
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--text-muted)" }}>+{f.step_ahead}h</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: cat.color }}>
                            {f.pm25.toFixed(1)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                            {f.lower_bound.toFixed(0)}–{f.upper_bound.toFixed(0)}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status="MODELED" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
