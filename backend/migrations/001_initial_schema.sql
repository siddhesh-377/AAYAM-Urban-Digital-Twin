-- ====================================================================
-- AERIS: Urban Environmental Digital Twin (Pune)
-- Database Schema for Supabase PostgreSQL + PostGIS Extension
-- Migration: 001_initial_schema.sql
-- ====================================================================

-- Enable PostGIS extension for spatial queries and geography types
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STATIONS TABLE
-- Air-quality monitoring stations across Pune Urban Airshed
CREATE TABLE IF NOT EXISTS stations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'OpenAQ',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(Point, 4326),
    city VARCHAR(100) NOT NULL DEFAULT 'Pune',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for spatial distance queries
CREATE INDEX IF NOT EXISTS idx_stations_location ON stations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_stations_city ON stations(city);

-- Trigger to automatically populate location from latitude & longitude
CREATE OR REPLACE FUNCTION update_station_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_station_location ON stations;
CREATE TRIGGER trg_station_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON stations
FOR EACH ROW EXECUTE FUNCTION update_station_location();

-- 2. AIR QUALITY MEASUREMENTS TABLE
-- Stores observed pollutant concentrations. Strictly marked 'OBSERVED'.
CREATE TABLE IF NOT EXISTS air_quality_measurements (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(64) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    aqi INTEGER,
    source VARCHAR(100) NOT NULL DEFAULT 'OpenAQ',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_station_timestamp UNIQUE (station_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_aq_station_time ON air_quality_measurements(station_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_aq_timestamp ON air_quality_measurements(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_aq_pm25 ON air_quality_measurements(pm25);

-- 3. WEATHER MEASUREMENTS TABLE
-- Meteorology from Open-Meteo / IMD / ERA5 reanalysis
CREATE TABLE IF NOT EXISTS weather_measurements (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    precipitation DOUBLE PRECISION,
    boundary_layer_height DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_weather_lat_lon_time UNIQUE (latitude, longitude, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_weather_time ON weather_measurements(timestamp DESC);

-- 4. TRAFFIC MEASUREMENTS TABLE
-- Traffic corridor metrics, TomTom API or calibrated proxy
CREATE TABLE IF NOT EXISTS traffic_measurements (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    location GEOGRAPHY(Point, 4326),
    corridor_name VARCHAR(100),
    vehicle_count INTEGER,
    traffic_index DOUBLE PRECISION NOT NULL DEFAULT 1.0, -- Normalized 0.0 - 2.0
    source VARCHAR(100) NOT NULL DEFAULT 'TomTom/Proxy',
    is_modeled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traffic_location ON traffic_measurements USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_traffic_time ON traffic_measurements(timestamp DESC);

-- 5. INDUSTRIAL ZONES TABLE
-- Key industrial belts in Pune (e.g. Bhosari MIDC, Hadapsar, Pimpri)
CREATE TABLE IF NOT EXISTS industrial_zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(100) NOT NULL, -- 'MIDC', 'Industrial Estate', 'Cluster'
    geometry GEOMETRY(Polygon, 4326),
    activity_index DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    source VARCHAR(100) NOT NULL DEFAULT 'MPCB',
    is_proxy BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ind_zones_geom ON industrial_zones USING GIST(geometry);

-- 6. CITY ZONES TABLE
-- Administrative and land-use zones for Pune Municipal Corporation
CREATE TABLE IF NOT EXISTS city_zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(100) NOT NULL, -- 'Commercial', 'Residential', 'Mixed', 'Industrial'
    geometry GEOMETRY(Polygon, 4326),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_zones_geom ON city_zones USING GIST(geometry);

-- 7. FORECASTS TABLE
-- ML model forecasts (XGBoost / Linear Regression)
CREATE TABLE IF NOT EXISTS forecasts (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(64) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    forecast_timestamp TIMESTAMPTZ NOT NULL,
    predicted_pm25 DOUBLE PRECISION NOT NULL,
    lower_bound DOUBLE PRECISION NOT NULL,
    upper_bound DOUBLE PRECISION NOT NULL,
    model_version VARCHAR(50) NOT NULL DEFAULT 'XGBoost-v1.0',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_forecast_station_time UNIQUE (station_id, forecast_timestamp, model_version)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_station_time ON forecasts(station_id, forecast_timestamp);

-- 8. SOURCE ATTRIBUTIONS TABLE
-- SHAP-based feature driver contributions (Model-estimated, not physical emission percentages)
CREATE TABLE IF NOT EXISTS source_attributions (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(64) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    traffic_contribution DOUBLE PRECISION NOT NULL,
    industrial_contribution DOUBLE PRECISION NOT NULL,
    weather_contribution DOUBLE PRECISION NOT NULL,
    other_contribution DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.82,
    methodology VARCHAR(100) NOT NULL DEFAULT 'TreeSHAP Additive Feature Attribution',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attributions_station_time ON source_attributions(station_id, timestamp DESC);

-- 9. SCENARIOS TABLE
-- User-defined or policy intervention scenarios
CREATE TABLE IF NOT EXISTS scenarios (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    traffic_reduction DOUBLE PRECISION NOT NULL DEFAULT 0.0,    -- % reduction (0-30)
    industrial_reduction DOUBLE PRECISION NOT NULL DEFAULT 0.0, -- % reduction (0-30)
    green_buffer BOOLEAN NOT NULL DEFAULT FALSE,
    target_zone VARCHAR(64),
    parameters JSONB DEFAULT '{}'::jsonb,
    created_by VARCHAR(100) DEFAULT 'policy_analyst'
);

-- 10. SCENARIO RESULTS TABLE
-- Model outputs from running scenarios through ML model
CREATE TABLE IF NOT EXISTS scenario_results (
    id BIGSERIAL PRIMARY KEY,
    scenario_id VARCHAR(64) NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    baseline_pm25 DOUBLE PRECISION NOT NULL,
    predicted_pm25 DOUBLE PRECISION NOT NULL,
    reduction_percent DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    affected_area VARCHAR(100) DEFAULT 'Pune Urban Airshed',
    estimated_exposure_change DOUBLE PRECISION,
    warnings JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenario_results_scen_id ON scenario_results(scenario_id);
