"""
models/air_quality.py — Air quality measurements database model.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from backend.app.database import Base


class AirQualityMeasurement(Base):
    __tablename__ = "air_quality_measurements"
    __table_args__ = (
        UniqueConstraint("station_id", "timestamp", name="uq_station_timestamp"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String(64), ForeignKey("stations.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    pm25 = Column(Float, nullable=True, index=True)
    pm10 = Column(Float, nullable=True)
    no2 = Column(Float, nullable=True)
    so2 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    o3 = Column(Float, nullable=True)
    aqi = Column(Integer, nullable=True)
    source = Column(String(100), nullable=False, default="OpenAQ")
    data_status = Column(String(50), nullable=False, default="OBSERVED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "station_id": self.station_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "pm25": self.pm25,
            "pm10": self.pm10,
            "no2": self.no2,
            "so2": self.so2,
            "co": self.co,
            "o3": self.o3,
            "aqi": self.aqi,
            "source": self.source,
            "data_status": self.data_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
