#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

#include "device_config.h"
#include "sensors.h"
#include "display.h"
#include "buffer.h"

// ── Globals ───────────────────────────────────────────────────────────────────
static bool wifiOk  = false;
static bool postOk  = false;
static unsigned long lastPostMs = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

static void getISO8601(char* out, size_t len) {
  time_t now;
  time(&now);
  struct tm* t = gmtime(&now);
  strftime(out, len, "%Y-%m-%dT%H:%M:%SZ", t);
}

static bool postReading(const SensorReading& r, const char* ts) {
  if (!ENABLE_WIFI_INGEST) return false;
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  char url[256];
  snprintf(url, sizeof(url), "%s", INGEST_FUNCTION_URL);
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload matching the backend contract exactly
  StaticJsonDocument<256> doc;
  doc["deviceId"]  = DEVICE_ID;
  doc["apiKey"]     = DEVICE_API_KEY;
  doc["stage"]     = STAGE;
  doc["timestamp"] = ts;
  JsonObject sv    = doc.createNestedObject("sensorValues");
  sv["pH"]          = serialized(String(r.pH, 2));
  sv["turbidity"]   = serialized(String(r.turbidity, 2));
  sv["TDS"]         = serialized(String(r.TDS, 1));
  sv["temperature"] = serialized(String(r.temperature, 1));

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  http.end();
  return (code == 200 || code == 201);
}

static void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  if (!ENABLE_WIFI_INGEST) {
    Serial.println("\n[WiFi] Disabled — using USB bridge");
    return;
  }
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500); Serial.print('.'); tries++;
  }
  wifiOk = (WiFi.status() == WL_CONNECTED);
  if (wifiOk) {
    Serial.printf("\n[WiFi] Connected: %s\n", WiFi.localIP().toString().c_str());
    configTime(0, 0, "pool.ntp.org");   // sync NTP for accurate timestamps
  } else {
    Serial.println("\n[WiFi] Failed — running offline");
  }
}

// ── Setup / Loop ──────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  displayInit();
  connectWiFi();
}

void loop() {
  // Reconnect if dropped
  if (ENABLE_WIFI_INGEST && WiFi.status() != WL_CONNECTED) {
    wifiOk = false;
    connectWiFi();
  }

  unsigned long now = millis();
  if (now - lastPostMs < (unsigned long)(POST_INTERVAL_S * 1000)) {
    displayUpdate(readSensors(), wifiOk, postOk);
    delay(500);
    return;
  }
  lastPostMs = now;

  SensorReading r = readSensors();
  char ts[25];
  getISO8601(ts, sizeof(ts));

  // Print to Serial (USB bridge can pick this up)
  Serial.printf("[READ] pH=%.2f turb=%.2f TDS=%.1f temp=%.1f cond=%.1f ts=%s\n",
    r.pH, r.turbidity, r.TDS, r.temperature, ts);

  // Try to flush buffer first (oldest readings go first)
  while (!bufferEmpty() && wifiOk) {
    BufferedReading* br = bufferPeek();
    if (postReading(br->values, br->timestamp)) {
      Serial.printf("[FLUSH] Sent buffered reading ts=%s\n", br->timestamp);
      bufferPop();
    } else {
      break;  // still offline, stop trying
    }
  }

  // Post current reading
  postOk = !ENABLE_WIFI_INGEST || postReading(r, ts);
  if (ENABLE_WIFI_INGEST && !postOk) {
    Serial.printf("[BUFFER] Offline — buffering reading (buf=%d)\n", bufferSize() + 1);
    bufferPush(r, ts);
  }

  displayUpdate(r, wifiOk, postOk);
}
