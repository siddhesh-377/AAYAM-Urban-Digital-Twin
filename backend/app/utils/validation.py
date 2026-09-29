"""
utils/validation.py — Data and scenario validation utilities.
"""
from typing import Tuple, List, Optional

# Pune Bounding Box
PUNE_BBOX = {
    "min_lat": 18.30,
    "max_lat": 18.75,
    "min_lon": 73.65,
    "max_lon": 74.15,
}

# Plausible Physical PM2.5 bounds (µg/m³)
PM25_MIN = 0.0
PM25_MAX = 999.0

# Intervention constraint limits
INTERVENTION_LIMITS = {
    "traffic_reduction": {"min": 0.0, "max": 30.0, "warning_threshold": 25.0},
    "industrial_reduction": {"min": 0.0, "max": 30.0, "warning_threshold": 25.0},
    "dust_control": {"min": 0.0, "max": 50.0, "warning_threshold": 40.0},
}


def is_in_pune_bounds(lat: float, lon: float) -> bool:
    """Check if geographic coordinates are within Pune urban airshed."""
    return (
        PUNE_BBOX["min_lat"] <= lat <= PUNE_BBOX["max_lat"]
        and PUNE_BBOX["min_lon"] <= lon <= PUNE_BBOX["max_lon"]
    )


def validate_pm25_value(val: Optional[float]) -> Optional[float]:
    """Validate and filter impossible physical PM2.5 measurements."""
    if val is None:
        return None
    try:
        f = float(val)
        if f < PM25_MIN or f > PM25_MAX:
            return None
        return round(f, 2)
    except (ValueError, TypeError):
        return None


def validate_scenario_parameters(
    traffic_reduction: float,
    industrial_reduction: float,
    dust_control: float = 0.0
) -> Tuple[float, float, float, List[str]]:
    """
    Validates and clips scenario parameters to physically plausible limits.
    Returns (clipped_traffic, clipped_industrial, clipped_dust, warnings).
    """
    warnings = []

    # Traffic
    t_cfg = INTERVENTION_LIMITS["traffic_reduction"]
    t = float(traffic_reduction)
    if t < t_cfg["min"]:
        t = t_cfg["min"]
    elif t > t_cfg["max"]:
        warnings.append(
            f"Traffic reduction ({t}%) exceeds max plausible single-year limit (30%). Clipped to 30%."
        )
        t = t_cfg["max"]
    elif t >= t_cfg["warning_threshold"]:
        warnings.append("High traffic reduction assumed (>25%). Requires strict municipal enforcement.")

    # Industrial
    i_cfg = INTERVENTION_LIMITS["industrial_reduction"]
    i = float(industrial_reduction)
    if i < i_cfg["min"]:
        i = i_cfg["min"]
    elif i > i_cfg["max"]:
        warnings.append(
            f"Industrial reduction ({i}%) exceeds max single-year limit (30%). Clipped to 30%."
        )
        i = i_cfg["max"]
    elif i >= i_cfg["warning_threshold"]:
        warnings.append("High industrial curtailment assumed (>25%). Potential local economic trade-offs.")

    # Dust
    d_cfg = INTERVENTION_LIMITS["dust_control"]
    d = float(dust_control)
    if d < d_cfg["min"]:
        d = d_cfg["min"]
    elif d > d_cfg["max"]:
        warnings.append(f"Dust control ({d}%) clipped to max limit (50%).")
        d = d_cfg["max"]

    return t, i, d, warnings
