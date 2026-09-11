"""
Motor Controller and Tracking Decision Logic
Manages MG995 continuous azimuth servo and positional elevation servo decisions.
Enforces deadbands, reverse flags, safe step limits, independent panel state estimation,
and MOTOR_ENABLED safety test mode.
"""
from typing import Tuple, Optional
from .config import settings
from .schemas import MotorState, PanelData

class MotorController:
    def __init__(self):
        # Current motor control status
        self.azimuth_state: str = "STOP"
        self.elevation_state: str = "HOLD"
        self.azimuth_command: int = settings.AZ_STOP  # 1500 us
        self.elevation_angle: float = settings.ELEVATION_INITIAL  # 90.0 deg

        # Independent Panel Position State (Section 6 & 7)
        self.panel_elevation: float = settings.ELEVATION_INITIAL  # 90.0 deg, 10 - 170
        self.estimated_panel_azimuth: float = 180.0  # Clearly labeled Estimated Panel Azimuth (0 - 360)

        # Estimated slew rate for continuous rotation servo at AZ_SPEED=40 (~4.0 deg/sec)
        # At 500ms cycle interval, approx 2.0 degrees per tick
        self.azimuth_slew_step_deg: float = 2.0
        self.elevation_step_deg: float = 1.0

    def compute_auto_decision(
        self,
        predicted_az_residual: float,
        predicted_el_residual: float,
        target_azimuth: float,
        target_elevation: float,
        lux: float,
        ldr_horizontal_error: Optional[int] = None,
        ldr_vertical_error: Optional[int] = None
    ) -> Tuple[MotorState, PanelData, str, bool, Optional[str]]:
        """
        Computes tracking decisions under AUTO mode:
        Returns:
            (MotorState, PanelData, decision_reason, is_locked, serial_command_or_none)
        """
        # 1. Low light safety condition (Section 17)
        if lux < settings.LOW_LIGHT_LUX:
            self.stop_all()
            return self.get_state(), self.get_panel_data(), "NO SUN: Lux below threshold (<150 Lux)", False, "CMD,MOTOR,STOP"

        # 2. Check deadbands (Section 15)
        az_in_deadband = abs(predicted_az_residual) <= settings.AZIMUTH_DEADBAND
        el_in_deadband = abs(predicted_el_residual) <= settings.ELEVATION_DEADBAND

        # Optional optical LDR balance verification
        ldr_balanced = True
        if ldr_horizontal_error is not None and ldr_vertical_error is not None:
            ldr_balanced = (abs(ldr_horizontal_error) < 150) and (abs(ldr_vertical_error) < 150)

        if az_in_deadband and el_in_deadband and ldr_balanced:
            self.azimuth_state = "STOP"
            self.azimuth_command = settings.AZ_STOP
            self.elevation_state = "HOLD"
            decision = "TRACKING LOCKED: Sun aligned with panel within configured tolerance."
            cmd = "CMD,MOTOR,STOP" if settings.MOTOR_ENABLED else None
            return self.get_state(), self.get_panel_data(), decision, True, cmd

        serial_cmd: Optional[str] = None

        # 3. Azimuth Decision (Continuous Rotation MG995 on GPIO25)
        if az_in_deadband:
            self.azimuth_state = "STOP"
            self.azimuth_command = settings.AZ_STOP
            az_cmd_str = "CMD,AZ,STOP"
        else:
            # Positive residual normally means turn RIGHT, unless AZIMUTH_REVERSE is true
            turn_right = (predicted_az_residual > 0)
            if settings.AZIMUTH_REVERSE:
                turn_right = not turn_right

            if turn_right:
                raw_state = "RIGHT"
                self.azimuth_command = settings.AZ_STOP + settings.AZ_SPEED  # 1540 us
                az_cmd_str = "CMD,AZ,RIGHT"
                # Update estimated azimuth
                self.estimated_panel_azimuth = (self.estimated_panel_azimuth + self.azimuth_slew_step_deg) % 360.0
            else:
                raw_state = "LEFT"
                self.azimuth_command = settings.AZ_STOP - settings.AZ_SPEED  # 1460 us
                az_cmd_str = "CMD,AZ,LEFT"
                # Update estimated azimuth
                self.estimated_panel_azimuth = (self.estimated_panel_azimuth - self.azimuth_slew_step_deg) % 360.0

            if not settings.MOTOR_ENABLED:
                self.azimuth_state = f"WOULD MOVE {raw_state}"
            else:
                self.azimuth_state = raw_state

        # 4. Elevation Decision (Positional MG995 on GPIO26)
        if el_in_deadband:
            self.elevation_state = "HOLD"
            el_cmd_str = "CMD,EL,STOP"
        else:
            # Positive residual normally means tilt UP, unless ELEVATION_REVERSE is true
            tilt_up = (predicted_el_residual > 0)
            if settings.ELEVATION_REVERSE:
                tilt_up = not tilt_up

            if tilt_up:
                raw_el = "UP"
                el_cmd_str = "CMD,EL,UP"
                self.panel_elevation = min(settings.ELEVATION_MAX, self.panel_elevation + self.elevation_step_deg)
            else:
                raw_el = "DOWN"
                el_cmd_str = "CMD,EL,DOWN"
                self.panel_elevation = max(settings.ELEVATION_MIN, self.panel_elevation - self.elevation_step_deg)

            self.elevation_angle = self.panel_elevation

            if not settings.MOTOR_ENABLED:
                self.elevation_state = f"WOULD MOVE {raw_el}"
            else:
                self.elevation_state = raw_el

        # Formulate hardware command string if MOTOR_ENABLED is True
        if settings.MOTOR_ENABLED:
            if not az_in_deadband:
                serial_cmd = az_cmd_str
            elif not el_in_deadband:
                serial_cmd = el_cmd_str
            else:
                serial_cmd = "CMD,MOTOR,STOP"
        else:
            serial_cmd = None

        decision_str = (
            f"Azimuth: {self.azimuth_state} (Cmd {self.azimuth_command}µs) | "
            f"Elevation: {self.elevation_state} (Angle {self.elevation_angle:.1f}°)"
        )
        if not settings.MOTOR_ENABLED:
            decision_str += " [SAFETY TEST MODE - MOTORS DISABLED]"

        return self.get_state(), self.get_panel_data(), decision_str, False, serial_cmd

    def manual_jog(self, axis: str, direction: int, step: float = 1.0) -> Tuple[MotorState, PanelData, Optional[str]]:
        """Applies manual jog step to specified axis in MANUAL mode."""
        serial_cmd: Optional[str] = None
        if axis == "azimuth":
            if direction > 0:
                raw_dir = "RIGHT"
                self.azimuth_command = settings.AZ_STOP + settings.AZ_SPEED
                self.estimated_panel_azimuth = (self.estimated_panel_azimuth + step) % 360.0
                cmd = "CMD,AZ,RIGHT"
            elif direction < 0:
                raw_dir = "LEFT"
                self.azimuth_command = settings.AZ_STOP - settings.AZ_SPEED
                self.estimated_panel_azimuth = (self.estimated_panel_azimuth - step) % 360.0
                cmd = "CMD,AZ,LEFT"
            else:
                raw_dir = "STOP"
                self.azimuth_command = settings.AZ_STOP
                cmd = "CMD,AZ,STOP"

            self.azimuth_state = raw_dir if settings.MOTOR_ENABLED else f"WOULD MOVE {raw_dir}"
            if settings.MOTOR_ENABLED:
                serial_cmd = cmd

        elif axis == "elevation":
            if direction > 0:
                raw_dir = "UP"
                self.panel_elevation = min(settings.ELEVATION_MAX, self.panel_elevation + step)
                self.elevation_angle = self.panel_elevation
                cmd = "CMD,EL,UP"
            elif direction < 0:
                raw_dir = "DOWN"
                self.panel_elevation = max(settings.ELEVATION_MIN, self.panel_elevation - step)
                self.elevation_angle = self.panel_elevation
                cmd = "CMD,EL,DOWN"
            else:
                raw_dir = "HOLD"
                cmd = "CMD,EL,STOP"

            self.elevation_state = raw_dir if settings.MOTOR_ENABLED else f"WOULD MOVE {raw_dir}"
            if settings.MOTOR_ENABLED:
                serial_cmd = cmd

        return self.get_state(), self.get_panel_data(), serial_cmd

    def stop_all(self) -> Tuple[MotorState, PanelData]:
        """Emergency and fail-safe full stop for both motors."""
        self.azimuth_state = "STOP"
        self.elevation_state = "HOLD"
        self.azimuth_command = settings.AZ_STOP
        return self.get_state(), self.get_panel_data()

    def get_state(self) -> MotorState:
        return MotorState(
            azimuth=self.azimuth_state,
            elevation=self.elevation_state,
            azimuth_command=self.azimuth_command,
            elevation_angle=round(self.elevation_angle, 1)
        )

    def get_panel_data(self) -> PanelData:
        return PanelData(
            estimated_azimuth=round(self.estimated_panel_azimuth, 1),
            elevation=round(self.panel_elevation, 1)
        )

motor_controller = MotorController()
