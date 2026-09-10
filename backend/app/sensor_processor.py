"""
ESP32 Sensor Packet Processor
Parses the 20 CSV fields sent over USB Serial from the ESP32
"""
from typing import Optional

def parse_esp32_packet(line: str) -> Optional[dict]:
    """
    Parses a 20-element CSV line:
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
    parts = line.strip().split(",")
    if len(parts) != 20:
        return None

    try:
        top_ldr = int(parts[1])
        bottom_ldr = int(parts[2])
        left_ldr = int(parts[3])
        right_ldr = int(parts[4])

        horiz_err = int(parts[5])
        vert_err = int(parts[6])
        horiz_norm = float(parts[7])
        vert_norm = float(parts[8])

        lux = float(parts[9])
        light_status = parts[10].strip()
        horiz_dir = parts[11].strip()
        vert_dir = parts[12].strip()

        temp_c = float(parts[13])
        hum_pct = float(parts[14])
        voltage_v = float(parts[15])
        current_a = float(parts[16])
        power_w = float(parts[17])

        az_cmd = int(parts[18])
        el_servo = float(parts[19])

        return {
            "esp32_timestamp_ms": int(parts[0]),
            # LDR Array
            "Top_LDR": top_ldr,
            "Bottom_LDR": bottom_ldr,
            "Left_LDR": left_ldr,
            "Right_LDR": right_ldr,
            # Differential Errors
            "Horizontal_Error": horiz_err,
            "Vertical_Error": vert_err,
            "Horizontal_Normalized": horiz_norm,
            "Vertical_Normalized": vert_norm,
            # Environmental
            "Lux": lux,
            "Light_Status": light_status,
            "Horizontal_Direction": horiz_dir,
            "Vertical_Direction": vert_dir,
            "Temperature_C": temp_c,
            "Humidity_percent": hum_pct,
            # Electrical
            "Voltage_V": voltage_v,
            "Current_A": current_a,
            "Power_W": power_w,
            # Hardware Status
            "Azimuth_Command": az_cmd,
            "Elevation_Servo_Angle": el_servo
        }
    except (ValueError, IndexError):
        return None
