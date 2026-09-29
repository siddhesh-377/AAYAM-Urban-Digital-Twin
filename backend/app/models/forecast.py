"""
models/forecast.py — Forecast and SourceAttribution models.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from backend.app.database import Base


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(64), ForeignKey("stations.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    forecast_timestamp = Column(DateTime(timezone=True), nullable=False)
    predicted_pm25 = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=False)
    upper_bound = Column(Float, nullable=False)
    model_version = Column(String(50), nullable=False, default="XGBoost-v1.0")
    confidence = Column(Float, nullable=False, default=0.85)
    data_status = Column(String(50), nullable=False, default="MODELED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "station_id": self.station_id,
            "forecast_timestamp": self.forecast_timestamp.isoformat() if self.forecast_timestamp else None,
            "predicted_pm25": self.predicted_pm25,
            "lower_bound": self.lower_bound,
            "upper_bound": self.upper_bound,
            "model_version": self.model_version,
            "confidence": self.confidence,
            "data_status": self.data_status,
        }


class SourceAttribution(Base):
    __tablename__ = "source_attributions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(64), ForeignKey("stations.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    traffic_contribution = Column(Float, nullable=False)
    industrial_contribution = Column(Float, nullable=False)
    weather_contribution = Column(Float, nullable=False)
    other_contribution = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False, default=0.82)
    methodology = Column(String(100), nullable=False, default="TreeSHAP Additive Feature Attribution")
    metadata_json = Column("metadata", JSON, default=dict)
    data_status = Column(String(50), nullable=False, default="MODELED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "station_id": self.station_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "traffic_contribution": self.traffic_contribution,
            "industrial_contribution": self.industrial_contribution,
            "weather_contribution": self.weather_contribution,
            "other_contribution": self.other_contribution,
            "confidence": self.confidence,
            "methodology": self.methodology,
            "data_status": self.data_status,
        }
