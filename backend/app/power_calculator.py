"""
Photovoltaic Power Bus & Battery Telemetry Calculator
Implements the exact Lux-to-Electrical conversion formula profile:

| Lux Range       | Panel Voltage | Current     | Power   |
| 0–500           | 0–10 V        | 0–0.05 A    | 0–0.5 W |
| 500–2,000 (2k)  | 8–18 V        | 0.02–0.15 A | 0.2–2 W |
| 2k–10k          | 12–22 V       | 0.05–0.4 A  | 0.6–8 W |
| 10k–30k         | 18–24 V       | 0.1–0.8 A   | 2–15 W  |
| 30k–60k         | 20–25 V       | 0.2–1.2 A   | 4–25 W  |
| 60k+            | 20–25 V       | 0.3–1.5 A   | 6–30 W  |
"""

def calculate_power_bus_telemetry(lux: float) -> dict:
    """
    Computes Panel Voltage (V), Current (A), Power (W), and 3S Battery Telemetry
    according to the defined photovoltaic illumination profile.
    """
    lux_val = max(0.0, float(lux))

    if lux_val <= 500.0:
        ratio = lux_val / 500.0
        voltage = 0.0 + ratio * 10.0
        current = 0.0 + ratio * 0.05
        power = 0.0 + ratio * 0.5
        lux_bracket = "0–500 Lux (0–10V, 0–0.05A)"
    elif lux_val <= 2000.0:
        ratio = (lux_val - 500.0) / (2000.0 - 500.0)
        voltage = 8.0 + ratio * (18.0 - 8.0)
        current = 0.02 + ratio * (0.15 - 0.02)
        power = 0.2 + ratio * (2.0 - 0.2)
        lux_bracket = "500–2k Lux (8–18V, 0.02–0.15A)"
    elif lux_val <= 10000.0:
        ratio = (lux_val - 2000.0) / (10000.0 - 2000.0)
        voltage = 12.0 + ratio * (22.0 - 12.0)
        current = 0.05 + ratio * (0.4 - 0.05)
        power = 0.6 + ratio * (8.0 - 0.6)
        lux_bracket = "2k–10k Lux (12–22V, 0.05–0.4A)"
    elif lux_val <= 30000.0:
        ratio = (lux_val - 10000.0) / (30000.0 - 10000.0)
        voltage = 18.0 + ratio * (24.0 - 18.0)
        current = 0.1 + ratio * (0.8 - 0.1)
        power = 2.0 + ratio * (15.0 - 2.0)
        lux_bracket = "10k–30k Lux (18–24V, 0.1–0.8A)"
    elif lux_val <= 60000.0:
        ratio = (lux_val - 30000.0) / (60000.0 - 30000.0)
        voltage = 20.0 + ratio * (25.0 - 20.0)
        current = 0.2 + ratio * (1.2 - 0.2)
        power = 4.0 + ratio * (25.0 - 4.0)
        lux_bracket = "30k–60k Lux (20–25V, 0.2–1.2A)"
    else:
        # 60k+ Lux: Saturated high sun (interpolating to 100,000 Lux peak)
        ratio = min(1.0, (lux_val - 60000.0) / 40000.0)
        voltage = 20.0 + ratio * (25.0 - 20.0)
        current = 0.3 + ratio * (1.5 - 0.3)
        power = 6.0 + ratio * (30.0 - 6.0)
        lux_bracket = "60k+ Lux (20–25V, 0.3–1.5A)"

    v_rounded = round(voltage, 2)
    i_rounded = round(current, 3)
    p_rounded = round(power, 2)

    # 3S 18650 Battery Pack calculations:
    # 3S Li-ion nominal 11.1V, 100% full = 12.6V (4.20V per cell)
    battery_soc = round(min(100.0, max(25.0, 78.0 + (p_rounded / 30.0) * 20.0)), 1)
    pack_voltage = round(11.1 + (battery_soc / 100.0) * 1.5, 2)
    cell_mid = pack_voltage / 3.0
    cell_1 = round(cell_mid - 0.01, 2)
    cell_2 = round(cell_mid, 2)
    cell_3 = round(cell_mid + 0.01, 2)

    if p_rounded >= 4.0:
        bms_status = "CHARGING (BULK)"
    elif p_rounded >= 0.5:
        bms_status = "CHARGING (FLOAT)"
    elif p_rounded >= 0.05:
        bms_status = "STANDBY TRICKLE"
    else:
        bms_status = "DISCHARGING (IDLE)"

    return {
        "voltage": v_rounded,
        "current": i_rounded,
        "power": p_rounded,
        "lux_bracket": lux_bracket,
        "battery_soc": battery_soc,
        "battery_voltage": pack_voltage,
        "cell_voltages": [cell_1, cell_2, cell_3],
        "bms_status": bms_status
    }
