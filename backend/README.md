# AI Solar Tracker IoT Backend

FastAPI backend for real-time solar tracking telemetry ingestion, astronomical solar positioning (pvlib), machine learning correction inference (`solar_tracker_model.pkl`), fail-safe motor decision making, and WebSocket live dashboard broadcasting.

## Architecture
```
[ESP32 Microcontroller]
          │
          ▼ USB Serial (115200 baud, 20 CSV fields)
[FastAPI Background Serial Worker]
          │
          ├────────► [pvlib Astronomical Ephemeris]
          │                     │
          ▼                     ▼
[Sensor Preprocessor] ──► [ML Feature Formulation (20 features)]
                                │
                                ▼
                   [solar_tracker_model.pkl]
                                │
                                ▼
                   [Residual Dual-Axis Angles]
                                │
                                ▼
                   [Fail-Safe Motor Controller]
                                │
                                ▼
             [WebSocket Broadcast /ws (~2 Hz)]
                                │
                                ▼
               [Existing React Vite Dashboard]
```

## Running the Backend

```bash
cd /Users/sumitkumar776693/Desktop/Project/SolarPanelIOT/backend
python3.13 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Running the Frontend

```bash
cd /Users/sumitkumar776693/Desktop/Project/SolarPanelIOT/prototype
npm run dev
```
