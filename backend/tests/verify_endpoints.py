"""
backend/tests/verify_endpoints.py — End-to-end verification script for all AYAM endpoints.
Tests every required endpoint against the FastAPI test client.
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.utils.logging import logger

client = TestClient(app)


def run_tests():
    logger.info("=" * 60)
    logger.info("AYAM ENDPOINT VERIFICATION SUITE")
    logger.info("=" * 60)

    # 1. Health
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    logger.info("✓ GET /api/health passed")

    # 2. Stations
    res = client.get("/api/stations")
    assert res.status_code == 200, f"Stations failed: {res.text}"
    data = res.json()
    assert "stations" in data and len(data["stations"]) > 0, "No stations returned"
    logger.info(f"✓ GET /api/stations passed ({len(data['stations'])} stations)")

    # 3. Air Quality
    res = client.get("/api/air-quality")
    assert res.status_code == 200, f"Air quality failed: {res.text}"
    data = res.json()
    assert "measurements" in data, "No measurements returned"
    logger.info(f"✓ GET /api/air-quality passed ({data.get('count', 0)} measurements)")

    # 4. Air Quality Hotspots
    res = client.get("/api/air-quality/hotspots")
    assert res.status_code == 200, f"Hotspots failed: {res.text}"
    data = res.json()
    assert "hotspots" in data and len(data["hotspots"]) > 0, "No hotspots returned"
    logger.info(f"✓ GET /api/air-quality/hotspots passed ({data.get('hotspot_count', 0)} hotspots detected)")

    # 5. Forecast for Station
    station_id = "DEMO-SHIVAJINAGAR"
    res = client.get(f"/api/forecast/{station_id}")
    assert res.status_code == 200, f"Forecast failed: {res.text}"
    data = res.json()
    assert "forecasts" in data and len(data["forecasts"]) > 0, "No forecast steps returned"
    assert data["data_status"] == "MODELED", "Data status must be MODELED"
    logger.info(f"✓ GET /api/forecast/{station_id} passed ({len(data['forecasts'])} steps ahead)")

    # 6. Attribution for Station
    res = client.get(f"/api/attribution/{station_id}")
    assert res.status_code == 200, f"Attribution failed: {res.text}"
    data = res.json()
    assert "driver_groups" in data, "Missing driver_groups in attribution"
    assert "Traffic & Transport" in data["driver_groups"], "Missing Traffic group"
    assert data["label"] == "MODEL-ESTIMATED CONTRIBUTION", "Label mismatch"
    logger.info(f"✓ GET /api/attribution/{station_id} passed ({data['label']})")

    # 7. Scenario Simulation
    payload = {
        "traffic_reduction": 20.0,
        "industrial_reduction": 10.0,
        "green_buffer": True,
        "station_id": station_id
    }
    res = client.post("/api/scenarios/simulate", json=payload)
    assert res.status_code == 200, f"Scenario simulation failed: {res.text}"
    scen_data = res.json()
    assert "baseline_pm25" in scen_data and "predicted_pm25" in scen_data
    assert scen_data["reduction_percent"] > 0, "Expected positive reduction percent"
    assert scen_data["data_status"] == "SCENARIO"
    scenario_id = scen_data["id"]
    logger.info(f"✓ POST /api/scenarios/simulate passed (Delta: -{scen_data['reduction_percent']}%)")

    # 8. Get Scenario by ID
    res = client.get(f"/api/scenarios/{scenario_id}")
    assert res.status_code == 200, f"Get scenario failed: {res.text}"
    logger.info(f"✓ GET /api/scenarios/{scenario_id} passed")

    # 9. Gemini AI Explanation
    explain_payload = {
        "traffic_reduction_pct": 20.0,
        "industrial_reduction_pct": 10.0,
        "green_buffer": True,
        "station_name": "Shivajinagar Transit Hub",
        "baseline_pm25": scen_data["baseline_pm25"],
        "scenario_pm25": scen_data["predicted_pm25"],
        "delta_ugm3": scen_data.get("delta", 15.0),
        "warnings": scen_data.get("warnings", [])
    }
    res = client.post("/api/ai/explain", json=explain_payload)
    assert res.status_code == 200, f"AI explain failed: {res.text}"
    ai_data = res.json()
    assert "explanation" in ai_data and len(ai_data["explanation"]) > 20
    logger.info(f"✓ POST /api/ai/explain passed (Source: {ai_data.get('source')})")

    # 10. Map Zones
    res = client.get("/api/map/zones")
    assert res.status_code == 200
    assert res.json().get("type") == "FeatureCollection"
    logger.info("✓ GET /api/map/zones passed")

    # 11. Map Industrial Zones
    res = client.get("/api/map/industrial-zones")
    assert res.status_code == 200
    assert res.json().get("type") == "FeatureCollection"
    logger.info("✓ GET /api/map/industrial-zones passed")

    # 12. Map Traffic Corridors
    res = client.get("/api/map/traffic-corridors")
    assert res.status_code == 200
    assert res.json().get("type") == "FeatureCollection"
    logger.info("✓ GET /api/map/traffic-corridors passed")

    # 13. Backward-compatible endpoints check
    res_overview = client.get("/api/overview")
    assert res_overview.status_code == 200
    res_comparison = client.get("/api/scenarios/comparison")
    assert res_comparison.status_code == 200
    res_sources = client.get("/api/sources")
    assert res_sources.status_code == 200
    logger.info("✓ All backward-compatible endpoints (/api/overview, /api/scenarios/comparison, /api/sources) passed")

    logger.info("=" * 60)
    logger.info("ALL AYAM ENDPOINTS PASSED VERIFICATION!")
    logger.info("=" * 60)


if __name__ == "__main__":
    run_tests()
