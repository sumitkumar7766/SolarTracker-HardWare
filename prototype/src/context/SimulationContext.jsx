import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateLDRValues,
  getSunPanelAlignment,
  calculateHeatIndex,
} from '../utils/solarPhysics';

const SimulationContext = createContext(null);

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

export const SimulationProvider = ({ children }) => {
  // --- Operational State ---
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationPaused, setSimulationPaused] = useState(false);
  const [trackingMode, setTrackingMode] = useState('AUTO'); // 'AUTO' | 'MANUAL'
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
  const [sunTimeOfDay, setSunTimeOfDay] = useState(11.5);

  // --- Calibration State ---
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // --- Sensor Values ---
  const [ldr, setLdr] = useState({
    tl: 2130,
    tr: 1980,
    bl: 2050,
    br: 1900,
  });

  // DHT22 Atmospheric
  const [temperature, setTemperature] = useState(31.8);
  const [humidity, setHumidity] = useState(54.6);
  const [heatIndex, setHeatIndex] = useState(33.2);

  // 2x BME680 Environmental Telemetry
  const [bme680_1, setBme680_1] = useState({
    temp: 31.6,
    humidity: 54.2,
    pressure: 1013.8, // hPa
    iaq: 42, // Air Quality Index (0-500, 0-50 is Good)
    gasResistance: 124.5, // kOhms
  });
  const [bme680_2, setBme680_2] = useState({
    temp: 31.9,
    humidity: 53.8,
    pressure: 1013.6,
    iaq: 38,
    gasResistance: 131.2,
  });

  // Rain Drop Sensor
  const [rainState, setRainState] = useState('NO RAIN'); // 'NO RAIN' | 'LIGHT RAIN' | 'HEAVY RAIN'
  const [rainMoisture, setRainMoisture] = useState(140); // 0-4095 ADC (dry > 3500 or active < 1500)

  // INA219 Energy Telemetry
  const [voltage, setVoltage] = useState(12.48);
  const [current, setCurrent] = useState(1.35);
  const [power, setPower] = useState(16.85);
  const [energyToday, setEnergyToday] = useState(0.245);

  // 3S 18650 Battery Pack & Power Subsystem
  const [battery, setBattery] = useState(88.4);
  const [cellVoltages, setCellVoltages] = useState([4.12, 4.11, 4.13]); // 3 cells in series
  const [bmsStatus, setBmsStatus] = useState('NORMAL BALANCED');
  const [tp4056Status, setTp4056Status] = useState('STANDBY TRICKLE');
  const [xl4015Output, setXl4015Output] = useState({ voltage: 5.14, current: 2.18 });

  // Core Controllers Status
  const [esp32Status, setEsp32Status] = useState('ONLINE (FREERTOS)');
  const [rpi5Status, setRpi5Status] = useState('ONLINE (AI INFERENCE)');
  const [arduinoStatus, setArduinoStatus] = useState('STANDBY (IO EXPANDER)');

  // Mechanical Actuators & Limit Switches
  const [motorStatus, setMotorStatus] = useState('IDLE');
  const [servoStatus, setServoStatus] = useState('IDLE');
  const [limitSwitches, setLimitSwitches] = useState({
    azimuthMin: false,
    azimuthMax: false,
    elevationMin: false,
    elevationMax: false,
  });

  // Efficiency & AI
  const [trackingEfficiency, setTrackingEfficiency] = useState(93.2);
  const [aiPredictedAzimuth, setAiPredictedAzimuth] = useState(22);
  const [aiPredictedElevation, setAiPredictedElevation] = useState(48);
  const [aiPredictedPower, setAiPredictedPower] = useState(18.2);
  const [aiConfidence, setAiConfidence] = useState(94.2);
  const [aiDecision, setAiDecision] = useState('OPTIMAL ALIGNMENT');
  const [expectedGain, setExpectedGain] = useState(1.8);
  const movementCost = 0.28;

  // View & Interactive Digital Twin Features
  const [showLabels, setShowLabels] = useState(true);
  const [showSunPath, setShowSunPath] = useState(true);
  const [showElectronics, setShowElectronics] = useState(false);
  const [isExplodedView, setIsExplodedView] = useState(false);
  const [showDataFlow, setShowDataFlow] = useState(false);
  const [showPowerFlow, setShowPowerFlow] = useState(false);
  const [hardwareFilter, setHardwareFilter] = useState('ALL'); // 'ALL' | 'SENSORS' | 'CONTROLLERS' | 'MOTORS' | 'POWER' | 'DISPLAY' | 'MECHANICAL'
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  const [cameraPreset, setCameraPreset] = useState('PERSPECTIVE');
  const [focusedComponentId, setFocusedComponentId] = useState(null);

  // Historical Time-Series (capped at 50)
  const [historyData, setHistoryData] = useState(() => {
    const initial = [];
    const now = new Date();
    for (let i = 20; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 1000);
      initial.push({
        time: t.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        tl: 2100 + Math.sin(i) * 30,
        tr: 1970 + Math.cos(i) * 25,
        bl: 2040 + Math.sin(i) * 20,
        br: 1910 + Math.cos(i) * 30,
        power: 16.5 + Math.sin(i * 0.5) * 0.4,
        voltage: 12.45,
        current: 1.32,
      });
    }
    return initial;
  });

  // Serial Monitor Logs
  const [serialLogs, setSerialLogs] = useState([
    { id: 1, timestamp: '10:25:00', text: 'ESP32-WROOM-32 Bootloader v4.2.1 initialized', type: 'system' },
    { id: 2, timestamp: '10:25:01', text: 'Raspberry Pi 5 AI Gateway linked via UART @ 921600 Baud', type: 'ai' },
    { id: 3, timestamp: '10:25:01', text: 'Arduino Mega 2560 linked: 54 GPIO Extender ready', type: 'system' },
    { id: 4, timestamp: '10:25:01', text: 'I2C Bus Scan: INA219 (0x40), BME680 #1 (0x76), BME680 #2 (0x77), OLED x2 [OK]', type: 'sensor' },
    { id: 5, timestamp: '10:25:02', text: 'Power Bus: 3S 18650 Pack (12.35V) | 3S BMS Normal | XL4015 5.14V Rail Active', type: 'power' },
    { id: 6, timestamp: '10:25:02', text: 'Safety: Dual-Axis Roller Limit Switches Armed.', type: 'ready' },
  ]);

  const addSerialLog = useCallback((text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setSerialLogs((prev) => {
      const next = [...prev, { id: Date.now() + Math.random(), timestamp, text, type }];
      return next.slice(-120);
    });
  }, []);

  // Simulation Controls
  const startSimulation = useCallback(() => {
    setSimulationRunning(true);
    setSimulationPaused(false);
    addSerialLog('SIMULATION STARTED: Dual-axis auto tracking & Edge-AI engaged.', 'action');
  }, [addSerialLog]);

  const pauseSimulation = useCallback(() => {
    setSimulationPaused((prev) => {
      const next = !prev;
      addSerialLog(next ? 'SIMULATION PAUSED: All motor drivers held.' : 'SIMULATION RESUMED.', 'warning');
      return next;
    });
  }, [addSerialLog]);

  const resetSimulation = useCallback(() => {
    setSimulationRunning(false);
    setSimulationPaused(false);
    setAzimuth(0);
    setElevation(30);
    setTargetAzimuth(0);
    setElevationTarget(30);
    setSunAzimuth(18);
    setSunElevation(45);
    setSunTimeOfDay(11.5);
    setSunIntensity(1.0);
    setBattery(88.0);
    setEnergyToday(0.245);
    setMotorStatus('IDLE');
    setServoStatus('IDLE');
    setRainState('NO RAIN');
    setRainMoisture(140);
    setLimitSwitches({ azimuthMin: false, azimuthMax: false, elevationMin: false, elevationMax: false });
    setLdr({ tl: 2130, tr: 1980, bl: 2050, br: 1900 });
    addSerialLog('SYSTEM RESET: Default angles restored. Telemetry reset.', 'system');
  }, [addSerialLog]);

  const manualJog = useCallback(
    (axis, direction, step = 4) => {
      if (trackingMode !== 'MANUAL') return;

      if (axis === 'azimuth') {
        setTargetAzimuth((prev) => {
          const next = Math.max(-90, Math.min(90, prev + direction * step));
          addSerialLog(`MANUAL JOG: Azimuth target -> ${next.toFixed(1)}°`, 'action');
          return next;
        });
      } else if (axis === 'elevation') {
        setElevationTarget((prev) => {
          const next = Math.max(0, Math.min(80, prev + direction * step));
          addSerialLog(`MANUAL JOG: Elevation target -> ${next.toFixed(1)}°`, 'action');
          return next;
        });
      }
    },
    [trackingMode, addSerialLog]
  );

  const calibrateSensors = useCallback(() => {
    if (isCalibrating) return;
    setIsCalibrating(true);
    setCalibrationProgress(0);
    addSerialLog('CALIBRATION: Sampling 4x LDR and dual BME680 sensor baselines...', 'action');

    const interval = setInterval(() => {
      setCalibrationProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsCalibrating(false);
          addSerialLog('CALIBRATION COMPLETE: ADC offsets balanced. Deadband trimmed.', 'ready');
          return 100;
        }
        return p + 20;
      });
    }, 350);
  }, [isCalibrating, addSerialLog]);

  const clearSerialLogs = useCallback(() => {
    setSerialLogs([]);
  }, []);

  const focusComponent = useCallback((componentId) => {
    setFocusedComponentId(componentId);
    setShowElectronics(true); // ensure interior is clearly visible
  }, []);

  // Main Simulation Physics & Tracking Loop (60ms tick)
  const lastTimeRef = useRef(Date.now());
  const logThrottleRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // 1. Smoothly interpolate tracker angles toward target
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

      // Limit switch trigger checks
      setLimitSwitches({
        azimuthMin: azimuth <= -89.0,
        azimuthMax: azimuth >= 89.0,
        elevationMin: elevation <= 0.5,
        elevationMax: elevation >= 79.5,
      });

      // Motor & Servo active states
      const azMoving = Math.abs(azimuth - targetAzimuth) > 0.3;
      const elMoving = Math.abs(elevation - targetElevation) > 0.3;
      setMotorStatus(azMoving ? 'RUNNING' : 'IDLE');
      setServoStatus(elMoving ? 'ACTIVE' : 'IDLE');

      // 2. If simulation running and not paused
      if (simulationRunning && !simulationPaused) {
        // Diurnal sun movement
        setSunTimeOfDay((prev) => {
          let next = prev + dt * 0.08;
          if (next > 17.5) next = 6.5;

          const solarFraction = (next - 6) / 12;
          const calculatedSunAz = -80 + solarFraction * 160;
          const calculatedSunEl = 15 + Math.sin(solarFraction * Math.PI) * 60;

          setSunAzimuth(Number(calculatedSunAz.toFixed(1)));
          setSunElevation(Number(calculatedSunEl.toFixed(1)));
          return next;
        });

        // 3. Compute 4-LDR Readings
        const newLdrs = calculateLDRValues(sunAzimuth, sunElevation, azimuth, elevation, sunIntensity);
        setLdr(newLdrs);

        // 4. Auto Tracking Controller
        if (trackingMode === 'AUTO') {
          const left = newLdrs.tl + newLdrs.bl;
          const right = newLdrs.tr + newLdrs.br;
          const top = newLdrs.tl + newLdrs.tr;
          const bottom = newLdrs.bl + newLdrs.br;

          const horizontalError = left - right;
          const verticalError = top - bottom;

          let newTargetAz = targetAzimuth;
          let newTargetEl = targetElevation;
          let moved = false;

          if (Math.abs(horizontalError) > threshold) {
            const step = Math.sign(horizontalError) * Math.min(1.2, Math.abs(horizontalError) * 0.003);
            newTargetAz = Math.max(-90, Math.min(90, targetAzimuth - step));
            moved = true;
          }

          if (Math.abs(verticalError) > threshold) {
            const step = Math.sign(verticalError) * Math.min(1.2, Math.abs(verticalError) * 0.003);
            newTargetEl = Math.max(0, Math.min(80, targetElevation + step));
            moved = true;
          }

          if (moved) {
            setTargetAzimuth(newTargetAz);
            setElevationTarget(newTargetEl);
          }
        }

        // 5. Physics & Power Model (INA219)
        const alignment = getSunPanelAlignment(sunAzimuth, sunElevation, azimuth, elevation);
        const eff = Number((alignment * 100).toFixed(1));
        setTrackingEfficiency(eff);

        const maxWatts = 22.0;
        const tempDerating = 1 - (temperature - 25) * 0.004;
        const calcPower = Number(Math.max(0.2, maxWatts * alignment * sunIntensity * tempDerating).toFixed(2));
        setPower(calcPower);

        const calcVoltage = Number((12.1 + (calcPower / maxWatts) * 0.65 + (Math.random() - 0.5) * 0.04).toFixed(2));
        setVoltage(calcVoltage);

        const calcCurrent = Number((calcPower / calcVoltage).toFixed(2));
        setCurrent(calcCurrent);

        // Update 3S cell voltages
        const cellAvg = calcVoltage / 3;
        setCellVoltages([
          Number((cellAvg + 0.01).toFixed(2)),
          Number((cellAvg - 0.01).toFixed(2)),
          Number(cellAvg.toFixed(2)),
        ]);

        // XL4015 Buck Converter output (5V rail for Raspberry Pi 5 & Displays)
        setXl4015Output({
          voltage: Number((5.12 + (Math.random() - 0.5) * 0.04).toFixed(2)),
          current: Number((1.95 + (calcPower / maxWatts) * 0.4).toFixed(2)),
        });

        // Integrate Energy Today (kWh)
        setEnergyToday((prev) => Number((prev + (calcPower * dt) / 3600000).toFixed(4)));

        // Battery State of Charge
        setBattery((prev) => {
          const delta = calcPower > 5 ? 0.0015 * dt : -0.001 * dt;
          return Number(Math.max(10, Math.min(100, prev + delta)).toFixed(2));
        });

        // 6. Environmental Sensors (DHT22, BME680 #1 & #2, Rain)
        const envTemp = Number((28.5 + sunIntensity * 3.5 + Math.sin(now / 15000) * 0.8).toFixed(1));
        const envHum = Number((58.0 - sunIntensity * 7.0 + Math.cos(now / 18000) * 1.2).toFixed(1));
        setTemperature(envTemp);
        setHumidity(envHum);
        setHeatIndex(calculateHeatIndex(envTemp, envHum));

        // Dual BME680 variations
        setBme680_1({
          temp: envTemp,
          humidity: envHum,
          pressure: Number((1013.6 + Math.sin(now / 30000) * 0.6).toFixed(1)),
          iaq: Math.round(38 + Math.random() * 6),
          gasResistance: Number((122 + Math.random() * 5).toFixed(1)),
        });
        setBme680_2({
          temp: Number((envTemp + 0.3).toFixed(1)),
          humidity: Number((envHum - 0.4).toFixed(1)),
          pressure: Number((1013.5 + Math.sin(now / 30000) * 0.6).toFixed(1)),
          iaq: Math.round(35 + Math.random() * 5),
          gasResistance: Number((128 + Math.random() * 6).toFixed(1)),
        });

        // Rain sensor moisture based on simulated state
        if (rainState === 'NO RAIN') {
          setRainMoisture(3800 + Math.round((Math.random() - 0.5) * 50));
        } else if (rainState === 'LIGHT RAIN') {
          setRainMoisture(1450 + Math.round((Math.random() - 0.5) * 80));
        } else if (rainState === 'HEAVY RAIN') {
          setRainMoisture(650 + Math.round((Math.random() - 0.5) * 60));
        }

        // 7. AI Prediction (Simulated RPi 5 model)
        const idealAz = sunAzimuth;
        const idealEl = sunElevation;
        setAiPredictedAzimuth(Number(idealAz.toFixed(1)));
        setAiPredictedElevation(Number(idealEl.toFixed(1)));

        const potentialPower = Number(Math.max(0.2, maxWatts * 1.0 * sunIntensity * tempDerating).toFixed(2));
        setAiPredictedPower(potentialPower);

        const gain = Math.max(0, Number((potentialPower - calcPower).toFixed(2)));
        setExpectedGain(gain);

        const conf = Number((91 + alignment * 7.5 + (Math.random() - 0.5) * 0.8).toFixed(1));
        setAiConfidence(Math.min(99.4, conf));

        if (gain > movementCost && (Math.abs(azimuth - idealAz) > 3 || Math.abs(elevation - idealEl) > 3)) {
          if (Math.abs(azimuth - idealAz) > Math.abs(elevation - idealEl)) {
            setAiDecision(azimuth < idealAz ? 'MOVE RIGHT (+Azimuth)' : 'MOVE LEFT (-Azimuth)');
          } else {
            setAiDecision(elevation < idealEl ? 'TILT UP (+Elevation)' : 'TILT DOWN (-Elevation)');
          }
        } else {
          setAiDecision('HOLD POSITION (OPTIMAL EFFICIENCY)');
        }

        // 8. Periodic Serial Output & History Push (every ~1 sec)
        if (now - logThrottleRef.current > 1100) {
          logThrottleRef.current = now;

          const timeStr = new Date().toLocaleTimeString([], { hour12: false });
          setHistoryData((prev) => {
            const next = [
              ...prev,
              {
                time: timeStr,
                tl: newLdrs.tl,
                tr: newLdrs.tr,
                bl: newLdrs.bl,
                br: newLdrs.br,
                power: calcPower,
                voltage: calcVoltage,
                current: calcCurrent,
                efficiency: eff,
              },
            ];
            return next.slice(-45);
          });

          const logSample = Math.random();
          if (logSample < 0.25) {
            addSerialLog(
              `LDR Array: TL:${newLdrs.tl} | TR:${newLdrs.tr} | BL:${newLdrs.bl} | BR:${newLdrs.br} (Diff H:${(newLdrs.tl + newLdrs.bl) - (newLdrs.tr + newLdrs.br)})`,
              'sensor'
            );
          } else if (logSample < 0.5) {
            addSerialLog(`INA219: ${calcVoltage}V | ${calcCurrent}A | ${calcPower}W (Eff: ${eff}%)`, 'power');
          } else if (logSample < 0.75) {
            addSerialLog(`RPi5 Edge-AI: Decision -> ${aiDecision} [Expected Gain: +${gain}W]`, 'ai');
          } else {
            addSerialLog(`BME680 #1: ${bme680_1.temp}°C | ${bme680_1.humidity}% | ${bme680_1.pressure}hPa | IAQ:${bme680_1.iaq}`, 'sensor');
          }
        }
      } else {
        // Idle updates
        const newLdrs = calculateLDRValues(sunAzimuth, sunElevation, azimuth, elevation, sunIntensity);
        setLdr(newLdrs);
        const alignment = getSunPanelAlignment(sunAzimuth, sunElevation, azimuth, elevation);
        setTrackingEfficiency(Number((alignment * 100).toFixed(1)));
        const maxWatts = 22.0;
        const calcPower = Number(Math.max(0.1, maxWatts * alignment * sunIntensity).toFixed(2));
        setPower(calcPower);
        const calcVoltage = Number((12.1 + (calcPower / maxWatts) * 0.65).toFixed(2));
        setVoltage(calcVoltage);
        setCurrent(Number((calcPower / calcVoltage).toFixed(2)));
      }
    }, 60);

    return () => clearInterval(timer);
  }, [
    simulationRunning,
    simulationPaused,
    trackingMode,
    threshold,
    azimuth,
    elevation,
    targetAzimuth,
    targetElevation,
    sunAzimuth,
    sunElevation,
    sunIntensity,
    temperature,
    aiDecision,
    rainState,
    addSerialLog,
  ]);

  const value = {
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
