"""
scripts/seed_database.py — Seed Pune monitoring stations, industrial zones, and sample records.
"""
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database import init_db, get_db_context
from backend.app.models.station import Station
from backend.app.models.industrial_zone import IndustrialZone, CityZone
from backend.app.models.air_quality import AirQualityMeasurement
from backend.app.models.weather import WeatherMeasurement
from backend.app.models.traffic import TrafficMeasurement
from backend.app.models.scenario import Scenario, ScenarioResult
from backend.app.utils.logging import logger

PUNE_STATIONS = [
    {
        "id": "DEMO-SHIVAJINAGAR",
        "name": "Shivajinagar (IMD / Shimla Office)",
        "source": "MPCB/CPCB Reference",
        "latitude": 18.5314,
        "longitude": 73.8446,
        "city": "Pune",
        "station_metadata": {"zone": "Urban Transit Core", "elevation_m": 560, "type": "Continuous CAAQMS"}
    },
    {
        "id": "DEMO-HADAPSAR",
        "name": "Hadapsar (Magarpatta / Industrial Fringe)",
        "source": "MPCB/CPCB Reference",
        "latitude": 18.5089,
        "longitude": 73.9260,
        "city": "Pune",
        "station_metadata": {"zone": "Industrial / Mixed Urban", "elevation_m": 555, "type": "Continuous CAAQMS"}
    },
    {
        "id": "DEMO-BHOSARI",
        "name": "Bhosari (PCMC MIDC Belt)",
        "source": "MPCB Reference",
        "latitude": 18.6279,
        "longitude": 73.8437,
        "city": "Pune / PCMC",
        "station_metadata": {"zone": "Heavy Industrial Belt", "elevation_m": 570, "type": "Industrial Monitoring"}
    },
    {
        "id": "DEMO-KATRAJ",
        "name": "Katraj (Southern Ghats Corridor)",
        "source": "MPCB Reference",
        "latitude": 18.4575,
        "longitude": 73.8677,
        "city": "Pune",
        "station_metadata": {"zone": "Highway / Residential Fringe", "elevation_m": 610, "type": "Continuous CAAQMS"}
    },
    {
        "id": "DEMO-LOHEGAON",
        "name": "Lohegaon (Airport Airshed)",
        "source": "MPCB Reference",
        "latitude": 18.5822,
        "longitude": 73.9197,
        "city": "Pune",
        "station_metadata": {"zone": "Suburban / Aviation Corridor", "elevation_m": 592, "type": "Continuous CAAQMS"}
    },
    {
        "id": "DEMO-PASHAN",
        "name": "Pashan (IISER / Ecological Belt)",
        "source": "MPCB Reference",
        "latitude": 18.5414,
        "longitude": 73.7928,
        "city": "Pune",
        "station_metadata": {"zone": "Institutional & Green Buffer", "elevation_m": 580, "type": "Continuous CAAQMS"}
    },
    {
        "id": "DEMO-KOTHRUD",
        "name": "Kothrud (Karve Road Corridor)",
        "source": "MPCB Reference",
        "latitude": 18.5074,
        "longitude": 73.8077,
        "city": "Pune",
        "station_metadata": {"zone": "Dense Residential / Commercial", "elevation_m": 575, "type": "Continuous CAAQMS"}
    },
    {
        "id": "DEMO-WAKAD",
        "name": "Wakad / Hinjawadi Bridge",
        "source": "MPCB Reference",
        "latitude": 18.5987,
        "longitude": 73.7688,
        "city": "Pune / PCMC",
        "station_metadata": {"zone": "IT Corridor & Highway Hub", "elevation_m": 568, "type": "Continuous CAAQMS"}
    },
]

INDUSTRIAL_ZONES = [
    {
        "id": "IND-BHOSARI-MIDC",
        "name": "Bhosari Industrial Estate (MIDC)",
        "zone_type": "MIDC Heavy Engineering",
        "coordinates": [
            [18.625, 73.830], [18.640, 73.830], [18.645, 73.855], [18.628, 73.855]
        ],
        "activity_index": 1.45,
        "source": "MPCB Emission Inventory",
        "is_proxy": False,
        "metadata_json": {"units_count": 320, "primary_fuels": ["Diesel", "Natural Gas", "Furnace Oil"]}
    },
    {
        "id": "IND-HADAPSAR",
        "name": "Hadapsar Industrial Estate",
        "zone_type": "Industrial & Logistics",
        "coordinates": [
            [18.500, 73.925], [18.515, 73.925], [18.515, 73.945], [18.500, 73.945]
        ],
        "activity_index": 1.30,
        "source": "MPCB Emission Inventory",
        "is_proxy": False,
        "metadata_json": {"units_count": 180, "primary_fuels": ["Electricity", "Diesel Generators"]}
    },
    {
        "id": "IND-CHAKAN-CORRIDOR",
        "name": "Chakan Automobile & Ancillary Corridor",
        "zone_type": "Special Economic Zone / MIDC",
        "coordinates": [
            [18.740, 73.840], [18.770, 73.840], [18.770, 73.875], [18.740, 73.875]
        ],
        "activity_index": 1.55,
        "source": "MPCB Emission Inventory",
        "is_proxy": False,
        "metadata_json": {"units_count": 450, "primary_fuels": ["LPG", "Electricity", "CNG"]}
    },
    {
        "id": "IND-PIRANGUT",
        "name": "Pirangut Industrial Cluster",
        "zone_type": "Medium Scale Industrial",
        "coordinates": [
            [18.505, 73.675], [18.520, 73.675], [18.520, 73.695], [18.505, 73.695]
        ],
        "activity_index": 1.15,
        "source": "MPCB Reference",
        "is_proxy": True,
        "metadata_json": {"units_count": 95, "primary_fuels": ["Biomass", "Diesel"]}
    },
]

CITY_ZONES = [
    {
        "id": "ZONE-CENTRAL-PUNE",
        "name": "Pune Central Urban Airshed",
        "zone_type": "High Density Commercial & Heritage",
        "coordinates": [[18.515, 73.840], [18.545, 73.840], [18.545, 73.870], [18.515, 73.870]],
        "metadata_json": {"traffic_load": "Very High", "green_cover_pct": 12.5}
    },
    {
        "id": "ZONE-WEST-KOTHRUD-PASHAN",
        "name": "West Urban & Green Belt",
        "zone_type": "Residential & Educational",
        "coordinates": [[18.500, 73.780], [18.550, 73.780], [18.550, 73.820], [18.500, 73.820]],
        "metadata_json": {"traffic_load": "Moderate", "green_cover_pct": 34.0}
    },
    {
        "id": "ZONE-EAST-HADAPSAR-VIMAN",
        "name": "East Urban & Tech Cluster",
        "zone_type": "Commercial IT & High-density Residential",
        "coordinates": [[18.510, 73.900], [18.585, 73.900], [18.585, 73.955], [18.510, 73.955]],
        "metadata_json": {"traffic_load": "High", "green_cover_pct": 18.0}
    }
]


def seed():
    logger.info("Initializing database schema...")
    init_db()

    with get_db_context() as db:
        # 1. Seed Stations
        logger.info(f"Seeding {len(PUNE_STATIONS)} Pune monitoring stations...")
        for s_data in PUNE_STATIONS:
            existing = db.query(Station).filter(Station.id == s_data["id"]).first()
            if not existing:
                stn = Station(
                    id=s_data["id"],
                    name=s_data["name"],
                    source=s_data["source"],
                    latitude=s_data["latitude"],
                    longitude=s_data["longitude"],
                    location_wkt=f"POINT({s_data['longitude']} {s_data['latitude']})",
                    city=s_data["city"],
                    station_metadata=s_data["station_metadata"]
                )
                db.add(stn)
            else:
                existing.latitude = s_data["latitude"]
                existing.longitude = s_data["longitude"]
                existing.name = s_data["name"]
                existing.station_metadata = s_data["station_metadata"]

        # 2. Seed Industrial Zones
        logger.info(f"Seeding {len(INDUSTRIAL_ZONES)} Pune industrial zones...")
        for iz_data in INDUSTRIAL_ZONES:
            existing = db.query(IndustrialZone).filter(IndustrialZone.id == iz_data["id"]).first()
            if not existing:
                iz = IndustrialZone(
                    id=iz_data["id"],
                    name=iz_data["name"],
                    zone_type=iz_data["zone_type"],
                    coordinates=iz_data["coordinates"],
                    activity_index=iz_data["activity_index"],
                    source=iz_data["source"],
                    is_proxy=iz_data["is_proxy"],
                    metadata_json=iz_data["metadata_json"]
                )
                db.add(iz)

        # 3. Seed City Zones
        logger.info(f"Seeding {len(CITY_ZONES)} Pune city administrative zones...")
        for cz_data in CITY_ZONES:
            existing = db.query(CityZone).filter(CityZone.id == cz_data["id"]).first()
            if not existing:
                cz = CityZone(
                    id=cz_data["id"],
                    name=cz_data["name"],
                    zone_type=cz_data["zone_type"],
                    coordinates=cz_data["coordinates"],
                    metadata_json=cz_data["metadata_json"]
                )
                db.add(cz)

        # 4. Seed recent sample observations for the last 24 hours
        now = datetime.now(timezone.utc)
        logger.info("Seeding baseline observed air-quality measurements...")
        sample_station_pm25 = {
            "DEMO-SHIVAJINAGAR": 88.5,
            "DEMO-HADAPSAR": 118.2,
            "DEMO-BHOSARI": 138.0,
            "DEMO-KATRAJ": 84.6,
            "DEMO-LOHEGAON": 64.3,
            "DEMO-PASHAN": 52.1,
            "DEMO-KOTHRUD": 68.0,
            "DEMO-WAKAD": 91.5,
        }

        for sid, base_pm in sample_station_pm25.items():
            for h in range(24, 0, -1):
                obs_time = now - timedelta(hours=h)
                # Diurnal variation: higher in morning rush (8-10am) & evening (7-9pm)
                hour_of_day = (obs_time.hour + 5) % 24  # approx IST
                rush_factor = 1.25 if (8 <= hour_of_day <= 10 or 19 <= hour_of_day <= 22) else 0.90
                val = round(base_pm * rush_factor, 1)

                existing = db.query(AirQualityMeasurement).filter(
                    AirQualityMeasurement.station_id == sid,
                    AirQualityMeasurement.timestamp == obs_time
                ).first()

                if not existing:
                    aq = AirQualityMeasurement(
                        station_id=sid,
                        timestamp=obs_time,
                        pm25=val,
                        pm10=round(val * 1.6, 1),
                        no2=34.2,
                        so2=14.5,
                        co=1.1,
                        o3=28.0,
                        aqi=int(min(500, val * 1.8)),
                        source="OpenAQ / CPCB",
                        data_status="OBSERVED"
                    )
                    db.add(aq)

        # 5. Seed Pre-configured Policy Scenarios
        demo_scenarios = [
            {
                "id": "SCEN-ODD-EVEN",
                "name": "Pune Transit ODD-EVEN Restriction",
                "traffic_reduction": 20.0,
                "industrial_reduction": 0.0,
                "green_buffer": False,
                "target_zone": "ZONE-CENTRAL-PUNE",
                "parameters": {"policy_type": "Vehicular Congestion Pricing", "expected_compliance": 0.85}
            },
            {
                "id": "SCEN-MIDC-STACK",
                "name": "Bhosari-Hadapsar Industrial Stack Control",
                "traffic_reduction": 0.0,
                "industrial_reduction": 20.0,
                "green_buffer": False,
                "target_zone": "IND-BHOSARI-MIDC",
                "parameters": {"scrubbers_mandatory": True, "curfew_heavy_diesel": True}
            },
            {
                "id": "SCEN-COMBINED-MAX",
                "name": "Integrated Clean Air Action Plan (NCAP)",
                "traffic_reduction": 20.0,
                "industrial_reduction": 20.0,
                "green_buffer": True,
                "target_zone": "ALL-PUNE",
                "parameters": {"dust_control_pct": 30.0, "green_buffer_sqkm": 15.0}
            }
        ]

        for sc_data in demo_scenarios:
            existing = db.query(Scenario).filter(Scenario.id == sc_data["id"]).first()
            if not existing:
                sc = Scenario(
                    id=sc_data["id"],
                    name=sc_data["name"],
                    traffic_reduction=sc_data["traffic_reduction"],
                    industrial_reduction=sc_data["industrial_reduction"],
                    green_buffer=sc_data["green_buffer"],
                    target_zone=sc_data["target_zone"],
                    parameters=sc_data["parameters"]
                )
                db.add(sc)

        logger.info("Database seeding completed successfully.")


if __name__ == "__main__":
    seed()
