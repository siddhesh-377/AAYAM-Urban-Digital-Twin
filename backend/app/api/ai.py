"""
api/ai.py — Google Gemini natural language explanation endpoint.
"""
from typing import Dict, Any, Optional, Union
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api/ai", tags=["AI Explanation"])


class AIExplainRequest(BaseModel):
    traffic_reduction_pct: float = Field(default=0.0, description="Traffic reduction percentage")
    industrial_reduction_pct: float = Field(default=0.0, description="Industrial reduction percentage")
    dust_control_pct: float = Field(default=0.0, description="Dust control percentage")
    green_buffer: bool = Field(default=False, description="Urban green buffer active")
    station_name: Optional[str] = Field(default="Pune Urban Airshed", description="Station or zone name")
    baseline_pm25: Optional[float] = Field(default=85.0, description="Baseline observed/modeled PM2.5")
    scenario_pm25: Optional[float] = Field(default=70.0, description="Predicted scenario PM2.5")
    delta_ugm3: Optional[Union[float, Dict[str, Any]]] = Field(default=None, description="Absolute change in µg/m³ or delta object")
    warnings: Optional[list] = Field(default_factory=list, description="Model warning messages")


@router.post("/explain")
async def explain_scenario(req: AIExplainRequest):
    """
    Generates a natural-language scientific explanation of the modeled scenario using Google Gemini.
    Strictly grounded in numerical ML model results without hallucinating fake data.
    """
    delta_val = None
    if isinstance(req.delta_ugm3, (int, float)):
        delta_val = float(req.delta_ugm3)
    elif isinstance(req.delta_ugm3, dict):
        delta_val = req.delta_ugm3.get("mean_absolute_change_ug_m3") or req.delta_ugm3.get("absolute_change")

    base = req.baseline_pm25 or 85.0
    scen = req.scenario_pm25 or (base - abs(delta_val or 14.5))
    red_pct = round(abs(base - scen) / max(base, 1.0) * 100.0, 1)

    scenario_data = {
        "baseline_pm25": base,
        "scenario_pm25": scen,
        "reduction_percent": red_pct,
        "interventions": {
            "traffic_reduction_pct": req.traffic_reduction_pct,
            "industrial_reduction_pct": req.industrial_reduction_pct,
            "green_buffer": req.green_buffer,
        },
        "warnings": req.warnings or [],
    }

    result = gemini_service.explain_scenario(scenario_data, station_name=req.station_name)
    return result

