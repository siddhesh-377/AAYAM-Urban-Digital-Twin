"""
models/station.py — Station database model.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, JSON
from backend.app.database import Base


class Station(Base):
    __tablename__ = "stations"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    source = Column(String(100), nullable=False, default="OpenAQ")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    # Stored as GeoJSON string or Point text for SQLite/generic compatibility
    location_wkt = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False, default="Pune")
    station_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "source": self.source,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "city": self.city,
            "metadata": self.station_metadata or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
