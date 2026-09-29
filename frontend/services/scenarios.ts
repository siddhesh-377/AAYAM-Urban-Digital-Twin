// services/scenarios.ts — Scenario simulation and intervention comparison services.

import { fetchAPI } from "./api";
import { ScenarioInterventionParams, ScenarioResult, ScenarioComparisonRow } from "@/types/scenario";

export const scenarioService = {
  /**
   * Simulates policy interventions through the XGBoost model.
   */
  simulate: (params: ScenarioInterventionParams) =>
    fetchAPI<ScenarioResult>("/api/scenarios/simulate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /**
   * Retrieves stored scenario result by ID.
   */
  getById: (scenarioId: string) =>
    fetchAPI<ScenarioResult>(`/api/scenarios/${scenarioId}`),

  /**
   * Retrieves standard intervention comparison matrix.
   */
  getComparison: () =>
    fetchAPI<{
      scenarios: ScenarioComparisonRow[];
      data_status: string;
      label: string;
      disclaimer: string;
      intervention_bounds: any;
    }>("/api/scenarios/comparison"),
};
