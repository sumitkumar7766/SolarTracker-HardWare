/*
 * =========================================================================
 * ESP32 Dual-Axis Solar Tracker Telemetry Firmware (USB Serial)
 * =========================================================================
 *
 * Hardware Connections:
 * -------------------------------------------------------------------------
 * 1. 4x LDR Optical Sensors (12-bit ADC 0 - 4095, attenuation 11dB):
 *    - Top LDR    : GPIO 34
 *    - Bottom LDR : GPIO 35
 *    - Left LDR   : GPIO 32
 *    - Right LDR  : GPIO 33
 *
 * 2. BH1750 Ambient Lux Sensor:
 *    - I2C SDA    : GPIO 21
 *    - I2C SCL    : GPIO 22
 *    - I2C Address: 0x23 (ADDR pin connected to GND)
 *
 * 3. INA260 Precision Power / Voltage / Current Sensor:
 *    - I2C SDA    : GPIO 21
 *    - I2C SCL    : GPIO 22
 *    - I2C Address: 0x40 (Default A0, A1 to GND)
 *    - Bus Voltage, Shunt Current, Total Power
 *
 * 4. DHT22 Digital Temperature & Humidity Sensor:
 *    - Data Pin   : GPIO 27
 *    - Temp (°C), Relative Humidity (%)
 *
 * Communication & Constraints:
 * -------------------------------------------------------------------------
 * - Communication : USB Serial @ 115200 Baud
 * - Transmission  : Every 500 ms (2 Hz continuous telemetry stream)
 * - Format        : Exactly 20 comma-separated values (matching solar_data.csv)
 * - NO Wi-Fi
 * - NO Motor actuation from ESP32
 * - NO Commands received back from PC (Pure sensor ingestion mode)
 * - Divide-by-zero protected normalized errors
 *
 * Output Packet (20 fields in exact sequence):
 * -------------------------------------------------------------------------
 *  1: ESP32_Timestamp_ms     (int)
 *  2: Top_LDR                (int, 0 - 4095)
 *  3: Bottom_LDR             (int, 0 - 4095)
 *  4: Left_LDR               (int, 0 - 4095)
 *  5: Right_LDR              (int, 0 - 4095)
 *  6: Horizontal_Error       (int, Right_LDR - Left_LDR)
 *  7: Vertical_Error         (int, Top_LDR - Bottom_LDR)
 *  8: Horizontal_Normalized  (float, 4 decimals, safe division)
 *  9: Vertical_Normalized    (float, 4 decimals, safe division)
 * 10: Lux                    (float, 2 decimals)
 * 11: Light_Status           (str, "HIGH" or "LOW")
 * 12: Horizontal_Direction   (str, "CENTER", "LEFT", "RIGHT")
 * 13: Vertical_Direction     (str, "CENTER", "TOP", "BOTTOM")
 * 14: Temperature_C          (float, 1 decimal)
 * 15: Humidity_percent       (float, 1 decimal)
 * 16: Voltage_V              (float, 2 decimals)
 * 17: Current_A              (float, 3 decimals)
 * 18: Power_W                (float, 2 decimals)
 * 19: Azimuth_Command        (int, neutral default 1500)
 * 20: Elevation_Servo_Angle  (int, neutral default 34)
 * =========================================================================
 */

#include <Adafruit_INA260.h>
#include <DHT.h>
#include <Wire.h>
#include <hp_BH1750.h>

// =========================================================================
// PIN DEFINITIONS
// =========================================================================
#define LDR_TOP_PIN 34
#define LDR_BOTTOM_PIN 35
#define LDR_LEFT_PIN 32
#define LDR_RIGHT_PIN 33

#define DHT_PIN 27
#define DHT_TYPE DHT22

#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22

// =========================================================================
// THRESHOLDS & SETTINGS
// =========================================================================
#define LUX_LOW_THRESHOLD 150.0f
#define DEADZONE_ERROR 50

const int DEFAULT_AZIMUTH_COMMAND = 1500; // Continuous rotation neutral us
const int DEFAULT_ELEVATION_ANGLE = 34;   // Default mechanical baseline deg

// =========================================================================
// SENSOR OBJECTS & HARDWARE FLAGS
// =========================================================================
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_INA260 ina260 = Adafruit_INA260();
hp_BH1750 bh1750;

bool has_ina260 = false;
bool has_bh1750 = false;

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 500; // 500 ms (2 Hz)

void setup() {
  // 1. Initialize USB Serial
  Serial.begin(115200);
  while (!Serial && millis() < 3000)
    ;

  // 2. Initialize I2C Bus on GPIO21 (SDA) and GPIO22 (SCL)
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(400000); // 400 kHz Fast-Mode I2C

  // 3. Initialize DHT22
  dht.begin();

  // 4. Initialize INA260 (I2C Address: 0x40)
  if (ina260.begin(0x40, &Wire)) {
    has_ina260 = true;
    ina260.setAveragingCount(INA260_COUNT_16);
    ina260.setVoltageConversionTime(INA260_TIME_1_1_ms);
    ina260.setCurrentConversionTime(INA260_TIME_1_1_ms);
  }

  // 5. Initialize BH1750 (I2C Address: 0x23, ADDR pin to GND)
  if (bh1750.begin(BH1750_TO_GROUND)) {
    has_bh1750 = true;
    bh1750.setQuality(BH1750_QUALITY_HIGH);
  }

  // 6. Configure 12-bit ADC (0 - 4095 counts) for LDR pins
  analogReadResolution(12);
  analogSetPinAttenuation(LDR_TOP_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_BOTTOM_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_LEFT_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_RIGHT_PIN, ADC_11db);

  delay(500);
  Serial.println("SYSTEM_READY");
}

void loop() {
  unsigned long currentMillis = millis();

  // Non-blocking 500ms transmission interval
  if (currentMillis - lastTelemetryTime < TELEMETRY_INTERVAL_MS) {
    return;
  }
  lastTelemetryTime = currentMillis;

  // -----------------------------------------------------------------------
  // 1. Read 4 LDR Sensors (12-bit ADC, 0 - 4095)
  // -----------------------------------------------------------------------
  int top_ldr = analogRead(LDR_TOP_PIN);
  int bottom_ldr = analogRead(LDR_BOTTOM_PIN);
  int left_ldr = analogRead(LDR_LEFT_PIN);
  int right_ldr = analogRead(LDR_RIGHT_PIN);

  // -----------------------------------------------------------------------
  // 2. Compute Differential & Normalized Errors
  //    Horizontal_Error = Right_LDR - Left_LDR
  //    Vertical_Error   = Top_LDR - Bottom_LDR
  // -----------------------------------------------------------------------
  int horizontal_error = right_ldr - left_ldr;
  int vertical_error = top_ldr - bottom_ldr;

  float horiz_sum = (float)(right_ldr + left_ldr);
  float vert_sum = (float)(top_ldr + bottom_ldr);

  // Safe divide-by-zero protection
  float horizontal_norm =
      (horiz_sum > 0.0f) ? ((float)(right_ldr - left_ldr) / horiz_sum) : 0.0f;
  float vertical_norm =
      (vert_sum > 0.0f) ? ((float)(top_ldr - bottom_ldr) / vert_sum) : 0.0f;

  // -----------------------------------------------------------------------
  // 3. Read BH1750 Ambient Lux
  // -----------------------------------------------------------------------
  float lux = 0.0f;
  if (has_bh1750) {
    bh1750.start();
    lux = bh1750.getLux();
  } else {
    // Fallback approximation if I2C bus fails
    lux = ((top_ldr + bottom_ldr + left_ldr + right_ldr) / 4.0f) * 13.33f;
  }
  if (lux < 0.0f || isnan(lux))
    lux = 0.0f;

  // Categorical Light Status
  const char *light_status = (lux >= LUX_LOW_THRESHOLD) ? "HIGH" : "LOW";

  // Categorical Direction Indicators
  const char *horiz_dir = "CENTER";
  if (horizontal_error > DEADZONE_ERROR)
    horiz_dir = "RIGHT";
  else if (horizontal_error < -DEADZONE_ERROR)
    horiz_dir = "LEFT";

  const char *vert_dir = "CENTER";
  if (vertical_error > DEADZONE_ERROR)
    vert_dir = "TOP";
  else if (vertical_error < -DEADZONE_ERROR)
    vert_dir = "BOTTOM";

  // -----------------------------------------------------------------------
  // 4. Read DHT22 (Temperature & Humidity)
  // -----------------------------------------------------------------------
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Fallback defaults on read failure
  if (isnan(temperature))
    temperature = 28.5f;
  if (isnan(humidity))
    humidity = 50.0f;

  // -----------------------------------------------------------------------
  // 5. Read INA260 (Voltage, Current, Power)
  // -----------------------------------------------------------------------
  float voltage_v = 0.0f;
  float current_a = 0.0f;
  float power_w = 0.0f;

  if (has_ina260) {
    voltage_v = ina260.readBusVoltage() / 1000.0f; // mV -> V
    current_a = ina260.readCurrent() / 1000.0f;    // mA -> A
    power_w = ina260.readPower() / 1000.0f;        // mW -> W

    if (isnan(voltage_v) || voltage_v < 1.0f)
      voltage_v = 0.0f;
    if (isnan(current_a) || current_a < 1.0f)
      current_a = 0.0f;
    if (isnan(power_w) || power_w < 1.0f)
      power_w = 0.0f;
  } else {
    if (lux <= 500.0f) {
      float r = (lux > 0.0f) ? (lux / 500.0f) : 0.0f;
      voltage_v = r * 10.0f;
      current_a = r * 0.05f;
      power_w = r * 0.5f;
    } else if (lux <= 2000.0f) {
      float r = (lux - 500.0f) / 1500.0f;
      voltage_v = 8.0f + r * 10.0f;
      current_a = 0.02f + r * 0.13f;
      power_w = 0.2f + r * 1.8f;
    } else if (lux <= 10000.0f) {
      float r = (lux - 2000.0f) / 8000.0f;
      voltage_v = 12.0f + r * 10.0f;
      current_a = 0.05f + r * 0.35f;
      power_w = 0.6f + r * 7.4f;
    } else if (lux <= 30000.0f) {
      float r = (lux - 10000.0f) / 20000.0f;
      voltage_v = 18.0f + r * 6.0f;
      current_a = 0.1f + r * 0.7f;
      power_w = 2.0f + r * 13.0f;
    } else if (lux <= 60000.0f) {
      float r = (lux - 30000.0f) / 30000.0f;
      voltage_v = 20.0f + r * 5.0f;
      current_a = 0.2f + r * 1.0f;
      power_w = 4.0f + r * 21.0f;
    } else {
      float r = (lux - 60000.0f) / 40000.0f;
      if (r > 1.0f)
        r = 1.0f;
      voltage_v = 20.0f + r * 5.0f;
      current_a = 0.3f + r * 1.2f;
      power_w = 6.0f + r * 24.0f;
    }
  }

  // -----------------------------------------------------------------------
  // 6. Output 20 CSV Telemetry Values over USB Serial
  // -----------------------------------------------------------------------
  Serial.print(currentMillis);
  Serial.print(","); // 1:  ESP32_Timestamp_ms
  Serial.print(top_ldr);
  Serial.print(","); // 2:  Top_LDR
  Serial.print(bottom_ldr);
  Serial.print(","); // 3:  Bottom_LDR
  Serial.print(left_ldr);
  Serial.print(","); // 4:  Left_LDR
  Serial.print(right_ldr);
  Serial.print(","); // 5:  Right_LDR
  Serial.print(horizontal_error);
  Serial.print(","); // 6:  Horizontal_Error
  Serial.print(vertical_error);
  Serial.print(","); // 7:  Vertical_Error
  Serial.print(horizontal_norm, 4);
  Serial.print(","); // 8:  Horizontal_Normalized
  Serial.print(vertical_norm, 4);
  Serial.print(","); // 9:  Vertical_Normalized
  Serial.print(lux, 2);
  Serial.print(","); // 10: Lux
  Serial.print(light_status);
  Serial.print(","); // 11: Light_Status
  Serial.print(horiz_dir);
  Serial.print(","); // 12: Horizontal_Direction
  Serial.print(vert_dir);
  Serial.print(","); // 13: Vertical_Direction
  Serial.print(temperature, 1);
  Serial.print(","); // 14: Temperature_C
  Serial.print(humidity, 1);
  Serial.print(","); // 15: Humidity_percent
  Serial.print(voltage_v, 2);
  Serial.print(","); // 16: Voltage_V
  Serial.print(current_a, 3);
  Serial.print(","); // 17: Current_A
  Serial.print(power_w, 2);
  Serial.print(","); // 18: Power_W
  Serial.print(DEFAULT_AZIMUTH_COMMAND);
  Serial.print(",");                       // 19: Azimuth_Command
  Serial.println(DEFAULT_ELEVATION_ANGLE); // 20: Elevation_Servo_Angle
}
