import time
import requests
import json
from datetime import datetime
from zoneinfo import ZoneInfo

API_BASE = "http://127.0.0.1:8000"

print("==================================================")
print("FASTAPI BACKEND SIMULATED HARDWARE TELEMETRY SENDER")
print("==================================================")

# Realistic sample solar tracker packet
# Columns:
# ESP32_Timestamp_ms, Top, Bottom, Left, Right, h_err, v_err, h_norm, v_norm, Lux, Light_Status, h_dir, v_dir, Temp, Hum, Volt, Curr, Power, AzCmd, ElAngle
raw_line = "125000,3850,3800,3100,3900,800,50,0.1143,0.0065,48250.0,HIGH,RIGHT,CENTER,35.8,51.2,22.45,0.850,19.08,1500,34"

try:
    resp = requests.get(f"{API_BASE}/api/status")
    print("Backend Status Check:", resp.json())

    resp = requests.get(f"{API_BASE}/api/tracker")
    print("\nInitial Tracker State:")
    print(json.dumps(resp.json(), indent=2))

    print("\n✓ Verification successful!")
except Exception as e:
    print(f"Note: Backend is not running yet. Run 'uvicorn app.main:app' to test live: {e}")
