"""
Solar Position Calculation Engine using pvlib
"""
import math
from datetime import datetime
from zoneinfo import ZoneInfo
import pvlib
from .config import settings

class SolarPositionEngine:
    def __init__(self):
        self.location = pvlib.location.Location(
            latitude=settings.LATITUDE,
            longitude=settings.LONGITUDE,
            tz=settings.TIMEZONE
        )

    def calculate(self, dt: datetime = None) -> dict:
        """
        Calculates cyclical time features and astronomical solar coordinates.
        Returns:
            dict with time_sin, time_cos, Solar_Azimuth_deg, Solar_Elevation_deg,
            Baseline_Azimuth_deg, Baseline_Elevation_deg
        """
        if dt is None:
            dt = datetime.now(ZoneInfo(settings.TIMEZONE))

        # 1. Cyclical time embeddings
        seconds_from_midnight = (
            dt.hour * 3600
            + dt.minute * 60
            + dt.second
            + dt.microsecond / 1e6
        )
        time_angle = 2.0 * math.pi * (seconds_from_midnight / 86400.0)
        time_sin = math.sin(time_angle)
        time_cos = math.cos(time_angle)

        # 2. Astronomical solar position
        solar_position = self.location.get_solarposition(times=[dt])
        solar_azimuth = float(solar_position["azimuth"].iloc[0])
        solar_elevation = float(solar_position["elevation"].iloc[0])

        return {
            "time_sin": time_sin,
            "time_cos": time_cos,
            "Solar_Azimuth_deg": round(solar_azimuth, 3),
            "Solar_Elevation_deg": round(solar_elevation, 3),
            "Baseline_Azimuth_deg": round(solar_azimuth, 3),
            "Baseline_Elevation_deg": round(solar_elevation, 3)
        }

solar_engine = SolarPositionEngine()
