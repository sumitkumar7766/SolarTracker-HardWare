"""
Central Solar Tracker State Coordinator
Coordinates Serial Ingestion -> Sensor Processing -> pvlib -> ML Model -> Motor Decision -> WebSocket Broadcast
"""
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from .config import settings
from .schemas import (
    TrackerState, SystemState, SolarData, LDRData,
    EnvironmentData, ElectricalData, MLData, MotorState, StopState
)
from .solar_position import solar_engine
from .ml_model import ml_engine
from .sensor_processor import parse_esp32_packet
from .motor_controller import motor_controller
from .websocket_manager import ws_manager

class SolarTrackerCoordinator:
    def __init__(self):
        self.state = TrackerState()
        self.loop: asyncio.AbstractEventLoop = None
        self.serial_manager = None
        self.last_broadcast_time = 0.0

        # Accumulated energy today in kWh
        self.energy_today_kwh = 0.245
        self.last_energy_calc_time = datetime.now(ZoneInfo(settings.TIMEZONE))

        # Initialize base state
        self._init_defaults()

    def _init_defaults(self):
        now_dt = datetime.now(ZoneInfo(settings.TIMEZONE))
        ephem = solar_engine.calculate(now_dt)

        self.state.timestamp = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        self.state.system.status = "STOPPED"
        self.state.system.mode = "AUTO"
        self.state.system.esp32_connected = False
        self.state.system.model_loaded = ml_engine.is_loaded
        self.state.system.last_update = self.state.timestamp

        self.state.solar.azimuth = ephem["Solar_Azimuth_deg"]
        self.state.solar.elevation = ephem["Solar_Elevation_deg"]
        self.state.solar.baseline_azimuth = ephem["Baseline_Azimuth_deg"]
        self.state.solar.baseline_elevation = ephem["Baseline_Elevation_deg"]

        self.state.ml.target_azimuth = ephem["Baseline_Azimuth_deg"]
        self.state.ml.target_elevation = max(settings.ELEVATION_MIN, ephem["Baseline_Elevation_deg"])

        self.state.motors = motor_controller.get_state()
        self.state.stop = StopState(is_stopped=True, reason="System initialized in STOPPED state")

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    def set_serial_manager(self, serial_mgr):
        self.serial_manager = serial_mgr

    def on_serial_status_changed(self, connected: bool):
        """Callback invoked when ESP32 USB serial connects or disconnects."""
        self.state.system.esp32_connected = connected
        now_dt = datetime.now(ZoneInfo(settings.TIMEZONE))
        self.state.system.last_update = now_dt.strftime("%Y-%m-%d %H:%M:%S")

        if not connected:
            self.state.system.status = "ESP32_DISCONNECTED"
            motor_controller.stop_all()
            self.state.motors = motor_controller.get_state()
            self.state.stop = StopState(is_stopped=True, reason="ESP32 USB Serial Disconnected")
            print("[COORDINATOR] ESP32 Disconnected -> Fail-Safe Motor Stop Triggered.")
        else:
            print("[COORDINATOR] ESP32 Connected -> Ready for Telemetry.")

        self._schedule_broadcast()

    def on_esp32_packet(self, line: str):
        """Callback invoked when a new line arrives over USB serial."""
        sensor_data = parse_esp32_packet(line)
        if not sensor_data:
            return

        now_dt = datetime.now(ZoneInfo(settings.TIMEZONE))
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        self.state.timestamp = now_str
        self.state.system.last_update = now_str
        self.state.system.esp32_connected = True

        # 1. Update Ephemeris
        ephem = solar_engine.calculate(now_dt)
        self.state.solar.azimuth = ephem["Solar_Azimuth_deg"]
        self.state.solar.elevation = ephem["Solar_Elevation_deg"]
        self.state.solar.baseline_azimuth = ephem["Baseline_Azimuth_deg"]
        self.state.solar.baseline_elevation = ephem["Baseline_Elevation_deg"]

        # 2. Update LDR Readings
        self.state.ldr.top = sensor_data["Top_LDR"]
        self.state.ldr.bottom = sensor_data["Bottom_LDR"]
        self.state.ldr.left = sensor_data["Left_LDR"]
        self.state.ldr.right = sensor_data["Right_LDR"]
        self.state.ldr.horizontal_error = sensor_data["Horizontal_Error"]
        self.state.ldr.vertical_error = sensor_data["Vertical_Error"]
        self.state.ldr.horizontal_normalized = sensor_data["Horizontal_Normalized"]
        self.state.ldr.vertical_normalized = sensor_data["Vertical_Normalized"]

        # 3. Update Environment
        lux = sensor_data["Lux"]
        self.state.environment.lux = lux
        self.state.environment.temperature = sensor_data["Temperature_C"]
        self.state.environment.humidity = sensor_data["Humidity_percent"]
        self.state.environment.light_status = sensor_data["Light_Status"]

        # 4. Update Electrical & Accumulate Energy
        calc_dt = (now_dt - self.last_energy_calc_time).total_seconds()
        self.last_energy_calc_time = now_dt
        if 0 < calc_dt < 5:
            self.energy_today_kwh += (sensor_data["Power_W"] * calc_dt) / 3600000.0

        self.state.electrical.voltage = sensor_data["Voltage_V"]
        self.state.electrical.current = sensor_data["Current_A"]
        self.state.electrical.power = sensor_data["Power_W"]
        self.state.electrical.energy_today = round(self.energy_today_kwh, 4)

        # 5. ML Feature Formulation & Prediction
        # Build exact 20-feature input mapping
        input_feature_dict = {
            "time_sin": ephem["time_sin"],
            "time_cos": ephem["time_cos"],
            "Solar_Azimuth_deg": ephem["Solar_Azimuth_deg"],
            "Solar_Elevation_deg": ephem["Solar_Elevation_deg"],
            "Baseline_Azimuth_deg": ephem["Baseline_Azimuth_deg"],
            "Baseline_Elevation_deg": ephem["Baseline_Elevation_deg"],
            "Top_LDR": sensor_data["Top_LDR"],
            "Bottom_LDR": sensor_data["Bottom_LDR"],
            "Left_LDR": sensor_data["Left_LDR"],
            "Right_LDR": sensor_data["Right_LDR"],
            "Horizontal_Error": sensor_data["Horizontal_Error"],
            "Vertical_Error": sensor_data["Vertical_Error"],
            "Horizontal_Normalized": sensor_data["Horizontal_Normalized"],
            "Vertical_Normalized": sensor_data["Vertical_Normalized"],
            "Lux": sensor_data["Lux"],
            "Temperature_C": sensor_data["Temperature_C"],
            "Humidity_percent": sensor_data["Humidity_percent"],
            "Voltage_V": sensor_data["Voltage_V"],
            "Current_A": sensor_data["Current_A"],
            "Power_W": sensor_data["Power_W"]
        }

        try:
            az_corr, el_corr = ml_engine.predict(input_feature_dict)
            self.state.ml.azimuth_correction = az_corr
            self.state.ml.elevation_correction = el_corr

            # Calculate target angles
            base_az = ephem["Baseline_Azimuth_deg"]
            base_el = ephem["Baseline_Elevation_deg"]

            t_az = (base_az + az_corr) % 360.0
            t_el = max(settings.ELEVATION_MIN, min(settings.ELEVATION_MAX, base_el + el_corr))

            self.state.ml.target_azimuth = round(t_az, 2)
            self.state.ml.target_elevation = round(t_el, 2)
            self.state.system.model_loaded = True
        except Exception as e:
            self.state.system.status = "ERROR"
            self.state.stop = StopState(is_stopped=True, reason=f"ML Prediction Error: {e}")
            motor_controller.stop_all()
            self.state.motors = motor_controller.get_state()
            self._schedule_broadcast()
            return

        # 6. Tracking Mode Decision Evaluation
        if self.state.system.mode == "STOPPED":
            motor_controller.stop_all()
            self.state.system.status = "MANUAL_STOP"
            self.state.ml.decision = "TRACKER STOPPED"
            self.state.stop = StopState(is_stopped=True, reason="User initiated manual stop")
        elif self.state.system.mode == "MANUAL":
            self.state.system.status = "MANUAL"
            self.state.ml.decision = "MANUAL JOG OVERRIDE"
            self.state.stop = StopState(is_stopped=False, reason=None)
        elif self.state.system.mode == "AUTO":
            # Auto ML Tracking
            motor_state, decision_str, is_locked = motor_controller.compute_auto_decision(
                predicted_az_residual=self.state.ml.azimuth_correction,
                predicted_el_residual=self.state.ml.elevation_correction,
                target_azimuth=self.state.ml.target_azimuth,
                target_elevation=self.state.ml.target_elevation,
                current_elevation=self.state.motors.elevation_angle,
                lux=lux
            )
            self.state.motors = motor_state
            self.state.ml.decision = decision_str

            if lux < settings.LOW_LIGHT_LUX:
                self.state.system.status = "NO_SUN"
                self.state.stop = StopState(is_stopped=True, reason="Low light threshold reached (<150 Lux)")
            elif is_locked:
                self.state.system.status = "TRACKING_LOCKED"
                self.state.stop = StopState(is_stopped=False, reason=None)
            else:
                self.state.system.status = "TRACKING"
                self.state.stop = StopState(is_stopped=False, reason=None)

        self._schedule_broadcast()

    def set_mode(self, mode: str):
        """Switches tracking mode between AUTO, MANUAL, STOPPED."""
        mode_upper = mode.upper()
        if mode_upper not in ["AUTO", "MANUAL", "STOPPED"]:
            raise ValueError("Invalid mode. Choose AUTO, MANUAL, or STOPPED.")

        self.state.system.mode = mode_upper
        if mode_upper == "STOPPED":
            motor_controller.stop_all()
            self.state.system.status = "MANUAL_STOP"
            self.state.stop = StopState(is_stopped=True, reason="Tracker stopped by user")
        elif mode_upper == "AUTO":
            self.state.stop = StopState(is_stopped=False, reason=None)

        self.state.motors = motor_controller.get_state()
        self._schedule_broadcast()

    def manual_jog(self, axis: str, direction: int, step: float = 4.0):
        """Commands a manual jog if in MANUAL mode."""
        if self.state.system.mode != "MANUAL":
            return
        motor_state = motor_controller.manual_jog(axis, direction, step)
        self.state.motors = motor_state
        self._schedule_broadcast()

    def stop_all(self, reason: str = "Emergency Stop Command"):
        """Emergency halt for motors."""
        self.state.system.mode = "STOPPED"
        self.state.system.status = "MANUAL_STOP"
        self.state.stop = StopState(is_stopped=True, reason=reason)
        motor_controller.stop_all()
        self.state.motors = motor_controller.get_state()
        self._schedule_broadcast()

    def _schedule_broadcast(self):
        """Throttles and broadcasts state to all connected WebSockets (~2Hz)."""
        now = datetime.now().timestamp()
        if now - self.last_broadcast_time > 0.4:
            self.last_broadcast_time = now
            if self.loop and not self.loop.is_closed():
                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast(self.state.model_dump()),
                    self.loop
                )

tracker_coordinator = SolarTrackerCoordinator()
