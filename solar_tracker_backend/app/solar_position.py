import math
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Dict, Any
import pvlib
from .config import settings

class SolarPositionCalculator:
    def __init__(self):
        self.location = pvlib.location.Location(
            latitude=settings.LATITUDE,
            longitude=settings.LONGITUDE,
            tz=settings.TIMEZONE
        )

    def calculate(self, now: datetime = None) -> Dict[str, Any]:
        """
        Calculates temporal trigonometric features and solar position using pvlib.
        Returns:
            time_sin, time_cos,
            Solar_Azimuth_deg, Solar_Elevation_deg,
            Baseline_Azimuth_deg, Baseline_Elevation_deg
        """
        if now is None:
            now = datetime.now(ZoneInfo(settings.TIMEZONE))

        # 1. Diurnal Cyclical Time Features
        seconds_from_midnight = (
            now.hour * 3600
            + now.minute * 60
            + now.second
            + now.microsecond / 1e6
        )
        time_angle = 2.0 * math.pi * (seconds_from_midnight / 86400.0)
        time_sin = math.sin(time_angle)
        time_cos = math.cos(time_angle)

        # 2. Astronomical Solar Position
        solar_position = self.location.get_solarposition(times=[now])
        solar_azimuth = float(solar_position["azimuth"].iloc[0])
        solar_elevation = float(solar_position["elevation"].iloc[0])

        # Baseline angles represent astronomical position before ML correction
        baseline_azimuth = solar_azimuth
        baseline_elevation = solar_elevation

        return {
            "time_sin": time_sin,
            "time_cos": time_cos,
            "Solar_Azimuth_deg": solar_azimuth,
            "Solar_Elevation_deg": solar_elevation,
            "Baseline_Azimuth_deg": baseline_azimuth,
            "Baseline_Elevation_deg": baseline_elevation,
            "pc_datetime": now.strftime("%Y-%m-%d %H:%M:%S")
        }
