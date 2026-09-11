"""
Central Solar Tracker State Coordinator
Coordinates:
  Real USB Serial Ingestion (ESP32)
  pvlib Astronomical Ephemeris (Asia/Kolkata)
  Pre-trained ML Model (solar_tracker_model.pkl)
  Independent Sun & Panel Tracking Controller
  Fail-Safe Motor Decisions & USB Serial Dispatch
  WebSocket Live Telemetry Broadcast (~500ms)
"""
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from .config import settings
from .schemas import (
    TrackerState, SystemState, SunData, PanelData, TargetData, SolarData,
    LDRData, EnvironmentData, ElectricalData, MLData, MotorState, StopState
)
from .solar_position import solar_engine
from .ml_model import ml_engine
from .sensor_processor import parse_esp32_packet
from .motor_controller import motor_controller
from .websocket_manager import ws_manager
from .power_calculator import calculate_power_bus_telemetry
from .energy_tracker import energy_tracker

class SolarTrackerCoordinator:
    def __init__(self):
        self.state = TrackerState()
        self.loop: asyncio.AbstractEventLoop = None
        self.serial_manager = None
        self.last_broadcast_time = 0.0
        self._heartbeat_task = None

        self._init_defaults()

    def _init_defaults(self):
        now_dt = datetime.now(ZoneInfo(settings.TIMEZONE))
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        ephem = solar_engine.calculate(now_dt)

        self.state.timestamp = now_str
        self.state.system = SystemState(
            status="STOPPED",
            mode="AUTO",
            esp32_connected=False,
            model_loaded=ml_engine.is_loaded,
            motor_enabled=settings.MOTOR_ENABLED,
            last_update=now_str
        )

        # Real pvlib Astronomical Sun Position
        self.state.sun = SunData(
            azimuth=ephem["Solar_Azimuth_deg"],
            elevation=ephem["Solar_Elevation_deg"]
        )
        self.state.solar = SolarData(
            azimuth=ephem["Solar_Azimuth_deg"],
            elevation=ephem["Solar_Elevation_deg"],
            baseline_azimuth=ephem["Baseline_Azimuth_deg"],
            baseline_elevation=ephem["Baseline_Elevation_deg"]
        )

        # Independent Panel Position (Section 5, 6, 7)
        self.state.panel = motor_controller.get_panel_data()

        # ML Target Panel Position
        self.state.target = TargetData(
            azimuth=ephem["Baseline_Azimuth_deg"],
            elevation=max(settings.ELEVATION_MIN, ephem["Baseline_Elevation_deg"])
        )

        self.state.ml.target_azimuth = self.state.target.azimuth
        self.state.ml.target_elevation = self.state.target.elevation
        self.state.ml.decision = "WAITING FOR ESP32 TELEMETRY"

        self.state.motors = motor_controller.get_state()
        self.state.stop = StopState(is_stopped=True, reason="Initial system startup in STOPPED state")

        # Telemetry begins empty/None until real ESP32 sensors arrive (NO FAKE SENSOR VALUES)
        self.state.ldr = LDRData()
        self.state.environment = EnvironmentData(
            lux=None,
            temperature=None,
            humidity=None,
            light_status="WAITING"
        )
        self.state.electrical = ElectricalData(
            voltage=None,
            current=None,
            power=None,
            energy_today=energy_tracker.get_energy_today(),
            lux_bracket="Waiting for ESP32..."
        )

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop
        if self._heartbeat_task is None and self.loop and not self.loop.is_closed():
            self._heartbeat_task = self.loop.create_task(self._standalone_heartbeat_loop())

    async def _standalone_heartbeat_loop(self):
        """
        Continuously updates real astronomical Sun position via pvlib every 500ms.
        When ESP32 is offline: NEVER generates fake sensor data.
        Sensor fields remain None and status is ESP32_DISCONNECTED.
        """
        while True:
            try:
                await asyncio.sleep(0.5)
                now_dt = datetime.now(ZoneInfo(settings.TIMEZONE))
                now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
                self.state.timestamp = now_str
                self.state.system.last_update = now_str
                self.state.system.motor_enabled = settings.MOTOR_ENABLED
                self.state.system.model_loaded = ml_engine.is_loaded

                # Always update REAL astronomical ephemeris
                ephem = solar_engine.calculate(now_dt)
                self.state.sun.azimuth = ephem["Solar_Azimuth_deg"]
                self.state.sun.elevation = ephem["Solar_Elevation_deg"]
                self.state.solar.azimuth = ephem["Solar_Azimuth_deg"]
                self.state.solar.elevation = ephem["Solar_Elevation_deg"]
                self.state.solar.baseline_azimuth = ephem["Baseline_Azimuth_deg"]
                self.state.solar.baseline_elevation = ephem["Baseline_Elevation_deg"]

                if not self.state.system.esp32_connected:
                    self.state.system.status = "ESP32_DISCONNECTED"
                    self.state.stop = StopState(is_stopped=True, reason="No sensor data received: ESP32 disconnected")
                    # Clear sensor values so frontend displays '--' or waiting
                    self.state.ldr = LDRData()
                    self.state.environment.lux = None
                    self.state.environment.temperature = None
                    self.state.environment.humidity = None
                    self.state.environment.light_status = "DISCONNECTED"
                    self.state.electrical.voltage = None
                    self.state.electrical.current = None
                    self.state.electrical.power = None
                    self.state.electrical.lux_bracket = "Waiting for ESP32..."

                    await ws_manager.broadcast(self.state.model_dump())
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[COORDINATOR HEARTBEAT ERROR] {e}")

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
            self.state.panel = motor_controller.get_panel_data()
            self.state.stop = StopState(is_stopped=True, reason="No sensor data received: ESP32 disconnected")
            print("[COORDINATOR] ESP32 Disconnected -> Fail-Safe Motor Stop Triggered.")
        else:
            self.state.system.status = "STOPPED"
            self.state.stop = StopState(is_stopped=True, reason="ESP32 connected. Press TRACK SUN to start.")
            print("[COORDINATOR] ESP32 Connected via USB Serial -> Ready for Telemetry.")

        self._schedule_broadcast()

    def on_esp32_packet(self, line: str):
        """Callback invoked when a new 20-field CSV telemetry packet arrives from ESP32."""
        sensor_data = parse_esp32_packet(line)
        if not sensor_data:
            return

        now_dt = datetime.now(ZoneInfo(settings.TIMEZONE))
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        self.state.timestamp = now_str
        self.state.system.last_update = now_str
        self.state.system.esp32_connected = True
        self.state.system.motor_enabled = settings.MOTOR_ENABLED
        self.state.system.model_loaded = ml_engine.is_loaded

        # 1. Update REAL Astronomical Ephemeris via pvlib
        ephem = solar_engine.calculate(now_dt)
        self.state.sun.azimuth = ephem["Solar_Azimuth_deg"]
        self.state.sun.elevation = ephem["Solar_Elevation_deg"]
        self.state.solar.azimuth = ephem["Solar_Azimuth_deg"]
        self.state.solar.elevation = ephem["Solar_Elevation_deg"]
        self.state.solar.baseline_azimuth = ephem["Baseline_Azimuth_deg"]
        self.state.solar.baseline_elevation = ephem["Baseline_Elevation_deg"]

        # 2. Update Real LDR Readings from ESP32
        self.state.ldr.top = sensor_data["Top_LDR"]
        self.state.ldr.bottom = sensor_data["Bottom_LDR"]
        self.state.ldr.left = sensor_data["Left_LDR"]
        self.state.ldr.right = sensor_data["Right_LDR"]
        self.state.ldr.horizontal_error = sensor_data["Horizontal_Error"]
        self.state.ldr.vertical_error = sensor_data["Vertical_Error"]
        self.state.ldr.horizontal_normalized = sensor_data["Horizontal_Normalized"]
        self.state.ldr.vertical_normalized = sensor_data["Vertical_Normalized"]

        # 3. Update Real Environmental Readings from ESP32
        lux = sensor_data["Lux"]
        self.state.environment.lux = lux
        self.state.environment.temperature = sensor_data["Temperature_C"]
        self.state.environment.humidity = sensor_data["Humidity_percent"]
        self.state.environment.light_status = sensor_data["Light_Status"]

        # 4. Update Electrical Readings & Integrate Daily Energy
        power_telemetry = calculate_power_bus_telemetry(lux)
        self.state.electrical.voltage = sensor_data["Voltage_V"] if sensor_data["Voltage_V"] > 0 else power_telemetry["voltage"]
        self.state.electrical.current = sensor_data["Current_A"] if sensor_data["Current_A"] > 0 else power_telemetry["current"]
        self.state.electrical.power = sensor_data["Power_W"] if sensor_data["Power_W"] > 0 else power_telemetry["power"]
        self.state.electrical.battery_soc = power_telemetry["battery_soc"]
        self.state.electrical.battery_voltage = power_telemetry["battery_voltage"]
        self.state.electrical.cell_voltages = power_telemetry["cell_voltages"]
        self.state.electrical.bms_status = power_telemetry["bms_status"]
        self.state.electrical.lux_bracket = power_telemetry["lux_bracket"]
        self.state.electrical.energy_today = energy_tracker.accumulate(self.state.electrical.power or 0.0, now_dt)

        # 5. Formulate Exact 20-Feature Vector for ML Model
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
            "Voltage_V": self.state.electrical.voltage,
            "Current_A": self.state.electrical.current,
            "Power_W": self.state.electrical.power
        }

        # 6. Run ML Inference (solar_tracker_model.pkl)
        try:
            az_corr, el_corr = ml_engine.predict(input_feature_dict)
            self.state.ml.azimuth_correction = az_corr
            self.state.ml.elevation_correction = el_corr

            # Calculate Target Panel Position: Baseline + ML Correction
            base_az = ephem["Baseline_Azimuth_deg"]
            base_el = ephem["Baseline_Elevation_deg"]

            t_az = (base_az + az_corr) % 360.0
            t_el = max(settings.ELEVATION_MIN, min(settings.ELEVATION_MAX, base_el + el_corr))

            self.state.target.azimuth = round(t_az, 2)
            self.state.target.elevation = round(t_el, 2)
            self.state.ml.target_azimuth = self.state.target.azimuth
            self.state.ml.target_elevation = self.state.target.elevation
            self.state.system.model_loaded = True
        except Exception as e:
            print(f"[ML INFERENCE ERROR] {e}")
            self.state.system.status = "ERROR"
            self.state.stop = StopState(is_stopped=True, reason=f"ML Prediction Error: {e}")
            motor_controller.stop_all()
            if self.serial_manager and settings.MOTOR_ENABLED:
                self.serial_manager.send_command("CMD,MOTOR,STOP")
            self.state.motors = motor_controller.get_state()
            self.state.panel = motor_controller.get_panel_data()
            self._schedule_broadcast()
            return

        # 7. Tracking Mode Execution & Motor Dispatch
        if self.state.system.mode == "STOPPED":
            motor_controller.stop_all()
            self.state.system.status = "STOPPED"
            self.state.ml.decision = "TRACKER STOPPED"
            self.state.stop = StopState(is_stopped=True, reason="User initiated manual stop")
            if self.serial_manager and settings.MOTOR_ENABLED:
                self.serial_manager.send_command("CMD,MOTOR,STOP")

        elif self.state.system.mode == "MANUAL":
            self.state.system.status = "MANUAL"
            self.state.ml.decision = "MANUAL D-PAD CONTROL"
            self.state.stop = StopState(is_stopped=False, reason=None)

        elif self.state.system.mode == "AUTO":
            motor_state, panel_data, decision_str, is_locked, serial_cmd = motor_controller.compute_auto_decision(
                predicted_az_residual=self.state.ml.azimuth_correction,
                predicted_el_residual=self.state.ml.elevation_correction,
                target_azimuth=self.state.target.azimuth,
                target_elevation=self.state.target.elevation,
                lux=lux,
                ldr_horizontal_error=sensor_data["Horizontal_Error"],
                ldr_vertical_error=sensor_data["Vertical_Error"]
            )

            self.state.motors = motor_state
            self.state.panel = panel_data
            self.state.ml.decision = decision_str

            # Send physical command over USB serial if enabled
            if serial_cmd and self.serial_manager and settings.MOTOR_ENABLED:
                self.serial_manager.send_command(serial_cmd)

            if lux < settings.LOW_LIGHT_LUX:
                self.state.system.status = "NO_SUN"
                self.state.stop = StopState(is_stopped=True, reason=f"Low light threshold reached ({lux:.1f} < 150 Lux)")
            elif is_locked:
                self.state.system.status = "TRACKING_LOCKED"
                self.state.stop = StopState(is_stopped=False, reason="Sun aligned with panel within configured tolerance.")
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
            self.state.system.status = "STOPPED"
            self.state.stop = StopState(is_stopped=True, reason="Tracker stopped by user")
            if self.serial_manager and settings.MOTOR_ENABLED:
                self.serial_manager.send_command("CMD,MOTOR,STOP")
        elif mode_upper == "AUTO":
            self.state.system.status = "TRACKING"
            self.state.stop = StopState(is_stopped=False, reason=None)
        elif mode_upper == "MANUAL":
            self.state.system.status = "MANUAL"
            self.state.stop = StopState(is_stopped=False, reason=None)

        self.state.motors = motor_controller.get_state()
        self.state.panel = motor_controller.get_panel_data()
        self._schedule_broadcast()

    def manual_jog(self, axis: str, direction: int, step: float = 1.0):
        """Commands a manual jog if in MANUAL mode."""
        if self.state.system.mode != "MANUAL":
            return
        motor_state, panel_data, serial_cmd = motor_controller.manual_jog(axis, direction, step)
        self.state.motors = motor_state
        self.state.panel = panel_data
        if serial_cmd and self.serial_manager and settings.MOTOR_ENABLED:
            self.serial_manager.send_command(serial_cmd)
        self._schedule_broadcast()

    def stop_all(self, reason: str = "Emergency Stop Command"):
        """Emergency halt for motors."""
        self.state.system.mode = "STOPPED"
        self.state.system.status = "EMERGENCY_STOP"
        self.state.stop = StopState(is_stopped=True, reason=reason)
        motor_controller.stop_all()
        if self.serial_manager:
            self.serial_manager.send_command("CMD,MOTOR,STOP")
        self.state.motors = motor_controller.get_state()
        self.state.panel = motor_controller.get_panel_data()
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
