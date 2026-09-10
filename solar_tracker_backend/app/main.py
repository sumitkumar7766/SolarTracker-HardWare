import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os

from .config import settings
from .tracker import TrackerCoordinator
from .schemas import (
    TrackerStateResponse,
    LDRData,
    EnvironmentData,
    ElectricalData,
    SolarPositionData,
    MLPredictionData,
    MotorStatusData,
    StopStatusData,
    MotorCommandRequest
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SolarTrackerBackend")

# Initialize central tracker coordinator
tracker = TrackerCoordinator()

# Connected WebSocket clients
active_websockets: List[WebSocket] = []

async def websocket_broadcaster():
    """Continuously broadcasts central tracker state to all connected UI clients."""
    interval = 1.0 / settings.WS_UPDATE_RATE_HZ
    while True:
        try:
            if active_websockets:
                current_state = tracker.get_state()
                payload_str = json.dumps(current_state)
                # Broadcast concurrently
                dead_sockets = []
                for ws in active_websockets:
                    try:
                        await ws.send_text(payload_str)
                    except Exception:
                        dead_sockets.append(ws)
                for ws in dead_sockets:
                    if ws in active_websockets:
                        active_websockets.remove(ws)
        except Exception as e:
            logger.error(f"Error in websocket broadcast: {e}")
        await asyncio.sleep(interval)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Print formatted startup banner
    esp32_status_str = "CONNECTED" if tracker.serial_mgr.is_connected else "WAITING"
    model_status_str = "LOADED" if tracker.ml_predictor.is_loaded else f"ERROR: {tracker.ml_predictor.load_error}"

    print("\n" + "=" * 48)
    print("AI SOLAR TRACKER BACKEND")
    print("=" * 48)
    print(f"ESP32 Serial:\n{settings.SERIAL_PORT}\n")
    print(f"Baud:\n{settings.BAUD_RATE}\n")
    print(f"ML Model:\nsolar_tracker_model.pkl\n")
    print(f"Model Status:\n{model_status_str}\n")
    print(f"ESP32 Status:\n{esp32_status_str}\n")
    print(f"Tracker Mode:\n{tracker.tracking_mode}\n")
    print("=" * 48 + "\n")

    # Start background serial manager
    tracker.start()

    # Launch WebSocket broadcast task
    broadcast_task = asyncio.create_task(websocket_broadcaster())

    yield

    # Shutdown sequence: stop motors and cancel broadcaster
    print("\nShutting down AI Solar Tracker Backend...")
    broadcast_task.cancel()
    tracker.emergency_stop()
    tracker.stop()

app = FastAPI(
    title="AI Dual-Axis Solar Tracker Backend",
    description="FastAPI Backend for ESP32 Telemetry, pvlib Solar Position, ML Corrections, and Dual-Axis Motor Control",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local dashboards and Vite prototype UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# REST API ENDPOINTS
# ============================================================

@app.get("/")
def get_root():
    frontend_index = os.path.join(os.path.dirname(settings.BASE_DIR), "frontend", "index.html")
    if os.path.exists(frontend_index):
        return FileResponse(frontend_index)
    return {
        "service": "AI Solar Tracker Backend",
        "version": "1.0.0",
        "status": "ONLINE",
        "model_loaded": tracker.ml_predictor.is_loaded,
        "esp32_connected": tracker.serial_mgr.is_connected or settings.SIMULATION_MODE,
        "mode": tracker.tracking_mode
    }

# Mount static frontend directory
frontend_dir = os.path.join(os.path.dirname(settings.BASE_DIR), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/dashboard", StaticFiles(directory=frontend_dir, html=True), name="frontend")


@app.get("/api/status")
def get_status():
    state = tracker.get_state()
    return {
        "system_status": state["system_status"],
        "tracking_mode": state["tracking_mode"],
        "esp32_connected": state["esp32_connected"],
        "model_loaded": state["model_loaded"],
        "last_update": state["timestamp"],
        "motor_status": state["motors"],
        "stop": state["stop"]
    }

@app.get("/api/sensor-data")
def get_sensor_data():
    state = tracker.get_state()
    return {
        "timestamp": state["timestamp"],
        "ldr": state["ldr"],
        "environment": state["environment"],
        "electrical": state["electrical"]
    }

@app.get("/api/solar-position")
def get_solar_position():
    state = tracker.get_state()
    return {
        "solar_azimuth": state["solar"]["azimuth"],
        "solar_elevation": state["solar"]["elevation"],
        "baseline_azimuth": state["baseline"]["azimuth"],
        "baseline_elevation": state["baseline"]["elevation"]
    }

@app.get("/api/prediction")
def get_prediction():
    state = tracker.get_state()
    return {
        "azimuth_residual": state["ml"]["azimuth_correction"],
        "elevation_residual": state["ml"]["elevation_correction"],
        "target_azimuth": state["ml"]["target_azimuth"],
        "target_elevation": state["ml"]["target_elevation"]
    }

@app.get("/api/motors")
def get_motors():
    state = tracker.get_state()
    return {
        "azimuth_motor_status": state["motors"]["azimuth"],
        "elevation_motor_status": state["motors"]["elevation"],
        "azimuth_command": state["motors"]["azimuth_command"],
        "elevation_command": state["motors"]["elevation_angle"],
        "tracking_state": state["motors"]["tracking_state"]
    }

@app.post("/api/motors/stop")
def stop_motors():
    tracker.emergency_stop()
    return {"status": "SUCCESS", "message": "Motors halted. Tracker switched to STOPPED mode."}

@app.post("/api/tracker/start")
def start_tracker():
    tracker.start_tracking()
    return {"status": "SUCCESS", "mode": "AUTO", "message": "Automatic ML tracking enabled."}

@app.post("/api/tracker/stop")
def stop_tracker():
    tracker.emergency_stop()
    return {"status": "SUCCESS", "mode": "STOPPED", "message": "Automatic ML tracking stopped."}

@app.post("/api/tracker/mode/{mode}")
def set_tracker_mode(mode: str):
    mode = mode.upper()
    if mode not in ("AUTO", "MANUAL", "STOPPED"):
        raise HTTPException(status_code=400, detail="Invalid mode. Must be AUTO, MANUAL, or STOPPED.")
    if mode == "AUTO":
        tracker.start_tracking()
    elif mode == "STOPPED":
        tracker.emergency_stop()
    else:
        tracker.tracking_mode = "MANUAL"
        tracker.state["tracking_mode"] = "MANUAL"
    return {"status": "SUCCESS", "mode": tracker.tracking_mode}

@app.post("/api/motors/azimuth/{direction}")
def manual_azimuth(direction: str):
    direction = direction.upper()
    if direction not in ("LEFT", "RIGHT", "STOP"):
        raise HTTPException(status_code=400, detail="Direction must be LEFT, RIGHT, or STOP.")
    res = tracker.manual_motor_control(f"AZ_{direction}")
    if not res:
        raise HTTPException(status_code=403, detail="Cannot manually control motors unless mode is MANUAL.")
    return {"status": "SUCCESS", "action": f"AZ_{direction}"}

@app.post("/api/motors/elevation/{direction}")
def manual_elevation(direction: str):
    direction = direction.upper()
    if direction not in ("UP", "DOWN", "STOP"):
        raise HTTPException(status_code=400, detail="Direction must be UP, DOWN, or STOP.")
    res = tracker.manual_motor_control(f"EL_{direction}")
    if not res:
        raise HTTPException(status_code=403, detail="Cannot manually control motors unless mode is MANUAL.")
    return {"status": "SUCCESS", "action": f"EL_{direction}"}

@app.get("/api/tracker")
def get_full_tracker():
    return tracker.get_state()

# ============================================================
# WEBSOCKET REAL-TIME STREAM
# ============================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        # Send initial state immediately
        await websocket.send_text(json.dumps(tracker.get_state()))
        while True:
            # Handle incoming client messages if any
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("command") == "EMERGENCY_STOP":
                    tracker.emergency_stop()
                elif msg.get("command") == "START_TRACKING":
                    tracker.start_tracking()
                elif msg.get("command") == "SET_MODE":
                    mode = msg.get("mode", "AUTO").upper()
                    if mode in ("AUTO", "MANUAL", "STOPPED"):
                        tracker.tracking_mode = mode
            except Exception:
                pass
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
    except Exception:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
