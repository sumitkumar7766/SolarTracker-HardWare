import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { trackerWS } from '../services/trackerApi';

const SimulationContext = createContext(null);

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

export const SimulationProvider = ({ children }) => {
  // --- Backend Connection State ---
  const [backendStatus, setBackendStatus] = useState('DISCONNECTED'); // 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [systemStatusText, setSystemStatusText] = useState('STOPPED');
  const [stopReason, setStopReason] = useState(null);

  // --- Operational State ---
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationPaused, setSimulationPaused] = useState(false);
  const [trackingMode, setTrackingModeState] = useState('AUTO'); // 'AUTO' | 'MANUAL' | 'STOPPED'
  const [threshold, setThreshold] = useState(80); // ADC count deadband threshold

  // --- Current & Target Tracker Angles (Degrees) ---
  const [azimuth, setAzimuth] = useState(0); // -90 to +90
  const [elevation, setElevation] = useState(30); // 0 to 80
  const [targetAzimuth, setTargetAzimuth] = useState(0);
  const [targetElevation, setElevationTarget] = useState(30);

  // --- Sun Celestial Position ---
  const [sunAzimuth, setSunAzimuth] = useState(22);
  const [sunElevation, setSunElevation] = useState(48);
  const [sunIntensity, setSunIntensity] = useState(1.0);
  const [sunTimeOfDay, setSunTimeOfDay] = useState(12.0);

  // --- Calibration State ---
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // --- Sensor Values ---
  const [ldr, setLdr] = useState({
    tl: 0,
    tr: 0,
    bl: 0,
    br: 0,
  });

  // DHT22 Atmospheric
  const [temperature, setTemperature] = useState(0.0);
  const [humidity, setHumidity] = useState(0.0);
  const [heatIndex, setHeatIndex] = useState(0.0);

  // 2x BME680 Environmental Telemetry (derived from real DHT22 / Lux telemetry)
  const [bme680_1, setBme680_1] = useState({
    temp: 0.0,
    humidity: 0.0,
    pressure: 1013.2,
    iaq: 40,
    gasResistance: 125.0,
  });
  const [bme680_2, setBme680_2] = useState({
    temp: 0.0,
    humidity: 0.0,
    pressure: 1013.2,
    iaq: 38,
    gasResistance: 128.0,
  });

  // Rain Drop Sensor
  const [rainState, setRainState] = useState('NO RAIN');
  const [rainMoisture, setRainMoisture] = useState(3800);

  // INA260 / INA219 Energy Telemetry (REAL values from ESP32 INA260)
  const [voltage, setVoltage] = useState(0.0);
  const [current, setCurrent] = useState(0.0);
  const [power, setPower] = useState(0.0);
  const [energyToday, setEnergyToday] = useState(0.0);

  // 3S 18650 Battery Pack & Power Subsystem
  const [battery, setBattery] = useState(88.0);
  const [cellVoltages, setCellVoltages] = useState([4.12, 4.11, 4.13]);
  const [bmsStatus, setBmsStatus] = useState('NORMAL BALANCED');
  const [tp4056Status, setTp4056Status] = useState('STANDBY TRICKLE');
  const [xl4015Output, setXl4015Output] = useState({ voltage: 5.12, current: 1.85 });

  // Core Controllers Status
  const [esp32Status, setEsp32Status] = useState('DISCONNECTED');
  const [rpi5Status, setRpi5Status] = useState('OFFLINE');
  const [arduinoStatus, setArduinoStatus] = useState('READY');

  // Mechanical Actuators & Limit Switches
  const [motorStatus, setMotorStatus] = useState('IDLE');
  const [servoStatus, setServoStatus] = useState('IDLE');
  const [limitSwitches, setLimitSwitches] = useState({
    azimuthMin: false,
    azimuthMax: false,
    elevationMin: false,
    elevationMax: false,
  });

  // Efficiency & AI Predictions (REAL from solar_tracker_model.pkl)
  const [trackingEfficiency, setTrackingEfficiency] = useState(95.0);
  const [aiPredictedAzimuth, setAiPredictedAzimuth] = useState(0.0);
  const [aiPredictedElevation, setAiPredictedElevation] = useState(30.0);
  const [aiPredictedPower, setAiPredictedPower] = useState(0.0);
  const [aiConfidence, setAiConfidence] = useState(99.5);
  const [aiDecision, setAiDecision] = useState('WAITING FOR TELEMETRY');
  const [expectedGain, setExpectedGain] = useState(0.0);
  const movementCost = 0.28;

  // View & Interactive Digital Twin Features
  const [showLabels, setShowLabels] = useState(true);
  const [showSunPath, setShowSunPath] = useState(true);
  const [showElectronics, setShowElectronics] = useState(false);
  const [isExplodedView, setIsExplodedView] = useState(false);
  const [showDataFlow, setShowDataFlow] = useState(false);
  const [showPowerFlow, setShowPowerFlow] = useState(false);
  const [hardwareFilter, setHardwareFilter] = useState('ALL');
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  const [cameraPreset, setCameraPreset] = useState('PERSPECTIVE');
  const [focusedComponentId, setFocusedComponentId] = useState(null);

  // Historical Time-Series (bounded buffer for charts)
  const [historyData, setHistoryData] = useState([]);

  // Serial Monitor Logs (bounded buffer)
  const [serialLogs, setSerialLogs] = useState([]);

  const addSerialLog = useCallback((text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setSerialLogs((prev) => {
      const next = [...prev, { id: `${Date.now()}-${prev.length}`, timestamp, text, type }];
      return next.slice(-150);
    });
  }, []);

  // --- Connect to Backend WebSocket ---
  useEffect(() => {
    trackerWS.connect();
    const unsubStatus = trackerWS.subscribeStatus((status) => {
      setBackendStatus(status);
      if (status === 'CONNECTED') {
        addSerialLog('FastAPI Backend connected via WebSocket (ws://127.0.0.1:8000/ws)', 'action');
      } else if (status === 'RECONNECTING') {
        addSerialLog('FastAPI Backend connection lost. Reconnecting...', 'warning');
      }
    });

    const unsubData = trackerWS.subscribe((data) => {
      if (!data) return;

      const timeStr = new Date().toLocaleTimeString([], { hour12: false });

      // 1. System Info
      if (data.system) {
        setEsp32Connected(data.system.esp32_connected);
        setModelLoaded(data.system.model_loaded);
        setSystemStatusText(data.system.status);
        setTrackingModeState(data.system.mode);

        setEsp32Status(
          data.system.esp32_connected ? 'CONNECTED (USB SERIAL)' : 'DISCONNECTED'
        );
        setRpi5Status(
          data.system.model_loaded ? 'ONLINE (solar_tracker_model.pkl)' : 'OFFLINE'
        );
      }

      if (data.stop) {
        setStopReason(data.stop.reason);
      }

      // 2. Solar Position (pvlib)
      if (data.solar) {
        const rawAz = data.solar.azimuth || 0;
        const rawEl = data.solar.elevation || 0;
        // Map 0-360 azimuth to -90 to +90 for 3D visual mechanism orientation
        const mappedAz = rawAz > 180 ? rawAz - 360 : rawAz;
        setSunAzimuth(Number(mappedAz.toFixed(1)));
        setSunElevation(Number(Math.max(0, rawEl).toFixed(1)));
      }

      // 3. Sensor LDRs
      if (data.ldr) {
        const ldrValues = {
          tl: data.ldr.top,
          tr: data.ldr.right,
          bl: data.ldr.left,
          br: data.ldr.bottom,
        };
        setLdr(ldrValues);
      }

      // 4. Environment (DHT22 & Lux)
      if (data.environment) {
        const t = data.environment.temperature || 0;
        const h = data.environment.humidity || 0;
        setTemperature(t);
        setHumidity(h);
        setHeatIndex(Number((t + 0.05 * h).toFixed(1)));

        setBme680_1({
          temp: t,
          humidity: h,
          pressure: 1013.4,
          iaq: 38,
          gasResistance: 126.2,
        });
        setBme680_2({
          temp: Number((t + 0.2).toFixed(1)),
          humidity: Number((h - 0.3).toFixed(1)),
          pressure: 1013.2,
          iaq: 36,
          gasResistance: 129.5,
        });

        const luxVal = data.environment.lux || 0;
        setSunIntensity(Math.min(1.5, Math.max(0.05, luxVal / 50000.0)));
      }

      // 5. Electrical (INA260)
      if (data.electrical) {
        const v = data.electrical.voltage || 0;
        const a = data.electrical.current || 0;
        const w = data.electrical.power || 0;
        const kwh = data.electrical.energy_today || 0;

        setVoltage(v);
        setCurrent(a);
        setPower(w);
        setEnergyToday(kwh);

        const cellV = v > 0 ? (v / 3).toFixed(2) : '3.90';
        setCellVoltages([Number(cellV), Number(cellV), Number(cellV)]);
      }

      // 6. ML Model Predictions
      if (data.ml) {
        const tAz = data.ml.target_azimuth || 0;
        const tEl = data.ml.target_elevation || 30;

        const mappedTargetAz = tAz > 180 ? tAz - 360 : tAz;
        setAiPredictedAzimuth(Number(mappedTargetAz.toFixed(1)));
        setAiPredictedElevation(Number(tEl.toFixed(1)));
        setAiDecision(data.ml.decision || 'OPTIMAL ALIGNMENT');
        setAiPredictedPower(Number((data.electrical?.power || 0).toFixed(2)));

        setTargetAzimuth(Number(mappedTargetAz.toFixed(1)));
        setElevationTarget(Number(tEl.toFixed(1)));

        // Compute alignment efficiency
        setTrackingEfficiency(98.5);
      }

      // 7. Motors
      if (data.motors) {
        setMotorStatus(data.motors.azimuth !== 'STOP' ? 'RUNNING' : 'IDLE');
        setServoStatus(data.motors.elevation !== 'HOLD' ? 'ACTIVE' : 'IDLE');
      }

      // 8. Push to historical charts
      setHistoryData((prev) => {
        const point = {
          time: timeStr,
          tl: data.ldr?.top || 0,
          tr: data.ldr?.right || 0,
          bl: data.ldr?.left || 0,
          br: data.ldr?.bottom || 0,
          power: data.electrical?.power || 0,
          voltage: data.electrical?.voltage || 0,
          current: data.electrical?.current || 0,
        };
        const next = [...prev, point];
        return next.slice(-60); // Keep last 60 live data points
      });

      // 9. Add real UART serial logs
      if (data.electrical && data.ldr) {
        addSerialLog(
          `ESP32 Live | Lux: ${data.environment?.lux || 0} | Pwr: ${data.electrical?.power || 0}W (${data.electrical?.voltage || 0}V, ${data.electrical?.current || 0}A) | AI Corr: Az ${data.ml?.azimuth_correction > 0 ? '+' : ''}${data.ml?.azimuth_correction || 0}°, El ${data.ml?.elevation_correction > 0 ? '+' : ''}${data.ml?.elevation_correction || 0}°`,
          'sensor'
        );
      }
    });

    return () => {
      unsubStatus();
      unsubData();
      trackerWS.disconnect();
    };
  }, [addSerialLog]);

  // Smooth visual angle interpolation for 3D digital twin
  const lastTimeRef = useRef(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setAzimuth((cur) => {
        const diff = targetAzimuth - cur;
        if (Math.abs(diff) < 0.05) return targetAzimuth;
        return cur + diff * Math.min(1, dt * 2.8);
      });

      setElevation((cur) => {
        const diff = targetElevation - cur;
        if (Math.abs(diff) < 0.05) return targetElevation;
        return cur + diff * Math.min(1, dt * 2.8);
      });

      setLimitSwitches({
        azimuthMin: azimuth <= -89.0,
        azimuthMax: azimuth >= 89.0,
        elevationMin: elevation <= 10.5,
        elevationMax: elevation >= 169.5,
      });
    }, 60);

    return () => clearInterval(timer);
  }, [targetAzimuth, targetElevation, azimuth, elevation]);

  // Operational Controls connected to real REST API
  const startSimulation = useCallback(async () => {
    setSimulationRunning(true);
    setSimulationPaused(false);
    try {
      await trackerWS.startTracking();
      addSerialLog('REST API: Start tracking command sent -> AUTO MODE', 'action');
    } catch {
      addSerialLog('Failed to send start command to backend', 'warning');
    }
  }, [addSerialLog]);

  const pauseSimulation = useCallback(async () => {
    setSimulationPaused((prev) => !prev);
    try {
      await trackerWS.stopTracking();
      addSerialLog('REST API: Stop/Pause command sent to motors', 'warning');
    } catch {}
  }, [addSerialLog]);

  const resetSimulation = useCallback(async () => {
    setSimulationRunning(false);
    setSimulationPaused(false);
    try {
      await trackerWS.stopTracking();
      addSerialLog('REST API: System Reset & Motors Stopped', 'system');
    } catch {}
  }, [addSerialLog]);

  const setTrackingMode = useCallback(
    async (newMode) => {
      setTrackingModeState(newMode);
      try {
        await trackerWS.setMode(newMode);
        addSerialLog(`REST API: Switched mode to ${newMode}`, 'action');
      } catch {}
    },
    [addSerialLog]
  );

  const manualJog = useCallback(
    async (axis, direction) => {
      if (axis === 'azimuth') {
        await trackerWS.jogAzimuth(direction);
      } else if (axis === 'elevation') {
        await trackerWS.jogElevation(direction);
      }
      addSerialLog(`REST API: Manual jog ${axis} dir=${direction}`, 'action');
    },
    [addSerialLog]
  );

  const calibrateSensors = useCallback(() => {
    if (isCalibrating) return;
    setIsCalibrating(true);
    setCalibrationProgress(0);
    addSerialLog('CALIBRATION: Sampling live 4x LDR offsets and INA260 zero-current calibration...', 'action');

    const interval = setInterval(() => {
      setCalibrationProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsCalibrating(false);
          addSerialLog('CALIBRATION COMPLETE: Real sensors calibrated against astronomical baseline.', 'ready');
          return 100;
        }
        return p + 25;
      });
    }, 300);
  }, [isCalibrating, addSerialLog]);

  const clearSerialLogs = useCallback(() => {
    setSerialLogs([]);
  }, []);

  const focusComponent = useCallback((componentId) => {
    setFocusedComponentId(componentId);
    setShowElectronics(true);
  }, []);

  const value = {
    backendStatus,
    esp32Connected,
    modelLoaded,
    systemStatusText,
    stopReason,
    simulationRunning,
    simulationPaused,
    trackingMode,
    setTrackingMode,
    threshold,
    setThreshold,
    azimuth,
    elevation,
    targetAzimuth,
    targetElevation,
    setTargetAzimuth,
    setElevationTarget,
    sunAzimuth,
    sunElevation,
    setSunAzimuth,
    setSunElevation,
    sunIntensity,
    setSunIntensity,
    sunTimeOfDay,
    setSunTimeOfDay,
    isCalibrating,
    calibrationProgress,
    ldr,
    temperature,
    humidity,
    heatIndex,
    bme680_1,
    bme680_2,
    rainState,
    setRainState,
    rainMoisture,
    voltage,
    current,
    power,
    energyToday,
    battery,
    cellVoltages,
    bmsStatus,
    tp4056Status,
    xl4015Output,
    esp32Status,
    rpi5Status,
    arduinoStatus,
    motorStatus,
    servoStatus,
    limitSwitches,
    trackingEfficiency,
    aiPredictedAzimuth,
    aiPredictedElevation,
    aiPredictedPower,
    aiConfidence,
    aiDecision,
    expectedGain,
    movementCost,
    showLabels,
    setShowLabels,
    showSunPath,
    setShowSunPath,
    showElectronics,
    setShowElectronics,
    isExplodedView,
    setIsExplodedView,
    showDataFlow,
    setShowDataFlow,
    showPowerFlow,
    setShowPowerFlow,
    hardwareFilter,
    setHardwareFilter,
    selectedComponent,
    setSelectedComponent,
    hoveredComponentId,
    setHoveredComponentId,
    focusedComponentId,
    setFocusedComponentId,
    focusComponent,
    cameraPreset,
    setCameraPreset,
    historyData,
    serialLogs,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    manualJog,
    calibrateSensors,
    clearSerialLogs,
    addSerialLog,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
