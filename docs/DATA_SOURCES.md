# DATA_SOURCES.md
# Pune Environmental Digital Twin — Data Sources Registry
# Status: FEASIBILITY REPORT (pre-implementation)
# Generated: 2026-09-27
# Author: ENR-01 Technical Lead

> **Network status note:** During initial feasibility assessment, outbound
> internet access from the development machine was unavailable (DNS resolution
> failed for api.openaq.gov, open-meteo.com). All external API calls are
> therefore deferred to runtime with a fully-implemented cache/fallback layer.
> This document describes the **intended** sources and their expected data
> characteristics, grounded in publicly available documentation.

---

## 1. OpenAQ API v3 — Primary Air Quality Source

| Attribute | Value |
|---|---|
| **Type** | OBSERVED |
| **URL** | https://api.openaq.gov/v3/ |
| **Auth** | `OPENAQ_API_KEY` header |
| **Format** | JSON |
| **Variables** | PM2.5 (µg/m³), station metadata |
| **Geographic coverage** | Pune urban area, Maharashtra, India |
| **Known Pune stations** | Lohegaon (CPCB), Katraj (CPCB), Hadapsar, Pashan — exact IDs resolved at runtime |
| **Historical coverage** | ~2016–present (station-dependent; many gaps) |
| **Frequency** | Hourly (CPCB) |
| **Freshness** | Near-real-time with ~1–2 h delay |
| **License** | CC BY 4.0 (OpenAQ Terms of Service) |
| **Known limitations** | Sporadic station outages; some stations switch pollutants; PM2.5 not always present; data may have unit inconsistencies |
| **Implementation** | `backend/app/services/openaq_service.py` |
| **Cache path** | `data/raw/openaq/` |
| **Fallback** | Cached parquet files; if unavailable → SYNTHETIC demo dataset |

---

## 2. Open-Meteo — Weather Data

| Attribute | Value |
|---|---|
| **Type** | OBSERVED (historical reanalysis ERA5) / MODELED (forecast NWP) |
| **URL** | https://open-meteo.com/en/docs |
| **Historical API** | https://archive-api.open-meteo.com/v1/archive |
| **Forecast API** | https://api.open-meteo.com/v1/forecast |
| **Auth** | None (free tier) |
| **Format** | JSON |
| **Variables** | temperature_2m, relative_humidity_2m, wind_speed_10m, wind_direction_10m, precipitation, surface_pressure, boundary_layer_height (if available) |
| **Geographic coverage** | Pune: lat=18.5204, lon=73.8567 |
| **Historical coverage** | 1940–present (ERA5 reanalysis) |
| **Frequency** | Hourly |
| **Freshness** | Historical lag ~5 days; forecast 7–16 days ahead |
| **License** | CC BY 4.0 |
| **Known limitations** | Reanalysis, not in-situ; spatial resolution ~9km; boundary-layer height accuracy varies |
| **Implementation** | `backend/app/services/weather_service.py` |
| **Cache path** | `data/raw/weather/` |
| **Fallback** | Cached parquet → PROXY synthetic weather pattern |

---

## 3. MPCB / CPCB Source Apportionment — REFERENCE Industrial Data

| Attribute | Value |
|---|---|
| **Type** | REFERENCE |
| **Primary source** | MPCB Pune Emission Inventory & Source Apportionment Study |
| **Secondary source** | CPCB National Source Apportionment for PM2.5 |
| **URL** | https://mpcb.gov.in/ — report extracted locally |
| **Format** | Structured JSON extracted from report (cached locally) |
| **Variables** | Source category shares, emission factors, receptor-model results |
| **Geographic coverage** | Pune Municipal Corporation area |
| **Publication date** | ~2018–2023 (version-dependent) |
| **License** | Government of Maharashtra (public domain / open government) |
| **Known limitations** | Receptor-model results; not direct measurement; methodology varies by study; may not reflect current industrial activity |
| **Implementation** | `data/reference/mpcb_source_apportionment.json` |
| **Usage in model** | REFERENCE only — NOT used as ML training labels; used to contextualise SHAP driver groups |

---

## 4. OpenStreetMap — Geographic / Spatial Proxies

| Attribute | Value |
|---|---|
| **Type** | REFERENCE / PROXY |
| **URL** | https://www.openstreetmap.org / https://overpass-api.de/ |
| **Format** | GeoJSON / PBF |
| **Variables** | Road network (motorway, primary, secondary, residential), industrial land-use polygons, construction zones |
| **Geographic coverage** | Pune bounding box: N 18.62, S 18.42, E 73.99, W 73.72 |
| **Frequency** | Static (updated when re-fetched) |
| **License** | ODbL |
| **Known limitations** | Road classification is not a direct traffic-volume measure; industrial tags may be incomplete; construction zones unmaintained |
| **Implementation** | `backend/app/services/osm_service.py` |
| **Cache path** | `data/raw/osm/` |
| **Fallback** | Pre-bundled GeoJSON cache |

---

## 5. TomTom Traffic API — Optional Live Traffic

| Attribute | Value |
|---|---|
| **Type** | OBSERVED / PROXY |
| **URL** | https://developer.tomtom.com/traffic-api/api-explorer |
| **Auth** | `TOMTOM_API_KEY` |
| **Variables** | Traffic flow speed, freeflow speed, congestion index |
| **Geographic coverage** | Pune road network |
| **Frequency** | Near real-time (per request) |
| **License** | TomTom Developer Terms |
| **Known limitations** | Requires active API key; limited to road segments covered by TomTom; historical data limited/paid |
| **Implementation** | `backend/app/services/traffic_service.py` |
| **Fallback** | **TRAFFIC ACTIVITY PROXY** (see below) |

### Traffic Activity Proxy (PROXY — explicit label required in UI)

When TomTom is unavailable, the system constructs a **traffic activity proxy**
from:
1. OSM road density (km of road per km²) at each station's spatial neighbourhood
2. Diurnal traffic pattern (AADT-weighted empirical curve for Indian cities)
3. Day-of-week factor
4. Public holiday calendar for Maharashtra

This is labelled **[PROXY]** everywhere in the UI. It is NOT traffic speed data.

---

## 6. Synthetic / Demo Dataset

| Attribute | Value |
|---|---|
| **Type** | SYNTHETIC |
| **Purpose** | Demo mode — deterministic offline demonstration |
| **Construction** | Based on PM2.5 statistical distribution reported in MPCB/CPCB studies for Pune; seasonal and diurnal patterns from published literature |
| **Period** | 2022-01-01 to 2023-12-31 (24 months) |
| **Labelled** | [SYNTHETIC] / [HISTORICAL REPLAY — NOT LIVE] everywhere |
| **Implementation** | `ml/generate_demo_data.py` |
| **Cache path** | `data/raw/openaq/pune_pm25_demo.parquet` |

---

## Data Quality Matrix

| Source | Availability | Completeness | Timeliness | Reliability |
|---|---|---|---|---|
| OpenAQ | API-dependent | Medium (gaps) | Good | Good |
| Open-Meteo | API-dependent | High | Excellent | High |
| MPCB | Local file | High | Static | Reference-quality |
| OSM | Cache-dependent | Medium | Static | Good for proxies |
| TomTom | Key-dependent | High | Real-time | Good (if available) |
| Synthetic demo | Always | Complete | N/A | Controlled |

---

## Feasibility Assessment

### Network Access
At development time, outbound API calls were blocked. All services are
implemented with cache → fallback → synthetic graceful degradation.

### Recommended Demo Strategy
- Use pre-generated synthetic dataset labelled `[SYNTHETIC]`
- Pre-run ML training on synthetic data
- All API calls attempt live at startup; if unavailable, load cache silently

### Data Honesty Commitments
Every UI element carries one of: `[OBSERVED]`, `[MODELED]`, `[SCENARIO]`,
`[REFERENCE]`, `[PROXY]`, `[SYNTHETIC]`.
No value is fabricated without explicit labelling.
