from typing import Tuple, Dict, Any
from .config import settings

class MotorController:
    """
    Manages dual-axis motor logic:
      - Azimuth: Continuous-rotation MG995 servo (Neutral 1500 us, Left: 1500 - speed, Right: 1500 + speed)
      - Elevation: Positional MG995 servo (Clamped 10 - 170 deg)
      - Implements Deadbands, Stop Conditions, and Low-Light Safeguards.
    """

    def __init__(self):
        self.azimuth_state: str = "STOP"      # LEFT, RIGHT, STOP
        self.elevation_state: str = "STOP"    # UP, DOWN, STOP, HOLD
        self.azimuth_command_us: int = settings.AZ_STOP_US
        self.current_elevation_angle: int = int(settings.DEFAULT_ELEVATION_DEG)
        self.last_serial_cmd: str = ""

    def evaluate_tracking(
        self,
        pred_az_res: float,
        pred_el_res: float,
        target_el: float,
        h_norm: float,
        v_norm: float,
        lux: float,
        tracking_mode: str = "AUTO"
    ) -> Tuple[str, str, int, int, str, bool, str]:
        """
        Determines motor actions based on safety rules and deadbands.
        Returns:
            (az_action, el_action, az_us, el_deg, system_status, is_stopped, stop_reason)
        """
        # 1. Manual or Stopped Mode Check
        if tracking_mode == "STOPPED":
            return self._full_stop("MANUAL STOP", "MANUAL STOP ACTIVATED")

        # 2. Low Light / No Sun Safeguard
        if lux < settings.LOW_LIGHT_LUX:
            return self._full_stop("NO SUN", f"Lux ({lux:.1f}) is below threshold ({settings.LOW_LIGHT_LUX:.1f} Lux)")

        # 3. Stop / Holding Condition (Tracking Locked)
        # Both ML residuals inside deadband AND normalized LDR differences balanced
        az_in_deadband = abs(pred_az_res) <= settings.AZIMUTH_DEADBAND
        el_in_deadband = abs(pred_el_res) <= settings.ELEVATION_DEADBAND
        ldr_balanced = (abs(h_norm) <= settings.LDR_NORM_DEADBAND) and (abs(v_norm) <= settings.LDR_NORM_DEADBAND)

        if az_in_deadband and el_in_deadband and ldr_balanced:
            self.azimuth_state = "STOP"
            self.elevation_state = "HOLD"
            self.azimuth_command_us = settings.AZ_STOP_US
            return (
                "STOP",
                "HOLD",
                settings.AZ_STOP_US,
                self.current_elevation_angle,
                "TRACKING LOCKED",
                True,
                f"Azimuth residual ({pred_az_res:+.2f}°) and Elevation residual ({pred_el_res:+.2f}°) inside deadbands; LDRs balanced."
            )

        # 4. Active Tracking Calculations
        # Azimuth continuous rotation control
        if abs(pred_az_res) <= settings.AZIMUTH_DEADBAND:
            az_action = "STOP"
            az_us = settings.AZ_STOP_US
        else:
            # Positive azimuth correction -> Right, Negative -> Left
            turn_right = (pred_az_res > 0) ^ settings.INVERT_AZIMUTH
            if turn_right:
                az_action = "RIGHT"
                az_us = settings.AZ_STOP_US + settings.AZ_SPEED_DELTA_US
            else:
                az_action = "LEFT"
                az_us = settings.AZ_STOP_US - settings.AZ_SPEED_DELTA_US

        # Elevation positional servo control
        if abs(pred_el_res) <= settings.ELEVATION_DEADBAND:
            el_action = "HOLD"
            el_deg = self.current_elevation_angle
        else:
            # Positive elevation correction -> UP, Negative -> DOWN
            tilt_up = (pred_el_res > 0) ^ settings.INVERT_ELEVATION
            el_action = "UP" if tilt_up else "DOWN"
            # Update target elevation angle clamped to safe physical limits
            clamped_target = min(max(int(round(target_el)), int(settings.MIN_ELEVATION_DEG)), int(settings.MAX_ELEVATION_DEG))
            self.current_elevation_angle = clamped_target
            el_deg = clamped_target

        self.azimuth_state = az_action
        self.elevation_state = el_action
        self.azimuth_command_us = az_us

        return (
            az_action,
            el_action,
            az_us,
            el_deg,
            "TRACKING",
            False,
            None
        )

    def _full_stop(self, status: str, reason: str) -> Tuple[str, str, int, int, str, bool, str]:
        self.azimuth_state = "STOP"
        self.elevation_state = "STOP"
        self.azimuth_command_us = settings.AZ_STOP_US
        return (
            "STOP",
            "STOP",
            settings.AZ_STOP_US,
            self.current_elevation_angle,
            status,
            True,
            reason
        )

    def generate_serial_command(self, az_action: str, el_action: str, el_deg: int) -> str:
        """
        Creates structured command strings for ESP32:
        Examples:
          CMD,AZ,LEFT
          CMD,AZ,RIGHT
          CMD,AZ,STOP
          CMD,EL,UP
          CMD,EL,DOWN
          CMD,EL,STOP
          CMD,EL,ANGLE,<deg>
          CMD,MOTOR,STOP
        """
        if az_action == "STOP" and (el_action == "STOP" or el_action == "HOLD"):
            return "CMD,MOTOR,STOP\n"

        cmd = f"CMD,AZ,{az_action};CMD,EL,{el_action};CMD,EL_ANGLE,{el_deg}\n"
        return cmd
