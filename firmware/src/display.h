#pragma once
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "sensors.h"

static const uint8_t OLED_WIDTH  = 128;
static const uint8_t OLED_HEIGHT = 64;
static const uint8_t OLED_ADDR   = 0x3C;

static Adafruit_SSD1306 _display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
static bool _displayOk = false;

// Safe-range thresholds (local, no cloud needed)
static const float T_PH_MIN   = 6.5f, T_PH_MAX   = 8.5f;
static const float T_TURB_MAX = 4.0f;
static const float T_TDS_MAX  = 500.0f;

inline bool isSafe(const SensorReading& r) {
  return r.pH >= T_PH_MIN && r.pH <= T_PH_MAX
      && r.turbidity <= T_TURB_MAX
      && r.TDS <= T_TDS_MAX;
}

inline void displayInit() {
  _displayOk = _display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (_displayOk) { _display.clearDisplay(); _display.display(); }
}

inline void displayUpdate(const SensorReading& r, bool wifiOk, bool postOk) {
  if (!_displayOk) return;
  _display.clearDisplay();
  _display.setTextSize(1);
  _display.setTextColor(SSD1306_WHITE);

  // Status banner
  _display.setCursor(0, 0);
  _display.print(isSafe(r) ? "STATUS: SAFE    " : "STATUS: UNSAFE  ");

  // Readings
  char buf[22];
  snprintf(buf, sizeof(buf), "pH   : %.2f", r.pH);         _display.setCursor(0, 12); _display.print(buf);
  snprintf(buf, sizeof(buf), "Turb : %.2f NTU", r.turbidity); _display.setCursor(0, 22); _display.print(buf);
  snprintf(buf, sizeof(buf), "TDS  : %.0f ppm", r.TDS);    _display.setCursor(0, 32); _display.print(buf);
  snprintf(buf, sizeof(buf), "Temp : %.1f C", r.temperature); _display.setCursor(0, 42); _display.print(buf);

  // Connectivity row
  _display.setCursor(0, 54);
  _display.print(wifiOk ? "WiFi:OK " : "WiFi:-- ");
  _display.print(postOk ? "POST:OK" : "POST:--");

  _display.display();
}
