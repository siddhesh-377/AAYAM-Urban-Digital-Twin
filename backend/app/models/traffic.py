"""
models/traffic.py — Traffic measurement database model.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from backend.app.database import Base


class TrafficMeasurement(Base):
    __tablename__ = "traffic_measurements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    corridor_name = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    vehicle_count = Column(Integer, nullable=True)
    traffic_index = Column(Float, nullable=False, default=1.0)
    source = Column(String(100), nullable=False, default="TomTom/Proxy")
    is_modeled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "corridor_name": self.corridor_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "vehicle_count": self.vehicle_count,
            "traffic_index": self.traffic_index,
            "source": self.source,
            "is_modeled": self.is_modeled,
        }
