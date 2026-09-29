// services/forecast.ts — Numerical forecasting and SHAP driver attribution services.

import { fetchAPI } from "./api";
import { StationForecastResponse, SourceAttributionResponse } from "@/types/forecast";

export const forecastService = {
  /**
   * Retrieves step-ahead numerical PM2.5 forecasts for a station.
   */
  getForecast: (stationId: string, horizonHours: number = 6) =>
    fetchAPI<StationForecastResponse>(`/api/forecast/${stationId}?horizon=${horizonHours}`),

  /**
   * Retrieves model-estimated driver contributions for a station.
   * Label: MODEL-ESTIMATED CONTRIBUTION.
   */
  getStationAttribution: (stationId: string) =>
    fetchAPI<SourceAttributionResponse>(`/api/attribution/${stationId}`),

  /**
   * Retrieves city-wide global SHAP driver summary.
   */
  getGlobalAttribution: () =>
    fetchAPI<SourceAttributionResponse>("/api/drivers/global"),
};
