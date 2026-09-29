"""
scenario.py
===========
Deterministic scenario engine for the Pune PM2.5 Digital Twin.

Architecture:
  X_baseline → Model C → baseline PM2.5
  X_modified → Model C → scenario PM2.5
  delta = scenario - baseline
  pct_change = 100 * delta / baseline

All scenario outputs are labelled:
  data_status: "SCENARIO"
  label: "MODELED SCENARIO"

NEVER presented as "actual reduction" or measured values.

Intervention parameters (constrained ranges):
  traffic_reduction:    0–30%   (traffic_activity_proxy × (1 - pct/100))
  industrial_reduction: 0–30%   (industrial_activity_proxy × (1 - pct/100))
  dust_control:         0–50%   (dust_activity_proxy × (1 - pct/100))

Constraint rationale:
  - Traffic -30%: plausible with major ODD-EVEN + electric vehicle mix
  - Industrial -30%: plausible with MPCB enforcement + CETP compliance
  - Dust -50%: plausible with mechanised sweeping + green cover
  - Values beyond these ranges are physically implausible for a 1-year scenario
"""

import json
import os
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import xgboost as xgb
except ImportError:
    print("[ERROR] xgboost required. Run: conda install xgboost")
    sys.exit(1)

from ml.feature_engineering import build_features, get_feature_columns

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT_DIR = os.path.join(PROJECT_ROOT, "ml", "artifacts")
FEATURES_DIR = os.path.join(PROJECT_ROOT, "data", "features")

# ── Intervention constraint ranges ────────────────────────────────────────────
INTERVENTION_BOUNDS = {
    "traffic_reduction":    {"min": 0, "max": 30, "units": "percent"},
    "industrial_reduction": {"min": 0, "max": 30, "units": "percent"},
    "dust_control":         {"min": 0, "max": 50, "units": "percent"},
}

# ── Feature columns modified by each intervention ─────────────────────────────
TRAFFIC_FEATURES    = ["traffic_activity_proxy"]
INDUSTRIAL_FEATURES = ["industrial_activity_proxy"]
DUST_FEATURES       = ["dust_activity_proxy"]


def validate_intervention(
    traffic_pct: float = 0.0,
    industrial_pct: float = 0.0,
    dust_pct: float = 0.0,
) -> dict:
    """Validate and clip intervention parameters to allowed ranges."""
    def clip(v, bounds):
        v = float(v)
        if v < bounds["min"] or v > bounds["max"]:
            v_clipped = max(bounds["min"], min(bounds["max"], v))
            return v_clipped, f"Clipped from {v} to {v_clipped}"
        return v, None

    warnings = []
    t, w = clip(traffic_pct, INTERVENTION_BOUNDS["traffic_reduction"])
    if w:
        warnings.append(f"traffic_reduction: {w}")
    i, w = clip(industrial_pct, INTERVENTION_BOUNDS["industrial_reduction"])
    if w:
        warnings.append(f"industrial_reduction: {w}")
    d, w = clip(dust_pct, INTERVENTION_BOUNDS["dust_control"])
    if w:
        warnings.append(f"dust_control: {w}")

    return {
        "traffic_reduction_pct":    t,
        "industrial_reduction_pct": i,
        "dust_control_pct":         d,
        "warnings":                 warnings,
    }


def apply_interventions(
    X: pd.DataFrame,
    traffic_pct: float,
    industrial_pct: float,
    dust_pct: float,
) -> pd.DataFrame:
    """
    Apply intervention modifications to feature matrix.
    Returns a new DataFrame (does not mutate input).
    """
    X_mod = X.copy()

    if traffic_pct > 0:
        factor = 1.0 - traffic_pct / 100.0
        for feat in TRAFFIC_FEATURES:
            if feat in X_mod.columns:
                X_mod[feat] = X_mod[feat] * factor
        # Also reduce short-term lags slightly (traffic effect carries over)
        lag_factor = 1.0 - (traffic_pct / 100.0) * 0.3
        for lag in [1, 2, 3]:
            col = f"pm25_lag_{lag}"
            if col in X_mod.columns:
                X_mod[col] = X_mod[col] * lag_factor

    if industrial_pct > 0:
        factor = 1.0 - industrial_pct / 100.0
        for feat in INDUSTRIAL_FEATURES:
            if feat in X_mod.columns:
                X_mod[feat] = X_mod[feat] * factor
        # Reduce medium lags slightly
        lag_factor = 1.0 - (industrial_pct / 100.0) * 0.25
        for lag in [6, 12]:
            col = f"pm25_lag_{lag}"
            if col in X_mod.columns:
                X_mod[col] = X_mod[col] * lag_factor

    if dust_pct > 0:
        factor = 1.0 - dust_pct / 100.0
        for feat in DUST_FEATURES:
            if feat in X_mod.columns:
                X_mod[feat] = X_mod[feat] * factor

    return X_mod


def run_scenario(
    model: xgb.XGBRegressor,
    X: pd.DataFrame,
    features: list,
    traffic_pct: float = 0.0,
    industrial_pct: float = 0.0,
    dust_pct: float = 0.0,
) -> dict:
    """
    Run a single scenario through the model.

    Returns:
      baseline_mean, scenario_mean, delta, pct_change,
      per-row arrays for chart display.
    """
    intervention = validate_intervention(traffic_pct, industrial_pct, dust_pct)

    # Baseline
    X_base     = X[features].copy()
    pred_base  = np.clip(model.predict(X_base), 0, 600)

    # Scenario
    X_mod      = apply_interventions(
        X,
        intervention["traffic_reduction_pct"],
        intervention["industrial_reduction_pct"],
        intervention["dust_control_pct"],
    )
    pred_scen  = np.clip(model.predict(X_mod[features]), 0, 600)

    delta      = pred_scen - pred_base
    pct_change = np.where(pred_base > 0, 100 * delta / pred_base, 0)

    # Simple uncertainty: ±15% of delta (model-estimated, not calibrated intervals)
    delta_std   = np.std(delta)
    uncertainty = max(abs(np.mean(delta)) * 0.15, delta_std * 0.1)

    return {
        "data_status":        "SCENARIO",
        "label":              "MODELED SCENARIO",
        "disclaimer":         "This is a model-estimated scenario, not an observed or guaranteed outcome.",
        "interventions":      intervention,
        "baseline": {
            "mean_pm25":   round(float(np.mean(pred_base)), 2),
            "median_pm25": round(float(np.median(pred_base)), 2),
            "n":           int(len(pred_base)),
        },
        "scenario": {
            "mean_pm25":   round(float(np.mean(pred_scen)), 2),
            "median_pm25": round(float(np.median(pred_scen)), 2),
        },
        "delta": {
            "mean_absolute_change_ug_m3":   round(float(np.mean(delta)), 2),
            "mean_pct_change":              round(float(np.mean(pct_change)), 2),
            "uncertainty_ug_m3":            round(float(uncertainty), 2),
            "uncertainty_note":             "±15% of estimated delta (model uncertainty, not calibrated CI)",
        },
        "time_series": {
            "baseline":  pred_base.tolist(),
            "scenario":  pred_scen.tolist(),
            "delta":     delta.tolist(),
        },
        "assumption_text": (
            "Scenario assumes proportional reduction in activity proxies. "
            "Real-world effects depend on meteorology, source mix, and implementation quality. "
            "Results are model estimates only."
        ),
        "computed_at": datetime.now().isoformat(),
    }


def run_comparison_table(
    model: xgb.XGBRegressor,
    X: pd.DataFrame,
    features: list,
) -> list:
    """
    Run all 5 scenarios and return a comparison table.
    This satisfies the requirement of comparing ≥3 interventions.
    """
    scenarios = [
        {
            "name":             "Baseline",
            "traffic_pct":      0,
            "industrial_pct":   0,
            "dust_pct":         0,
        },
        {
            "name":             "Traffic −20%",
            "description":      "ODD-EVEN scheme + EV push. No industrial/dust change.",
            "traffic_pct":      20,
            "industrial_pct":   0,
            "dust_pct":         0,
        },
        {
            "name":             "Industry −20%",
            "description":      "MPCB enforcement + stack emission controls on MIDC units.",
            "traffic_pct":      0,
            "industrial_pct":   20,
            "dust_pct":         0,
        },
        {
            "name":             "Dust −30%",
            "description":      "Mechanised sweeping + road paving + construction site wetting.",
            "traffic_pct":      0,
            "industrial_pct":   0,
            "dust_pct":         30,
        },
        {
            "name":             "Combined",
            "description":      "Traffic −20% + Industry −20% + Dust −30% simultaneously.",
            "traffic_pct":      20,
            "industrial_pct":   20,
            "dust_pct":         30,
        },
    ]

    results = []
    for sc in scenarios:
        out = run_scenario(
            model, X, features,
            sc["traffic_pct"], sc["industrial_pct"], sc["dust_pct"],
        )
        results.append({
            "scenario":          sc["name"],
            "description":       sc.get("description", "No intervention"),
            "traffic_pct":       sc["traffic_pct"],
            "industrial_pct":    sc["industrial_pct"],
            "dust_pct":          sc["dust_pct"],
            "baseline_pm25":     out["baseline"]["mean_pm25"],
            "scenario_pm25":     out["scenario"]["mean_pm25"],
            "absolute_change":   out["delta"]["mean_absolute_change_ug_m3"],
            "pct_change":        out["delta"]["mean_pct_change"],
            "uncertainty_ug_m3": out["delta"]["uncertainty_ug_m3"],
            "data_status":       "SCENARIO",
            "label":             "MODELED SCENARIO",
            "assumptions":       out["assumption_text"],
        })

    return results


def main():
    print("=" * 60)
    print("SCENARIO ENGINE TEST")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    model_path = os.path.join(ARTIFACT_DIR, "model_c_xgb.json")
    if not os.path.exists(model_path):
        print("[ERROR] Model not found. Run train.py first.")
        sys.exit(1)

    model = xgb.XGBRegressor()
    model.load_model(model_path)

    df_test = pd.read_parquet(os.path.join(FEATURES_DIR, "test_features.parquet"))

    with open(os.path.join(ARTIFACT_DIR, "training_report.json")) as f:
        report = json.load(f)
    features = [f for f in report["features"]["model_c"] if f in df_test.columns]

    # Run comparison
    table = run_comparison_table(model, df_test, features)

    print("\nScenario Comparison [MODELED SCENARIO]:")
    print(f"{'Scenario':<20} {'Baseline':>10} {'Scenario':>10} {'Change':>10} {'%Change':>8}")
    print("-" * 65)
    for row in table:
        print(
            f"{row['scenario']:<20} {row['baseline_pm25']:>10.1f} "
            f"{row['scenario_pm25']:>10.1f} {row['absolute_change']:>+10.1f} "
            f"{row['pct_change']:>+7.1f}%"
        )

    scenario_path = os.path.join(ARTIFACT_DIR, "scenario_comparison.json")
    with open(scenario_path, "w") as f:
        json.dump(table, f, indent=2)
    print(f"\n✓ Scenario comparison saved: {scenario_path}")


if __name__ == "__main__":
    main()
