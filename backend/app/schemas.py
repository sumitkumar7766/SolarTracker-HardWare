"""
Pydantic Schemas for Live Solar Tracker System State and API Payloads
"""
from typing import Optional
from pydantic import BaseModel, Field


class SystemState(BaseModel):
    status: str = "STOPPED"  # TRACKING, TRACKING_LOCKED, NO_SUN, MANUAL, STOPPED, ERROR, ESP32_DISCONNECTED
    mode: str = "AUTO"       # AUTO, MANUAL, STOPPED
    esp32_connected: bool = False
    model_loaded: bool = False
    last_update: str = ""


class SolarData(BaseModel):
    azimuth: float = 0.0
    elevation: float = 0.0
    baseline_azimuth: float = 0.0
    baseline_elevation: float = 0.0


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
    energy_today: float = 0.0


class MLData(BaseModel):
    azimuth_correction: float = 0.0
    elevation_correction: float = 0.0
    target_azimuth: float = 0.0
    target_elevation: float = 0.0
    confidence: float = 95.0
    decision: str = "WAITING"


class MotorState(BaseModel):
    azimuth: str = "STOP"          # LEFT, RIGHT, STOP
    elevation: str = "HOLD"        # UP, DOWN, HOLD
    azimuth_command: int = 1500    # PWM us: 1460, 1500, 1540
    elevation_angle: float = 90.0  # Degrees: 10 - 170


class StopState(BaseModel):
    is_stopped: bool = True
    reason: Optional[str] = "Initial system startup"


class TrackerState(BaseModel):
    timestamp: str = ""
    system: SystemState = Field(default_factory=SystemState)
    solar: SolarData = Field(default_factory=SolarData)
    ldr: LDRData = Field(default_factory=LDRData)
    environment: EnvironmentData = Field(default_factory=EnvironmentData)
    electrical: ElectricalData = Field(default_factory=ElectricalData)
    ml: MLData = Field(default_factory=MLData)
    motors: MotorState = Field(default_factory=MotorState)
    stop: StopState = Field(default_factory=StopState)


class ModeRequest(BaseModel):
    mode: str  # AUTO, MANUAL, STOPPED


class JogRequest(BaseModel):
    axis: str  # azimuth, elevation
    direction: int = 1
    step: float = 4.0
