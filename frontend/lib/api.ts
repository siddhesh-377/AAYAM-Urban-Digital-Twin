// lib/api.ts — Typed API client for the backend
// All responses include data_status for UI labelling.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
  name: string;
  lat: number;
  lon: number;
  type: string;
  demo_station_id: string;
  data_status: DataStatus;
  source: string;
}

export interface Observation {
  station_id: string;
  station_name: string;
  lat: number;
  lon: number;
  timestamp: string;
  pm25: number;
  data_status: DataStatus;
  source: string;
}

export interface ForecastPoint {
  timestamp: string;
  step_ahead: number;
  pm25: number;
  lower_bound: number;
  upper_bound: number;
  data_status: DataStatus;
  label: string;
  station_id: string;
}

export interface ValidationData {
  data_status: DataStatus;
  label: string;
  page_label: string;
  test_period: {
    train_start: string;
    train_end: string;
    val_start: string;
    val_end: string;
    test_start: string;
    test_end: string;
  };
  metrics: {
    baseline_persistence: { val: ModelMetrics; test: ModelMetrics };
    baseline_rolling_6h: { val: ModelMetrics; test: ModelMetrics };
    model_a: { val: ModelMetrics; test: ModelMetrics };
    model_b: { val: ModelMetrics; test: ModelMetrics };
    model_c: { val: ModelMetrics; test: ModelMetrics };
    baseline_linear_regression?: { val: ModelMetrics; test: ModelMetrics };
    xgboost_main?: { val: ModelMetrics; test: ModelMetrics };
    [key: string]: any;
  };
  time_series: {
    timestamps: string[];
    observed: number[];
    predicted_model_c: number[];
    predicted_model_a: number[];
    baseline_persist: number[];
    baseline_rolling: number[];
  };
  improvement_over_baseline: {
    mae_reduction_pct: number;
    rmse_reduction_pct: number;
  };
}

export interface ModelMetrics {
  model: string;
  n: number;
  mae: number;
  rmse: number;
  r2: number;
  mape_pct: number;
  bias: number;
}

export interface DriverData {
  station_id?: string;
  data_status: DataStatus;
  label: string;
  assumption_text: string;
  driver_groups: {
    [key: string]: {
      share_pct: number;
      label: string;
      description: string;
    };
  };
  group_shares_pct?: { [key: string]: number };
  computed_at: string;
}

export interface ScenarioRow {
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

export interface ScenarioResult {
  data_status: DataStatus;
  label: string;
  disclaimer: string;
  interventions: {
    traffic_reduction_pct: number;
    industrial_reduction_pct: number;
    dust_control_pct: number;
    warnings?: string[];
  };
  baseline: { mean_pm25: number; median_pm25: number; n: number };
  scenario: { mean_pm25: number; median_pm25: number };
  delta: {
    mean_absolute_change_ug_m3: number;
    mean_pct_change: number;
    uncertainty_ug_m3: number;
    uncertainty_note: string;
  };
  baseline_pm25?: number;
  scenario_pm25?: number;
  predicted_pm25?: number;
  reduction_percent?: number;
  warnings?: string[];
  affected_area?: string;
  assumption_text: string;
  computed_at: string;
}

// ── API Functions ──────────────────────────────────────────────────────────────

export const api = {
  health: () => fetchJSON<{ status: string; ml_loaded: boolean; app_mode: string }>("/api/health"),

  stations: () =>
    fetchJSON<{ stations: Station[]; data_status: DataStatus; count: number }>("/api/stations"),

  overview: () =>
    fetchJSON<{
      data_status: DataStatus;
      label: string;
      disclaimer: string;
      stations: Observation[];
      n_stations: number;
    }>("/api/overview"),

  timeseries: (stationId: string, hours = 168) =>
    fetchJSON<{ station_id: string; data_status: DataStatus; observations: Observation[] }>(
      `/api/timeseries/${stationId}?hours=${hours}`
    ),

  forecast: (stationId: string) =>
    fetchJSON<{ station_id: string; data_status: DataStatus; forecasts: ForecastPoint[] }>(
      `/api/forecast/${stationId}`
    ),

  validation: () => fetchJSON<ValidationData>("/api/validation"),

  globalDrivers: () => fetchJSON<DriverData>("/api/drivers/global"),

  stationDrivers: (stationId: string) => fetchJSON<DriverData>(`/api/drivers/${stationId}`),

  scenarioComparison: () =>
    fetchJSON<{ scenarios: ScenarioRow[]; data_status: DataStatus; intervention_bounds: object }>(
      "/api/scenarios/comparison"
    ),

  runScenario: (params: {
    traffic_reduction_pct: number;
    industrial_reduction_pct: number;
    dust_control_pct: number;
    station_id?: string;
  }) =>
    fetchJSON<ScenarioResult>("/api/scenarios/run", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  sources: () => fetchJSON<{ sources: object[] }>("/api/sources"),

  mpcbReference: () => fetchJSON<object>("/api/reference/mpcb"),

  hotspots: () =>
    fetchJSON<{
      data_status: DataStatus;
      label: string;
      total_monitored: number;
      hotspot_count: number;
      highest_hotspot: any;
      hotspots: any[];
    }>("/api/air-quality/hotspots"),

  stationAttribution: (stationId: string) =>
    fetchJSON<DriverData>(`/api/attribution/${stationId}`),

  simulateScenario: (params: {
    traffic_reduction: number;
    industrial_reduction: number;
    green_buffer?: boolean;
    dust_control?: number;
    zone_id?: string;
    station_id?: string;
  }) =>
    fetchJSON<ScenarioResult>("/api/scenarios/simulate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  aiExplain: (params: {
    traffic_reduction_pct?: number;
    industrial_reduction_pct?: number;
    dust_control_pct?: number;
    green_buffer?: boolean;
    station_name?: string;
    baseline_pm25?: number;
    scenario_pm25?: number;
    delta_ugm3?: number;
    warnings?: string[];
  }) =>
    fetchJSON<{
      explanation: string;
      source: string;
      data_status: string;
    }>("/api/ai/explain", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  industrialZones: () => fetchJSON<any>("/api/map/industrial-zones"),
  cityZones: () => fetchJSON<any>("/api/map/zones"),
  trafficCorridors: () => fetchJSON<any>("/api/map/traffic-corridors"),

  demoStatus: () =>
    fetchJSON<{
      mode: string;
      is_demo: boolean;
      synthetic_data: boolean;
      model_ready: boolean;
      label: string;
      demo_stations: string[];
    }>("/api/demo/status"),
};

// ── PM2.5 helpers ─────────────────────────────────────────────────────────────
export function getPm25Category(v: number): {
  label: string;
  color: string;
  bgColor: string;
  className: string;
} {
  if (v <= 30)  return { label: "Good",          color: "#22c55e", bgColor: "rgba(34,197,94,0.12)",   className: "pm25-good"      };
  if (v <= 60)  return { label: "Moderate",       color: "#eab308", bgColor: "rgba(234,179,8,0.12)",  className: "pm25-moderate"  };
  if (v <= 90)  return { label: "Sensitive",      color: "#f97316", bgColor: "rgba(249,115,22,0.12)", className: "pm25-sensitive" };
  if (v <= 120) return { label: "Unhealthy",      color: "#ef4444", bgColor: "rgba(239,68,68,0.12)",  className: "pm25-unhealthy" };
  if (v <= 250) return { label: "Very Unhealthy", color: "#a855f7", bgColor: "rgba(168,85,247,0.12)", className: "pm25-very-bad"  };
  return        { label: "Hazardous",             color: "#991b1b", bgColor: "rgba(153,27,27,0.12)",  className: "pm25-hazardous" };
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

export const STATUS_COLORS: Record<DataStatus, string> = {
  OBSERVED:            "#10b981",
  DERIVED:             "#06b6d4",
  FORECAST:            "#0284c7",
  MODELED:             "#3b82f6",
  "MODELED ESTIMATE":  "#6366f1",
  "MODELED SCENARIO":  "#8b5cf6",
  SCENARIO:            "#8b5cf6",
  "DEMO DATA":         "#64748b",
  SYNTHETIC:           "#64748b",
  REFERENCE:           "#f97316",
  PROXY:               "#f59e0b",
  UNAVAILABLE:         "#475569",
};
