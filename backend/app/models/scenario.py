"""
models/scenario.py — Scenario and ScenarioResult models.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from backend.app.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    traffic_reduction = Column(Float, nullable=False, default=0.0)
    industrial_reduction = Column(Float, nullable=False, default=0.0)
    green_buffer = Column(Boolean, nullable=False, default=False)
    target_zone = Column(String(64), nullable=True)
    parameters = Column(JSON, default=dict)
    created_by = Column(String(100), default="policy_analyst")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "traffic_reduction": self.traffic_reduction,
            "industrial_reduction": self.industrial_reduction,
            "green_buffer": self.green_buffer,
            "target_zone": self.target_zone,
            "parameters": self.parameters or {},
            "created_by": self.created_by,
        }


class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    baseline_pm25 = Column(Float, nullable=False)
    predicted_pm25 = Column(Float, nullable=False)
    reduction_percent = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False, default=0.80)
    affected_area = Column(String(100), default="Pune Urban Airshed")
    estimated_exposure_change = Column(Float, nullable=True)
    warnings = Column(JSON, default=list)
    data_status = Column(String(50), nullable=False, default="SCENARIO")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "scenario_id": self.scenario_id,
            "baseline_pm25": self.baseline_pm25,
            "predicted_pm25": self.predicted_pm25,
            "reduction_percent": self.reduction_percent,
            "confidence": self.confidence,
            "affected_area": self.affected_area,
            "estimated_exposure_change": self.estimated_exposure_change,
            "warnings": self.warnings or [],
            "data_status": self.data_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
