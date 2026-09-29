// lib/types.ts — Shared Types for AYAM Urban Environmental Digital Twin

export type DataStatus = 
  | "OBSERVED" 
  | "DERIVED" 
  | "FORECAST" 
  | "MODELED" 
  | "MODELED ESTIMATE" 
  | "MODELED SCENARIO" 
  | "SCENARIO" 
  | "DEMO DATA" 
  | "SYNTHETIC" 
  | "REFERENCE" 
  | "PROXY" 
  | "UNAVAILABLE";

export interface Station {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  pm25: number;
  timestamp: string;
  source: string;
  data_status?: DataStatus;
}

export interface ScenarioRequest {
  scenario_name: string;
  traffic_reduction_pct: number;
  industrial_reduction_pct: number;
  green_buffer_increase_pct?: number;
  target_zones: string[];
  duration_hours: number;
}

export interface ScenarioResponse {
  scenario_name: string;
  baseline_pm25: number;
  scenario_pm25: number;
  absolute_change: number;
  percent_change: number;
  confidence_level: "high" | "medium" | "low";
  timestamp: string;
  model_version: string;
  affected_zones: string[];
}

export interface ValidationMetrics {
  model_name: string;
  test_period: string;
  sample_count: number;
  r2: number;
  mae: number;
  rmse: number;
}
