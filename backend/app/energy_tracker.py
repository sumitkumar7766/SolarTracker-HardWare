"""
Persistent Energy Storage and Accumulator
Tracks real harvested energy (kWh) from live power telemetry,
resets automatically at midnight, and persists locally to disk.
"""
import json
import os
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from .config import settings

class EnergyStorageManager:
    def __init__(self):
        self.file_path = Path(__file__).resolve().parent.parent / "energy_storage.json"
        self.tz = ZoneInfo(settings.TIMEZONE)
        self.current_date = datetime.now(self.tz).strftime("%Y-%m-%d")
        self.energy_today_kwh = 0.0
        self.total_lifetime_kwh = 0.0
        self.last_saved_time = 0.0
        self.last_calc_time = datetime.now(self.tz)

        # Load existing stored energy
        self._load_from_disk()

    def _get_today_str(self) -> str:
        return datetime.now(self.tz).strftime("%Y-%m-%d")

    def _load_from_disk(self):
        today = self._get_today_str()
        self.current_date = today

        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.total_lifetime_kwh = float(data.get("total_lifetime_kwh", 0.0))
                    # If file is from today, restore the accumulated value
                    if data.get("date") == today:
                        self.energy_today_kwh = float(data.get("energy_today_kwh", 0.0))
                        print(f"[ENERGY] Restored today's harvested energy from disk: {self.energy_today_kwh:.5f} kWh ({today})")
                    else:
                        print(f"[ENERGY] New day detected ({today} vs {data.get('date')}). Resetting daily energy to 0.0 kWh.")
                        self.energy_today_kwh = 0.0
                        self._save_to_disk(force=True)
            except Exception as e:
                print(f"[ENERGY] Warning loading energy_storage.json: {e}")
                self.energy_today_kwh = 0.0
        else:
            print(f"[ENERGY] Initialized fresh daily energy storage ({today})")
            self.energy_today_kwh = 0.0
            self._save_to_disk(force=True)

    def _save_to_disk(self, force: bool = False):
        now = time.time()
        # Throttle disk writes to once every 2.0 seconds unless forced
        if not force and (now - self.last_saved_time < 2.0):
            return

        self.last_saved_time = now
        try:
            today = self._get_today_str()
            payload = {
                "date": today,
                "energy_today_kwh": round(self.energy_today_kwh, 5),
                "total_lifetime_kwh": round(self.total_lifetime_kwh, 5),
                "last_updated": datetime.now(self.tz).strftime("%Y-%m-%d %H:%M:%S")
            }
            # Atomic write via temporary file
            temp_path = self.file_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            os.replace(temp_path, self.file_path)
        except Exception as e:
            print(f"[ENERGY WRITE ERROR] {e}")

    def accumulate(self, power_w: float, now_dt: datetime = None) -> float:
        """
        Integrates power (Watts) over delta-time (seconds) into kWh:
        energy_kwh += (P * dt) / 3,600,000
        """
        if now_dt is None:
            now_dt = datetime.now(self.tz)

        # Check for midnight date rollover
        today = now_dt.strftime("%Y-%m-%d")
        if today != self.current_date:
            print(f"[ENERGY] Midnight rollover: {self.current_date} -> {today}. Daily counter reset.")
            self.current_date = today
            self.energy_today_kwh = 0.0

        calc_dt = (now_dt - self.last_calc_time).total_seconds()
        self.last_calc_time = now_dt

        # Ensure reasonable interval between packets (0.02s to 10s)
        if 0.02 < calc_dt < 10.0 and power_w > 0.0:
            delta_kwh = (power_w * calc_dt) / 3600000.0
            self.energy_today_kwh += delta_kwh
            self.total_lifetime_kwh += delta_kwh
            self._save_to_disk()

        return round(self.energy_today_kwh, 5)

    def get_energy_today(self) -> float:
        return round(self.energy_today_kwh, 5)

    def get_total_lifetime(self) -> float:
        return round(self.total_lifetime_kwh, 5)

energy_tracker = EnergyStorageManager()
