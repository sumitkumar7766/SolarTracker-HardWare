from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class LDRData(BaseModel):
    top: int = 0
    bottom: int = 0
    left: int = 0
    right: int = 0
    horizontal_error: int = 0
    vertical_error: int = 0
    horizontal_normalized: float = 0.0
    vertical_normalized: float = 0.0

class EnvironmentData(BaseModel):
    lux: float = 0.0
    temperature: float = 0.0
    humidity: float = 0.0
    light_status: str = "LOW"

class ElectricalData(BaseModel):
    voltage: float = 0.0
    current: float = 0.0
    power: float = 0.0

class SolarPositionData(BaseModel):
    azimuth: float = 0.0
    elevation: float = 0.0

class MLPredictionData(BaseModel):
    azimuth_correction: float = 0.0
    elevation_correction: float = 0.0
    target_azimuth: float = 0.0
    target_elevation: float = 0.0

class MotorStatusData(BaseModel):
    azimuth: str = "STOP"          # LEFT, RIGHT, STOP
    elevation: str = "STOP"        # UP, DOWN, STOP, HOLD
    azimuth_command: int = 1500    # us
    elevation_angle: int = 90      # degrees
    tracking_state: str = "IDLE"

class StopStatusData(BaseModel):
    is_stopped: bool = True
    reason: Optional[str] = "SYSTEM INITIALIZING"

class TrackerStateResponse(BaseModel):
    timestamp: str
    system_status: str              # IDLE, TRACKING, TRACKING LOCKED, NO SUN, ERROR, MANUAL
    tracking_mode: str              # AUTO, MANUAL, STOPPED
    esp32_connected: bool
    model_loaded: bool
    solar: SolarPositionData
    baseline: SolarPositionData
    ldr: LDRData
    environment: EnvironmentData
    electrical: ElectricalData
    ml: MLPredictionData
    motors: MotorStatusData
    stop: StopStatusData
    error_message: Optional[str] = None

class MotorCommandRequest(BaseModel):
    action: str = Field(..., description="Action name e.g. STOP, LEFT, RIGHT, UP, DOWN")
