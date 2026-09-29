// types/scenario.ts — Types for intervention scenarios, simulation results, and comparisons.

import { DataStatus } from "./airQuality";

export interface ScenarioInterventionParams {
  traffic_reduction: number;       // % (0-30)
  industrial_reduction: number;    // % (0-30)
  green_buffer: boolean;
  dust_control?: number;           // % (0-50)
  zone_id?: string;
  station_id?: string;
  scenario_name?: string;
}

export interface ScenarioResult {
  id?: string;
  name?: string;
  data_status: DataStatus;
  label: string;
  disclaimer: string;
  baseline_pm25: number;
  scenario_pm25: number;
  predicted_pm25: number;
  reduction_percent: number;
  absolute_reduction_ugm3?: number;
  delta: {
    mean_absolute_change_ug_m3: number;
    mean_pct_change: number;
    uncertainty_ug_m3: number;
    uncertainty_note: string;
  };
  baseline: {
    mean_pm25: number;
    median_pm25: number;
    n: number;
  };
  scenario: {
    mean_pm25: number;
    median_pm25: number;
  };
  confidence: number;
  affected_area: string;
  estimated_exposure_change?: number;
  warnings: string[];
  interventions: {
    traffic_reduction_pct: number;
    industrial_reduction_pct: number;
    dust_control_pct?: number;
    green_buffer?: boolean;
    zone_id?: string;
  };
  assumption_text: string;
  created_at: string;
}

export interface ScenarioComparisonRow {
  scenario: string;
  description: string;
  traffic_pct: number;
  industrial_pct: number;
  dust_pct: number;
  baseline_pm25: number;
  scenario_pm25: number;
  absolute_change: number;
  pct_change: number;
  uncertainty_ug_m3: number;
  data_status: DataStatus;
  label: string;
  assumptions: string;
}
