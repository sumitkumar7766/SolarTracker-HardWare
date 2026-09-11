"""
Pydantic Schemas for Live Solar Tracker System State and API Payloads
Matches exact Section 25 & 26 Central Tracker State & WebSocket contracts
"""
from typing import Optional
from pydantic import BaseModel, Field

class SystemState(BaseModel):
    status: str = "STOPPED"  # IDLE, TRACKING, TRACKING_LOCKED, NO_SUN, MANUAL, STOPPED, ERROR, ESP32_DISCONNECTED
    mode: str = "AUTO"       # AUTO, MANUAL, STOPPED
    esp32_connected: bool = False
    model_loaded: bool = False
    motor_enabled: bool = False
    last_update: str = ""

class SunData(BaseModel):
    azimuth: float = 0.0
    elevation: float = 0.0

class PanelData(BaseModel):
    estimated_azimuth: float = 180.0
    elevation: float = 90.0

class TargetData(BaseModel):
    azimuth: float = 0.0
    elevation: float = 0.0

class SolarData(BaseModel):
    azimuth: float = 0.0
    elevation: float = 0.0
    baseline_azimuth: float = 0.0
    baseline_elevation: float = 0.0

class LDRData(BaseModel):
    top: Optional[int] = None
    bottom: Optional[int] = None
    left: Optional[int] = None
    right: Optional[int] = None
    horizontal_error: Optional[int] = None
    vertical_error: Optional[int] = None
    horizontal_normalized: Optional[float] = None
    vertical_normalized: Optional[float] = None

class EnvironmentData(BaseModel):
    lux: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    light_status: str = "WAITING"

class ElectricalData(BaseModel):
    voltage: Optional[float] = None
    current: Optional[float] = None
    power: Optional[float] = None
    energy_today: float = 0.0
    battery_soc: float = 88.0
    battery_voltage: float = 12.4
    cell_voltages: list[float] = Field(default_factory=lambda: [4.13, 4.12, 4.14])
    bms_status: str = "CHARGING (FLOAT)"
    lux_bracket: str = "Waiting for Telemetry"

class MLData(BaseModel):
    azimuth_correction: float = 0.0
    elevation_correction: float = 0.0
    target_azimuth: float = 0.0
    target_elevation: float = 0.0
    confidence: float = 95.0
    decision: str = "WAITING FOR TELEMETRY"

class MotorState(BaseModel):
    azimuth: str = "STOP"          # LEFT, RIGHT, STOP, WOULD MOVE LEFT, WOULD MOVE RIGHT
    elevation: str = "HOLD"        # UP, DOWN, HOLD, WOULD MOVE UP, WOULD MOVE DOWN
    azimuth_command: int = 1500    # PWM us: 1460, 1500, 1540
    elevation_angle: float = 90.0  # Degrees: 10 - 170

class StopState(BaseModel):
    is_stopped: bool = True
    reason: Optional[str] = "Initial system startup"

class TrackerState(BaseModel):
    timestamp: str = ""
    system: SystemState = Field(default_factory=SystemState)
    sun: SunData = Field(default_factory=SunData)
    panel: PanelData = Field(default_factory=PanelData)
    target: TargetData = Field(default_factory=TargetData)
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
    step: float = 1.0
