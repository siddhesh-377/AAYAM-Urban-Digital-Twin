// types/airQuality.ts — Types for air quality measurements, stations, and hotspots.

export type DataStatus =
  | "OBSERVED"
  | "MODELED"
  | "SCENARIO"
  | "REFERENCE"
  | "PROXY"
  | "SYNTHETIC"
  | "UNAVAILABLE";

export interface StationMetadata {
  zone?: string;
  elevation_m?: number;
  type?: string;
  sensors?: string[];
  owner?: string;
  [key: string]: any;
}

export interface Station {
  id: string;
  station_id: string;
  name: string;
  station_name: string;
  source: string;
  latitude: number;
  longitude: number;
  lat: number;
  lon: number;
  city: string;
  pm25: number;
  type?: string;
  demo_station_id?: string;
  data_status: DataStatus;
  metadata?: StationMetadata;
}

export interface AirQualityMeasurement {
  id?: number;
  station_id: string;
  timestamp: string;
  pm25: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  aqi?: number;
  source: string;
  data_status: DataStatus;
}

export interface Hotspot {
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  pm25: number;
  severity: "Severe" | "Unhealthy" | "Poor / Sensitive" | "Moderate" | "Good";
  color: string;
  radius_meters: number;
  is_hotspot: boolean;
  timestamp: string;
  data_status: DataStatus;
  source: string;
  primary_stressor: string;
}

export interface HotspotsResponse {
  data_status: DataStatus;
  label: string;
  total_monitored: number;
  hotspot_count: number;
  highest_hotspot: Hotspot | null;
  hotspots: Hotspot[];
  naaqs_annual_standard: string;
  naaqs_24h_standard: string;
}
