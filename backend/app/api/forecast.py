"""
api/forecast.py — Numerical forecasting and SHAP driver attribution endpoints.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException

from backend.app.services.forecast_service import forecast_service
from backend.app.services.attribution_service import attribution_service

router = APIRouter(prefix="/api", tags=["Forecast & Attribution"])


@router.get("/forecast/{station_id}")
async def get_forecast(
    station_id: str,
    horizon: int = Query(default=6, ge=1, le=48)
):
    """
    Returns numerical step-ahead PM2.5 forecasts for a station.
    Includes observed baseline, forecast timestamps, predictions, uncertainty bounds, and model confidence.
    Data status: MODELED.
    """
    result = forecast_service.get_station_forecast(station_id, horizon=horizon)
    if not result:
        raise HTTPException(status_code=404, detail=f"Unable to generate forecast for station {station_id}")
    return result


@router.get("/attribution/{station_id}")
async def get_attribution(station_id: str):
    """
    Returns SHAP-based feature driver contributions for a station.
    Categorized into: Traffic, Industrial activity, Meteorology, and Other.
    Label: MODEL-ESTIMATED CONTRIBUTION.
    """
    result = attribution_service.get_station_attribution(station_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"No attribution model available for station {station_id}")
    return result


@router.get("/drivers/global")
async def get_global_drivers():
    """Returns city-wide global SHAP driver attributions."""
    return attribution_service.get_global_attribution()


@router.get("/drivers/{station_id}")
async def get_station_drivers(station_id: str):
    """Backward-compatible endpoint for existing drivers page."""
    return attribution_service.get_station_attribution(station_id)
