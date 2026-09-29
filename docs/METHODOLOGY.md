# METHODOLOGY.md
# Pune Environmental Digital Twin — Technical Methodology
# HackMatrix 5.0 — ENR-01
# Version: 1.0

---

## 1. Overview

This document describes the complete technical methodology for the
**Pune Environmental Digital Twin** — a decision-support and simulation system
for PM2.5 pollution in Pune, Maharashtra, India.

The system answers three questions:
- **WHERE** is pollution concentrated? (Spatial hotspot mapping)
- **WHY** does the model associate pollution with particular drivers? (SHAP attribution)
- **WHAT HAPPENS IF** the city changes an intervention? (Scenario simulation)

---

## 2. Data

### 2.1 Primary Air Quality
- **Source**: OpenAQ API v3 (Pune CPCB/MPCB stations)
- **Fallback**: SYNTHETIC demo dataset (labelled throughout as `[SYNTHETIC]`)
- **Pollutant**: PM2.5 (µg/m³)
- **Period**: 2022–2023 (demo); live data when API is configured

### 2.2 Weather
- **Source**: Open-Meteo (ERA5 historical reanalysis + NWP forecast)
- **Variables**: Temperature, humidity, wind speed/direction, precipitation,
  surface pressure, boundary-layer height proxy

### 2.3 Geographic Proxies
- **OSM road network** → road density proxy per station neighbourhood
- **MPCB industrial zone locations** → industrial proximity score
- Both clearly labelled `[PROXY]` in outputs

### 2.4 Traffic
- **Primary**: TomTom Traffic API (if key provided)
- **Fallback**: **TRAFFIC ACTIVITY PROXY** = road_density × diurnal_profile × weekend_factor
- Always labelled `[PROXY]` when real data unavailable

---

## 3. Feature Engineering

All features have documented rationale. No arbitrary features.

### PM2.5 Autoregressive Features
| Feature | Lag/Window | Rationale |
|---|---|---|
| pm25_lag_1 | 1h | Immediate persistence |
| pm25_lag_2 | 2h | Short-term persistence |
| pm25_lag_3 | 3h | Traffic episode decay |
| pm25_lag_6 | 6h | Industrial emission cycle |
| pm25_lag_12 | 12h | Half-day cycle |
| pm25_lag_24 | 24h | Day-before same-hour |
| pm25_rolling_mean_3 | 3h rolling | Short-term average |
| pm25_rolling_mean_6 | 6h rolling | Traffic/industrial episode |
| pm25_rolling_mean_24 | 24h rolling | Daily background |

### Weather Features
| Feature | Encoding | Rationale |
|---|---|---|
| temperature | Raw °C | Photochemistry + mixing |
| humidity | Raw % | Hygroscopic growth |
| wind_speed | Raw m/s | Dilution/transport |
| wind_direction | sin/cos | Cyclical direction |
| precipitation | Raw mm | Wet deposition washout |
| pressure | Raw hPa | Atmospheric stability |
| boundary_layer_height | Raw m | Vertical mixing volume |

### Temporal Features
| Feature | Encoding | Rationale |
|---|---|---|
| hour | sin/cos | Diurnal cycle |
| day_of_week | sin/cos | Weekly pattern (weekday vs weekend) |
| month | sin/cos | Seasonal cycle |
| is_weekend | Binary | Reduced traffic |
| is_monsoon | Binary | Wet season regime |
| construction_season | Binary | Dry season dust |

### Spatial Features
| Feature | Type | Rationale |
|---|---|---|
| lat, lon | Raw | Station-specific effects |
| road_density_proxy | PROXY 0–1 | Traffic exposure |
| industrial_proximity_score | PROXY 0–1 | Industrial exposure |
| station_index | Integer | Fixed effects per station |

---

## 4. Model

### 4.1 Baseline Models
**Baseline 1 — Persistence**: PM2.5(t+1) = PM2.5(t) (pm25_lag_1)
**Baseline 2 — Rolling Mean**: 6-hour rolling average

### 4.2 ML Models (Ablation)
| Model | Features | Purpose |
|---|---|---|
| Model A | Lags + temporal | PM2.5 history only |
| Model B | Model A + weather | Add meteorological context |
| Model C | Model B + urban activity | Add traffic/industrial/dust |

### 4.3 Algorithm
**XGBoost (XGBRegressor)**
- n_estimators: 800
- learning_rate: 0.05
- max_depth: 6
- subsample: 0.8
- colsample_bytree: 0.8
- Objective: reg:squarederror

XGBoost is preferred over LSTM/Transformers because:
- Faster training and inference
- More interpretable (SHAP)
- Better performance on tabular time-series data with limited samples
- No risk of overfitting from vanishing gradients

### 4.4 Why NOT Deep Learning First
Per project specification: establish interpretable gradient boosting baseline first.
LSTM/Transformer would be considered only if XGBoost R² < 0.5 on test set.

---

## 5. Temporal Validation

### CRITICAL: Strict Temporal Split
**NEVER random-shuffle a time series before splitting.**
Doing so creates data leakage — the model "sees the future" during training.

| Split | Period | Purpose |
|---|---|---|
| Train | 2022-01-01 → 2023-03-31 | Model fitting |
| Validation | 2023-04-01 → 2023-09-30 | Hyperparameter selection |
| Test | 2023-10-01 → 2023-12-31 | Final evaluation (held out) |

Test set NEVER used during model fitting or hyperparameter tuning.

### Metrics
- **MAE**: Mean Absolute Error (primary metric)
- **RMSE**: Root Mean Squared Error (penalises large errors)
- **R²**: Coefficient of determination (variance explained)
- **MAPE**: Mean Absolute Percentage Error (only when denominator > 0)
- **Bias**: Mean signed error (positive = model over-predicts)

---

## 6. Source Contribution (SHAP Driver Attribution)

### Method
SHAP (SHapley Additive exPlanations) — TreeExplainer for XGBoost.
Applied to Model C predictions on the test set.

### Feature Grouping
| Driver Group | Features |
|---|---|
| Traffic & Transport | traffic_activity_proxy, pm25_lag_1/2/3, road_density |
| Industrial | industrial_activity_proxy, pm25_lag_6/12, industrial_proximity |
| Dust & Construction | dust_activity_proxy, pm25_rolling_mean_3, construction_season |
| Meteorology | wind, humidity, temperature, precipitation, BLH, pm25_lag_24 |
| Temporal / Other | hour, day_of_week, month, station location |

### IMPORTANT CAVEAT
**SHAP values are feature contributions, NOT physical source apportionment.**

They represent: *"how much did this feature group influence the model's prediction?"*

They do NOT represent: *"what fraction of PM2.5 came from traffic emissions?"*

For published physical source apportionment, see `data/reference/mpcb_source_apportionment.json`.

### UI Labelling Required
All SHAP outputs must be labelled:
- "Model-estimated driver contribution [MODELED]"
- Assumptions panel must be visible

---

## 7. Scenario Engine

### Architecture
```
X_baseline → Model C → baseline PM2.5
         ↓
Apply intervention:
  traffic_activity_proxy × (1 - t/100)
  industrial_activity_proxy × (1 - i/100)
  dust_activity_proxy × (1 - d/100)
         ↓
X_scenario → Model C → scenario PM2.5
         ↓
delta = scenario - baseline
pct_change = 100 × delta / baseline
```

### Intervention Constraints
| Intervention | Range | Rationale |
|---|---|---|
| Traffic reduction | 0–30% | ODD-EVEN + EV adoption |
| Industrial reduction | 0–30% | MPCB enforcement |
| Dust control | 0–50% | Mechanised sweeping + green cover |

Values beyond these ranges are physically implausible for short-term municipal action.

### Uncertainty Estimate
±15% of estimated delta (model uncertainty, not calibrated confidence interval).
This is a conservative placeholder. Calibrated intervals require ensemble models
or conformal prediction — beyond hackathon scope.

### Scenarios Implemented
1. Baseline (no intervention)
2. Traffic −20%
3. Industry −20%
4. Dust −30%
5. Combined (traffic + industry + dust)

---

## 8. Spatial Hotspot Model

### Current Implementation
- Station-level PM2.5 values displayed as point markers
- Map interpolation: Inverse Distance Weighting (IDW) where spatial layer is shown
- Spatial resolution: station-to-station (5 stations)

### Limitations
- 5 stations provide coarse spatial coverage
- IDW assumes homogeneous decay; real pollution is anisotropic
- No topographic correction (Pune has variable terrain)

### Future Improvements
- Kriging interpolation
- ML-based spatial downscaling using building/road/industrial density
- Satellite AOD (Aerosol Optical Depth) fusion

---

## 9. Uncertainty

| Component | Treatment |
|---|---|
| Forecast uncertainty | Grows with horizon (±8–32%) |
| Scenario uncertainty | ±15% of estimated delta |
| Interpolation uncertainty | Not quantified — stated limitation |
| Model uncertainty | Shown as test RMSE in validation page |

---

## 10. Data Honesty Framework

Every value in the UI carries an explicit status:

| Status | Definition |
|---|---|
| `[OBSERVED]` | Directly measured, authoritative dataset |
| `[MODELED]` | Generated by our ML model |
| `[SCENARIO]` | Generated from modified intervention inputs |
| `[REFERENCE]` | Published report or authoritative source |
| `[PROXY]` | Constructed proxy for unavailable data |
| `[SYNTHETIC]` | Artificial demo data |

This framework prevents judges or users from confusing model estimates with measurements.
