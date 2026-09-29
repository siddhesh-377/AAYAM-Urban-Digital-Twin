"""
backend/ml/evaluate.py — Model evaluation metrics: MAE, RMSE, R².
"""
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from typing import Dict, Any


def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Computes standard regression metrics on validation or test sets.
    """
    y_true = np.array(y_true, dtype=float)
    y_pred = np.array(y_pred, dtype=float)

    # Filter any NaNs
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    y_t = y_true[mask]
    y_p = y_pred[mask]

    mae = float(mean_absolute_error(y_t, y_p))
    rmse = float(np.sqrt(mean_squared_error(y_t, y_p)))
    r2 = float(r2_score(y_t, y_p))

    mean_actual = float(np.mean(y_t))
    mape = float(np.mean(np.abs((y_t - y_p) / np.maximum(y_t, 1.0))) * 100)
    bias = float(np.mean(y_p - y_t))

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 4),
        "mape_pct": round(mape, 2),
        "bias": round(bias, 2),
        "n_samples": int(len(y_t)),
        "mean_actual": round(mean_actual, 2),
    }
