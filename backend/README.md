# AYAM — Atmospheric & Urban Analytics Model: Backend

Decision-support platform for Pune that connects air-quality observations with weather, traffic, and industrial activity to forecast pollution, estimate model-based source contributions, and simulate interventions.

---

## 🏗 Directory Architecture

```
backend/
├── app/
│   ├── main.py                     # FastAPI application entry point & lifespan
│   ├── config.py                   # Central settings & env var management
│   ├── database.py                 # SQLAlchemy session & PostGIS engine
│   │
│   ├── api/
│   │   ├── air_quality.py          # /api/air-quality & /api/air-quality/hotspots
│   │   ├── stations.py             # /api/stations & /api/stations/{id}
│   │   ├── forecast.py             # /api/forecast/{station_id} & /api/attribution/{id}
│   │   ├── scenarios.py            # /api/scenarios/simulate & /api/scenarios/{id}
│   │   ├── map.py                  # /api/map/zones, industrial-zones, corridors
│   │   └── ai.py                   # /api/ai/explain (Google Gemini narrative)
│   │
│   ├── models/                     # SQLAlchemy Models
│   │   ├── station.py              # Monitoring station metadata
│   │   ├── air_quality.py          # Observed pollutant measurements
│   │   ├── weather.py              # Meteorology observations
│   │   ├── traffic.py              # Traffic corridor counts & proxy indices
│   │   ├── industrial_zone.py      # Industrial & City administrative zones
│   │   ├── forecast.py             # Numerical forecasts & source attributions
│   │   └── scenario.py             # Scenarios & simulation results
│   │
│   ├── services/
│   │   ├── openaq_service.py       # OpenAQ v3 client with backoff & caching
│   │   ├── weather_service.py      # Open-Meteo weather & boundary layer height
│   │   ├── forecast_service.py     # Multi-step ahead numerical forecast service
│   │   ├── scenario_service.py     # Policy simulation engine
│   │   ├── attribution_service.py  # SHAP driver attribution service
│   │   ├── gemini_service.py       # Grounded natural language explanation
│   │   └── spatial_service.py      # GeoJSON GIS layers
│   │
│   └── utils/
│       ├── validation.py           # Physical bounds & parameter clipping
│       └── logging.py              # Structured logging
│
├── migrations/
│   └── 001_initial_schema.sql      # Supabase PostgreSQL + PostGIS SQL migration
│
├── ml/
│   ├── train.py                    # Time-based split training pipeline
│   ├── predict.py                  # Numerical inference predictor
│   ├── features.py                 # Feature engineering pipeline
│   ├── evaluate.py                 # MAE, RMSE, R² metrics
│   └── models/                     # Saved model artifacts
│
├── data/
│   ├── raw/                        # Ingested OpenAQ / Open-Meteo raw data
│   ├── processed/                  # Feature matrices
│   └── sample/                     # Calibrated offline sample datasets
│
├── scripts/
│   ├── ingest_openaq.py            # OpenAQ ingestion CLI
│   ├── seed_database.py            # Database schema & reference seeding
│   └── generate_sample_data.py     # Sample data generation script
│
├── requirements.txt
├── .env.example
└── README.md
```

---

## ⚡ Quick Start

### 1. Environment Setup

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your API keys:
- `SUPABASE_URL` & `SUPABASE_ANON_KEY` (Supabase PostgreSQL + PostGIS)
- `DATABASE_URL` (e.g. `postgresql://postgres:password@db.your-supabase.co:5432/postgres` or default `sqlite:///./urban_twin.db`)
- `OPENAQ_API_KEY` (OpenAQ API v3)
- `GEMINI_API_KEY` (Google Gemini API)
- `MAPTILER_API_KEY` (MapTiler vector map tiles)

### 3. Initialize & Seed Database

```bash
python scripts/seed_database.py
```

### 4. Train ML Forecasting Pipeline

```bash
python ml/train.py
```
Outputs model metrics:
- Baseline (Linear Regression) Test MAE, RMSE, R²
- Main (XGBoost) Test MAE, RMSE, R²
- Evaluated on a **strict time-based split** (never randomly shuffled)

### 5. Run Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```
Swagger API docs available at: `http://localhost:8000/docs`

---

## 📡 API Endpoints

| Method | Endpoint | Description | Status Tag |
|---|---|---|---|
| `GET` | `/api/health` | Service health & API key capability status | SYSTEM |
| `GET` | `/api/stations` | Pune air-quality monitoring stations | OBSERVED |
| `GET` | `/api/air-quality` | Recent observed pollutant measurements | OBSERVED |
| `GET` | `/api/air-quality/hotspots` | Ranked pollution hotspots with severity & radius | OBSERVED |
| `GET` | `/api/forecast/{station_id}` | Step-ahead numerical PM2.5 forecasts | MODELED |
| `GET` | `/api/attribution/{station_id}`| Model-estimated SHAP driver contributions | MODELED |
| `POST`| `/api/scenarios/simulate` | Run intervention scenario through XGBoost | SCENARIO |
| `GET` | `/api/scenarios/{id}` | Retrieve stored scenario simulation result | SCENARIO |
| `GET` | `/api/scenarios/comparison` | Pre-computed comparison matrix | SCENARIO |
| `POST`| `/api/ai/explain` | Grounded Gemini environmental policy narrative | MODELED |
| `GET` | `/api/map/zones` | Pune administrative zones GeoJSON | REFERENCE |
| `GET` | `/api/map/industrial-zones` | MIDC & industrial belts GeoJSON polygons | REFERENCE |
| `GET` | `/api/map/traffic-corridors`| Transit corridors GeoJSON with traffic indices | MODELED |

---

## 🎯 Data Provenance & Integrity

Every endpoint, metric, and visualization is explicitly tagged:
- **OBSERVED**: Direct physical measurements from OpenAQ v3 / CPCB monitoring stations.
- **MODELED**: Statistical and physical forecasts produced by XGBoost / SHAP.
- **SCENARIO**: Counterfactual simulated interventions under stated policy assumptions.
- **REFERENCE**: Published regulatory reports (MPCB emission inventories, MIDC zones).
