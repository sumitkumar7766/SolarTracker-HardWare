"""
Configuration management for AI Solar Tracker Backend
"""
import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings(BaseModel):
    # Serial Port Settings
    SERIAL_PORT: str = os.getenv("SERIAL_PORT", "/dev/cu.usbserial-0001")
    BAUD_RATE: int = int(os.getenv("BAUD_RATE", "115200"))

    # Location & Solar Ephemeris
    LATITUDE: float = float(os.getenv("LATITUDE", "23.25"))
    LONGITUDE: float = float(os.getenv("LONGITUDE", "77.50"))
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")

    # Safety & Thresholds
    LOW_LIGHT_LUX: float = float(os.getenv("LOW_LIGHT_LUX", "150.0"))
    AZIMUTH_DEADBAND: float = float(os.getenv("AZIMUTH_DEADBAND", "1.0"))
    ELEVATION_DEADBAND: float = float(os.getenv("ELEVATION_DEADBAND", "1.0"))

    # Azimuth Continuous Rotation MG995 Servo (Microseconds)
    AZ_NEUTRAL: int = int(os.getenv("AZ_NEUTRAL", "1500"))
    AZ_SPEED: int = int(os.getenv("AZ_SPEED", "40"))  # Left: 1460, Right: 1540

    # Elevation Positional MG995 Servo (Degrees)
    ELEVATION_MIN: float = float(os.getenv("ELEVATION_MIN", "10.0"))
    ELEVATION_MAX: float = float(os.getenv("ELEVATION_MAX", "170.0"))
    ELEVATION_INITIAL: float = float(os.getenv("ELEVATION_INITIAL", "90.0"))

    # Model file paths
    MODEL_PATH: str = str(BASE_DIR / os.getenv("MODEL_PATH", "models/solar_tracker_model.pkl"))
    FEATURES_PATH: str = str(BASE_DIR / os.getenv("FEATURES_PATH", "models/features.pkl"))

    # CORS Allowed Origins
    CORS_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
        ).split(",") if origin.strip()
    ]

settings = Settings()
