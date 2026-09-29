"""
feature_engineering.py
=======================
Build ML-ready feature matrix from raw PM2.5 + weather + proxy data.

All features are named and grouped for SHAP driver attribution.
No arbitrary random features. All features have a documented rationale.
"""

import math
import os

import numpy as np
import pandas as pd


# ── Feature groups for SHAP driver attribution ─────────────────────────────
FEATURE_GROUPS = {
    "traffic": [
        "traffic_activity_proxy",
        "pm25_lag_1", "pm25_lag_2", "pm25_lag_3",  # short-memory (traffic)
        "road_density_proxy",
    ],
    "industrial": [
        "industrial_activity_proxy",
        "pm25_lag_6", "pm25_lag_12",                # medium lag (industrial)
        "industrial_proximity_score",
    ],
    "dust": [
        "dust_activity_proxy",
        "pm25_rolling_mean_3",
        "construction_season",
    ],
    "weather": [
        "temperature",
        "humidity",
        "wind_speed",
        "wind_sin",
        "wind_cos",
        "precipitation",
        "pressure",
        "boundary_layer_height",
        "pm25_lag_24",                              # boundary-layer diurnal
        "pm25_rolling_mean_24",
    ],
    "temporal": [
        "hour",
        "hour_sin",
        "hour_cos",
        "day_of_week",
        "dow_sin",
        "dow_cos",
        "month",
        "month_sin",
        "month_cos",
        "is_weekend",
        "is_monsoon",
    ],
    "spatial": [
        "lat",
        "lon",
        "station_index",
    ],
}

# Flat list of all features (training order)
ALL_FEATURES = (
    FEATURE_GROUPS["temporal"]
    + FEATURE_GROUPS["weather"]
    + FEATURE_GROUPS["traffic"]
    + FEATURE_GROUPS["industrial"]
    + FEATURE_GROUPS["dust"]
    + FEATURE_GROUPS["spatial"]
)


# ── Road density proxy (based on OSM data / MPCB reference) ─────────────────
# Approximate relative road density around each demo station.
# This is a PROXY. In production, computed from OSM road network.
STATION_ROAD_DENSITY = {
    "DEMO-LOHEGAON":     0.62,
    "DEMO-KATRAJ":       0.91,
    "DEMO-PASHAN":       0.75,
    "DEMO-HADAPSAR":     0.83,
    "DEMO-SHIVAJINAGAR": 0.95,
}

# Industrial proximity score (based on MIDC locations / MPCB reference)
STATION_INDUSTRIAL_PROXIMITY = {
    "DEMO-LOHEGAON":     0.30,
    "DEMO-KATRAJ":       0.45,
    "DEMO-PASHAN":       0.35,
    "DEMO-HADAPSAR":     0.80,
    "DEMO-SHIVAJINAGAR": 0.55,
}

STATION_INDEX = {s: i for i, s in enumerate(
    ["DEMO-LOHEGAON", "DEMO-KATRAJ", "DEMO-PASHAN", "DEMO-HADAPSAR", "DEMO-SHIVAJINAGAR"]
)}


def add_lag_features(df: pd.DataFrame, group_col: str = "station_id") -> pd.DataFrame:
    """
    Add PM2.5 lag features within each station's time series.
    IMPORTANT: lags are computed on sorted time series. No shuffle.
    """
    df = df.sort_values([group_col, "timestamp"]).copy()

    for lag in [1, 2, 3, 6, 12, 24]:
        df[f"pm25_lag_{lag}"] = df.groupby(group_col)["pm25"].shift(lag)

    for window in [3, 6, 24]:
        df[f"pm25_rolling_mean_{window}"] = (
            df.groupby(group_col)["pm25"]
            .transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
        )

    return df


def add_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """Cyclical encoding of temporal features."""
    df = df.copy()
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow_sin"]  = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]  = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["is_monsoon"] = df["month"].isin([6, 7, 8, 9]).astype(int)
    df["construction_season"] = df["month"].isin([3, 4, 5, 10, 11]).astype(int)
    return df


def add_wind_encoding(df: pd.DataFrame) -> pd.DataFrame:
    """Encode wind direction cyclically."""
    df = df.copy()
    df["wind_sin"] = np.sin(np.radians(df["wind_direction"]))
    df["wind_cos"] = np.cos(np.radians(df["wind_direction"]))
    return df


def add_spatial_proxies(df: pd.DataFrame) -> pd.DataFrame:
    """Add spatial proxy features from reference dictionaries."""
    df = df.copy()
    df["road_density_proxy"]        = df["station_id"].map(STATION_ROAD_DENSITY).fillna(0.7)
    df["industrial_proximity_score"] = df["station_id"].map(STATION_INDUSTRIAL_PROXIMITY).fillna(0.5)
    df["station_index"]             = df["station_id"].map(STATION_INDEX).fillna(0).astype(int)
    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full feature engineering pipeline.
    Input: raw PM2.5 + weather + proxy dataframe.
    Output: feature matrix ready for ML.
    """
    df = add_lag_features(df)
    df = add_temporal_features(df)
    df = add_wind_encoding(df)
    df = add_spatial_proxies(df)

    # Drop rows where lag features are NaN (first N rows of each station)
    df = df.dropna(subset=["pm25_lag_24"])

    return df


def get_feature_columns() -> list[str]:
    """Return the ordered feature list used for training/inference."""
    # Deduplicate while preserving order
    seen = set()
    result = []
    for col in ALL_FEATURES:
        if col not in seen:
            seen.add(col)
            result.append(col)
    return result


def get_feature_groups() -> dict:
    return FEATURE_GROUPS


if __name__ == "__main__":
    # Quick test
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(project_root, "data", "raw", "openaq", "pune_pm25_synthetic.parquet")
    if os.path.exists(data_path):
        df = pd.read_parquet(data_path)
        print(f"Loaded {len(df):,} rows")
        df_feat = build_features(df)
        print(f"After feature engineering: {len(df_feat):,} rows, {len(df_feat.columns)} columns")
        features = get_feature_columns()
        missing = [f for f in features if f not in df_feat.columns]
        print(f"Feature columns OK: {len(features)}, missing: {missing}")
        print(df_feat[features].describe().round(2))
    else:
        print(f"Data not found at {data_path}. Run generate_demo_data.py first.")
