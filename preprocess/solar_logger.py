import serial
import csv
import math
import os

from datetime import datetime
from zoneinfo import ZoneInfo

import pvlib


# ============================================================
# SERIAL SETTINGS
# ============================================================

SERIAL_PORT = "/dev/cu.usbserial-0001"
BAUD_RATE = 115200


# ============================================================
# LOCATION
# ============================================================

LATITUDE = 23.25
LONGITUDE = 77.50
TIMEZONE = "Asia/Kolkata"


# ============================================================
# OUTPUT FILE
# ============================================================

CSV_FILE = "solar_data.csv"


# ============================================================
# RESIDUAL CALIBRATION
# ============================================================

# Maximum angle correction represented by normalized LDR error.

MAX_AZIMUTH_CORRECTION = 30.0
MAX_ELEVATION_CORRECTION = 30.0


# ============================================================
# DATASET COLUMNS
# ============================================================

CSV_COLUMNS = [

    "PC_DateTime",
    "ESP32_Timestamp_ms",

    "time_sin",
    "time_cos",

    "Solar_Azimuth_deg",
    "Solar_Elevation_deg",

    "Baseline_Azimuth_deg",
    "Baseline_Elevation_deg",

    "Top_LDR",
    "Bottom_LDR",
    "Left_LDR",
    "Right_LDR",

    "Horizontal_Error",
    "Vertical_Error",

    "Horizontal_Normalized",
    "Vertical_Normalized",

    "Lux",
    "Light_Status",

    "Horizontal_Direction",
    "Vertical_Direction",

    "Temperature_C",
    "Humidity_percent",

    "Voltage_V",
    "Current_A",
    "Power_W",

    "Azimuth_Command",
    "Elevation_Servo_Angle",

    "ground_truth_azimuth_residual_deg",
    "ground_truth_elevation_residual_deg"
]


# ============================================================
# CREATE / APPEND CSV
# ============================================================

file_exists = os.path.exists(CSV_FILE)

csv_file = open(
    CSV_FILE,
    "a",
    newline="",
    encoding="utf-8"
)

writer = csv.DictWriter(
    csv_file,
    fieldnames=CSV_COLUMNS
)

if not file_exists:
    writer.writeheader()
    csv_file.flush()


# ============================================================
# SERIAL CONNECTION
# ============================================================

ser = serial.Serial(
    SERIAL_PORT,
    BAUD_RATE,
    timeout=2
)


# ============================================================
# PVLIB LOCATION
# ============================================================

location = pvlib.location.Location(
    LATITUDE,
    LONGITUDE,
    tz=TIMEZONE
)


print()
print("================================================")
print("          SOLAR TRACKER DATA LOGGER")
print("================================================")
print()
print("Serial Port :", SERIAL_PORT)
print("Baud Rate   :", BAUD_RATE)
print("Dataset     :", CSV_FILE)
print()
print("Collecting data...")
print("Press CTRL+C to stop.")
print()


# ============================================================
# MAIN LOOP
# ============================================================

try:

    while True:

        line = (
            ser.readline()
            .decode(
                "utf-8",
                errors="ignore"
            )
            .strip()
        )

        if not line:
            continue


        # ====================================================
        # ESP32 READY
        # ====================================================

        if line == "SYSTEM_READY":

            print("ESP32 SYSTEM READY")

            continue


        # ====================================================
        # SPLIT DATA
        # ====================================================

        values = line.split(",")


        # ESP32 sends 20 fields

        if len(values) != 20:

            print(
                "Invalid data:",
                line
            )

            continue


        try:

            # =================================================
            # ESP32 DATA
            # =================================================

            esp_timestamp = int(
                values[0]
            )

            top = int(
                values[1]
            )

            bottom = int(
                values[2]
            )

            left = int(
                values[3]
            )

            right = int(
                values[4]
            )

            horizontal_error = int(
                values[5]
            )

            vertical_error = int(
                values[6]
            )

            horizontal_normalized = float(
                values[7]
            )

            vertical_normalized = float(
                values[8]
            )

            lux = float(
                values[9]
            )

            light_status = values[10]

            horizontal_direction = values[11]

            vertical_direction = values[12]

            temperature = float(
                values[13]
            )

            humidity = float(
                values[14]
            )

            voltage = float(
                values[15]
            )

            current = float(
                values[16]
            )

            power = float(
                values[17]
            )

            azimuth_command = int(
                values[18]
            )

            elevation_angle = int(
                values[19]
            )


            # =================================================
            # PC TIME
            # =================================================

            now = datetime.now(
                ZoneInfo(TIMEZONE)
            )

            pc_datetime = now.strftime(
                "%Y-%m-%d %H:%M:%S"
            )


            # =================================================
            # TIME FEATURES
            # =================================================

            seconds_from_midnight = (

                now.hour * 3600
                +
                now.minute * 60
                +
                now.second
            )

            time_angle = (

                2
                *
                math.pi
                *
                seconds_from_midnight
                /
                86400
            )

            time_sin = math.sin(
                time_angle
            )

            time_cos = math.cos(
                time_angle
            )


            # =================================================
            # SOLAR POSITION
            # =================================================

            solar_position = (
                location
                .get_solarposition(
                    times=[now]
                )
            )

            solar_azimuth = float(
                solar_position[
                    "azimuth"
                ].iloc[0]
            )

            solar_elevation = float(
                solar_position[
                    "elevation"
                ].iloc[0]
            )


            # =================================================
            # BASELINE ANGLES
            # =================================================

            baseline_azimuth = (
                solar_azimuth
            )

            baseline_elevation = (
                solar_elevation
            )


            # =================================================
            # ESTIMATED RESIDUAL LABELS
            # =================================================

            ground_truth_azimuth_residual = (

                horizontal_normalized
                *
                MAX_AZIMUTH_CORRECTION
            )


            ground_truth_elevation_residual = (

                vertical_normalized
                *
                MAX_ELEVATION_CORRECTION
            )


            # =================================================
            # LIMIT RESIDUALS
            # =================================================

            ground_truth_azimuth_residual = max(
                -MAX_AZIMUTH_CORRECTION,
                min(
                    MAX_AZIMUTH_CORRECTION,
                    ground_truth_azimuth_residual
                )
            )


            ground_truth_elevation_residual = max(
                -MAX_ELEVATION_CORRECTION,
                min(
                    MAX_ELEVATION_CORRECTION,
                    ground_truth_elevation_residual
                )
            )


            # =================================================
            # CREATE ROW
            # =================================================

            row = {

                # ------------------------------------------------
                # TIME
                # ------------------------------------------------

                "PC_DateTime":
                    pc_datetime,

                "ESP32_Timestamp_ms":
                    esp_timestamp,


                # ------------------------------------------------
                # TIME FEATURES
                # ------------------------------------------------

                "time_sin":
                    round(
                        time_sin,
                        6
                    ),

                "time_cos":
                    round(
                        time_cos,
                        6
                    ),


                # ------------------------------------------------
                # SOLAR POSITION
                # ------------------------------------------------

                "Solar_Azimuth_deg":
                    round(
                        solar_azimuth,
                        3
                    ),

                "Solar_Elevation_deg":
                    round(
                        solar_elevation,
                        3
                    ),


                # ------------------------------------------------
                # BASELINE
                # ------------------------------------------------

                "Baseline_Azimuth_deg":
                    round(
                        baseline_azimuth,
                        3
                    ),

                "Baseline_Elevation_deg":
                    round(
                        baseline_elevation,
                        3
                    ),


                # ------------------------------------------------
                # LDR
                # ------------------------------------------------

                "Top_LDR":
                    top,

                "Bottom_LDR":
                    bottom,

                "Left_LDR":
                    left,

                "Right_LDR":
                    right,


                # ------------------------------------------------
                # ERRORS
                # ------------------------------------------------

                "Horizontal_Error":
                    horizontal_error,

                "Vertical_Error":
                    vertical_error,


                # ------------------------------------------------
                # NORMALIZED
                # ------------------------------------------------

                "Horizontal_Normalized":
                    round(
                        horizontal_normalized,
                        6
                    ),

                "Vertical_Normalized":
                    round(
                        vertical_normalized,
                        6
                    ),


                # ------------------------------------------------
                # LIGHT
                # ------------------------------------------------

                "Lux":
                    round(
                        lux,
                        2
                    ),

                "Light_Status":
                    light_status,


                # ------------------------------------------------
                # DIRECTION
                # ------------------------------------------------

                "Horizontal_Direction":
                    horizontal_direction,

                "Vertical_Direction":
                    vertical_direction,


                # ------------------------------------------------
                # TEMPERATURE / HUMIDITY
                # ------------------------------------------------

                "Temperature_C":
                    round(
                        temperature,
                        2
                    ),

                "Humidity_percent":
                    round(
                        humidity,
                        2
                    ),


                # ------------------------------------------------
                # ELECTRICAL
                # ------------------------------------------------

                "Voltage_V":
                    round(
                        voltage,
                        3
                    ),

                "Current_A":
                    round(
                        current,
                        3
                    ),

                "Power_W":
                    round(
                        power,
                        3
                    ),


                # ------------------------------------------------
                # MOTOR
                # ------------------------------------------------

                "Azimuth_Command":
                    azimuth_command,

                "Elevation_Servo_Angle":
                    elevation_angle,


                # ------------------------------------------------
                # ML LABELS
                # ------------------------------------------------

                "ground_truth_azimuth_residual_deg":
                    round(
                        ground_truth_azimuth_residual,
                        3
                    ),

                "ground_truth_elevation_residual_deg":
                    round(
                        ground_truth_elevation_residual,
                        3
                    )
            }


            # =================================================
            # SAVE ROW
            # =================================================

            writer.writerow(row)

            csv_file.flush()


            # =================================================
            # LIVE OUTPUT
            # =================================================

            print(

                f"{pc_datetime} | "

                f"Solar "
                f"{solar_azimuth:.1f}°/"
                f"{solar_elevation:.1f}° | "

                f"Baseline "
                f"{baseline_azimuth:.1f}°/"
                f"{baseline_elevation:.1f}° | "

                f"LDR "
                f"{horizontal_error}/"
                f"{vertical_error} | "

                f"Residual "
                f"{ground_truth_azimuth_residual:+.2f}/"
                f"{ground_truth_elevation_residual:+.2f}° | "

                f"Temp "
                f"{temperature:.1f}°C | "

                f"Hum "
                f"{humidity:.1f}% | "

                f"Lux "
                f"{lux:.1f} | "

                f"V "
                f"{voltage:.2f}V | "

                f"I "
                f"{current:.3f}A | "

                f"P "
                f"{power:.2f}W | "

                f"Motor "
                f"{horizontal_direction}/"
                f"{vertical_direction} | "

                f"Elevation "
                f"{elevation_angle}°"
            )


        except Exception as error:

            print(
                "DATA ERROR:",
                error
            )


# ============================================================
# STOP
# ============================================================

except KeyboardInterrupt:

    print()
    print("==============================================")
    print("DATA COLLECTION STOPPED")
    print("==============================================")


finally:

    csv_file.close()
    ser.close()

    print()
    print("Dataset saved:", CSV_FILE)