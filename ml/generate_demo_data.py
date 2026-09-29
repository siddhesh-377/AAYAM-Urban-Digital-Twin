"""
generate_demo_data.py
=====================
Generates a scientifically-grounded SYNTHETIC Pune PM2.5 dataset.

STATUS: SYNTHETIC
All generated values are labelled [SYNTHETIC] in output metadata.
The dataset is constructed from:
  - MPCB/CPCB published annual mean and seasonal patterns for Pune
  - Published diurnal profiles for Indian urban PM2.5
  - Meteorological plausibility constraints
  - Known seasonal cycles (monsoon / winter / summer)

This is NOT real observed data. It is used ONLY for:
  1. Demo mode when OpenAQ is unavailable
  2. Validating the ML pipeline end-to-end
  3. Hackathon demonstration

The demo data mimics the statistical properties of Pune PM2.5,
but individual values are synthetic.
"""

import json
import math
import os
import random
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

# ── Seed for reproducibility ────────────────────────────────────────────────
SEED = 42
np.random.seed(SEED)
random.seed(SEED)

# ── Pune geography ─────────────────────────────────────────────────────────
PUNE_STATIONS = [
    {"id": "DEMO-LOHEGAON",    "name": "Lohegaon",     "lat": 18.5642, "lon": 73.9109, "type": "CPCB CAAQMS", "bias": 0.85},
    {"id": "DEMO-KATRAJ",      "name": "Katraj",        "lat": 18.4509, "lon": 73.8662, "type": "CPCB CAAQMS", "bias": 1.25},
    {"id": "DEMO-PASHAN",      "name": "Pashan",        "lat": 18.5342, "lon": 73.8027, "type": "CPCB CAAQMS", "bias": 0.95},
    {"id": "DEMO-HADAPSAR",    "name": "Hadapsar",      "lat": 18.5089, "lon": 73.9260, "type": "MPCB",        "bias": 1.15},
    {"id": "DEMO-SHIVAJINAGAR","name": "Shivajinagar",  "lat": 18.5308, "lon": 73.8497, "type": "MPCB",        "bias": 1.05},
]

# ── Date range ──────────────────────────────────────────────────────────────
START_DATE = datetime(2022, 1, 1)
END_DATE   = datetime(2023, 12, 31, 23, 0, 0)


def seasonal_factor(dt: datetime) -> float:
    """
    Returns a PM2.5 multiplier based on Pune's seasonal cycle.
    Winter (DJF): highest; Monsoon (JJA): lowest.
    Based on CPCB annual/seasonal reports for Pune.
    """
    m = dt.month
    if m in (12, 1, 2):       # Winter
        base = 1.60
    elif m in (3, 4, 5):       # Summer / pre-monsoon
        base = 1.15
    elif m in (6, 7, 8, 9):    # Monsoon
        base = 0.55
    else:                       # Post-monsoon (Oct–Nov)
        base = 1.20
    # Add inter-annual noise
    year_noise = 1.0 + 0.05 * math.sin(2 * math.pi * (dt.year - 2022))
    return base * year_noise


def diurnal_factor(hour: int) -> float:
    """
    Hourly PM2.5 variation pattern for Indian urban areas.
    Two peaks: morning rush (7-9h) and evening rush (19-21h).
    Minimum at 14-15h (maximum boundary-layer height).
    """
    profile = {
        0: 0.85, 1: 0.80, 2: 0.78, 3: 0.77, 4: 0.80,
        5: 0.90, 6: 1.00, 7: 1.20, 8: 1.30, 9: 1.15,
        10: 1.00, 11: 0.90, 12: 0.85, 13: 0.80, 14: 0.78,
        15: 0.82, 16: 0.90, 17: 1.00, 18: 1.15, 19: 1.25,
        20: 1.20, 21: 1.10, 22: 1.00, 23: 0.90,
    }
    return profile[hour]


def weekend_factor(dt: datetime) -> float:
    """Reduced traffic on weekends → lower PM2.5."""
    return 0.90 if dt.weekday() >= 5 else 1.0


def weather_covariates(dt: datetime, rng: np.random.Generator) -> dict:
    """
    Generates plausible hourly weather for Pune.
    Loosely based on IMD Pune climate normals.
    """
    m = dt.month
    h = dt.hour

    # Temperature (°C)
    temp_mean = {1:17,2:19,3:23,4:27,5:29,6:26,7:24,8:24,9:24,10:23,11:20,12:18}[m]
    temp_amp   = 7  # diurnal amplitude
    temp = temp_mean + temp_amp * math.sin(math.pi * (h - 6) / 12) + rng.normal(0, 1.5)

    # Relative humidity (%)
    rh_mean = {1:55,2:45,3:35,4:30,5:40,6:75,7:85,8:85,9:80,10:65,11:60,12:58}[m]
    rh = np.clip(rh_mean + rng.normal(0, 8), 15, 100)

    # Wind speed (m/s) — Pune is relatively calm
    ws_mean = {1:2.0,2:2.5,3:3.0,4:3.5,5:3.0,6:3.5,7:4.0,8:3.5,9:3.0,10:2.5,11:2.0,12:1.8}[m]
    ws = max(0, ws_mean + rng.normal(0, 0.8))

    # Wind direction (degrees 0-360, meteorological)
    wd_mean = {1:90,2:90,3:270,4:270,5:270,6:240,7:240,8:240,9:240,10:90,11:90,12:90}[m]
    wd = (wd_mean + rng.normal(0, 30)) % 360

    # Precipitation (mm)
    if m in (6, 7, 8, 9):
        precip = max(0, rng.exponential(0.3) if rng.random() < 0.4 else 0)
    elif m in (10, 11):
        precip = max(0, rng.exponential(0.05) if rng.random() < 0.1 else 0)
    else:
        precip = 0.0

    # Surface pressure (hPa)
    pressure = 943.0 + rng.normal(0, 2.5)  # Pune is ~559m elevation

    # Boundary layer height proxy (m)
    blh_day = 1800 if m not in (6,7,8,9) else 1200
    blh = max(200, blh_day * math.sin(max(0, math.pi * (h - 6) / 12)) + rng.normal(0, 150))

    return {
        "temperature": round(temp, 1),
        "humidity": round(rh, 1),
        "wind_speed": round(ws, 2),
        "wind_direction": round(wd, 1),
        "precipitation": round(precip, 2),
        "pressure": round(pressure, 1),
        "boundary_layer_height": round(blh, 0),
    }


def traffic_proxy(dt: datetime) -> float:
    """
    TRAFFIC ACTIVITY PROXY — clearly synthetic.
    Scaled 0–1, representing relative traffic activity.
    NOT real traffic data.
    """
    return diurnal_factor(dt.hour) * weekend_factor(dt) * 0.7 + 0.3


def industrial_proxy(dt: datetime) -> float:
    """
    INDUSTRIAL ACTIVITY PROXY.
    Factories typically run 06:00–22:00 weekdays.
    """
    if dt.weekday() >= 5:  # Weekend
        return 0.4
    if 6 <= dt.hour < 22:
        return 0.85 + 0.15 * math.sin(math.pi * (dt.hour - 6) / 16)
    return 0.3


def dust_proxy(dt: datetime) -> float:
    """
    DUST ACTIVITY PROXY.
    Higher during dry months and daytime (construction hours).
    """
    m = dt.month
    seasonal = 0.3 if m in (6, 7, 8, 9) else (1.0 if m in (3, 4, 5) else 0.7)
    daytime  = 0.8 if 8 <= dt.hour < 18 else 0.3
    return seasonal * daytime


def generate_pm25(
    dt: datetime,
    station_bias: float,
    weather: dict,
    rng: np.random.Generator,
) -> float:
    """
    Generates a plausible PM2.5 value (µg/m³) for a station at a given time.

    Formula (multiplicative seasonal/diurnal structure + additive noise):
      PM2.5 = base × seasonal × diurnal × weekend × station_bias
              × meteorological_penalty + noise

    base: ~32 µg/m³ (Pune annual mean from CPCB reports)
    """
    base = 32.0
    seasonal = seasonal_factor(dt)
    diurnal  = diurnal_factor(dt.hour)
    wknd     = weekend_factor(dt)

    # Meteorological adjustments
    wind_penalty    = max(0.5, 1.0 - 0.05 * weather["wind_speed"])
    humidity_factor = 1.0 + 0.005 * max(0, weather["humidity"] - 60)
    rain_washout    = max(0.3, 1.0 - 0.3 * weather["precipitation"])
    blh_factor      = max(0.6, 1200 / max(300, weather["boundary_layer_height"]))

    pm25 = (
        base * seasonal * diurnal * wknd * station_bias
        * wind_penalty * humidity_factor * rain_washout * blh_factor
    )

    # Log-normal noise (PM2.5 is right-skewed)
    noise = rng.lognormal(mean=0, sigma=0.15)
    pm25 = pm25 * noise

    # Occasional high-pollution episodes (MPCB-consistent: winter inversions)
    if (rng.random() < 0.02 and dt.month in (12, 1, 2)
            and weather["wind_speed"] < 1.5 and weather["boundary_layer_height"] < 400):
        pm25 *= rng.uniform(1.5, 2.5)

    return round(max(5.0, min(pm25, 500.0)), 1)


def generate_dataset(output_dir: str) -> str:
    """
    Generates the full SYNTHETIC demo dataset and writes it to Parquet + CSV.
    Returns path to Parquet file.
    """
    os.makedirs(output_dir, exist_ok=True)
    rng = np.random.default_rng(SEED)

    records = []
    current = START_DATE
    step    = timedelta(hours=1)

    print(f"Generating synthetic Pune PM2.5 dataset: {START_DATE.date()} → {END_DATE.date()}")
    print(f"Stations: {len(PUNE_STATIONS)}")

    n_hours = int((END_DATE - START_DATE).total_seconds() / 3600) + 1
    progress_step = n_hours // 10

    hour_idx = 0
    while current <= END_DATE:
        weather = weather_covariates(current, rng)
        t_proxy  = traffic_proxy(current)
        i_proxy  = industrial_proxy(current)
        d_proxy  = dust_proxy(current)

        for stn in PUNE_STATIONS:
            # Simulate ~5% missing data (realistic for CPCB stations)
            if rng.random() < 0.05:
                continue

            pm25 = generate_pm25(current, stn["bias"], weather, rng)

            records.append({
                # Identifiers
                "station_id":   stn["id"],
                "station_name": stn["name"],
                "lat":          stn["lat"],
                "lon":          stn["lon"],
                "station_type": stn["type"],
                # Timestamps
                "timestamp":    current,
                "hour":         current.hour,
                "day_of_week":  current.weekday(),
                "month":        current.month,
                "year":         current.year,
                "is_weekend":   int(current.weekday() >= 5),
                # Target
                "pm25":         pm25,
                # Weather covariates
                **weather,
                # Urban activity proxies
                "traffic_activity_proxy": round(t_proxy, 3),
                "industrial_activity_proxy": round(i_proxy, 3),
                "dust_activity_proxy": round(d_proxy, 3),
                # Data provenance
                "data_status":  "SYNTHETIC",
                "source":       "synthetic_demo_generator_v1",
            })

        if hour_idx % progress_step == 0:
            pct = 100 * hour_idx / n_hours
            print(f"  {pct:.0f}% — {current.date()}")

        current  += step
        hour_idx += 1

    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["station_id", "timestamp"]).reset_index(drop=True)

    parquet_path = os.path.join(output_dir, "pune_pm25_synthetic.parquet")
    csv_path     = os.path.join(output_dir, "pune_pm25_synthetic_sample.csv")

    df.to_parquet(parquet_path, index=False)
    df.head(1000).to_csv(csv_path, index=False)

    # Metadata
    meta = {
        "data_status": "SYNTHETIC",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "generator_script": "ml/generate_demo_data.py",
        "seed": SEED,
        "date_range": {
            "start": START_DATE.isoformat(),
            "end":   END_DATE.isoformat(),
        },
        "n_records":  len(df),
        "n_stations": len(PUNE_STATIONS),
        "stations":   PUNE_STATIONS,
        "columns": list(df.columns),
        "pm25_stats": df["pm25"].describe().round(2).to_dict(),
        "WARNING": (
            "All values in this file are SYNTHETIC. "
            "They are generated to mimic the statistical properties of "
            "Pune PM2.5 based on published CPCB/MPCB reference data. "
            "They are NOT real measurements."
        ),
        "construction_basis": [
            "MPCB Pune Source Apportionment Study 2019",
            "CPCB Annual Report on Air Quality in India 2022",
            "IMD Pune Climate Normals",
            "Published diurnal PM2.5 profiles for Indian cities",
        ],
    }
    meta_path = os.path.join(output_dir, "pune_pm25_synthetic_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n✓ Synthetic dataset written:")
    print(f"  Parquet: {parquet_path}")
    print(f"  Sample CSV: {csv_path}")
    print(f"  Metadata: {meta_path}")
    print(f"  Records: {len(df):,}")
    print(f"  PM2.5 stats:\n{df['pm25'].describe().round(2)}")

    return parquet_path


if __name__ == "__main__":
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir   = os.path.join(project_root, "data", "raw", "openaq")
    generate_dataset(output_dir)
