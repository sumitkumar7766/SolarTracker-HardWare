/*
 * =========================================================================
 * ESP32 Complete Dual-Axis Solar Tracker Firmware
 * =========================================================================
 * Features:
 *   - 4x LDRs: Top(GPIO34), Bottom(GPIO35), Left(GPIO32), Right(GPIO33)
 *   - BH1750 Ambient Lux Sensor (I2C 0x23, SDA: 21, SCL: 22)
 *   - INA260 Voltage/Current/Power Monitor (I2C 0x40, SDA: 21, SCL: 22)
 *   - DHT22 Temp & Humidity (Data: GPIO27)
 *   - Azimuth Motor (Continuous-rotation MG995 on GPIO25)
 *   - Elevation Motor (Positional MG995 on GPIO26)
 *
 * Operation:
 *   1. Reads real sensors and sends 20 CSV values over USB Serial (115200 baud).
 *   2. Receives structured motor commands from FastAPI backend:
 *        CMD,AZ,LEFT
 *        CMD,AZ,RIGHT
 *        CMD,AZ,STOP
 *        CMD,EL,UP
 *        CMD,EL,DOWN
 *        CMD,EL,STOP
 *        CMD,EL_ANGLE,<degrees>
 *        CMD,MOTOR,STOP
 * =========================================================================
 */

#include <Wire.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <Adafruit_INA260.h>
#include <hp_BH1750.h>

// ---------------- Pin Definitions ----------------
#define PIN_LDR_TOP     34
#define PIN_LDR_BOTTOM  35
#define PIN_LDR_LEFT    32
#define PIN_LDR_RIGHT   33

#define PIN_DHT         27
#define DHT_TYPE        DHT22

#define PIN_I2C_SDA     21
#define PIN_I2C_SCL     22

#define PIN_AZ_SERVO    25    // Azimuth Continuous MG995
#define PIN_EL_SERVO    26    // Elevation Positional MG995

// ---------------- Motor Tuning & Safety ----------------
#define AZ_STOP_US      1500
#define AZ_SPEED_DELTA  40    // Speed offset for continuous servo
#define MIN_EL_ANGLE    10
#define MAX_EL_ANGLE    170
#define DEFAULT_EL_DEG  90

// ---------------- Objects ----------------
DHT dht(PIN_DHT, DHT_TYPE);
Adafruit_INA260 ina260;
hp_BH1750 bh1750;

Servo azimuthServo;
Servo elevationServo;

bool has_ina260 = false;
bool has_bh1750 = false;

// Motor state variables
int currentAzCmdUs = AZ_STOP_US;
int currentElAngle = DEFAULT_EL_DEG;

unsigned long lastTelemetryMs = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 500;

// Command parser buffer
String serialInputBuffer = "";

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  // Initialize I2C bus
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);

  // Initialize sensors
  dht.begin();
  if (ina260.begin(0x40, &Wire)) {
    has_ina260 = true;
  }
  if (bh1750.begin(BH1750_TO_GROUND)) {
    has_bh1750 = true;
  }

  // Configure ADC for 12-bit (0-4095)
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_LDR_TOP, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_BOTTOM, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_LEFT, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_RIGHT, ADC_11db);

  // Initialize Servo Actuators (50Hz)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  azimuthServo.setPeriodHertz(50);
  elevationServo.setPeriodHertz(50);

  azimuthServo.attach(PIN_AZ_SERVO, 500, 2500);
  elevationServo.attach(PIN_EL_SERVO, 500, 2500);

  // Initial Safe Stop
  azimuthServo.writeMicroseconds(AZ_STOP_US);
  elevationServo.write(DEFAULT_EL_DEG);

  delay(1000);
}

void parseCommandSegment(String seg) {
  seg.trim();
  if (seg.startsWith("CMD,MOTOR,STOP")) {
    currentAzCmdUs = AZ_STOP_US;
    azimuthServo.writeMicroseconds(AZ_STOP_US);
  }
  else if (seg.startsWith("CMD,AZ,")) {
    String action = seg.substring(7);
    action.trim();
    if (action == "LEFT") {
      currentAzCmdUs = AZ_STOP_US - AZ_SPEED_DELTA;
    } else if (action == "RIGHT") {
      currentAzCmdUs = AZ_STOP_US + AZ_SPEED_DELTA;
    } else {
      currentAzCmdUs = AZ_STOP_US;
    }
    azimuthServo.writeMicroseconds(currentAzCmdUs);
  }
  else if (seg.startsWith("CMD,EL,")) {
    String action = seg.substring(7);
    action.trim();
    if (action == "UP") {
      currentElAngle = constrain(currentElAngle + 2, MIN_EL_ANGLE, MAX_EL_ANGLE);
      elevationServo.write(currentElAngle);
    } else if (action == "DOWN") {
      currentElAngle = constrain(currentElAngle - 2, MIN_EL_ANGLE, MAX_EL_ANGLE);
      elevationServo.write(currentElAngle);
    }
  }
  else if (seg.startsWith("CMD,EL_ANGLE,")) {
    int target = seg.substring(13).toInt();
    if (target >= MIN_EL_ANGLE && target <= MAX_EL_ANGLE) {
      currentElAngle = target;
      elevationServo.write(currentElAngle);
    }
  }
}

void processIncomingSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      serialInputBuffer.trim();
      if (serialInputBuffer.length() > 0) {
        // Handle compound commands separated by ';'
        int semiIdx = serialInputBuffer.indexOf(';');
        if (semiIdx != -1) {
          int start = 0;
          while (semiIdx != -1) {
            String segment = serialInputBuffer.substring(start, semiIdx);
            parseCommandSegment(segment);
            start = semiIdx + 1;
            semiIdx = serialInputBuffer.indexOf(';', start);
          }
          String lastSegment = serialInputBuffer.substring(start);
          parseCommandSegment(lastSegment);
        } else {
          parseCommandSegment(serialInputBuffer);
        }
      }
      serialInputBuffer = "";
    } else if (c != '\r') {
      serialInputBuffer += c;
    }
  }
}

void sendTelemetry() {
  unsigned long timestamp_ms = millis();

  // 1. Read LDRs
  int top    = analogRead(PIN_LDR_TOP);
  int bottom = analogRead(PIN_LDR_BOTTOM);
  int left   = analogRead(PIN_LDR_LEFT);
  int right  = analogRead(PIN_LDR_RIGHT);

  // 2. Compute Errors
  int h_err = right - left;
  int v_err = top - bottom;

  float h_sum = (float)(right + left);
  float v_sum = (float)(top + bottom);
  float h_norm = (h_sum > 0.0f) ? ((float)h_err / h_sum) : 0.0f;
  float v_norm = (v_sum > 0.0f) ? ((float)v_err / v_sum) : 0.0f;

  // 3. Read Lux
  float lux = 0.0f;
  if (has_bh1750) {
    bh1750.start();
    lux = bh1750.getLux();
  } else {
    lux = ((top + bottom + left + right) / 4.0f) * 13.33f;
  }

  const char* light_status = (lux < 200.0f) ? "LOW" : "HIGH";

  const char* horiz_dir = "CENTER";
  if (h_err > 50) horiz_dir = "RIGHT";
  else if (h_err < -50) horiz_dir = "LEFT";

  const char* vert_dir = "CENTER";
  if (v_err > 50) vert_dir = "TOP";
  else if (v_err < -50) vert_dir = "BOTTOM";

  // 4. Read DHT22
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp)) temp = 25.0f;
  if (isnan(hum))  hum  = 50.0f;

  // 5. Read INA260
  float v_bus = 0.0f;
  float current_a = 0.0f;
  float power_w = 0.0f;
  if (has_ina260) {
    v_bus = ina260.readBusVoltage() / 1000.0f;
    current_a = ina260.readCurrent() / 1000.0f;
    power_w = ina260.readPower() / 1000.0f;
  }

  // 6. Transmit 20 Values Over Serial
  Serial.print(timestamp_ms); Serial.print(",");
  Serial.print(top); Serial.print(",");
  Serial.print(bottom); Serial.print(",");
  Serial.print(left); Serial.print(",");
  Serial.print(right); Serial.print(",");
  Serial.print(h_err); Serial.print(",");
  Serial.print(v_err); Serial.print(",");
  Serial.print(h_norm, 4); Serial.print(",");
  Serial.print(v_norm, 4); Serial.print(",");
  Serial.print(lux, 2); Serial.print(",");
  Serial.print(light_status); Serial.print(",");
  Serial.print(horiz_dir); Serial.print(",");
  Serial.print(vert_dir); Serial.print(",");
  Serial.print(temp, 1); Serial.print(",");
  Serial.print(hum, 1); Serial.print(",");
  Serial.print(v_bus, 2); Serial.print(",");
  Serial.print(current_a, 3); Serial.print(",");
  Serial.print(power_w, 2); Serial.print(",");
  Serial.print(currentAzCmdUs); Serial.print(",");
  Serial.println(currentElAngle);
}

void loop() {
  // Listen for motor commands from Python backend
  processIncomingSerial();

  // Periodically send 20 telemetry values
  if (millis() - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = millis();
    sendTelemetry();
  }
}
