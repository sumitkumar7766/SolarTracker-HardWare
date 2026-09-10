import os
from pydantic import BaseModel

class Settings(BaseModel):
    # Serial Port Settings
    SERIAL_PORT: str = os.getenv("SERIAL_PORT", "/dev/cu.usbserial-0001")
    BAUD_RATE: int = int(os.getenv("BAUD_RATE", "115200"))
    SERIAL_TIMEOUT: float = 1.0

    # Solar Geographic Location (Bhopal / Central India default as per project dataset)
    LATITUDE: float = float(os.getenv("LATITUDE", "23.25"))
    LONGITUDE: float = float(os.getenv("LONGITUDE", "77.50"))
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")

    # Simulation / Hardware Mode
    SIMULATION_MODE: bool = os.getenv("SIMULATION_MODE", "False").lower() in ("true", "1", "yes")

    # Model Assets Paths
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    MODEL_PATH: str = os.getenv("MODEL_PATH", os.path.join(BASE_DIR, "models", "solar_tracker_model.pkl"))
    FEATURES_PATH: str = os.getenv("FEATURES_PATH", os.path.join(BASE_DIR, "models", "features.pkl"))

    # Tracking & Deadbands
    AZIMUTH_DEADBAND: float = 1.0       # degrees
    ELEVATION_DEADBAND: float = 1.0     # degrees
    LDR_NORM_DEADBAND: float = 0.08     # normalized differential threshold

    # Low light / No sun condition
    LOW_LIGHT_LUX: float = 200.0        # Lux threshold below which system enters NO_SUN

    # Motor constraints
    MIN_ELEVATION_DEG: float = 10.0
    MAX_ELEVATION_DEG: float = 170.0
    DEFAULT_ELEVATION_DEG: float = 90.0

    AZ_STOP_US: int = 1500
    AZ_SPEED_DELTA_US: int = 40         # 1500 +/- 40 us

    # Direction inversions (if physical servo orientation is reversed)
    INVERT_AZIMUTH: bool = False
    INVERT_ELEVATION: bool = False

    # WebSocket Broadcast Rate
    WS_UPDATE_RATE_HZ: float = 2.0      # 2 updates per second

settings = Settings()
