// types/forecast.ts — Types for numerical PM2.5 forecasting and SHAP driver attribution.

import { DataStatus } from "./airQuality";

export interface ForecastPoint {
  step_ahead: number;
  timestamp: string;
  forecast_timestamp?: string;
  pm25: number;
  predicted_pm25?: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
  model_version: string;
  data_status: DataStatus;
  label: string;
  station_id: string;
}

export interface StationForecastResponse {
  station_id: string;
  station_name: string;
  current_observed_pm25: number;
  observed_timestamp: string;
  data_status: DataStatus;
  label: string;
  model_version: string;
  horizon_hours: number;
  forecasts: ForecastPoint[];
  disclaimer: string;
}

export interface DriverGroup {
  share_pct: number;
  relative_contribution?: number;
  label: string;
  description: string;
  icon?: string;
  color?: string;
}

export interface SourceAttributionResponse {
  station_id: string;
  data_status: DataStatus;
  label: string;
  assumption_text: string;
  methodology: string;
  confidence: number;
  driver_groups: {
    [groupName: string]: DriverGroup;
  };
  group_shares_pct: {
    [groupName: string]: number;
  };
  notes?: string;
  disclaimer: string;
}
