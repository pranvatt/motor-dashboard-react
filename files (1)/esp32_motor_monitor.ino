/*
  Single-Phase Motor Health Monitor — ESP32 firmware
  ----------------------------------------------------
  Streams one CSV line per reading over USB serial, in the format the
  web dashboard expects:

      C:4.82,V:231.4,T:42.1,VB:0.031,S:1439,BULB:1

  C  = current (A)        from ACS758 hall-effect current sensor
  V  = voltage (V)        from ZMPT101B voltage sensor
  T  = temperature (C)    from PT100 RTD (via signal conditioner) or thermistor
  VB = vibration (g)      from ADXL345 accelerometer
  S  = speed (RPM)        from inductive proximity sensor (pulse counting)
  BULB = 1/0              simple LDR-based "is the test bulb lit" flag —
         a safe, low-voltage way to prove the ESP32 -> USB -> browser link
         works before any of the real motor sensors are wired in.
         The dashboard displays this directly as a "Bulb ON/OFF" pill and
         logs every change, so leave it in while testing — or delete the
         line that prints it once the real sensors are wired.

  ---------------------------------------------------------------------
  DEMO_MODE (default: true)
  ---------------------------------------------------------------------
  Compiles and runs on a bare ESP32 dev board with NOTHING wired except
  USB. It fakes realistic C/V/T/VB/S values with a small random walk, and
  additionally reads one REAL sensor — an LDR pointed at a bulb — so you
  can confirm the whole pipeline (firmware -> USB-C cable -> browser Web
  Serial -> dashboard) before wiring the actual current/voltage/vibration
  sensors onto the motor.

  Wiring for the DEMO_MODE bulb test (safe, low-voltage only):
    - Do NOT wire the ESP32 directly to a mains (230V) bulb circuit —
      that's a shock/fire risk and will destroy the board.
    - Instead: LDR + 10k resistor as a voltage divider between 3.3V and
      GND, midpoint -> GPIO34 (ADC1_CH6). Point the LDR at any bulb/lamp
      (mains bulb behind glass, a torch, a desk lamp — anything). No
      electrical contact with the bulb's own wiring is needed.
    - Flip the bulb on/off and watch the BULB field (and LDR raw value)
      change in the dashboard's fault log / serial output.

  ---------------------------------------------------------------------
  Real sensors (set DEMO_MODE to false once wired)
  ---------------------------------------------------------------------
  Every conversion below has a calibration constant marked TODO — these
  depend on your exact sensor breakout and supply voltage, so treat the
  numbers here as a starting point, not ground truth. Bench-test each
  sensor against a multimeter / known load before trusting the readings.
*/

#define DEMO_MODE true

// ---- Pin map (adjust to your wiring) ----
const int PIN_LDR        = 34;  // demo-mode bulb sensor (ADC1_CH6)
const int PIN_CURRENT    = 35;  // ACS758 analog out      (ADC1_CH7)
const int PIN_VOLTAGE    = 32;  // ZMPT101B analog out    (ADC1_CH4)
const int PIN_TEMP       = 33;  // thermistor / RTD conditioner out (ADC1_CH5)
const int PIN_SPEED      = 27;  // inductive speed sensor digital pulse (interrupt-capable)
// ADXL345 vibration sensor uses the default I2C pins (SDA=21, SCL=22 on most ESP32 dev boards)

const unsigned long SEND_INTERVAL_MS = 800;
unsigned long lastSend = 0;

// ---- Speed sensor pulse counting ----
volatile unsigned long pulseCount = 0;
void IRAM_ATTR onSpeedPulse() { pulseCount++; }

// ---- Demo-mode random walk state ----
float demoC = 4.9, demoV = 230.0, demoT = 45.0, demoVB = 0.03, demoS = 1440.0;

float randWalk(float current, float target, float noise, float pull) {
  float drift = (target - current) * pull;
  float n = ((float)random(-1000, 1000) / 1000.0) * noise;
  return current + drift + n;
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_SPEED, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_SPEED), onSpeedPulse, FALLING);

#if !DEMO_MODE
  // Wire.begin();               // uncomment when wiring the ADXL345 (I2C)
  // initAdxl345();              // implement per the ADXL345 datasheet / library of your choice
#endif

  randomSeed(analogRead(PIN_LDR));
  Serial.println("# ESP32 motor monitor ready");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL_MS) return;

  float c, v, t, vb, s;
  int bulbOn;

  int ldrRaw = analogRead(PIN_LDR);      // 0-4095; higher = brighter, typically
  bulbOn = ldrRaw > 1500 ? 1 : 0;         // TODO: calibrate this threshold to your LDR + ambient light

#if DEMO_MODE
  demoC  = randWalk(demoC, 4.9, 0.15, 0.15);
  demoV  = randWalk(demoV, 230.0, 1.6, 0.15);
  demoT  = randWalk(demoT, 45.0, 0.6, 0.1);
  demoVB = randWalk(demoVB, 0.03, 0.006, 0.15);
  demoS  = randWalk(demoS, 1440.0, 4.0, 0.15);
  c = demoC; v = demoV; t = demoT; vb = demoVB; s = demoS;
#else
  // ---- Current: ACS758 (e.g. ACS758LCB-050B, 40 mV/A, Vcc/2 at 0A) ----
  int rawC = analogRead(PIN_CURRENT);
  float vOutC = (rawC / 4095.0) * 3.3;             // TODO: confirm ADC reference voltage
  c = (vOutC - 1.65) / 0.040;                       // TODO: replace 1.65 (zero-current offset) and
                                                      //       0.040 (V/A sensitivity) with your module's datasheet values

  // ---- Voltage: ZMPT101B (needs its own calibration against a multimeter) ----
  int rawV = analogRead(PIN_VOLTAGE);
  float vOutV = (rawV / 4095.0) * 3.3;
  v = vOutV * 100.0;                                 // TODO: replace 100.0 with your measured scale factor

  // ---- Temperature: PT100 via signal conditioner, or NTC thermistor ----
  int rawT = analogRead(PIN_TEMP);
  float vOutT = (rawT / 4095.0) * 3.3;
  t = (vOutT - 0.5) * 100.0;                         // TODO: replace with your conditioner's actual transfer function

  // ---- Vibration: ADXL345 over I2C ----
  vb = 0.03;                                         // TODO: read ADXL345 registers, compute |accel| - 1g in 'g' units

  s = pulseCount * (60.0 / (SEND_INTERVAL_MS / 1000.0)) / 1.0; // TODO: divide by pulses-per-revolution for your sensor target
  pulseCount = 0;
#endif

  Serial.print("C:");  Serial.print(c, 2);
  Serial.print(",V:"); Serial.print(v, 1);
  Serial.print(",T:"); Serial.print(t, 1);
  Serial.print(",VB:"); Serial.print(vb, 3);
  Serial.print(",S:"); Serial.print(s, 0);
  Serial.print(",BULB:"); Serial.print(bulbOn);
  Serial.println();

  lastSend = now;
}
