"""
api/map.py — Spatial GeoJSON endpoints for MapLibre GL JS integration.
Provides Pune boundary, monitoring stations, industrial zones, and traffic corridors.
"""
from typing import Dict, Any
from fastapi import APIRouter

from backend.app.services.spatial_service import spatial_service

router = APIRouter(prefix="/api/map", tags=["Map"])


@router.get("/config")
async def get_map_config():
    """Returns Pune center coordinates, initial zoom, and bounding box."""
    return spatial_service.get_pune_center()


@router.get("/zones")
async def get_city_zones():
    """Returns Pune administrative and land-use zones as GeoJSON FeatureCollection."""
    return spatial_service.get_city_zones_geojson()


@router.get("/industrial-zones")
async def get_industrial_zones():
    """Returns Pune MIDC and industrial cluster zones as GeoJSON polygons."""
    return spatial_service.get_industrial_zones_geojson()


@router.get("/traffic-corridors")
async def get_traffic_corridors():
    """Returns major Pune transit corridors as GeoJSON LineStrings with traffic load indices."""
    return spatial_service.get_traffic_corridors_geojson()
