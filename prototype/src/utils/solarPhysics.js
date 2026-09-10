// Physics, geometry and solar calculations

/**
 * Convert degrees to radians
 */
export const degToRad = (deg) => (deg * Math.PI) / 180;

/**
 * Convert radians to degrees
 */
export const radToDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Calculate 3D Cartesian coordinates for Sun from Azimuth (-90 to +90) and Elevation (0 to 90)
 * Radius default is 14 units
 */
export const getSunPosition = (azimuthDeg, elevationDeg, radius = 14) => {
  const azRad = degToRad(azimuthDeg);
  const elRad = degToRad(elevationDeg);

  // In Three.js: Y is up, X is right/left (Azimuth), -Z is forward/north
  const y = Math.max(1, radius * Math.sin(elRad));
  const cosEl = radius * Math.cos(elRad);
  const x = cosEl * Math.sin(azRad);
  const z = -cosEl * Math.cos(azRad);

  return [x, y, z];
};

/**
 * Calculate normal vector for solar panel given current Azimuth and Elevation
 */
export const getPanelNormal = (azimuthDeg, elevationDeg) => {
  const azRad = degToRad(azimuthDeg);
  const elRad = degToRad(elevationDeg);

  const ny = Math.sin(elRad);
  const cosEl = Math.cos(elRad);
  const nx = cosEl * Math.sin(azRad);
  const nz = -cosEl * Math.cos(azRad);

  return [nx, ny, nz];
};

/**
 * Calculate cosine alignment (dot product) between normalized Sun vector and Panel normal
 */
export const getSunPanelAlignment = (sunAzimuth, sunElevation, panelAzimuth, panelElevation) => {
  const [sx, sy, sz] = getSunPosition(sunAzimuth, sunElevation, 1);
  const [nx, ny, nz] = getPanelNormal(panelAzimuth, panelElevation);

  // Dot product
  const dot = sx * nx + sy * ny + sz * nz;
  return Math.max(0, Math.min(1, dot));
};

/**
 * Compute simulated 4-LDR sensor readings (TL, TR, BL, BR)
 * 12-bit ADC range: ~1000 (ambient) to ~2800 (direct sunlight)
 */
export const calculateLDRValues = (sunAzimuth, sunElevation, panelAzimuth, panelElevation, intensity = 1.0) => {
  const alignment = getSunPanelAlignment(sunAzimuth, sunElevation, panelAzimuth, panelElevation);
  
  // Angular differences
  const diffAzimuth = sunAzimuth - panelAzimuth; // positive means sun is to the East/Right
  const diffElevation = sunElevation - panelElevation; // positive means sun is Higher/Top

  // Base illumination derived from direct normal component and ambient diffuse light
  const baseADC = 900 + 1200 * intensity * Math.pow(alignment, 1.2);

  // Differential sensitivity factor (ADC counts per degree of misalignment)
  const sensitivity = 16.5 * intensity;

  // Small organic high-frequency noise
  const noise = () => (Math.random() - 0.5) * 8;

  // LDR positions relative to center:
  // TL: Left (-), Top (+)
  // TR: Right (+), Top (+)
  // BL: Left (-), Bottom (-)
  // BR: Right (+), Bottom (-)
  // When sun is to the right (diffAzimuth > 0), TR and BR receive more light
  // When sun is higher (diffElevation > 0), TL and TR receive more light
  const horizBias = diffAzimuth * sensitivity;
  const vertBias = diffElevation * sensitivity;

  const tl = Math.round(Math.max(400, Math.min(4095, baseADC - horizBias + vertBias + noise())));
  const tr = Math.round(Math.max(400, Math.min(4095, baseADC + horizBias + vertBias + noise())));
  const bl = Math.round(Math.max(400, Math.min(4095, baseADC - horizBias - vertBias + noise())));
  const br = Math.round(Math.max(400, Math.min(4095, baseADC + horizBias - vertBias + noise())));

  return { tl, tr, bl, br };
};

/**
 * Compute simulated Heat Index from Temperature (°C) and Relative Humidity (%)
 */
export const calculateHeatIndex = (tempC, humidity) => {
  // Simplified Steadman's / Rothfusz formula for Celsius
  const t = (tempC * 9) / 5 + 32; // Fahrenheit
  const h = humidity;
  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * h -
    0.22475541 * t * h -
    0.00683783 * t * t -
    0.05481717 * h * h +
    0.00122874 * t * t * h +
    0.00085282 * t * h * h -
    0.00000199 * t * t * h * h;
  const hiC = ((hi - 32) * 5) / 9;
  return Math.max(tempC, Number(hiC.toFixed(1)));
};
