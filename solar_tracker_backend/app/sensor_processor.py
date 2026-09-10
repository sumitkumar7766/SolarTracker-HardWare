from typing import Optional, Dict, Any

def parse_esp32_packet(line: str) -> Optional[Dict[str, Any]]:
    """
    Parses a single CSV line from ESP32 USB Serial.
    The packet must contain 20 comma-separated values:
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
    if not line:
        return None

    parts = line.strip().split(",")
    if len(parts) != 20:
        return None

    try:
        top_ldr = int(float(parts[1]))
        bottom_ldr = int(float(parts[2]))
        left_ldr = int(float(parts[3]))
        right_ldr = int(float(parts[4]))

        # Calculate / Verify Differential LDR Errors
        # Horizontal_Error = Right_LDR - Left_LDR
        # Vertical_Error   = Top_LDR - Bottom_LDR
        h_err = right_ldr - left_ldr
        v_err = top_ldr - bottom_ldr

        # Normalized Error Calculation with Safe Zero-Division Protection
        h_sum = float(right_ldr + left_ldr)
        v_sum = float(top_ldr + bottom_ldr)
        h_norm = (h_err / h_sum) if h_sum > 0.0 else 0.0
        v_norm = (v_err / v_sum) if v_sum > 0.0 else 0.0

        lux = float(parts[9])
        light_status = parts[10].strip().upper()
        h_dir = parts[11].strip().upper()
        v_dir = parts[12].strip().upper()

        temperature = float(parts[13])
        humidity = float(parts[14])

        voltage = float(parts[15])
        current = float(parts[16])
        power = float(parts[17])

        az_cmd = int(float(parts[18]))
        el_servo_angle = int(float(parts[19]))

        return {
            "ESP32_Timestamp_ms": int(float(parts[0])),
            "Top_LDR": top_ldr,
            "Bottom_LDR": bottom_ldr,
            "Left_LDR": left_ldr,
            "Right_LDR": right_ldr,
            "Horizontal_Error": h_err,
            "Vertical_Error": v_err,
            "Horizontal_Normalized": round(h_norm, 4),
            "Vertical_Normalized": round(v_norm, 4),
            "Lux": round(lux, 2),
            "Light_Status": light_status,
            "Horizontal_Direction": h_dir,
            "Vertical_Direction": v_dir,
            "Temperature_C": round(temperature, 1),
            "Humidity_percent": round(humidity, 1),
            "Voltage_V": round(voltage, 2),
            "Current_A": round(current, 3),
            "Power_W": round(power, 2),
            "Azimuth_Command": az_cmd,
            "Elevation_Servo_Angle": el_servo_angle
        }
    except (ValueError, IndexError):
        return None
