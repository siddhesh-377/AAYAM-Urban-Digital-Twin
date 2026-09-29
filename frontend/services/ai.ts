// services/ai.ts — Google Gemini natural language explanation service.

import { fetchAPI } from "./api";

export interface AIExplainParams {
  traffic_reduction_pct?: number;
  industrial_reduction_pct?: number;
  dust_control_pct?: number;
  green_buffer?: boolean;
  station_name?: string;
  baseline_pm25?: number;
  scenario_pm25?: number;
  delta_ugm3?: number;
  warnings?: string[];
}

export interface AIExplainResponse {
  explanation: string;
  source: string;
  data_status: string;
  grounded: boolean;
}

export const aiService = {
  /**
   * Generates grounded environmental policy explanation via Gemini.
   */
  explain: (params: AIExplainParams) =>
    fetchAPI<AIExplainResponse>("/api/ai/explain", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};
