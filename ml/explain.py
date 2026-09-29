"""
explain.py
==========
SHAP-based driver attribution for trained Pune PM2.5 model.

This module:
1. Loads trained Model C
2. Computes SHAP values on test set (or any input DataFrame)
3. Groups feature SHAP values into driver categories:
   - Traffic / Transport
   - Industrial
   - Dust / Construction
   - Weather / Meteorology
4. Saves grouped contribution JSON for API consumption

IMPORTANT LABELLING:
These are model feature contributions (SHAP), NOT physical source apportionment.
The UI must call them "Model-estimated driver contributions" and display
the assumptions panel.

Assumption panel text:
"These contributions represent model feature influence under the available
data and assumptions. They are not direct physical source-apportionment
measurements. They should not be interpreted as precise emission percentages."
"""

import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import shap
    import xgboost as xgb
except ImportError as e:
    print(f"[ERROR] Required package missing: {e}")
    sys.exit(1)

from ml.feature_engineering import (
    build_features,
    get_feature_groups,
)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT_DIR = os.path.join(PROJECT_ROOT, "ml", "artifacts")
FEATURES_DIR = os.path.join(PROJECT_ROOT, "data", "features")

FEATURE_GROUPS = get_feature_groups()

# Map each feature to its driver group
FEATURE_TO_GROUP = {}
for group, feats in FEATURE_GROUPS.items():
    for feat in feats:
        FEATURE_TO_GROUP[feat] = group


def load_model(model_path: str) -> xgb.XGBRegressor:
    model = xgb.XGBRegressor()
    model.load_model(model_path)
    return model


def compute_shap_values(
    model: xgb.XGBRegressor,
    X: pd.DataFrame,
    features: list,
    max_samples: int = 2000,
) -> tuple[np.ndarray, list]:
    """
    Compute SHAP values. Subsample if X is large (for speed).
    Returns (shap_values array, feature_names list).
    """
    X_eval = X[features]
    if len(X_eval) > max_samples:
        X_eval = X_eval.sample(max_samples, random_state=42)

    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X_eval)
    return shap_vals, list(features), X_eval


def group_shap_contributions(
    shap_vals: np.ndarray,
    feature_names: list,
) -> dict:
    """
    Sum |SHAP| values within each driver group.
    Returns relative share (%) per group.

    Uses mean absolute SHAP across samples (global importance).
    """
    shap_df = pd.DataFrame(np.abs(shap_vals), columns=feature_names)

    group_totals = {}
    for group in FEATURE_GROUPS.keys():
        group_feats = [f for f in feature_names if FEATURE_TO_GROUP.get(f) == group]
        group_totals[group] = float(shap_df[group_feats].values.sum()) if group_feats else 0.0

    total = sum(group_totals.values())
    if total == 0:
        return {g: 0.0 for g in group_totals}

    return {g: round(100 * v / total, 2) for g, v in group_totals.items()}


def compute_station_shap(
    model: xgb.XGBRegressor,
    df: pd.DataFrame,
    features: list,
    station_id: str,
) -> dict:
    """
    Compute SHAP-based driver contributions for a specific station
    in the most recent available window.
    Returns a dict ready for the UI Drivers panel.
    """
    station_df = df[df["station_id"] == station_id].copy()
    if len(station_df) == 0:
        return {"error": f"No data for station {station_id}"}

    # Use last 168 rows (1 week) or all if fewer
    station_df = station_df.tail(168)

    X_station = station_df[features]
    explainer  = shap.TreeExplainer(model)
    shap_vals  = explainer.shap_values(X_station)

    group_pct = group_shap_contributions(shap_vals, features)

    # Top contributing features
    mean_abs_shap = pd.Series(
        np.abs(shap_vals).mean(axis=0), index=features
    ).sort_values(ascending=False)

    top_features = [
        {"feature": feat, "mean_abs_shap": round(float(val), 4), "group": FEATURE_TO_GROUP.get(feat, "other")}
        for feat, val in mean_abs_shap.head(10).items()
    ]

    return {
        "station_id":      station_id,
        "n_samples":       len(station_df),
        "analysis_type":   "SHAP TreeExplainer",
        "data_status":     "MODELED",
        "label":           "Model-estimated driver contribution",
        "assumption_text": (
            "These contributions represent model feature influence under the "
            "available data and assumptions. They are not direct physical "
            "source-apportionment measurements. They should not be interpreted "
            "as precise emission percentages."
        ),
        "driver_groups": {
            "Traffic & Transport": {
                "share_pct": group_pct.get("traffic", 0),
                "label":     "[MODELED]",
                "description": "Traffic activity proxy, short-term PM2.5 lags, road density",
            },
            "Industrial": {
                "share_pct": group_pct.get("industrial", 0),
                "label":     "[MODELED]",
                "description": "Industrial activity proxy, medium-term PM2.5 lags, industrial proximity",
            },
            "Dust & Construction": {
                "share_pct": group_pct.get("dust", 0),
                "label":     "[MODELED]",
                "description": "Dust activity proxy, rolling PM2.5 mean, construction season",
            },
            "Meteorology": {
                "share_pct": group_pct.get("weather", 0),
                "label":     "[MODELED]",
                "description": "Wind, humidity, temperature, precipitation, boundary-layer height",
            },
            "Temporal / Other": {
                "share_pct": group_pct.get("temporal", 0) + group_pct.get("spatial", 0),
                "label":     "[MODELED]",
                "description": "Hour of day, day of week, seasonality, station location",
            },
        },
        "top_features": top_features,
        "computed_at": datetime.now().isoformat(),
    }


def run_global_shap(model, df_test: pd.DataFrame, features: list) -> dict:
    """
    Compute global SHAP summary for the test set.
    Saved to artifact for UI and validation page.
    """
    print("Computing global SHAP values on test set...")
    shap_vals, feat_names, X_eval = compute_shap_values(model, df_test, features)

    group_pct = group_shap_contributions(shap_vals, feat_names)

    mean_abs_shap = pd.Series(
        np.abs(shap_vals).mean(axis=0), index=feat_names
    ).sort_values(ascending=False)

    result = {
        "computed_at":    datetime.now().isoformat(),
        "n_samples":      len(X_eval),
        "data_status":    "MODELED",
        "label":          "Model-estimated global driver contributions",
        "group_shares_pct": {
            "Traffic & Transport":  group_pct.get("traffic", 0),
            "Industrial":           group_pct.get("industrial", 0),
            "Dust & Construction":  group_pct.get("dust", 0),
            "Meteorology":          group_pct.get("weather", 0),
            "Temporal / Other":     round(group_pct.get("temporal", 0) + group_pct.get("spatial", 0), 2),
        },
        "top_20_features": [
            {
                "feature":        feat,
                "mean_abs_shap":  round(float(val), 4),
                "group":          FEATURE_TO_GROUP.get(feat, "other"),
            }
            for feat, val in mean_abs_shap.head(20).items()
        ],
        "assumption_text": (
            "Feature influence is estimated using SHAP (SHapley Additive exPlanations) "
            "applied to the XGBoost model. This represents statistical feature contribution "
            "under the training data distribution, NOT physical emission source apportionment. "
            "Refer to the MPCB reference data for published source apportionment estimates."
        ),
    }
    return result


def main():
    print("=" * 60)
    print("SHAP DRIVER EXPLANATION")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    model_path = os.path.join(ARTIFACT_DIR, "model_c_xgb.json")
    if not os.path.exists(model_path):
        print(f"[ERROR] Model not found: {model_path}. Run train.py first.")
        sys.exit(1)

    feat_path = os.path.join(FEATURES_DIR, "test_features.parquet")

    model = load_model(model_path)

    if os.path.exists(feat_path):
        df_test = pd.read_parquet(feat_path)
    else:
        # Rebuild test split from raw synthetic data
        print("[INFO] test_features.parquet not found — rebuilding from raw data.")
        raw_path = os.path.join(PROJECT_ROOT, "data", "raw", "openaq", "pune_pm25_synthetic.parquet")
        if not os.path.exists(raw_path):
            print(f"[ERROR] Raw data not found: {raw_path}. Run generate_demo_data.py first.")
            sys.exit(1)
        raw_df = pd.read_parquet(raw_path)
        df_feat = build_features(raw_df)
        TEST_START = "2023-10-01"
        df_test = df_feat[df_feat["timestamp"] >= TEST_START].copy()
        os.makedirs(FEATURES_DIR, exist_ok=True)
        df_test.to_parquet(feat_path, index=False)
        print(f"[INFO] Rebuilt and saved {len(df_test):,} test-set rows to {feat_path}")

    # Get features used by model C
    with open(os.path.join(ARTIFACT_DIR, "training_report.json")) as f:
        report = json.load(f)
    features = report["features"]["model_c"]
    features = [f for f in features if f in df_test.columns]

    # Global SHAP
    global_shap = run_global_shap(model, df_test, features)
    global_path = os.path.join(ARTIFACT_DIR, "global_shap.json")
    with open(global_path, "w") as f:
        json.dump(global_shap, f, indent=2)
    print(f"✓ Global SHAP saved: {global_path}")

    print("\nGlobal driver group contributions [MODELED]:")
    for group, pct in global_shap["group_shares_pct"].items():
        bar = "█" * int(pct / 2)
        print(f"  {group:25s}  {bar:30s} {pct:.1f}%")

    # Per-station SHAP
    stations = df_test["station_id"].unique()
    station_shap_all = {}
    for stn in stations:
        result = compute_station_shap(model, df_test, features, stn)
        station_shap_all[stn] = result
        print(f"  Station {stn}: computed ({result.get('n_samples', 0)} samples)")

    station_path = os.path.join(ARTIFACT_DIR, "station_shap.json")
    with open(station_path, "w") as f:
        json.dump(station_shap_all, f, indent=2)
    print(f"✓ Station SHAP saved: {station_path}")

    print("\nDone.")


if __name__ == "__main__":
    main()
