// services/airQuality.ts — Air quality observations, stations, and hotspot services.

import { fetchAPI } from "./api";
import { Station, AirQualityMeasurement, HotspotsResponse, Hotspot } from "@/types/airQuality";

export const airQualityService = {
  /**
   * Retrieves all Pune monitoring stations.
   */
  getStations: () =>
    fetchAPI<{ stations: Station[]; data_status: string; count: number }>("/api/stations"),

  /**
   * Retrieves specific station details.
   */
  getStationDetail: (stationId: string) =>
    fetchAPI<{ station: Station; latest_measurement: AirQualityMeasurement | null }>(
      `/api/stations/${stationId}`
    ),

  /**
   * Retrieves recent observed measurements.
   */
  getMeasurements: (stationId?: string, hours: number = 24) => {
    const query = stationId ? `?station_id=${stationId}&hours=${hours}` : `?hours=${hours}`;
    return fetchAPI<{ measurements: AirQualityMeasurement[]; data_status: string; count: number }>(
      `/api/air-quality${query}`
    );
  },

  /**
   * Detects and diagnoses pollution hotspots across Pune.
   */
  getHotspots: () => fetchAPI<HotspotsResponse>("/api/air-quality/hotspots"),

  /**
   * Spatial zones GeoJSON for MapLibre layers.
   */
  getCityZones: () => fetchAPI<any>("/api/map/zones"),

  /**
   * Industrial belts GeoJSON.
   */
  getIndustrialZones: () => fetchAPI<any>("/api/map/industrial-zones"),

  /**
   * Traffic corridors GeoJSON.
   */
  getTrafficCorridors: () => fetchAPI<any>("/api/map/traffic-corridors"),
};
