"""
api/stations.py — Monitoring stations metadata endpoints.
"""
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.station import Station
from backend.app.models.air_quality import AirQualityMeasurement

router = APIRouter(prefix="/api/stations", tags=["Stations"])


@router.get("")
async def get_stations(db: Session = Depends(get_db)):
    """
    Returns Pune air-quality monitoring station locations, metadata, and latest observed status.
    """
    stations = db.query(Station).all()
    if not stations:
        # Fallback to default reference stations
        from backend.scripts.seed_database import PUNE_STATIONS
        return {
            "stations": PUNE_STATIONS,
            "data_status": "REFERENCE",
            "count": len(PUNE_STATIONS),
            "source": "MPCB/CPCB Reference Data",
        }

    # Fetch latest PM2.5 for each station
    station_list = []
    for s in stations:
        latest = db.query(AirQualityMeasurement).filter(
            AirQualityMeasurement.station_id == s.id
        ).order_by(AirQualityMeasurement.timestamp.desc()).first()

        pm25 = latest.pm25 if (latest and latest.pm25 is not None) else 75.0

        station_list.append({
            "id": s.id,
            "station_id": s.id,
            "name": s.name,
            "station_name": s.name,
            "source": s.source,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "lat": s.latitude,
            "lon": s.longitude,
            "city": s.city,
            "pm25": pm25,
            "type": s.station_metadata.get("type", "Continuous CAAQMS") if s.station_metadata else "Continuous CAAQMS",
            "demo_station_id": s.id,
            "metadata": s.station_metadata or {},
            "data_status": "OBSERVED",
        })

    return {
        "stations": station_list,
        "data_status": "OBSERVED",
        "count": len(station_list),
        "source": "MPCB / OpenAQ v3 Observations",
    }


@router.get("/{station_id}")
async def get_station_detail(station_id: str, db: Session = Depends(get_db)):
    """Returns specific station metadata and latest observation."""
    s = db.query(Station).filter(Station.id == station_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found.")

    latest = db.query(AirQualityMeasurement).filter(
        AirQualityMeasurement.station_id == s.id
    ).order_by(AirQualityMeasurement.timestamp.desc()).first()

    return {
        "station": s.to_dict(),
        "latest_measurement": latest.to_dict() if latest else None,
        "data_status": "OBSERVED",
    }
