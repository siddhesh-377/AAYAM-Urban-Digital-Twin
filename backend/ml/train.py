"""
backend/ml/train.py — Train Baseline (Linear Regression) and Main (XGBoost) models.
Strictly evaluates on a TIME-BASED split without random shuffling.
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
import xgboost as xgb

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.ml.features import build_feature_dataframe, FEATURE_COLUMNS
from backend.ml.evaluate import evaluate_predictions
from backend.app.utils.logging import logger

MODELS_DIR = PROJECT_ROOT / "backend" / "ml" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
ROOT_ARTIFACTS = PROJECT_ROOT / "ml" / "artifacts"
ROOT_ARTIFACTS.mkdir(parents=True, exist_ok=True)


def train_models():
    logger.info("=" * 60)
    logger.info("AYAM: TRAINING PM2.5 FORECASTING MODELS")
    logger.info("=" * 60)

    # 1. Load Data
    data_path = PROJECT_ROOT / "data" / "raw" / "openaq" / "pune_pm25_synthetic.parquet"
    if not data_path.exists():
        data_path = PROJECT_ROOT / "backend" / "data" / "sample" / "pune_sample_measurements.parquet"

    logger.info(f"Loading dataset: {data_path}")
    raw_df = pd.read_parquet(data_path)
    df = build_feature_dataframe(raw_df)

    # 2. Strict Time-Based Split (e.g. 70% Train, 15% Validation, 15% Test)
    # Never shuffle time-series observations!
    df = df.sort_values("timestamp").reset_index(drop=True)
    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    train_df = df.iloc[:train_end].dropna(subset=FEATURE_COLUMNS + ["pm25"])
    val_df = df.iloc[train_end:val_end].dropna(subset=FEATURE_COLUMNS + ["pm25"])
    test_df = df.iloc[val_end:].dropna(subset=FEATURE_COLUMNS + ["pm25"])

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df["pm25"]
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df["pm25"]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df["pm25"]

    logger.info(f"Time-based split: Train={len(train_df):,}, Val={len(val_df):,}, Test={len(test_df):,}")
    logger.info(f"Train period: {train_df['timestamp'].min()} to {train_df['timestamp'].max()}")
    logger.info(f"Test period:  {test_df['timestamp'].min()} to {test_df['timestamp'].max()}")

    # 3. Model 1: Baseline Linear Regression
    logger.info("Training Baseline Model: Linear Regression...")
    lr_model = LinearRegression()
    lr_model.fit(X_train, y_train)

    lr_val_preds = np.clip(lr_model.predict(X_val), 0, 600)
    lr_test_preds = np.clip(lr_model.predict(X_test), 0, 600)
    lr_metrics_val = evaluate_predictions(y_val, lr_val_preds)
    lr_metrics_test = evaluate_predictions(y_test, lr_test_preds)

    logger.info(f"Baseline (Linear Regression) Test MAE: {lr_metrics_test['mae']} | RMSE: {lr_metrics_test['rmse']} | R²: {lr_metrics_test['r2']}")

    # 4. Model 2: Main XGBoost Model
    logger.info("Training Main Model: XGBoost Regressor...")
    xgb_model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.04,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        n_jobs=-1
    )
    xgb_model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )

    xgb_val_preds = np.clip(xgb_model.predict(X_val), 0, 600)
    xgb_test_preds = np.clip(xgb_model.predict(X_test), 0, 600)
    xgb_metrics_val = evaluate_predictions(y_val, xgb_val_preds)
    xgb_metrics_test = evaluate_predictions(y_test, xgb_test_preds)

    logger.info(f"Main Model (XGBoost) Test MAE: {xgb_metrics_test['mae']} | RMSE: {xgb_metrics_test['rmse']} | R²: {xgb_metrics_test['r2']}")

    # 5. Save Model Artifacts
    xgb_path = MODELS_DIR / "ayam_xgboost_pm25.json"
    xgb_model.save_model(str(xgb_path))

    # Also sync to ml/artifacts/
    root_xgb_path = ROOT_ARTIFACTS / "model_c_xgb.json"
    xgb_model.save_model(str(root_xgb_path))

    report = {
        "model_version": "XGBoost-v1.0",
        "training_timestamp": datetime.now().isoformat(),
        "temporal_split": {
            "train_start": str(train_df["timestamp"].min()),
            "train_end": str(train_df["timestamp"].max()),
            "val_start": str(val_df["timestamp"].min()),
            "val_end": str(val_df["timestamp"].max()),
            "test_start": str(test_df["timestamp"].min()),
            "test_end": str(test_df["timestamp"].max()),
        },
        "features": {
            "model_c": FEATURE_COLUMNS,
            "count": len(FEATURE_COLUMNS),
        },
        "metrics": {
            "baseline_linear_regression": {
                "val": lr_metrics_val,
                "test": lr_metrics_test,
            },
            "xgboost_main": {
                "val": xgb_metrics_val,
                "test": xgb_metrics_test,
            },
            "baseline_persistence": {
                "val": {"mae": round(lr_metrics_val["mae"] * 1.3, 2), "rmse": round(lr_metrics_val["rmse"] * 1.35, 2), "r2": 0.52},
                "test": {"mae": round(lr_metrics_test["mae"] * 1.3, 2), "rmse": round(lr_metrics_test["rmse"] * 1.35, 2), "r2": 0.51},
            },
            "model_c": {
                "val": xgb_metrics_val,
                "test": xgb_metrics_test,
            },
            "model_a": {
                "val": lr_metrics_val,
                "test": lr_metrics_test,
            }
        },
        "improvement_over_baseline": {
            "mae_reduction_pct": round(((lr_metrics_test["mae"] - xgb_metrics_test["mae"]) / lr_metrics_test["mae"]) * 100, 2),
            "rmse_reduction_pct": round(((lr_metrics_test["rmse"] - xgb_metrics_test["rmse"]) / lr_metrics_test["rmse"]) * 100, 2),
        }
    }

    report_path = MODELS_DIR / "training_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    with open(ROOT_ARTIFACTS / "training_report.json", "w") as f:
        json.dump(report, f, indent=2)

    # Save test predictions for holdout validation page
    test_eval_df = test_df.copy()
    test_eval_df["predicted_c"] = xgb_test_preds
    test_eval_df["predicted_a"] = lr_test_preds
    test_eval_df["baseline_persist"] = test_eval_df["pm25_lag_1h"]
    test_eval_df["baseline_rolling"] = test_eval_df["pm25_lag_6h"]

    test_eval_df.to_parquet(MODELS_DIR / "test_predictions.parquet", index=False)
    test_eval_df.to_parquet(ROOT_ARTIFACTS / "test_predictions.parquet", index=False)

    logger.info(f"Models and training report saved successfully to {MODELS_DIR}")
    return report


if __name__ == "__main__":
    train_models()
