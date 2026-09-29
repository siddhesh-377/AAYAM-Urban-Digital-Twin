"""
models/weather.py — Weather measurement database model.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, DateTime, UniqueConstraint
from backend.app.database import Base


class WeatherMeasurement(Base):
    __tablename__ = "weather_measurements"
    __table_args__ = (
        UniqueConstraint("latitude", "longitude", "timestamp", name="uq_weather_lat_lon_time"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    wind_direction = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    precipitation = Column(Float, nullable=True)
    boundary_layer_height = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "wind_speed": self.wind_speed,
            "wind_direction": self.wind_direction,
            "pressure": self.pressure,
            "precipitation": self.precipitation,
            "boundary_layer_height": self.boundary_layer_height,
        }
