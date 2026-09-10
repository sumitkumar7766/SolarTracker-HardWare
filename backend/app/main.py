"""
FastAPI Solar Tracker Backend Application
Endpoints:
  - WS  /ws
  - GET /api/status
  - GET /api/sensor-data
  - GET /api/solar-position
  - GET /api/prediction
  - GET /api/motors
  - GET /api/tracker
  - POST /api/tracker/start
  - POST /api/tracker/stop
  - POST /api/tracker/mode
  - POST /api/motors/stop
  - POST /api/motors/azimuth/left
  - POST /api/motors/azimuth/right
  - POST /api/motors/azimuth/stop
  - POST /api/motors/elevation/up
  - POST /api/motors/elevation/down
  - POST /api/motors/elevation/stop
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas import ModeRequest, JogRequest
from .serial_manager import SerialManager
from .tracker import tracker_coordinator
from .websocket_manager import ws_manager
from .ml_model import ml_engine

serial_mgr: SerialManager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Sequence
    print("================================================")
    print("AI SOLAR TRACKER BACKEND")
    print("================================================")
    print(f"ML Model:\n{'LOADED' if ml_engine.is_loaded else 'FAILED'}")
    print(f"\nFeatures:\n{'LOADED' if ml_engine.feature_names else 'FAILED'}")
    print(f"\nSerial:\n {settings.SERIAL_PORT}")
    print("\nESP32:\nWAITING")
    print("\nTracker:\nSTOPPED")
    print("================================================")

    loop = asyncio.get_running_loop()
    tracker_coordinator.set_event_loop(loop)

    global serial_mgr
    serial_mgr = SerialManager(
        on_packet_received=tracker_coordinator.on_esp32_packet,
        on_status_changed=tracker_coordinator.on_serial_status_changed
    )
    tracker_coordinator.set_serial_manager(serial_mgr)
    serial_mgr.start()

    yield

    # Shutdown Sequence
    print("\n[BACKEND SHUTDOWN] Halting motors and closing serial port...")
    tracker_coordinator.stop_all(reason="Backend server shutting down")
    if serial_mgr:
        serial_mgr.stop()

app = FastAPI(
    title="AI Solar Tracker IoT Backend",
    description="Real-Time Telemetry, pvlib Solar Position, ML Inference & Fail-Safe Dual-Axis Motor Control",
    version="2.4.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# WEBSOCKET ENDPOINT
# ============================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    # Send immediate state on connection
    try:
        await websocket.send_json(tracker_coordinator.state.model_dump())
        while True:
            # Keep-alive receive
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# ============================================================
# REST QUERY APIS
# ============================================================

@app.get("/api/status")
def get_system_status():
    return {
        "status": tracker_coordinator.state.system.status,
        "mode": tracker_coordinator.state.system.mode,
        "esp32_connected": tracker_coordinator.state.system.esp32_connected,
        "model_loaded": tracker_coordinator.state.system.model_loaded,
        "last_update": tracker_coordinator.state.system.last_update,
        "stop": tracker_coordinator.state.stop.model_dump()
    }

@app.get("/api/tracker")
def get_complete_tracker_state():
    return tracker_coordinator.state.model_dump()

@app.get("/api/sensor-data")
def get_sensor_data():
    return {
        "ldr": tracker_coordinator.state.ldr.model_dump(),
        "environment": tracker_coordinator.state.environment.model_dump(),
        "electrical": tracker_coordinator.state.electrical.model_dump()
    }

@app.get("/api/solar-position")
def get_solar_position():
    return tracker_coordinator.state.solar.model_dump()

@app.get("/api/prediction")
def get_prediction():
    return {
        "model_loaded": tracker_coordinator.state.system.model_loaded,
        "prediction": tracker_coordinator.state.ml.model_dump()
    }

@app.get("/api/motors")
def get_motors():
    return tracker_coordinator.state.motors.model_dump()

# ============================================================
# REST COMMAND APIS
# ============================================================

@app.post("/api/tracker/start")
def start_tracker():
    tracker_coordinator.set_mode("AUTO")
    return {"message": "Tracking started in AUTO mode", "state": tracker_coordinator.state.system.model_dump()}

@app.post("/api/tracker/stop")
def stop_tracker():
    tracker_coordinator.stop_all(reason="Manual stop from dashboard")
    return {"message": "Tracker stopped", "state": tracker_coordinator.state.system.model_dump()}

@app.post("/api/tracker/mode")
def set_tracker_mode(req: ModeRequest):
    try:
        tracker_coordinator.set_mode(req.mode)
        return {"message": f"Mode set to {req.mode}", "state": tracker_coordinator.state.system.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/motors/stop")
def stop_motors():
    tracker_coordinator.stop_all(reason="Emergency Stop from API")
    return {"message": "Emergency Stop engaged: all motors stopped", "motors": tracker_coordinator.state.motors.model_dump()}

@app.post("/api/motors/azimuth/left")
def azimuth_jog_left():
    tracker_coordinator.manual_jog("azimuth", -1)
    return tracker_coordinator.state.motors.model_dump()

@app.post("/api/motors/azimuth/right")
def azimuth_jog_right():
    tracker_coordinator.manual_jog("azimuth", 1)
    return tracker_coordinator.state.motors.model_dump()

@app.post("/api/motors/azimuth/stop")
def azimuth_stop():
    tracker_coordinator.manual_jog("azimuth", 0)
    return tracker_coordinator.state.motors.model_dump()

@app.post("/api/motors/elevation/up")
def elevation_jog_up():
    tracker_coordinator.manual_jog("elevation", 1)
    return tracker_coordinator.state.motors.model_dump()

@app.post("/api/motors/elevation/down")
def elevation_jog_down():
    tracker_coordinator.manual_jog("elevation", -1)
    return tracker_coordinator.state.motors.model_dump()

@app.post("/api/motors/elevation/stop")
def elevation_stop():
    tracker_coordinator.manual_jog("elevation", 0)
    return tracker_coordinator.state.motors.model_dump()
