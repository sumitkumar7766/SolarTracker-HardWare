import os
import sys
import math
import time
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from zoneinfo import ZoneInfo
import pvlib
import serial

# ============================================================
# CONFIGURATION
# ============================================================
SERIAL_PORT = "/dev/cu.usbserial-0001"
BAUD_RATE = 115200

LATITUDE = 23.25
LONGITUDE = 77.50
TIMEZONE = "Asia/Kolkata"

MODEL_FILE = "solar_tracker_model.pkl"
FEATURES_FILE = "features.pkl"

# Angle boundary constraints
MIN_ELEVATION = 10.0
MAX_ELEVATION = 170.0


def load_ml_assets(model_path, features_path):
    """Loads the trained ML model and expected feature list."""
    if not os.path.exists(model_path):
        print(f"Error: Model file '{model_path}' not found.")
        sys.exit(1)
    if not os.path.exists(features_path):
        print(f"Error: Features file '{features_path}' not found.")
        sys.exit(1)

    print(f"Loading {model_path}...")
    try:
        model = joblib.load(model_path)
        features = joblib.load(features_path)
        print("Model loaded successfully.")
        return model, features
    except Exception as e:
        print(f"Error loading model assets: {e}")
        sys.exit(1)


def parse_esp32_line(line_str):
    """
    Parses a single CSV line from ESP32 containing 20 values:
    1. ESP32_Timestamp_ms
    2. Top_LDR
    3. Bottom_LDR
    4. Left_LDR
    5. Right_LDR
    6. Horizontal_Error
    7. Vertical_Error
    8. Horizontal_Normalized
    9. Vertical_Normalized
    10. Lux
    11. Light_Status
    12. Horizontal_Direction
    13. Vertical_Direction
    14. Temperature_C
    15. Humidity_percent
    16. Voltage_V
    17. Current_A
    18. Power_W
    19. Azimuth_Command
    20. Elevation_Servo_Angle
    """
    parts = line_str.strip().split(",")
    if len(parts) != 20:
        return None

    try:
        data = {
            "Top_LDR": float(parts[1]),
            "Bottom_LDR": float(parts[2]),
            "Left_LDR": float(parts[3]),
            "Right_LDR": float(parts[4]),
            "Horizontal_Error": float(parts[5]),
            "Vertical_Error": float(parts[6]),
            "Horizontal_Normalized": float(parts[7]),
            "Vertical_Normalized": float(parts[8]),
            "Lux": float(parts[9]),
            "Temperature_C": float(parts[13]),
            "Humidity_percent": float(parts[14]),
            "Voltage_V": float(parts[15]),
            "Current_A": float(parts[16]),
            "Power_W": float(parts[17])
        }
        return data
    except (ValueError, IndexError):
        return None


def calculate_ephemeris(now_dt, location):
    """Calculates temporal sine/cosine and solar ephemeris using pvlib."""
    # 1. Cyclical time features
    seconds_from_midnight = (
        now_dt.hour * 3600
        + now_dt.minute * 60
        + now_dt.second
        + now_dt.microsecond / 1e6
    )
    time_angle = 2.0 * math.pi * (seconds_from_midnight / 86400.0)
    time_sin = math.sin(time_angle)
    time_cos = math.cos(time_angle)

    # 2. Astronomical solar position
    solar_position = location.get_solarposition(times=[now_dt])
    solar_azimuth = float(solar_position["azimuth"].iloc[0])
    solar_elevation = float(solar_position["elevation"].iloc[0])

    baseline_azimuth = solar_azimuth
    baseline_elevation = solar_elevation

    return {
        "time_sin": time_sin,
        "time_cos": time_cos,
        "Solar_Azimuth_deg": solar_azimuth,
        "Solar_Elevation_deg": solar_elevation,
        "Baseline_Azimuth_deg": baseline_azimuth,
        "Baseline_Elevation_deg": baseline_elevation
    }


def main():
    # Load trained model and feature definitions
    model, expected_features = load_ml_assets(MODEL_FILE, FEATURES_FILE)

    # Initialize pvlib solar location
    location = pvlib.location.Location(
        latitude=LATITUDE,
        longitude=LONGITUDE,
        tz=TIMEZONE
    )

    print("Waiting for ESP32 data...")

    # Open serial connection
    ser = None
    while True:
        try:
            if ser is None or not ser.is_open:
                ser = serial.Serial(
                    port=SERIAL_PORT,
                    baudrate=BAUD_RATE,
                    timeout=1.0
                )
                time.sleep(2.0)  # Stabilize serial port

            raw_line = ser.readline().decode("utf-8", errors="ignore").strip()
            if not raw_line:
                continue

            # Parse ESP32 sensor values
            sensor_data = parse_esp32_line(raw_line)
            if sensor_data is None:
                continue

            # Compute real-time ephemeris and cyclical time
            now_dt = datetime.now(ZoneInfo(TIMEZONE))
            ephemeris_data = calculate_ephemeris(now_dt, location)

            # Combine all features
            full_feature_dict = {**ephemeris_data, **sensor_data}

            # Build feature dataframe adhering strictly to features.pkl
            feature_vector = pd.DataFrame([full_feature_dict])

            # Verify and select expected columns in exact order
            missing_cols = [col for col in expected_features if col not in feature_vector.columns]
            if missing_cols:
                continue

            X = feature_vector[expected_features]

            # Check for NaN / infinite values
            if X.isnull().values.any() or np.isinf(X.values).any():
                continue

            # Perform ML Inference
            # Target 1: ground_truth_azimuth_residual_deg
            # Target 2: ground_truth_elevation_residual_deg
            predictions = model.predict(X)
            pred_az_residual = float(predictions[0, 0])
            pred_el_residual = float(predictions[0, 1])

            # Calculate target angles
            base_az = ephemeris_data["Baseline_Azimuth_deg"]
            base_el = ephemeris_data["Baseline_Elevation_deg"]

            target_azimuth = (base_az + pred_az_residual) % 360.0
            target_elevation = min(max(base_el + pred_el_residual, MIN_ELEVATION), MAX_ELEVATION)

            # Clean Live Terminal Output
            print("------------------------------------------------")
            print("Solar Tracker ML Prediction")
            print("------------------------------------------------")
            print(f"Solar Azimuth       : {ephemeris_data['Solar_Azimuth_deg']:.2f}°")
            print(f"Solar Elevation     : {ephemeris_data['Solar_Elevation_deg']:.2f}°")
            print()
            print(f"Azimuth Correction  : {pred_az_residual:+.2f}°")
            print(f"Elevation Correction: {pred_el_residual:+.2f}°")
            print()
            print(f"Target Azimuth      : {target_azimuth:.2f}°")
            print(f"Target Elevation    : {target_elevation:.2f}°")
            print("------------------------------------------------")
            print()

        except serial.SerialException:
            print("Serial connection lost or port unavailable. Retrying in 2 seconds...")
            if ser is not None:
                try:
                    ser.close()
                except Exception:
                    pass
                ser = None
            time.sleep(2.0)
        except KeyboardInterrupt:
            print("\nInference stopped by user.")
            if ser is not None and ser.is_open:
                ser.close()
            break
        except Exception as e:
            # Continue on transient errors without crashing
            continue


if __name__ == "__main__":
    main()
