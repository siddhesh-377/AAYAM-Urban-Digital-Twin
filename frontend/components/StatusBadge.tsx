// components/StatusBadge.tsx
// Renders a data status badge — the core UI data-honesty element.
// Every chart, map layer, and metric must display this badge.

import React from "react";
import { DataStatus } from "@/lib/api";

const STATUS_CONFIG: Record<
  DataStatus,
  { label: string; className: string; dot: string }
> = {
  OBSERVED:            { label: "OBSERVED",           className: "badge-observed",          dot: "#10b981" },
  DERIVED:             { label: "DERIVED",            className: "badge-derived",           dot: "#06b6d4" },
  FORECAST:            { label: "FORECAST",           className: "badge-forecast",          dot: "#0284c7" },
  MODELED:             { label: "MODELED",            className: "badge-modeled",           dot: "#3b82f6" },
  "MODELED ESTIMATE":  { label: "MODELED ESTIMATE",   className: "badge-modeled-estimate",  dot: "#6366f1" },
  "MODELED SCENARIO":  { label: "MODELED SCENARIO",   className: "badge-scenario",          dot: "#8b5cf6" },
  SCENARIO:            { label: "MODELED SCENARIO",   className: "badge-scenario",          dot: "#8b5cf6" },
  "DEMO DATA":         { label: "DEMO DATA",          className: "badge-demo",              dot: "#64748b" },
  SYNTHETIC:           { label: "DEMO DATA",          className: "badge-synthetic",         dot: "#64748b" },
  REFERENCE:           { label: "REFERENCE",          className: "badge-reference",         dot: "#f97316" },
  PROXY:               { label: "PROXY",              className: "badge-proxy",             dot: "#f59e0b" },
  UNAVAILABLE:         { label: "UNAVAILABLE",        className: "badge-unavailable",       dot: "#475569" },
};

interface StatusBadgeProps {
  status: DataStatus;
  pulse?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, pulse = false, className = "", size = "sm" }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNAVAILABLE;
  const sizeClass = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span className={`badge ${cfg.className} ${sizeClass} ${className}`}>
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

interface DataStatusBarProps {
  status: DataStatus;
  source?: string;
  timestamp?: string;
}

export function DataStatusBar({ status, source, timestamp }: DataStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
      <StatusBadge status={status} />
      {source && <span className="text-slate-400">Source: <strong className="text-slate-300 font-semibold">{source}</strong></span>}
      {timestamp && <span className="text-slate-500">[{timestamp}]</span>}
    </div>
  );
}
