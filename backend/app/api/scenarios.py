"""
api/scenarios.py — Intervention scenario simulation endpoints.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from backend.app.services.scenario_service import scenario_service

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])


class ScenarioSimulateRequest(BaseModel):
    traffic_reduction: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage vehicular traffic reduction")
    industrial_reduction: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage industrial emissions reduction")
    green_buffer: bool = Field(default=False, description="Enable urban green buffer filtration")
    dust_control: float = Field(default=0.0, ge=0.0, le=100.0, description="Road paving and dust control %")
    zone_id: Optional[str] = Field(default=None, description="Target geographic or industrial zone ID")
    station_id: Optional[str] = Field(default=None, description="Target monitoring station ID")
    scenario_name: Optional[str] = Field(default=None, description="Custom scenario label")
    traffic_reduction_pct: Optional[float] = None
    industrial_reduction_pct: Optional[float] = None
    dust_control_pct: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            d = dict(data)
            if "traffic_reduction" not in d and "traffic_reduction_pct" in d:
                d["traffic_reduction"] = d["traffic_reduction_pct"]
            if "industrial_reduction" not in d and "industrial_reduction_pct" in d:
                d["industrial_reduction"] = d["industrial_reduction_pct"]
            if "dust_control" not in d and "dust_control_pct" in d:
                d["dust_control"] = d["dust_control_pct"]
            return d
        return data


# Backward compatibility schema for existing frontend /api/scenarios/run
class LegacyScenarioRequest(BaseModel):
    traffic_reduction_pct: float = 0.0
    industrial_reduction_pct: float = 0.0
    dust_control_pct: float = 0.0
    station_id: Optional[str] = None


@router.post("/simulate")
async def simulate_scenario(req: ScenarioSimulateRequest):
    """
    Simulates a targeted pollution intervention through the XGBoost ML model.
    Modifies baseline activity proxies, predicts scenario PM2.5, and calculates exposure delta.
    Data status: SCENARIO.
    """
    result = scenario_service.simulate_scenario(
        traffic_reduction=req.traffic_reduction,
        industrial_reduction=req.industrial_reduction,
        green_buffer=req.green_buffer,
        dust_control=req.dust_control,
        zone_id=req.zone_id,
        station_id=req.station_id,
        scenario_name=req.scenario_name
    )
    return result


@router.post("/run")
async def run_scenario_legacy(req: LegacyScenarioRequest):
    """
    Backward-compatible endpoint for existing intervention lab.
    """
    result = scenario_service.simulate_scenario(
        traffic_reduction=req.traffic_reduction_pct,
        industrial_reduction=req.industrial_reduction_pct,
        green_buffer=req.dust_control_pct > 20,
        dust_control=req.dust_control_pct,
        station_id=req.station_id,
    )
    return result


@router.get("/comparison")
async def get_comparison():
    """
    Returns pre-computed comparison matrix across standard intervention packages.
    """
    table = scenario_service.get_comparison_table()
    return {
        "data_status": "SCENARIO",
        "label": "MODELED SCENARIO COMPARISON",
        "disclaimer": "All values are model estimates under stated assumptions. Not observed outcomes.",
        "scenarios": table,
        "intervention_bounds": {
            "traffic_reduction": {"min": 0, "max": 30, "units": "percent"},
            "industrial_reduction": {"min": 0, "max": 30, "units": "percent"},
            "dust_control": {"min": 0, "max": 50, "units": "percent"},
        }
    }


@router.get("/{scenario_id}")
async def get_scenario_by_id(scenario_id: str):
    """
    Retrieves stored scenario simulation results by scenario ID.
    """
    res = scenario_service.get_scenario_by_id(scenario_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found.")
    return res
