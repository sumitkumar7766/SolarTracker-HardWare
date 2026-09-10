// Helios-AI Dual-Axis Tracker Real-Time Dashboard Client

const WS_URL = `ws://${window.location.hostname || "127.0.0.1"}:8000/ws`;
const API_BASE = `http://${window.location.hostname || "127.0.0.1"}:8000`;

let socket = null;
let currentMode = "AUTO";

// Real-Time Charts History Configuration
const MAX_HISTORY_POINTS = 150;
let chartAngles, chartCorrections, chartPower, chartErrors;

function initCharts() {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        display: false
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8", font: { size: 10 } }
      }
    },
    plugins: {
      legend: {
        labels: { color: "#94a3b8", font: { size: 11 } }
      }
    }
  };

  // 1. Angles Chart
  chartAngles = new Chart(document.getElementById("chartAngles"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "Solar Azimuth (°)", data: [], borderColor: "#38bdf8", borderWidth: 1.5, pointRadius: 0 },
        { label: "Target Azimuth (°)", data: [], borderColor: "#0284c7", borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 },
        { label: "Solar Elevation (°)", data: [], borderColor: "#22c55e", borderWidth: 1.5, pointRadius: 0 },
        { label: "Target Elevation (°)", data: [], borderColor: "#16a34a", borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 }
      ]
    },
    options: commonOptions
  });

  // 2. Corrections Chart
  chartCorrections = new Chart(document.getElementById("chartCorrections"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "Azimuth Correction ΔAz (°)", data: [], borderColor: "#38bdf8", borderWidth: 2, pointRadius: 0 },
        { label: "Elevation Correction ΔEl (°)", data: [], borderColor: "#22c55e", borderWidth: 2, pointRadius: 0 }
      ]
    },
    options: commonOptions
  });

  // 3. Power & Lux Chart
  chartPower = new Chart(document.getElementById("chartPower"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "Instant Power (W)", data: [], borderColor: "#f97316", borderWidth: 2, pointRadius: 0 },
        { label: "Lux (×1000)", data: [], borderColor: "#eab308", borderWidth: 1.5, pointRadius: 0 }
      ]
    },
    options: commonOptions
  });

  // 4. LDR Errors Chart
  chartErrors = new Chart(document.getElementById("chartErrors"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "Horizontal Error (Right - Left)", data: [], borderColor: "#06b6d4", borderWidth: 1.5, pointRadius: 0 },
        { label: "Vertical Error (Top - Bottom)", data: [], borderColor: "#c084fc", borderWidth: 1.5, pointRadius: 0 }
      ]
    },
    options: commonOptions
  });
}

function updateChartSeries(chart, label, values) {
  chart.data.labels.push(label);
  values.forEach((v, idx) => {
    chart.data.datasets[idx].data.push(v);
  });

  if (chart.data.labels.length > MAX_HISTORY_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.update("none");
}

// WebSocket Management
function connectWebSocket() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    const badge = document.getElementById("connectionBadge");
    const text = document.getElementById("connectionText");
    badge.querySelector(".status-dot").className = "status-dot connected";
    text.innerText = "ONLINE (WS)";
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      renderDashboard(data);
    } catch (err) {
      console.error("Failed to parse websocket message:", err);
    }
  };

  socket.onclose = () => {
    const badge = document.getElementById("connectionBadge");
    const text = document.getElementById("connectionText");
    badge.querySelector(".status-dot").className = "status-dot disconnected";
    text.innerText = "DISCONNECTED";
    setTimeout(connectWebSocket, 2000);
  };

  socket.onerror = () => {
    if (socket) socket.close();
  };
}

// Render Incoming Real-Time Data to UI
function renderDashboard(data) {
  // 1. Status Banner
  const statusPill = document.getElementById("systemStatusPill");
  const bannerTitle = document.getElementById("bannerTitle");
  const bannerReason = document.getElementById("bannerReason");
  const espStatusVal = document.getElementById("espStatusVal");
  const modelStatusVal = document.getElementById("modelStatusVal");
  const lastUpdateVal = document.getElementById("lastUpdateVal");

  statusPill.innerText = data.system_status;
  statusPill.className = "banner-pill " + data.system_status.toLowerCase().replace(/\s+/g, "-");

  bannerTitle.innerText = `STATUS: ${data.system_status}`;
  bannerReason.innerText = data.stop.is_stopped
    ? `STOPPED / HOLDING: ${data.stop.reason || "Panel aligned within deadbands."}`
    : `ACTIVE TRACKING: Dual-axis ML adjustment in progress.`;

  espStatusVal.innerText = data.esp32_connected ? "CONNECTED" : "DISCONNECTED";
  espStatusVal.style.color = data.esp32_connected ? "#22c55e" : "#ef4444";

  modelStatusVal.innerText = data.model_loaded ? "LOADED (GBR)" : "FAILED";
  modelStatusVal.style.color = data.model_loaded ? "#22c55e" : "#ef4444";

  lastUpdateVal.innerText = data.timestamp;

  // 2. Sun & Baseline Position
  document.getElementById("sunAzimuth").innerText = `${data.solar.azimuth.toFixed(2)}°`;
  document.getElementById("sunElevation").innerText = `${data.solar.elevation.toFixed(2)}°`;
  document.getElementById("baselineAzimuth").innerText = `${data.baseline.azimuth.toFixed(2)}°`;
  document.getElementById("baselineElevation").innerText = `${data.baseline.elevation.toFixed(2)}°`;

  // 3. ML Predictions
  const azCorr = data.ml.azimuth_correction;
  const elCorr = data.ml.elevation_correction;
  document.getElementById("mlAzCorrection").innerText = `${azCorr >= 0 ? "+" : ""}${azCorr.toFixed(2)}°`;
  document.getElementById("mlElCorrection").innerText = `${elCorr >= 0 ? "+" : ""}${elCorr.toFixed(2)}°`;
  document.getElementById("targetAzimuth").innerText = `${data.ml.target_azimuth.toFixed(2)}°`;
  document.getElementById("targetElevation").innerText = `${data.ml.target_elevation.toFixed(2)}°`;

  // 4. Alignment Visual Ray Transforms
  document.getElementById("visSolarAng").innerText = `Az: ${data.solar.azimuth.toFixed(1)}° | El: ${data.solar.elevation.toFixed(1)}°`;
  document.getElementById("visCorrAng").innerText = `ΔAz: ${azCorr >= 0 ? "+" : ""}${azCorr.toFixed(2)}° | ΔEl: ${elCorr >= 0 ? "+" : ""}${elCorr.toFixed(2)}°`;
  document.getElementById("visTargetAng").innerText = `Az: ${data.ml.target_azimuth.toFixed(1)}° | El: ${data.ml.target_elevation.toFixed(1)}°`;

  // Rotate compass baseline ray and target ray
  const baselineAngle = data.baseline.azimuth;
  const targetAngle = data.ml.target_azimuth;
  document.getElementById("baselineRay").setAttribute("transform", `rotate(${baselineAngle}, 120, 120)`);
  document.getElementById("targetRay").setAttribute("transform", `rotate(${targetAngle}, 120, 120)`);

  // Position Sun marker on compass perimeter according to elevation & azimuth
  const rad = (data.solar.azimuth - 90) * (Math.PI / 180);
  const distance = Math.max(10, 100 * (1 - Math.max(0, data.solar.elevation) / 90));
  const sunX = 120 + distance * Math.cos(rad);
  const sunY = 120 + distance * Math.sin(rad);
  document.getElementById("sunMarker").setAttribute("transform", `translate(${sunX}, ${sunY})`);

  // 5. Motor Actions Box
  const azActionVal = document.getElementById("azActionVal");
  const elActionVal = document.getElementById("elActionVal");
  azActionVal.innerText = data.motors.azimuth;
  elActionVal.innerText = data.motors.elevation;

  azActionVal.style.color = data.motors.azimuth === "STOP" ? "#94a3b8" : "#38bdf8";
  elActionVal.style.color = data.motors.elevation === "HOLD" || data.motors.elevation === "STOP" ? "#94a3b8" : "#22c55e";

  document.getElementById("azMotorStateText").innerText = `${data.motors.azimuth} (${data.motors.azimuth_command} µs)`;
  document.getElementById("elMotorStateText").innerText = `${data.motors.elevation} (${data.motors.elevation_angle}°)`;

  // 6. LDR Values
  document.getElementById("ldrTop").innerText = data.ldr.top;
  document.getElementById("ldrBottom").innerText = data.ldr.bottom;
  document.getElementById("ldrLeft").innerText = data.ldr.left;
  document.getElementById("ldrRight").innerText = data.ldr.right;

  document.getElementById("hError").innerText = data.ldr.horizontal_error;
  document.getElementById("vError").innerText = data.ldr.vertical_error;
  document.getElementById("hNorm").innerText = data.ldr.horizontal_normalized.toFixed(3);
  document.getElementById("vNorm").innerText = data.ldr.vertical_normalized.toFixed(3);

  const balIndicator = document.getElementById("ldrBalanceIndicator");
  const isLdrBalanced = Math.abs(data.ldr.horizontal_normalized) <= 0.08 && Math.abs(data.ldr.vertical_normalized) <= 0.08;
  if (isLdrBalanced) {
    balIndicator.innerText = "BALANCED";
    balIndicator.style.color = "#22c55e";
    balIndicator.style.background = "rgba(34, 197, 94, 0.15)";
  } else {
    balIndicator.innerText = "OFFSET";
    balIndicator.style.color = "#f97316";
    balIndicator.style.background = "rgba(249, 115, 22, 0.15)";
  }

  // 7. Electrical
  document.getElementById("busVoltage").innerText = `${data.electrical.voltage.toFixed(2)} V`;
  document.getElementById("panelCurrent").innerText = `${data.electrical.current.toFixed(3)} A`;
  document.getElementById("instantPower").innerText = `${data.electrical.power.toFixed(2)} W`;

  // 8. Environment
  document.getElementById("envLux").innerText = `${data.environment.lux.toFixed(0)} Lux`;
  document.getElementById("envTemp").innerText = `${data.environment.temperature.toFixed(1)} °C`;
  document.getElementById("envHum").innerText = `${data.environment.humidity.toFixed(1)} %`;
  document.getElementById("envLightStatus").innerText = `STATUS: ${data.environment.light_status}`;

  // 9. Charts Update
  const timeLabel = data.timestamp.split(" ")[1] || "";
  updateChartSeries(chartAngles, timeLabel, [data.solar.azimuth, data.ml.target_azimuth, data.solar.elevation, data.ml.target_elevation]);
  updateChartSeries(chartCorrections, timeLabel, [azCorr, elCorr]);
  updateChartSeries(chartPower, timeLabel, [data.electrical.power, data.environment.lux / 1000.0]);
  updateChartSeries(chartErrors, timeLabel, [data.ldr.horizontal_error, data.ldr.vertical_error]);
}

// Mode & Manual Actions
async function setMode(mode) {
  currentMode = mode;
  document.getElementById("btnAuto").className = mode === "AUTO" ? "mode-btn active" : "mode-btn";
  document.getElementById("btnManual").className = mode === "MANUAL" ? "mode-btn active" : "mode-btn";
  document.getElementById("manualControlsPanel").style.display = mode === "MANUAL" ? "block" : "none";

  try {
    await fetch(`${API_BASE}/api/tracker/mode/${mode}`, { method: "POST" });
  } catch (err) {
    console.error("Error setting mode:", err);
  }
}

async function emergencyStop() {
  try {
    await fetch(`${API_BASE}/api/motors/stop`, { method: "POST" });
  } catch (err) {
    console.error("Emergency stop failed:", err);
  }
}

async function sendJog(endpoint) {
  try {
    if (endpoint === "stop") {
      await fetch(`${API_BASE}/api/motors/stop`, { method: "POST" });
    } else {
      await fetch(`${API_BASE}/api/motors/${endpoint}`, { method: "POST" });
    }
  } catch (err) {
    console.error("Jog command failed:", err);
  }
}

// Initial Boot
window.addEventListener("DOMContentLoaded", () => {
  initCharts();
  connectWebSocket();
});
