import time
import copy
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Dict, Any, Optional

from .config import settings
from .sensor_processor import parse_esp32_packet
from .solar_position import SolarPositionCalculator
from .ml_model import MLTrackerPredictor
from .motor_controller import MotorController
from .serial_manager import SerialManager

class TrackerCoordinator:
    """
    Central coordinator orchestrating:
      1. Serial reception from ESP32
      2. Solar ephemeris calculation via pvlib
      3. ML inference via solar_tracker_model.pkl
      4. Motor safety and deadband evaluation
      5. Central in-memory state distribution
    """

    def __init__(self):
        self.solar_calc = SolarPositionCalculator()
        self.ml_predictor = MLTrackerPredictor()
        self.motor_ctrl = MotorController()

        self.tracking_mode = "AUTO"  # AUTO | MANUAL | STOPPED
        self.last_update_ts = time.time()

        # In-memory unified state
        self.state: Dict[str, Any] = {
            "timestamp": datetime.now(ZoneInfo(settings.TIMEZONE)).strftime("%Y-%m-%d %H:%M:%S"),
            "system_status": "IDLE",
            "tracking_mode": self.tracking_mode,
            "esp32_connected": False,
            "model_loaded": self.ml_predictor.is_loaded,
            "solar": {
                "azimuth": 0.0,
                "elevation": 0.0
            },
            "baseline": {
                "azimuth": 0.0,
                "elevation": 0.0
            },
            "ldr": {
                "top": 0,
                "bottom": 0,
                "left": 0,
                "right": 0,
                "horizontal_error": 0,
                "vertical_error": 0,
                "horizontal_normalized": 0.0,
                "vertical_normalized": 0.0
            },
            "environment": {
                "lux": 0.0,
                "temperature": 0.0,
                "humidity": 0.0,
                "light_status": "LOW"
            },
            "electrical": {
                "voltage": 0.0,
                "current": 0.0,
                "power": 0.0
            },
            "ml": {
                "azimuth_correction": 0.0,
                "elevation_correction": 0.0,
                "target_azimuth": 0.0,
                "target_elevation": 0.0
            },
            "motors": {
                "azimuth": "STOP",
                "elevation": "STOP",
                "azimuth_command": settings.AZ_STOP_US,
                "elevation_angle": int(settings.DEFAULT_ELEVATION_DEG),
                "tracking_state": "IDLE"
            },
            "stop": {
                "is_stopped": True,
                "reason": "INITIALIZING"
            },
            "error_message": None
        }

        # Serial manager initialization
        self.serial_mgr = SerialManager(on_packet_received=self.process_raw_line)

    def start(self):
        self.serial_mgr.start()

    def stop(self):
        self.serial_mgr.stop()

    def process_raw_line(self, line: str):
        """Callback triggered when a line arrives from ESP32."""
        sensor_data = parse_esp32_packet(line)
        if not sensor_data:
            # Bad or corrupted packet
            return

        self.process_sensor_data(sensor_data)

    def process_sensor_data(self, sensor_data: Dict[str, Any]):
        """Processes valid sensor dictionary, computes ML predictions & updates motor commands."""
        now = datetime.now(ZoneInfo(settings.TIMEZONE))
        solar_data = self.solar_calc.calculate(now)

        # Merge sensor telemetry and astronomical solar position for the ML model
        combined_features = {**solar_data, **sensor_data}

        # Run ML Inference
        az_corr, el_corr, ml_err = self.ml_predictor.predict_corrections(combined_features)

        # Target angle calculations:
        # Target_Azimuth = (Baseline_Azimuth + predicted_azimuth_residual) % 360
        # Target_Elevation = clamp(Baseline_Elevation + predicted_elevation_residual, 10, 170)
        base_az = solar_data["Baseline_Azimuth_deg"]
        base_el = solar_data["Baseline_Elevation_deg"]

        target_az = (base_az + az_corr) % 360.0
        target_el = min(max(base_el + el_corr, settings.MIN_ELEVATION_DEG), settings.MAX_ELEVATION_DEG)

        # Motor control evaluation
        if ml_err:
            az_act, el_act, az_us, el_deg, sys_status, is_stop, stop_reason = (
                "STOP", "STOP", settings.AZ_STOP_US, int(settings.DEFAULT_ELEVATION_DEG), "ERROR", True, ml_err
            )
        else:
            az_act, el_act, az_us, el_deg, sys_status, is_stop, stop_reason = self.motor_ctrl.evaluate_tracking(
                pred_az_res=az_corr,
                pred_el_res=el_corr,
                target_el=target_el,
                h_norm=sensor_data["Horizontal_Normalized"],
                v_norm=sensor_data["Vertical_Normalized"],
                lux=sensor_data["Lux"],
                tracking_mode=self.tracking_mode
            )

        # Send command back to ESP32 over serial if in AUTO mode
        if self.tracking_mode == "AUTO":
            cmd = self.motor_ctrl.generate_serial_command(az_act, el_act, el_deg)
            self.serial_mgr.send_command(cmd)

        # Update in-memory unified state
        self.last_update_ts = time.time()
        self.state = {
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "system_status": sys_status,
            "tracking_mode": self.tracking_mode,
            "esp32_connected": self.serial_mgr.is_connected or settings.SIMULATION_MODE,
            "model_loaded": self.ml_predictor.is_loaded,
            "solar": {
                "azimuth": round(solar_data["Solar_Azimuth_deg"], 2),
                "elevation": round(solar_data["Solar_Elevation_deg"], 2)
            },
            "baseline": {
                "azimuth": round(solar_data["Baseline_Azimuth_deg"], 2),
                "elevation": round(solar_data["Baseline_Elevation_deg"], 2)
            },
            "ldr": {
                "top": sensor_data["Top_LDR"],
                "bottom": sensor_data["Bottom_LDR"],
                "left": sensor_data["Left_LDR"],
                "right": sensor_data["Right_LDR"],
                "horizontal_error": sensor_data["Horizontal_Error"],
                "vertical_error": sensor_data["Vertical_Error"],
                "horizontal_normalized": sensor_data["Horizontal_Normalized"],
                "vertical_normalized": sensor_data["Vertical_Normalized"]
            },
            "environment": {
                "lux": sensor_data["Lux"],
                "temperature": sensor_data["Temperature_C"],
                "humidity": sensor_data["Humidity_percent"],
                "light_status": sensor_data["Light_Status"]
            },
            "electrical": {
                "voltage": sensor_data["Voltage_V"],
                "current": sensor_data["Current_A"],
                "power": sensor_data["Power_W"]
            },
            "ml": {
                "azimuth_correction": round(az_corr, 2),
                "elevation_correction": round(el_corr, 2),
                "target_azimuth": round(target_az, 2),
                "target_elevation": round(target_el, 2)
            },
            "motors": {
                "azimuth": az_act,
                "elevation": el_act,
                "azimuth_command": az_us,
                "elevation_angle": el_deg,
                "tracking_state": sys_status
            },
            "stop": {
                "is_stopped": is_stop,
                "reason": stop_reason
            },
            "error_message": ml_err if ml_err else None
        }

    def get_state(self) -> Dict[str, Any]:
        """Returns deep copy of current tracker state."""
        state_copy = copy.deepcopy(self.state)
        # Update dynamic connection state
        state_copy["esp32_connected"] = self.serial_mgr.is_connected or settings.SIMULATION_MODE
        if not state_copy["esp32_connected"] and not settings.SIMULATION_MODE:
            state_copy["system_status"] = "DISCONNECTED"
            state_copy["stop"]["is_stopped"] = True
            state_copy["stop"]["reason"] = "ESP32 USB Serial Disconnected"
        return state_copy

    def emergency_stop(self):
        """Immediately halts motors and switches to STOPPED mode."""
        self.tracking_mode = "STOPPED"
        self.motor_ctrl.azimuth_state = "STOP"
        self.motor_ctrl.elevation_state = "STOP"
        self.serial_mgr.send_command("CMD,MOTOR,STOP\n")
        self.state["system_status"] = "MANUAL STOP"
        self.state["tracking_mode"] = "STOPPED"
        self.state["motors"]["azimuth"] = "STOP"
        self.state["motors"]["elevation"] = "STOP"
        self.state["stop"]["is_stopped"] = True
        self.state["stop"]["reason"] = "Emergency Stop Pressed by User"

    def start_tracking(self):
        self.tracking_mode = "AUTO"
        self.state["tracking_mode"] = "AUTO"

    def manual_motor_control(self, action: str) -> bool:
        """Executes manual motor action when mode is MANUAL."""
        action = action.upper()
        if action == "STOP":
            self.serial_mgr.send_command("CMD,MOTOR,STOP\n")
            self.motor_ctrl.azimuth_state = "STOP"
            self.motor_ctrl.elevation_state = "STOP"
            return True

        if self.tracking_mode != "MANUAL":
            return False

        if action == "AZ_LEFT":
            self.serial_mgr.send_command("CMD,AZ,LEFT\n")
            self.motor_ctrl.azimuth_state = "LEFT"
        elif action == "AZ_RIGHT":
            self.serial_mgr.send_command("CMD,AZ,RIGHT\n")
            self.motor_ctrl.azimuth_state = "RIGHT"
        elif action == "AZ_STOP":
            self.serial_mgr.send_command("CMD,AZ,STOP\n")
            self.motor_ctrl.azimuth_state = "STOP"
        elif action == "EL_UP":
            new_angle = min(self.motor_ctrl.current_elevation_angle + 5, int(settings.MAX_ELEVATION_DEG))
            self.motor_ctrl.current_elevation_angle = new_angle
            self.serial_mgr.send_command(f"CMD,EL,UP;CMD,EL_ANGLE,{new_angle}\n")
            self.motor_ctrl.elevation_state = "UP"
        elif action == "EL_DOWN":
            new_angle = max(self.motor_ctrl.current_elevation_angle - 5, int(settings.MIN_ELEVATION_DEG))
            self.motor_ctrl.current_elevation_angle = new_angle
            self.serial_mgr.send_command(f"CMD,EL,DOWN;CMD,EL_ANGLE,{new_angle}\n")
            self.motor_ctrl.elevation_state = "DOWN"
        elif action == "EL_STOP":
            self.serial_mgr.send_command("CMD,EL,STOP\n")
            self.motor_ctrl.elevation_state = "STOP"
        return True
