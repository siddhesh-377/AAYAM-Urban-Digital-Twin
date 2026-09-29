"""
services/spatial_service.py — Spatial GeoJSON definitions, industrial zones, and hotspot geometry.
"""
from typing import Dict, Any, List
from backend.app.database import get_db_context
from backend.app.models.station import Station
from backend.app.models.industrial_zone import IndustrialZone, CityZone


class SpatialService:
    def get_pune_center(self) -> Dict[str, Any]:
        return {
            "center": [18.5204, 73.8567],
            "zoom": 12,
            "bounds": [[18.42, 73.74], [18.66, 73.98]],
            "city": "Pune",
            "state": "Maharashtra",
            "country": "India"
        }

    def get_stations_geojson(self, observations_map: Dict[str, float] = None) -> Dict[str, Any]:
        """Returns monitoring stations as a GeoJSON FeatureCollection."""
        features = []
        with get_db_context() as db:
            stations = db.query(Station).all()
            for s in stations:
                pm25 = (observations_map or {}).get(s.id, 75.0)
                features.append({
                    "type": "Feature",
                    "id": s.id,
                    "geometry": {
                        "type": "Point",
                        "coordinates": [s.longitude, s.latitude]
                    },
                    "properties": {
                        "id": s.id,
                        "name": s.name,
                        "source": s.source,
                        "pm25": pm25,
                        "city": s.city,
                        "metadata": s.station_metadata or {},
                        "data_status": "OBSERVED",
                    }
                })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    def get_industrial_zones_geojson(self) -> Dict[str, Any]:
        """Returns key Pune industrial belts (MIDC, clusters) as GeoJSON polygons."""
        features = []
        with get_db_context() as db:
            zones = db.query(IndustrialZone).all()
            for z in zones:
                # coordinates in DB stored as [[lat, lon], ...] -> convert to GeoJSON [[lon, lat], ...]
                raw_coords = z.coordinates or []
                poly_coords = [[pt[1], pt[0]] for pt in raw_coords]
                if poly_coords and poly_coords[0] != poly_coords[-1]:
                    poly_coords.append(poly_coords[0])  # Close linear ring

                features.append({
                    "type": "Feature",
                    "id": z.id,
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [poly_coords] if poly_coords else []
                    },
                    "properties": {
                        "id": z.id,
                        "name": z.name,
                        "zone_type": z.zone_type,
                        "activity_index": z.activity_index,
                        "source": z.source,
                        "is_proxy": z.is_proxy,
                        "metadata": z.metadata_json or {},
                        "data_status": "REFERENCE",
                    }
                })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    def get_city_zones_geojson(self) -> Dict[str, Any]:
        """Returns city administrative zones as GeoJSON."""
        features = []
        with get_db_context() as db:
            zones = db.query(CityZone).all()
            for z in zones:
                raw_coords = z.coordinates or []
                poly_coords = [[pt[1], pt[0]] for pt in raw_coords]
                if poly_coords and poly_coords[0] != poly_coords[-1]:
                    poly_coords.append(poly_coords[0])

                features.append({
                    "type": "Feature",
                    "id": z.id,
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [poly_coords] if poly_coords else []
                    },
                    "properties": {
                        "id": z.id,
                        "name": z.name,
                        "zone_type": z.zone_type,
                        "metadata": z.metadata_json or {},
                        "data_status": "REFERENCE",
                    }
                })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    def get_traffic_corridors_geojson(self) -> Dict[str, Any]:
        """Returns major vehicular corridors with traffic load indices."""
        corridors = [
            {
                "id": "CORRIDOR-SHIVAJINAGAR-FC",
                "name": "Shivaji Nagar — FC Road — JM Road Transit Core",
                "traffic_index": 1.48,
                "coordinates": [[73.840, 18.525], [73.845, 18.532], [73.850, 18.540]]
            },
            {
                "id": "CORRIDOR-SWARGATE-KATRAJ",
                "name": "Swargate — Katraj Ghat Corridor (Satara Rd)",
                "traffic_index": 1.35,
                "coordinates": [[73.858, 18.502], [73.862, 18.475], [73.868, 18.455]]
            },
            {
                "id": "CORRIDOR-HADAPSAR-SOLAPUR",
                "name": "Hadapsar — Solapur Road Freight & Mixed Corridor",
                "traffic_index": 1.42,
                "coordinates": [[73.910, 18.508], [73.926, 18.509], [73.948, 18.498]]
            },
            {
                "id": "CORRIDOR-OLD-PUNE-MUMBAI",
                "name": "Old Pune-Mumbai Highway (PCMC — Dapodi Belt)",
                "traffic_index": 1.50,
                "coordinates": [[73.840, 18.570], [73.835, 18.610], [73.825, 18.640]]
            }
        ]

        features = []
        for c in corridors:
            features.append({
                "type": "Feature",
                "id": c["id"],
                "geometry": {
                    "type": "LineString",
                    "coordinates": c["coordinates"]
                },
                "properties": {
                    "id": c["id"],
                    "name": c["name"],
                    "traffic_index": c["traffic_index"],
                    "data_status": "MODELED",
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }


spatial_service = SpatialService()
