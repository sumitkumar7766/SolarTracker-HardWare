# AI Dual-Axis Solar Tracker Backend & Live Dashboard

This repository contains the complete production-grade FastAPI backend, real-time WebSocket server, ML inference pipeline, ESP32 firmware, and visual telemetry dashboard for the AI Dual-Axis Solar Tracking System.

## Architecture Flow

```
+-------------------------------------------------------------+
| ESP32 Microcontroller                                      |
|  - 4x LDRs (GPIO 34, 35, 32, 33)                            |
|  - BH1750 Lux (I2C 0x23)                                    |
|  - INA260 Energy (I2C 0x40)                                 |
|  - DHT22 Temp & Hum (GPIO 27)                               |
|  - Azimuth Servo (MG995 continuous on GPIO 25)              |
|  - Elevation Servo (MG995 positional on GPIO 26)            |
+-------------------------------------------------------------+
                            │
              USB Serial    │   20 CSV Telemetry Values (115200 Baud)
              (Bidirectional)│   Motor Commands (CMD,AZ,...; CMD,EL,...)
                            ▼
+-------------------------------------------------------------+
| FastAPI Backend                                             |
|  - Serial Worker Thread (non-blocking, auto-reconnect)      |
|  - pvlib Astronomical Sun Position (Latitude 23.25, 77.50)  |
|  - Temporal Cyclical Features (time_sin, time_cos)          |
|  - ML Inference Engine (solar_tracker_model.pkl)            |
|  - Deadband & Safety Evaluation (Tracking Lock, No Sun)     |
|  - Dual-Axis Motor Command Dispatcher                       |
|  - Real-Time WebSocket (2Hz broadcast)                      |
|  - RESTful API Endpoints                                    |
+-------------------------------------------------------------+
                            │
             WebSocket /    │   JSON Full State Stream
             REST API       ▼
+-------------------------------------------------------------+
| Interactive Telemetry Dashboard                             |
|  - Visual 3D Celestial Projection & Sun Ray Indicator       |
|  - Quadrant LDR Balance Matrix                              |
|  - Real-time Power Generation & Environmental Cards         |
|  - Motor Status & Manual Jog Controls                       |
|  - Real-time Chart.js Streams (Angles, Corrections, Power)   |
|  - Big Clear Status & Emergency Stop Indicator              |
+-------------------------------------------------------------+
```

---

## Folder Structure

```
solar_tracker_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application, CORS, endpoints & WebSocket
│   ├── config.py                # Pydantic system settings & deadband thresholds
│   ├── serial_manager.py        # Non-blocking USB serial background worker
│   ├── sensor_processor.py      # 20-field packet parsing & error normalization
│   ├── solar_position.py        # Astronomical ephemeris calculation via pvlib
│   ├── ml_model.py              # ML inference loader & predictor (solar_tracker_model.pkl)
│   ├── motor_controller.py      # Dual-axis MG995 state machine & safe command generator
│   ├── tracker.py               # Central unified state coordinator
│   ├── schemas.py               # Pydantic schemas for REST & WebSocket
│   ├── test_backend.py          # Complete 8-part unit test suite
│   └── models/
│       ├── solar_tracker_model.pkl
│       └── features.pkl
│
├── frontend/
│   ├── index.html               # Real-time dashboard HTML UI
│   ├── style.css                # Modern dark-mode styling & layout
│   └── dashboard.js             # WebSocket listener, compass ray transforms & Chart.js
│
├── esp32_tracker_firmware.ino   # Complete ESP32 sketch (telemetry + motor control)
├── requirements.txt             # Python dependencies
├── test_client.py               # Quick sanity check client
└── README.md
```

---

## Installation & Setup

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd /Users/sumitkumar776693/Desktop/Project/SolarPanelIOT/solar_tracker_backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## Running the Backend & Dashboard

1. Start the server using uvicorn:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. Open your browser:
   - **Dashboard**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/) or [http://127.0.0.1:8000/dashboard/](http://127.0.0.1:8000/dashboard/)
   - **Interactive API Documentation (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **WebSocket Stream**: `ws://127.0.0.1:8000/ws`

---

## Running Automated Backend Tests

To execute the unit test suite verifying packet parsing, ML inference, deadbands, stop conditions, and low-light safeguards:

```bash
python3.13 -m unittest discover -s app -p "test_backend.py"
```
