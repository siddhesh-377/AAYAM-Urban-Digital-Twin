"use client";
// components/aeris/GeminiExplanationBox.tsx
// Component for rendering natural-language atmospheric science and policy explanations.

import React from "react";

interface GeminiExplanationBoxProps {
  explanation: string | null;
  loading?: boolean;
  stationName?: string;
  source?: string;
}

export function GeminiExplanationBox({
  explanation,
  loading = false,
  stationName = "Pune Urban Airshed",
  source = "Google Gemini (gemini-2.5-flash)",
}: GeminiExplanationBoxProps) {
  if (!explanation && !loading) return null;

  return (
    <div
      className="p-4 rounded-xl shadow-lg border backdrop-blur-md animate-fade-in mt-4"
      style={{
        background: "rgba(13, 22, 41, 0.85)",
        borderColor: "rgba(56, 189, 248, 0.25)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">✨</span>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            AI ENVIRONMENTAL POLICY BRIEFING
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {source}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Synthesizing atmospheric science and urban policy reasoning…</span>
        </div>
      ) : (
        <div className="text-xs text-slate-200 leading-relaxed space-y-2">
          <p>{explanation}</p>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-[rgba(99,132,199,0.15)] flex justify-between">
            <span>Location: {stationName}</span>
            <span>Grounding: XGBoost Model Predictions Only</span>
          </div>
        </div>
      )}
    </div>
  );
}
