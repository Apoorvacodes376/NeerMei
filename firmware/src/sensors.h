#pragma once
#include <Arduino.h>

struct SensorReading {
  float pH;
  float turbidity;
  float TDS;
  float temperature;
  float conductivity;
};

// ── Pin assignments (adjust to your wiring) ───────────────────────────────────
static const uint8_t PIN_PH          = 34;
static const uint8_t PIN_TURBIDITY   = 35;
static const uint8_t PIN_TDS         = 32;
static const uint8_t PIN_TEMPERATURE = 33;
static const uint8_t PIN_CONDUCTIVITY= 36;

// ADC full-scale for ESP32 (12-bit)
static const float ADC_MAX = 4095.0f;
static const float VREF    = 3.3f;

// ── Stub conversions ──────────────────────────────────────────────────────────
// Replace each block with real sensor library calls when hardware is available.

static inline float readPH() {
  // TODO: replace with actual pH sensor library (e.g. DFRobot pH v2)
  float v = (analogRead(PIN_PH) / ADC_MAX) * VREF;
  return 3.5f * v + 0.0f;   // linear stub: 0V→0, 3.3V→11.55 → clamp to 0–14
}

static inline float readTurbidity() {
  // TODO: replace with actual turbidity sensor (e.g. SEN0189)
  float v = (analogRead(PIN_TURBIDITY) / ADC_MAX) * VREF;
  return max(0.0f, -1120.4f * v * v + 5742.3f * v - 4352.9f);
}

static inline float readTDS() {
  // TODO: replace with actual TDS sensor (e.g. DFRobot TDS)
  float v = (analogRead(PIN_TDS) / ADC_MAX) * VREF;
  return (133.42f * v * v * v - 255.86f * v * v + 857.39f * v) * 0.5f;
}

static inline float readTemperature() {
  // TODO: replace with DS18B20 or NTC thermistor library
  float v = (analogRead(PIN_TEMPERATURE) / ADC_MAX) * VREF;
  return v * 30.0f;   // stub: 0–3.3V → 0–99°C
}

static inline float readConductivity() {
  // TODO: replace with actual EC sensor
  float v = (analogRead(PIN_CONDUCTIVITY) / ADC_MAX) * VREF;
  return v * 300.0f;  // stub: 0–3.3V → 0–990 µS/cm
}

inline SensorReading readSensors() {
  return {
    .pH          = readPH(),
    .turbidity   = readTurbidity(),
    .TDS         = readTDS(),
    .temperature = readTemperature(),
    .conductivity= readConductivity(),
  };
}
