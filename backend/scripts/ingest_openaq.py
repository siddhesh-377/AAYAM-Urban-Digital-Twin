"""
scripts/ingest_openaq.py — Ingestion script to pull observed air-quality data from OpenAQ.
Can be executed as a scheduled cron or on-demand data pipeline step.
"""
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.services.openaq_service import openaq_service
from backend.app.services.weather_service import weather_service
from backend.app.utils.logging import logger


def main():
    logger.info("=" * 60)
    logger.info("AYAM: INGESTING OBSERVED OPENAQ AIR QUALITY DATA")
    logger.info("=" * 60)

    # 1. Fetch & sync locations
    locations = openaq_service.fetch_pune_locations()
    logger.info(f"Retrieved {len(locations)} Pune air-quality monitoring locations.")

    # 2. Ingest measurements into Supabase / local DB
    count = openaq_service.sync_to_database()
    logger.info(f"Successfully processed and stored {count} observed PM2.5 measurements.")

    # 3. Synchronize concurrent weather
    weather_synced = weather_service.sync_to_database()
    if weather_synced:
        logger.info("Meteorological conditions synchronized.")

    logger.info("Ingestion pipeline completed successfully.")


if __name__ == "__main__":
    main()
