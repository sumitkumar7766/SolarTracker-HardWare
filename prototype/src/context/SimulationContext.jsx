import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { trackerWS } from '../services/trackerApi';

const SimulationContext = createContext(null);

const getInitialEnergyToday = () => {
  try {
    const saved = localStorage.getItem('solar_tracker_energy_today');
    if (saved) {
      const parsed = JSON.parse(saved);
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.date === today && typeof parsed.kwh === 'number') {
        return parsed.kwh;
      }
    }
  } catch (e) {}
  return 0.0;
};

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
  const [motorEnabled, setMotorEnabled] = useState(false);
  const [systemStatusText, setSystemStatusText] = useState('STOPPED');
  const [stopReason, setStopReason] = useState('System initialized');

  // --- Operational State ---
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationPaused, setSimulationPaused] = useState(false);
  const [trackingMode, setTrackingModeState] = useState('AUTO'); // 'AUTO' | 'MANUAL' | 'STOPPED'
  const [threshold, setThreshold] = useState(80); // ADC count deadband threshold

  // --- Real Astronomical Sun Ephemeris (pvlib Asia/Kolkata) ---
  const [rawSunAzimuth, setRawSunAzimuth] = useState(180.0);
  const [rawSunElevation, setRawSunElevation] = useState(45.0);
  const [sunAzimuth, setSunAzimuth] = useState(0.0); // Mapped for 3D Three.js
  const [sunElevation, setSunElevation] = useState(45.0);
  const [sunIntensity, setSunIntensity] = useState(1.0);
  const [sunTimeOfDay, setSunTimeOfDay] = useState(12.0);

  // --- Independent Panel Position State (Section 5, 6, 7) ---
  const [estimatedPanelAzimuth, setEstimatedPanelAzimuth] = useState(180.0); // 0 - 360
  const [panelElevationDeg, setPanelElevationDeg] = useState(90.0); // 10 - 170
  // Mapped 3D mechanism visual orientations
  const [azimuth, setAzimuth] = useState(0.0); // -180 to +180
  const [elevation, setElevation] = useState(40.0); // 0 to 80 tilt for 3D assembly

  // --- ML Target Panel Position ---
  const [targetPanelAzimuth, setTargetPanelAzimuth] = useState(180.0);
  const [targetPanelElevation, setTargetPanelElevation] = useState(90.0);
  const [targetAzimuth, setTargetAzimuth] = useState(0.0);
  const [targetElevation, setElevationTarget] = useState(40.0);

  // --- ML Model Residual Corrections ---
  const [azimuthCorrection, setAzimuthCorrection] = useState(0.0);
  const [elevationCorrection, setElevationCorrection] = useState(0.0);
  const [aiDecision, setAiDecision] = useState('WAITING FOR ESP32 TELEMETRY');
  const [aiConfidence, setAiConfidence] = useState(95.0);
  const [aiPredictedAzimuth, setAiPredictedAzimuth] = useState(180.0);
  const [aiPredictedElevation, setAiPredictedElevation] = useState(90.0);
  const [aiPredictedPower, setAiPredictedPower] = useState(0.0);
  const [expectedGain, setExpectedGain] = useState(0.0);
  const movementCost = 0.28;

  // --- Actuator States ---
  const [motorAzimuthStatus, setMotorAzimuthStatus] = useState('STOP');
  const [motorElevationStatus, setMotorElevationStatus] = useState('HOLD');
  const [motorStatus, setMotorStatus] = useState('IDLE');
  const [servoStatus, setServoStatus] = useState('IDLE');
  const [limitSwitches, setLimitSwitches] = useState({
    azimuthMin: false,
    azimuthMax: false,
    elevationMin: false,
    elevationMax: false,
  });

  // --- Real Sensor Values (null when ESP32 disconnected) ---
  const [ldr, setLdr] = useState({
    tl: null,
    tr: null,
    bl: null,
    br: null,
  });
  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [heatIndex, setHeatIndex] = useState(null);

  // BME680 Environmental Telemetry
  const [bme680_1, setBme680_1] = useState({
    temp: null,
    humidity: null,
    pressure: 1013.2,
    iaq: 40,
    gasResistance: 125.0,
  });
  const [bme680_2, setBme680_2] = useState({
    temp: null,
    humidity: null,
    pressure: 1013.2,
    iaq: 38,
    gasResistance: 128.0,
  });

  // Rain Drop Sensor
  const [rainState, setRainState] = useState('NO RAIN');
  const [rainMoisture, setRainMoisture] = useState(3800);

  // INA260 Real Electrical Telemetry
  const [voltage, setVoltage] = useState(null);
  const [current, setCurrent] = useState(null);
  const [power, setPower] = useState(null);
  const [energyToday, setEnergyToday] = useState(getInitialEnergyToday);

  // Battery Pack & Power Subsystem
  const [battery, setBattery] = useState(88.0);
  const [cellVoltages, setCellVoltages] = useState([4.12, 4.11, 4.13]);
  const [bmsStatus, setBmsStatus] = useState('STANDBY');
  const [luxBracket, setLuxBracket] = useState('Waiting for ESP32...');
  const [tp4056Status, setTp4056Status] = useState('STANDBY TRICKLE');
  const [xl4015Output, setXl4015Output] = useState({ voltage: 5.12, current: 1.85 });

  // Core Controllers Status
  const [esp32Status, setEsp32Status] = useState('DISCONNECTED');
  const [rpi5Status, setRpi5Status] = useState('OFFLINE');
  const [arduinoStatus, setArduinoStatus] = useState('READY');
  const [trackingEfficiency, setTrackingEfficiency] = useState(95.0);

  // Calibration State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

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
        const isEspConnected = !!data.system.esp32_connected;
        setEsp32Connected(isEspConnected);
        setModelLoaded(!!data.system.model_loaded);
        setMotorEnabled(!!data.system.motor_enabled);
        setSystemStatusText(data.system.status || 'STOPPED');
        setTrackingModeState(data.system.mode || 'AUTO');

        setEsp32Status(isEspConnected ? 'CONNECTED (USB SERIAL)' : 'DISCONNECTED');
        setRpi5Status(data.system.model_loaded ? 'ONLINE (solar_tracker_model.pkl)' : 'OFFLINE');

        if (data.system.status === 'TRACKING' || data.system.status === 'TRACKING_LOCKED') {
          setSimulationRunning(true);
          setSimulationPaused(false);
        } else if (data.system.status === 'STOPPED' || data.system.status === 'EMERGENCY_STOP' || data.system.status === 'ESP32_DISCONNECTED') {
          setSimulationRunning(false);
        }
      }

      if (data.stop) {
        setStopReason(data.stop.reason || null);
        if (data.stop.is_stopped) {
          setSimulationRunning(false);
        }
      }

      // 2. Real Astronomical Sun Position (pvlib)
      const sunAz = (data.sun?.azimuth ?? data.solar?.azimuth);
      const sunEl = (data.sun?.elevation ?? data.solar?.elevation);
      if (typeof sunAz === 'number' && typeof sunEl === 'number') {
        setRawSunAzimuth(sunAz);
        setRawSunElevation(sunEl);
        // Map 0-360 azimuth to -180 to +180 for 3D Sun celestial sphere
        const mappedSunAz = sunAz > 180 ? sunAz - 360 : sunAz;
        setSunAzimuth(Number(mappedSunAz.toFixed(1)));
        setSunElevation(Number(Math.max(0, sunEl).toFixed(1)));
      }

      // 3. Independent Panel Position State (Section 5, 6, 7)
      if (data.panel) {
        const pAz = data.panel.estimated_azimuth ?? 180.0;
        const pEl = data.panel.elevation ?? 90.0;
        setEstimatedPanelAzimuth(pAz);
        setPanelElevationDeg(pEl);

        // Map to 3D Three.js assembly:
        // Azimuth: 0-360 -> -180 to +180
        const mappedPanelAz = pAz > 180 ? pAz - 360 : pAz;
        setAzimuth(Number(mappedPanelAz.toFixed(1)));
        // Positional servo 10° to 170° mapped to 3D visual tilt 0° to 80°
        const visualTilt = Math.max(0, Math.min(80, (pEl - 10) * (80.0 / 160.0)));
        setElevation(Number(visualTilt.toFixed(1)));
      }

      // 4. ML Target Panel Position
      const tAz = data.target?.azimuth ?? data.ml?.target_azimuth;
      const tEl = data.target?.elevation ?? data.ml?.target_elevation;
      if (typeof tAz === 'number' && typeof tEl === 'number') {
        setTargetPanelAzimuth(tAz);
        setTargetPanelElevation(tEl);
        const mappedTargetAz = tAz > 180 ? tAz - 360 : tAz;
        setTargetAzimuth(Number(mappedTargetAz.toFixed(1)));
        setElevationTarget(Number(tEl.toFixed(1)));
        setAiPredictedAzimuth(Number(tAz.toFixed(1)));
        setAiPredictedElevation(Number(tEl.toFixed(1)));
      }

      // 5. ML Model Predictions
      if (data.ml) {
        setAzimuthCorrection(data.ml.azimuth_correction ?? 0.0);
        setElevationCorrection(data.ml.elevation_correction ?? 0.0);
        setAiDecision(data.ml.decision || 'WAITING');
        setAiConfidence(data.ml.confidence ?? 95.0);
      }

      // 6. Actuators
      if (data.motors) {
        setMotorAzimuthStatus(data.motors.azimuth || 'STOP');
        setMotorElevationStatus(data.motors.elevation || 'HOLD');
        setMotorStatus(data.motors.azimuth && !data.motors.azimuth.includes('STOP') ? 'RUNNING' : 'IDLE');
        setServoStatus(data.motors.elevation && !data.motors.elevation.includes('HOLD') ? 'ACTIVE' : 'IDLE');
      }

      // 7. Sensor LDRs (Real data only, null if offline)
      if (data.system?.esp32_connected && data.ldr && data.ldr.top !== null) {
        setLdr({
          tl: data.ldr.top,
          tr: data.ldr.right,
          bl: data.ldr.left,
          br: data.ldr.bottom,
        });
      } else {
        setLdr({ tl: null, tr: null, bl: null, br: null });
      }

      // 8. Environment (Real DHT22 & Lux, null if offline)
      if (data.system?.esp32_connected && data.environment && data.environment.lux !== null) {
        const t = data.environment.temperature;
        const h = data.environment.humidity;
        const luxVal = data.environment.lux;
        setTemperature(t);
        setHumidity(h);
        setHeatIndex(t !== null && h !== null ? Number((t + 0.05 * h).toFixed(1)) : null);
        setSunIntensity(Math.min(1.5, Math.max(0.05, luxVal / 50000.0)));

        setBme680_1({
          temp: t,
          humidity: h,
          pressure: 1013.4,
          iaq: 38,
          gasResistance: 126.2,
        });
        setBme680_2({
          temp: t !== null ? Number((t + 0.2).toFixed(1)) : null,
          humidity: h !== null ? Number((h - 0.3).toFixed(1)) : null,
          pressure: 1013.2,
          iaq: 36,
          gasResistance: 129.5,
        });
      } else {
        setTemperature(null);
        setHumidity(null);
        setHeatIndex(null);
        setBme680_1({ temp: null, humidity: null, pressure: 1013.4, iaq: '--', gasResistance: '--' });
        setBme680_2({ temp: null, humidity: null, pressure: 1013.2, iaq: '--', gasResistance: '--' });
      }

      // 9. Electrical (Real INA260 Telemetry, null if offline)
      if (data.system?.esp32_connected && data.electrical && data.electrical.voltage !== null) {
        const v = data.electrical.voltage;
        const a = data.electrical.current;
        const w = data.electrical.power;
        const kwh = typeof data.electrical.energy_today === 'number'
          ? Number(data.electrical.energy_today.toFixed(4))
          : 0;

        setVoltage(v);
        setCurrent(a);
        setPower(w);
        setEnergyToday(kwh);
        setAiPredictedPower(Number((w || 0).toFixed(2)));

        try {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem(
            'solar_tracker_energy_today',
            JSON.stringify({ date: today, kwh, timestamp: Date.now() })
          );
        } catch (e) {}

        if (data.electrical.battery_soc !== undefined) setBattery(data.electrical.battery_soc);
        if (data.electrical.cell_voltages && Array.isArray(data.electrical.cell_voltages)) setCellVoltages(data.electrical.cell_voltages);
        if (data.electrical.bms_status) setBmsStatus(data.electrical.bms_status);
        if (data.electrical.lux_bracket) setLuxBracket(data.electrical.lux_bracket);
      } else {
        setVoltage(null);
        setCurrent(null);
        setPower(null);
        setLuxBracket(data.system?.esp32_connected ? 'Waiting...' : 'Waiting for ESP32...');
      }

      // 10. Push to historical charts
      if (data.system?.esp32_connected && data.electrical?.power !== null) {
        setHistoryData((prev) => {
          const point = {
            time: timeStr,
            tl: data.ldr?.top ?? 0,
            tr: data.ldr?.right ?? 0,
            bl: data.ldr?.left ?? 0,
            br: data.ldr?.bottom ?? 0,
            power: data.electrical?.power ?? 0,
            voltage: data.electrical?.voltage ?? 0,
            current: data.electrical?.current ?? 0,
          };
          const next = [...prev, point];
          return next.slice(-60);
        });
      }

      // 11. Add real UART serial logs
      if (data.system?.esp32_connected && data.electrical?.voltage !== null) {
        addSerialLog(
          `ESP32 Live | Lux: ${data.environment?.lux ?? 0} | Pwr: ${data.electrical?.power ?? 0}W | AI Corr: Az ${data.ml?.azimuth_correction > 0 ? '+' : ''}${data.ml?.azimuth_correction || 0}°, El ${data.ml?.elevation_correction > 0 ? '+' : ''}${data.ml?.elevation_correction || 0}° | Decision: ${data.ml?.decision || ''}`,
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

  // Operational Controls connected to real REST API
  const startTracking = useCallback(async () => {
    setSimulationRunning(true);
    setSimulationPaused(false);
    try {
      await trackerWS.startTracking();
      addSerialLog('REST API: Start tracking command sent -> AUTO MODE', 'action');
    } catch {
      addSerialLog('Failed to send start command to backend', 'warning');
    }
  }, [addSerialLog]);

  const stopTracking = useCallback(async () => {
    setSimulationRunning(false);
    setSimulationPaused(false);
    try {
      await trackerWS.stopTracking();
      addSerialLog('REST API: Stop command sent -> MOTORS HALTED', 'warning');
    } catch {}
  }, [addSerialLog]);

  const emergencyStop = useCallback(async () => {
    setSimulationRunning(false);
    setSimulationPaused(false);
    try {
      await trackerWS.emergencyStop();
      addSerialLog('REST API: EMERGENCY STOP ENGAGED -> ALL MOTORS FORCED STOP', 'warning');
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
    motorEnabled,
    systemStatusText,
    stopReason,
    simulationRunning,
    simulationPaused,
    trackingMode,
    setTrackingMode,
    threshold,
    setThreshold,
    // Independent Panel Position
    estimatedPanelAzimuth,
    panelElevationDeg,
    azimuth, // Mapped for 3D mechanism
    elevation, // Mapped for 3D mechanism
    // ML Target Panel Position
    targetPanelAzimuth,
    targetPanelElevation,
    targetAzimuth,
    targetElevation,
    setTargetAzimuth,
    setElevationTarget,
    // Real Astronomical Sun Ephemeris
    rawSunAzimuth,
    rawSunElevation,
    sunAzimuth,
    sunElevation,
    setSunAzimuth,
    setSunElevation,
    sunIntensity,
    setSunIntensity,
    sunTimeOfDay,
    setSunTimeOfDay,
    // ML Corrections
    azimuthCorrection,
    elevationCorrection,
    aiPredictedAzimuth,
    aiPredictedElevation,
    aiPredictedPower,
    aiConfidence,
    aiDecision,
    expectedGain,
    movementCost,
    // Motor Statuses
    motorAzimuthStatus,
    motorElevationStatus,
    motorStatus,
    servoStatus,
    limitSwitches,
    trackingEfficiency,
    // Sensors (Real data only, null if offline)
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
    luxBracket,
    tp4056Status,
    xl4015Output,
    esp32Status,
    rpi5Status,
    arduinoStatus,
    isCalibrating,
    calibrationProgress,
    // 3D Visual flags
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
    // Operational Controls
    startTracking,
    stopTracking,
    emergencyStop,
    startSimulation: startTracking,
    pauseSimulation: stopTracking,
    resetSimulation: stopTracking,
    manualJog,
    calibrateSensors,
    clearSerialLogs,
    addSerialLog,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
