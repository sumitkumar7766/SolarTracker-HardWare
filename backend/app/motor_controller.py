"""
Motor Controller and Tracking Decision Logic
Manages MG995 continuous azimuth servo and positional elevation servo commands
Enforces deadbands, low-light stops, limit bounds, and safety states
"""
from typing import Tuple
from .config import settings
from .schemas import MotorState

class MotorController:
    def __init__(self):
        # Current motor control status
        self.azimuth_state: str = "STOP"          # LEFT, RIGHT, STOP
        self.elevation_state: str = "HOLD"        # UP, DOWN, HOLD
        self.azimuth_command: int = settings.AZ_NEUTRAL  # 1500 us
        self.elevation_angle: float = settings.ELEVATION_INITIAL # 90.0 deg

    def compute_auto_decision(
        self,
        predicted_az_residual: float,
        predicted_el_residual: float,
        target_azimuth: float,
        target_elevation: float,
        current_elevation: float,
        lux: float
    ) -> Tuple[MotorState, str, bool]:
        """
        Calculates tracking decisions under AUTO mode:
        Returns:
            (MotorState, decision_reason, is_locked)
        """
        # 1. Low light safety condition
        if lux < settings.LOW_LIGHT_LUX:
            self.stop_all()
            return self.get_state(), "NO SUN: Lux below threshold (Night/Cloud Hold)", False

        # 2. Check deadbands
        az_in_deadband = abs(predicted_az_residual) <= settings.AZIMUTH_DEADBAND
        el_in_deadband = abs(predicted_el_residual) <= settings.ELEVATION_DEADBAND

        if az_in_deadband and el_in_deadband:
            self.azimuth_state = "STOP"
            self.azimuth_command = settings.AZ_NEUTRAL
            self.elevation_state = "HOLD"
            return self.get_state(), "TRACKING LOCKED: Angular errors within ±1.0° deadband", True

        # 3. Azimuth Decision (Continuous Rotation MG995)
        if az_in_deadband:
            self.azimuth_state = "STOP"
            self.azimuth_command = settings.AZ_NEUTRAL
        elif predicted_az_residual > 0:
            # Needs positive azimuth correction -> slew RIGHT
            self.azimuth_state = "RIGHT"
            self.azimuth_command = settings.AZ_NEUTRAL + settings.AZ_SPEED  # 1540 us
        else:
            # Needs negative azimuth correction -> slew LEFT
            self.azimuth_state = "LEFT"
            self.azimuth_command = settings.AZ_NEUTRAL - settings.AZ_SPEED  # 1460 us

        # 4. Elevation Decision (Positional MG995 Servo)
        clamped_el_target = max(settings.ELEVATION_MIN, min(settings.ELEVATION_MAX, target_elevation))
        el_diff = clamped_el_target - current_elevation

        if el_in_deadband or abs(el_diff) <= settings.ELEVATION_DEADBAND:
            self.elevation_state = "HOLD"
        elif el_diff > 0:
            self.elevation_state = "UP"
            self.elevation_angle = min(settings.ELEVATION_MAX, current_elevation + 1.0)
        else:
            self.elevation_state = "DOWN"
            self.elevation_angle = max(settings.ELEVATION_MIN, current_elevation - 1.0)

        decision_str = f"Slew Az: {self.azimuth_state} (Cmd {self.azimuth_command}µs) | El: {self.elevation_state} (Target {clamped_el_target:.1f}°)"
        return self.get_state(), decision_str, False

    def manual_jog(self, axis: str, direction: int, step: float = 4.0) -> MotorState:
        """Applies manual jog step to specified axis."""
        if axis == "azimuth":
            if direction > 0:
                self.azimuth_state = "RIGHT"
                self.azimuth_command = settings.AZ_NEUTRAL + settings.AZ_SPEED
            elif direction < 0:
                self.azimuth_state = "LEFT"
                self.azimuth_command = settings.AZ_NEUTRAL - settings.AZ_SPEED
            else:
                self.azimuth_state = "STOP"
                self.azimuth_command = settings.AZ_NEUTRAL
        elif axis == "elevation":
            if direction > 0:
                self.elevation_state = "UP"
                self.elevation_angle = min(settings.ELEVATION_MAX, self.elevation_angle + step)
            elif direction < 0:
                self.elevation_state = "DOWN"
                self.elevation_angle = max(settings.ELEVATION_MIN, self.elevation_angle - step)
            else:
                self.elevation_state = "HOLD"

        return self.get_state()

    def stop_all(self) -> MotorState:
        """Emergency and fail-safe full stop for both motors."""
        self.azimuth_state = "STOP"
        self.elevation_state = "HOLD"
        self.azimuth_command = settings.AZ_NEUTRAL
        return self.get_state()

    def get_state(self) -> MotorState:
        return MotorState(
            azimuth=self.azimuth_state,
            elevation=self.elevation_state,
            azimuth_command=self.azimuth_command,
            elevation_angle=round(self.elevation_angle, 1)
        )

motor_controller = MotorController()
