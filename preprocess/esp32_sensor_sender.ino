/*
 * =========================================================================
 * ESP32 Dual-Axis Solar Tracker Sensor Telemetry Transmitter (USB Serial)
 * =========================================================================
 * Features:
 *   - 4x LDRs (Top: 34, Bottom: 35, Left: 32, Right: 33)
 *   - BH1750 Ambient Light Sensor (I2C SDA: 21, SCL: 22, Addr: 0x23)
 *   - INA260 Precision Voltage / Current / Power Monitor (I2C Addr: 0x40)
 *   - DHT22 Temperature & Humidity (Data: 27)
 * 
 * Strict Constraints:
 *   - NO Wi-Fi
 *   - NO Motor Control / Servos
 *   - NO Commands sent from PC to ESP32
 *   - Calculates raw values & normalized errors
 *   - Sends 20 comma-separated values every 500ms via USB Serial (115200 baud)
 * =========================================================================
 */

#include <Wire.h>
#include <DHT.h>
#include <Adafruit_INA260.h>
#include <hp_BH1750.h>

// ---------------- Pins Configuration ----------------
#define LDR_TOP_PIN     34
#define LDR_BOTTOM_PIN  35
#define LDR_LEFT_PIN    32
#define LDR_RIGHT_PIN   33

#define DHT_PIN         27
#define DHT_TYPE        DHT22

#define I2C_SDA_PIN     21
#define I2C_SCL_PIN     22

// ---------------- Constants ----------------
#define LUX_THRESHOLD   100.0f
#define DEADZONE_ERROR  50

// ---------------- Objects ----------------
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_INA260 ina260 = Adafruit_INA260();
hp_BH1750 bh1750;

// Sensor presence flags
bool has_ina260 = false;
bool has_bh1750 = false;

// Simulated placeholder angles/commands for structural compatibility
const int DUMMY_AZIMUTH_COMMAND = 1500;
const int DUMMY_SERVO_ANGLE = 34;

void setup() {
  // Initialize Serial
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  // Initialize I2C
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  // Initialize DHT22
  dht.begin();

  // Initialize INA260 (0x40)
  if (ina260.begin(0x40, &Wire)) {
    has_ina260 = true;
  }

  // Initialize BH1750 (0x23)
  if (bh1750.begin(BH1750_TO_GROUND)) {
    has_bh1750 = true;
  }

  // Configure ADC resolution & attenuation (12-bit, 0-4095, up to ~3.3V)
  analogReadResolution(12);
  analogSetPinAttenuation(LDR_TOP_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_BOTTOM_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_LEFT_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_RIGHT_PIN, ADC_11db);

  delay(1000);
}

void loop() {
  unsigned long timestamp_ms = millis();

  // 1. Read 4 LDRs (Raw ADC 0 - 4095)
  int top_ldr    = analogRead(LDR_TOP_PIN);
  int bottom_ldr = analogRead(LDR_BOTTOM_PIN);
  int left_ldr   = analogRead(LDR_LEFT_PIN);
  int right_ldr  = analogRead(LDR_RIGHT_PIN);

  // 2. Compute Horizontal and Vertical Errors
  // Horizontal_Error = Right_LDR - Left_LDR
  // Vertical_Error   = Top_LDR - Bottom_LDR
  int horizontal_error = right_ldr - left_ldr;
  int vertical_error   = top_ldr - bottom_ldr;

  // 3. Normalized Errors (with safe zero-division handling)
  float horiz_sum = (float)(right_ldr + left_ldr);
  float vert_sum  = (float)(top_ldr + bottom_ldr);

  float horizontal_norm = (horiz_sum > 0.0f) ? ((float)(right_ldr - left_ldr) / horiz_sum) : 0.0f;
  float vertical_norm   = (vert_sum  > 0.0f) ? ((float)(top_ldr - bottom_ldr) / vert_sum)  : 0.0f;

  // 4. Read BH1750 Lux
  float lux = 0.0f;
  if (has_bh1750) {
    bh1750.start();
    lux = bh1750.getLux();
  } else {
    // Approximate lux from average LDR if I2C sensor offline
    lux = ((top_ldr + bottom_ldr + left_ldr + right_ldr) / 4.0f) * 13.33f;
  }

  // 5. Categorical Light Status & Directions
  const char* light_status = (lux < LUX_THRESHOLD) ? "LOW" : "HIGH";

  const char* horiz_dir = "CENTER";
  if (horizontal_error > DEADZONE_ERROR) horiz_dir = "RIGHT";
  else if (horizontal_error < -DEADZONE_ERROR) horiz_dir = "LEFT";

  const char* vert_dir = "CENTER";
  if (vertical_error > DEADZONE_ERROR) vert_dir = "TOP";
  else if (vertical_error < -DEADZONE_ERROR) vert_dir = "BOTTOM";

  // 6. Read DHT22 (Temperature & Humidity)
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  if (isnan(temperature)) temperature = 25.0f;
  if (isnan(humidity))    humidity = 50.0f;

  // 7. Read INA260 (Voltage, Current, Power)
  float voltage_v = 0.0f;
  float current_a = 0.0f;
  float power_w   = 0.0f;

  if (has_ina260) {
    voltage_v = ina260.readBusVoltage() / 1000.0f; // mV -> V
    current_a = ina260.readCurrent() / 1000.0f;    // mA -> A
    power_w   = ina260.readPower() / 1000.0f;      // mW -> W
  }

  // 8. Output Exactly 20 CSV Values to USB Serial
  // 1: ESP32_Timestamp_ms
  // 2: Top_LDR
  // 3: Bottom_LDR
  // 4: Left_LDR
  // 5: Right_LDR
  // 6: Horizontal_Error
  // 7: Vertical_Error
  // 8: Horizontal_Normalized
  // 9: Vertical_Normalized
  // 10: Lux
  // 11: Light_Status
  // 12: Horizontal_Direction
  // 13: Vertical_Direction
  // 14: Temperature_C
  // 15: Humidity_percent
  // 16: Voltage_V
  // 17: Current_A
  // 18: Power_W
  // 19: Azimuth_Command
  // 20: Elevation_Servo_Angle
  Serial.print(timestamp_ms); Serial.print(",");
  Serial.print(top_ldr); Serial.print(",");
  Serial.print(bottom_ldr); Serial.print(",");
  Serial.print(left_ldr); Serial.print(",");
  Serial.print(right_ldr); Serial.print(",");
  Serial.print(horizontal_error); Serial.print(",");
  Serial.print(vertical_error); Serial.print(",");
  Serial.print(horizontal_norm, 4); Serial.print(",");
  Serial.print(vertical_norm, 4); Serial.print(",");
  Serial.print(lux, 2); Serial.print(",");
  Serial.print(light_status); Serial.print(",");
  Serial.print(horiz_dir); Serial.print(",");
  Serial.print(vert_dir); Serial.print(",");
  Serial.print(temperature, 1); Serial.print(",");
  Serial.print(humidity, 1); Serial.print(",");
  Serial.print(voltage_v, 2); Serial.print(",");
  Serial.print(current_a, 3); Serial.print(",");
  Serial.print(power_w, 2); Serial.print(",");
  Serial.print(DUMMY_AZIMUTH_COMMAND); Serial.print(",");
  Serial.println(DUMMY_SERVO_ANGLE);

  // Send packet every 500 ms
  delay(500);
}
