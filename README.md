# AYAM — Atmospheric & Urban Analytics Model

A map-based urban environmental digital twin for Pune that connects air-quality observations with weather, traffic, and industrial activity to forecast pollution, estimate model-based source contributions, and simulate policy interventions such as traffic restrictions and industrial controls.

---

## 🌟 Core Workflow

```
OBSERVE ───▶ UNDERSTAND ───▶ PREDICT ───▶ SIMULATE ───▶ COMPARE
   │              │             │             │            │
Direct OpenAQ   TreeSHAP      XGBoost       Policy      Baseline vs
Observations    Driver        Step-Ahead    Engine      Modeled Scenario
(CPCB / MPCB)   Attribution   Forecasts     (Intervention) Map Updates
```

1. **OBSERVE**: View Pune on an interactive MapLibre map with verified air-quality monitoring stations, observed PM2.5 levels, and identified pollution hotspots.
2. **UNDERSTAND**: Click a hotspot to inspect its details and view model-estimated source contributions (Traffic, Industrial activity, Meteorology, Other).
3. **PREDICT**: View 6-hour ahead numerical PM2.5 forecasts with uncertainty intervals.
4. **SIMULATE**: Formulate policy interventions by adjusting vehicular traffic reduction (0–30%), industrial stack control (0–30%), and green buffer filters.
5. **COMPARE**: Run the scenario through the trained XGBoost model to compare baseline vs modeled scenario, quantify percentage changes, and review AI policy narratives powered by Google Gemini.

> [!IMPORTANT]
> **Data Provenance & Integrity**:
> Modeled source contributions are statistical feature attributions (TreeSHAP) and are explicitly labeled **"MODEL-ESTIMATED CONTRIBUTION"** under stated assumptions. They are not physical chemical mass-balance emission apportionment. Every layer clearly distinguishes **OBSERVED**, **MODELED**, and **SCENARIO** data.

---

## 🏗 System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   AYAM Frontend                        │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS     │
│  Interactive MapLibre GL JS & MapTiler Vector Base Map │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON API
                           ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│   /api/stations     /api/air-quality   /api/forecast   │
│   /api/attribution  /api/scenarios     /api/ai/explain │
└───────┬──────────────────┬─────────────────────┬───────┘
        │                  │                     │
        ▼                  ▼                     ▼
┌──────────────┐   ┌───────────────┐     ┌──────────────┐
│   Database   │   │   ML Engine   │     │ External APIs│
│ Supabase PG  │   │  XGBoost v1   │     │  OpenAQ v3   │
│   + PostGIS  │   │   TreeSHAP    │     │  Open-Meteo  │
│ (or SQLite)  │   │  Time-Split   │     │  Google AI   │
└──────────────┘   └───────────────┘     │  MapTiler    │
                                         └──────────────┘
```

---

## 🚀 Running Locally

### 1. Backend Setup

```bash
# From repository root
pip install -r backend/requirements.txt

# Configure environment variables
cp backend/.env.example .env

# Initialize and seed database
python backend/scripts/seed_database.py

# Train / verify ML forecasting pipeline
python backend/ml/train.py

# Launch FastAPI server
uvicorn backend.app.main:app --reload --port 8000
```
API Documentation and interactive Swagger UI: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 ML Pipeline & Evaluation

The PM2.5 forecasting pipeline is trained and evaluated using a strict **TIME-BASED SPLIT** (never randomly shuffled time-series data):
- **Training Period**: Jan 2022 – May 2023 (58,266 hourly records)
- **Validation Period**: Jun 2023 – Aug 2023 (12,486 hourly records)
- **Test Period**: Sep 2023 – Dec 2023 (12,486 holdout records)

### Holdout Performance:
| Model | MAE (µg/m³) | RMSE (µg/m³) | R² Score |
|---|---|---|---|
| **Baseline (Linear Regression)** | 24.40 | 34.45 | 0.7427 |
| **Main (XGBoost Regressor)** | **15.83** | **23.99** | **0.8752** |
| **Improvement over Baseline** | **35.1% Reduction** | **30.4% Reduction** | **+0.1325** |

---

## 📡 API Reference

### Air Quality & Stations
- `GET /api/stations`: Pune air quality monitoring station locations and metadata.
- `GET /api/air-quality`: Recent observed PM2.5 observations.
- `GET /api/air-quality/hotspots`: Ranked pollution hotspots with severity category and affected radius.

### Forecasting & Driver Attribution
- `GET /api/forecast/{station_id}`: Step-ahead numerical forecasts with upper/lower bounds.
- `GET /api/attribution/{station_id}`: SHAP driver attribution (Traffic, Industrial, Meteorology, Other).
- `GET /api/drivers/global`: Airshed-wide global driver summary.

### Intervention Scenarios & AI
- `POST /api/scenarios/simulate`: Run counterfactual intervention scenarios through the XGBoost model.
- `GET /api/scenarios/comparison`: Pre-computed scenario comparison matrix.
- `POST /api/ai/explain`: Grounded environmental policy explanation powered by Google Gemini.

### Spatial GIS
- `GET /api/map/zones`: Pune administrative and land-use zones GeoJSON.
- `GET /api/map/industrial-zones`: Bhosari MIDC, Hadapsar, Chakan, Pirangut industrial polygons.
- `GET /api/map/traffic-corridors`: Key vehicular corridors with traffic load indices.

---

## 🛡 Security & Secrets Management
- All sensitive credentials (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAQ_API_KEY`, `GEMINI_API_KEY`, `MAPTILER_API_KEY`) are managed via `.env` and never committed to version control.
- Service-role credentials are restricted strictly to backend internal operations and are never exposed to client bundles.
- All API inputs are validated and clipped against physical atmospheric bounds.
