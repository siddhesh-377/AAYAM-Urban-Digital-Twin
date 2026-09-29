"""
train.py
========
Trains the Pune PM2.5 forecasting model pipeline.

Follows strict temporal split — NO random shuffle of the time series.

Model hierarchy:
  BASELINE 1 — Persistence (PM2.5(t+1) = PM2.5(t))
  BASELINE 2 — Rolling mean
  MODEL A    — XGBoost, PM2.5 lags only
  MODEL B    — XGBoost, PM2.5 lags + weather
  MODEL C    — XGBoost, PM2.5 lags + weather + urban activity proxies

Outputs:
  ml/artifacts/model_c_xgb.json    — trained Model C (best expected)
  ml/artifacts/training_report.json — metrics + validation results
  ml/artifacts/feature_importance.json
  data/features/train_features.parquet
  data/features/test_features.parquet
"""

import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False
    print("[WARN] xgboost not available. Using sklearn GradientBoosting fallback.")
    from sklearn.ensemble import GradientBoostingRegressor

from ml.feature_engineering import (
    build_features,
    get_feature_columns,
    get_feature_groups,
    FEATURE_GROUPS,
)

# ── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH     = os.path.join(PROJECT_ROOT, "data", "raw", "openaq", "pune_pm25_synthetic.parquet")
ARTIFACT_DIR  = os.path.join(PROJECT_ROOT, "ml", "artifacts")
FEATURES_DIR  = os.path.join(PROJECT_ROOT, "data", "features")

os.makedirs(ARTIFACT_DIR, exist_ok=True)
os.makedirs(FEATURES_DIR, exist_ok=True)

# ── Temporal split configuration ─────────────────────────────────────────────
# TRAIN:      2022-01-01 → 2023-03-31 (15 months)
# VALIDATION: 2023-04-01 → 2023-09-30 (6 months)
# TEST:       2023-10-01 → 2023-12-31 (3 months — NEVER used during fitting)
TRAIN_END  = "2023-03-31 23:00:00"
VAL_END    = "2023-09-30 23:00:00"
TARGET_COL = "pm25"
FORECAST_HORIZON = 1  # hours ahead (t+1)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray, name: str) -> dict:
    """Compute regression metrics. All metrics calculated, none hardcoded."""
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2   = r2_score(y_true, y_pred)

    # MAPE only when y_true never zero (PM2.5 > 0 always)
    mape = float(np.mean(np.abs((y_true - y_pred) / np.maximum(y_true, 1.0)))) * 100

    # Prediction bias
    bias = float(np.mean(y_pred - y_true))

    return {
        "model":    name,
        "n":        int(len(y_true)),
        "mae":      round(float(mae), 3),
        "rmse":     round(float(rmse), 3),
        "r2":       round(float(r2), 4),
        "mape_pct": round(float(mape), 2),
        "bias":     round(float(bias), 3),
    }


def baseline_persistence(df: pd.DataFrame) -> np.ndarray:
    """Baseline 1: PM2.5(t+1) = PM2.5(t) — uses lag_1 feature."""
    return df["pm25_lag_1"].values


def baseline_rolling(df: pd.DataFrame) -> np.ndarray:
    """Baseline 2: Rolling 6-hour mean."""
    return df["pm25_rolling_mean_6"].values


def get_xgb_model(n_estimators: int = 800, learning_rate: float = 0.05) -> "xgb.XGBRegressor":
    return xgb.XGBRegressor(
        n_estimators=n_estimators,
        learning_rate=learning_rate,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )


def train_model(X_train, y_train, X_val, y_val, features: list) -> object:
    """Train XGBoost with early stopping on validation set."""
    model = get_xgb_model()
    model.fit(
        X_train[features], y_train,
        eval_set=[(X_val[features], y_val)],
        verbose=False,
    )
    return model


def ablation_features(model_name: str) -> list:
    """Returns feature subset for each ablation model."""
    lag_features = [f for f in get_feature_columns()
                    if f.startswith("pm25_lag") or f.startswith("pm25_rolling")]
    temporal     = FEATURE_GROUPS["temporal"]
    weather      = FEATURE_GROUPS["weather"]
    traffic      = FEATURE_GROUPS["traffic"]
    industrial   = FEATURE_GROUPS["industrial"]
    dust         = FEATURE_GROUPS["dust"]
    spatial      = FEATURE_GROUPS["spatial"]

    if model_name == "A":
        # PM2.5 lags + temporal only
        return list(dict.fromkeys(lag_features + temporal + spatial))
    elif model_name == "B":
        # Model A + weather
        return list(dict.fromkeys(lag_features + temporal + weather + spatial))
    elif model_name == "C":
        # Full: A + B + urban activity
        return list(dict.fromkeys(
            lag_features + temporal + weather + traffic + industrial + dust + spatial
        ))
    else:
        raise ValueError(f"Unknown model {model_name}")


def main():
    print("=" * 60)
    print("PUNE PM2.5 ML TRAINING PIPELINE")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    # ── Load data ────────────────────────────────────────────────
    if not os.path.exists(DATA_PATH):
        print(f"[ERROR] Dataset not found: {DATA_PATH}")
        print("Run: python ml/generate_demo_data.py")
        sys.exit(1)

    print(f"\nLoading data: {DATA_PATH}")
    raw = pd.read_parquet(DATA_PATH)
    print(f"  Raw records: {len(raw):,}")

    # ── Feature engineering ──────────────────────────────────────
    print("\nBuilding features...")
    df = build_features(raw)
    print(f"  After feature engineering: {len(df):,} rows")

    # ── Temporal split ────────────────────────────────────────────
    print(f"\nTemporal split:")
    train_mask = df["timestamp"] <= TRAIN_END
    val_mask   = (df["timestamp"] > TRAIN_END) & (df["timestamp"] <= VAL_END)
    test_mask  = df["timestamp"] > VAL_END

    df_train = df[train_mask].copy()
    df_val   = df[val_mask].copy()
    df_test  = df[test_mask].copy()

    print(f"  TRAIN:      {df_train['timestamp'].min().date()} → {df_train['timestamp'].max().date()}  ({len(df_train):,} rows)")
    print(f"  VALIDATION: {df_val['timestamp'].min().date()} → {df_val['timestamp'].max().date()}  ({len(df_val):,} rows)")
    print(f"  TEST:       {df_test['timestamp'].min().date()} → {df_test['timestamp'].max().date()}  ({len(df_test):,} rows)")
    print("  *** Test set NEVER used during model fitting ***")

    # Save splits
    df_train.to_parquet(os.path.join(FEATURES_DIR, "train_features.parquet"), index=False)
    df_test.to_parquet(os.path.join(FEATURES_DIR, "test_features.parquet"), index=False)
    df_val.to_parquet(os.path.join(FEATURES_DIR, "val_features.parquet"), index=False)

    y_val  = df_val[TARGET_COL].values
    y_test = df_test[TARGET_COL].values

    # ── Baselines ─────────────────────────────────────────────────
    print("\n── BASELINES ──────────────────────────────────────────")
    pred_persist_val  = baseline_persistence(df_val)
    pred_persist_test = baseline_persistence(df_test)
    pred_roll_val     = baseline_rolling(df_val)
    pred_roll_test    = baseline_rolling(df_test)

    metrics_baseline1_val  = compute_metrics(y_val,  pred_persist_val,  "Baseline-Persistence [VAL]")
    metrics_baseline1_test = compute_metrics(y_test, pred_persist_test, "Baseline-Persistence [TEST]")
    metrics_baseline2_val  = compute_metrics(y_val,  pred_roll_val,     "Baseline-Rolling6h [VAL]")
    metrics_baseline2_test = compute_metrics(y_test, pred_roll_test,    "Baseline-Rolling6h [TEST]")

    for m in [metrics_baseline1_val, metrics_baseline1_test,
              metrics_baseline2_val, metrics_baseline2_test]:
        print(f"  {m['model']:45s}  MAE={m['mae']:.2f}  RMSE={m['rmse']:.2f}  R²={m['r2']:.3f}")

    # ── Model A: lags + temporal ───────────────────────────────────
    print("\n── MODEL A (PM2.5 lags + temporal) ────────────────────")
    feat_a = [f for f in ablation_features("A") if f in df_train.columns]
    model_a = train_model(df_train, df_train[TARGET_COL], df_val, y_val, feat_a)
    pred_a_val  = np.clip(model_a.predict(df_val[feat_a]), 0, 600)
    pred_a_test = np.clip(model_a.predict(df_test[feat_a]), 0, 600)
    m_a_val  = compute_metrics(y_val,  pred_a_val,  "Model-A [VAL]")
    m_a_test = compute_metrics(y_test, pred_a_test, "Model-A [TEST]")
    for m in [m_a_val, m_a_test]:
        print(f"  {m['model']:45s}  MAE={m['mae']:.2f}  RMSE={m['rmse']:.2f}  R²={m['r2']:.3f}")

    # ── Model B: lags + weather ─────────────────────────────────────
    print("\n── MODEL B (PM2.5 lags + weather) ─────────────────────")
    feat_b = [f for f in ablation_features("B") if f in df_train.columns]
    model_b = train_model(df_train, df_train[TARGET_COL], df_val, y_val, feat_b)
    pred_b_val  = np.clip(model_b.predict(df_val[feat_b]), 0, 600)
    pred_b_test = np.clip(model_b.predict(df_test[feat_b]), 0, 600)
    m_b_val  = compute_metrics(y_val,  pred_b_val,  "Model-B [VAL]")
    m_b_test = compute_metrics(y_test, pred_b_test, "Model-B [TEST]")
    for m in [m_b_val, m_b_test]:
        print(f"  {m['model']:45s}  MAE={m['mae']:.2f}  RMSE={m['rmse']:.2f}  R²={m['r2']:.3f}")

    # ── Model C: full ───────────────────────────────────────────────
    print("\n── MODEL C (full: lags + weather + urban activity) ────")
    feat_c = [f for f in ablation_features("C") if f in df_train.columns]
    model_c = train_model(df_train, df_train[TARGET_COL], df_val, y_val, feat_c)
    pred_c_val  = np.clip(model_c.predict(df_val[feat_c]), 0, 600)
    pred_c_test = np.clip(model_c.predict(df_test[feat_c]), 0, 600)
    m_c_val  = compute_metrics(y_val,  pred_c_val,  "Model-C [VAL]")
    m_c_test = compute_metrics(y_test, pred_c_test, "Model-C [TEST]")
    for m in [m_c_val, m_c_test]:
        print(f"  {m['model']:45s}  MAE={m['mae']:.2f}  RMSE={m['rmse']:.2f}  R²={m['r2']:.3f}")

    # ── Save best model (Model C) ────────────────────────────────────
    model_path = os.path.join(ARTIFACT_DIR, "model_c_xgb.json")
    model_c.save_model(model_path)
    print(f"\n✓ Model C saved: {model_path}")

    # ── Feature importance ────────────────────────────────────────────
    importance = dict(zip(feat_c, model_c.feature_importances_.tolist()))
    importance_sorted = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    fi_path = os.path.join(ARTIFACT_DIR, "feature_importance.json")
    with open(fi_path, "w") as f:
        json.dump({
            "model": "Model-C",
            "feature_importances": importance_sorted,
            "features_used": feat_c,
            "feature_groups": get_feature_groups(),
        }, f, indent=2)
    print(f"✓ Feature importance saved: {fi_path}")

    # ── Save test predictions for validation page ────────────────────
    test_preds_df = df_test[["timestamp", "station_id", "station_name", "lat", "lon", TARGET_COL]].copy()
    test_preds_df["predicted_c"]       = pred_c_test
    test_preds_df["predicted_a"]       = pred_a_test
    test_preds_df["baseline_persist"]  = pred_persist_test
    test_preds_df["baseline_rolling"]  = pred_roll_test
    test_preds_df["residual_c"]        = pred_c_test - y_test
    test_preds_path = os.path.join(ARTIFACT_DIR, "test_predictions.parquet")
    test_preds_df.to_parquet(test_preds_path, index=False)
    print(f"✓ Test predictions saved: {test_preds_path}")

    # ── Compile full training report ──────────────────────────────────
    report = {
        "generated_at": datetime.now().isoformat(),
        "data_status": "SYNTHETIC",
        "model_version": "v1.0",
        "target": TARGET_COL,
        "forecast_horizon_hours": FORECAST_HORIZON,
        "temporal_split": {
            "train_start":  str(df_train["timestamp"].min().date()),
            "train_end":    TRAIN_END,
            "val_start":    str(df_val["timestamp"].min().date()),
            "val_end":      VAL_END,
            "test_start":   str(df_test["timestamp"].min().date()),
            "test_end":     str(df_test["timestamp"].max().date()),
            "note":         "Strict temporal split. Test set not used during fitting.",
        },
        "features": {
            "model_a": feat_a,
            "model_b": feat_b,
            "model_c": feat_c,
        },
        "metrics": {
            "baseline_persistence": {
                "val":  metrics_baseline1_val,
                "test": metrics_baseline1_test,
            },
            "baseline_rolling_6h": {
                "val":  metrics_baseline2_val,
                "test": metrics_baseline2_test,
            },
            "model_a": {"val": m_a_val, "test": m_a_test},
            "model_b": {"val": m_b_val, "test": m_b_test},
            "model_c": {"val": m_c_val, "test": m_c_test},
        },
        "model_c_improvement_over_persistence_test": {
            "mae_reduction_pct":  round(100 * (metrics_baseline1_test["mae"]  - m_c_test["mae"])  / metrics_baseline1_test["mae"],  1),
            "rmse_reduction_pct": round(100 * (metrics_baseline1_test["rmse"] - m_c_test["rmse"]) / metrics_baseline1_test["rmse"], 1),
        },
        "notes": [
            "All data is SYNTHETIC — generated from MPCB/CPCB Pune PM2.5 reference statistics.",
            "Metrics reflect model performance on synthetic data, not real Pune measurements.",
            "In production, replace synthetic data with OpenAQ/CPCB observed data.",
            "SHAP values computed separately in explain.py.",
        ],
    }

    report_path = os.path.join(ARTIFACT_DIR, "training_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"✓ Training report saved: {report_path}")

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print(f"Test MAE  (Model C): {m_c_test['mae']:.2f} µg/m³")
    print(f"Test RMSE (Model C): {m_c_test['rmse']:.2f} µg/m³")
    print(f"Test R²   (Model C): {m_c_test['r2']:.3f}")
    print(f"Test MAE  (Baseline): {metrics_baseline1_test['mae']:.2f} µg/m³")
    print("=" * 60)

    return report


if __name__ == "__main__":
    main()
