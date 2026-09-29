"""
models/industrial_zone.py — Industrial zones and City zones models.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, JSON
from backend.app.database import Base


class IndustrialZone(Base):
    __tablename__ = "industrial_zones"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    zone_type = Column(String(100), nullable=False)  # MIDC, Cluster, Industrial Estate
    coordinates = Column(JSON, nullable=True)  # Polygon coordinates [[lat, lon], ...]
    activity_index = Column(Float, nullable=False, default=1.0)
    source = Column(String(100), nullable=False, default="MPCB")
    is_proxy = Column(Boolean, nullable=False, default=False)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "zone_type": self.zone_type,
            "coordinates": self.coordinates or [],
            "activity_index": self.activity_index,
            "source": self.source,
            "is_proxy": self.is_proxy,
            "metadata": self.metadata_json or {},
        }


class CityZone(Base):
    __tablename__ = "city_zones"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    zone_type = Column(String(100), nullable=False)
    coordinates = Column(JSON, nullable=True)
    metadata_json = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "zone_type": self.zone_type,
            "coordinates": self.coordinates or [],
            "metadata": self.metadata_json or {},
        }
