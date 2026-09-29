"""
backend/ml/features.py — Feature engineering pipeline for PM2.5 forecasting.
Supports all required temporal, meteorological, lagged, and proxy features.
"""
import numpy as np
import pandas as pd
from typing import List, Dict

FEATURE_COLUMNS = [
    "temperature",
    "humidity",
    "wind_speed",
    "wind_direction",
    "pressure",
    "precipitation",
    "traffic_index",
    "industrial_activity_index",
    "hour",
    "day_of_week",
    "month",
    "is_weekend",
    "pm25_lag_1h",
    "pm25_lag_3h",
    "pm25_lag_6h",
    "pm25_lag_24h",
]

FEATURE_GROUPS: Dict[str, List[str]] = {
    "traffic": ["traffic_index", "pm25_lag_1h", "pm25_lag_3h"],
    "industrial": ["industrial_activity_index", "pm25_lag_6h"],
    "weather": [
        "temperature", "humidity", "wind_speed", "wind_direction",
        "pressure", "precipitation", "pm25_lag_24h"
    ],
    "other": ["hour", "day_of_week", "month", "is_weekend"]
}


def build_feature_dataframe(df: pd.DataFrame, station_col: str = "station_id") -> pd.DataFrame:
    """
    Constructs all model features from time-series DataFrame.
    Strictly preserves chronological order without random shuffling.
    """
    df = df.copy()
    if not np.issubdtype(df["timestamp"].dtype, np.datetime64):
        df["timestamp"] = pd.to_datetime(df["timestamp"])

    df = df.sort_values([station_col, "timestamp"]).reset_index(drop=True)

    # 1. Temporal calendar features
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["month"] = df["timestamp"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # 2. Activity Proxies fallback if missing
    if "traffic_index" not in df.columns:
        if "traffic_activity_proxy" in df.columns:
            df["traffic_index"] = df["traffic_activity_proxy"]
        else:
            is_rush = df["hour"].isin([8, 9, 10, 18, 19, 20, 21])
            df["traffic_index"] = np.where(is_rush, 1.45, 0.85)

    if "industrial_activity_index" not in df.columns:
        if "industrial_activity_proxy" in df.columns:
            df["industrial_activity_index"] = df["industrial_activity_proxy"]
        else:
            df["industrial_activity_index"] = 1.0

    if "precipitation" not in df.columns:
        df["precipitation"] = 0.0
    if "pressure" not in df.columns:
        df["pressure"] = 1012.0

    # 3. Time-lagged PM2.5 features computed per station
    for lag in [1, 3, 6, 24]:
        col_name = f"pm25_lag_{lag}h"
        alt_col = f"pm25_lag_{lag}"
        if alt_col in df.columns and col_name not in df.columns:
            df[col_name] = df[alt_col]
        else:
            df[col_name] = df.groupby(station_col)["pm25"].shift(lag)

    # Fill earliest missing lags with forward fill or baseline mean
    for lag in [1, 3, 6, 24]:
        col = f"pm25_lag_{lag}h"
        df[col] = df.groupby(station_col)[col].bfill().fillna(df["pm25"].mean())

    return df


def get_feature_names() -> List[str]:
    return list(FEATURE_COLUMNS)
