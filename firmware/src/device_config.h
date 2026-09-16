#pragma once

// ── Per-unit configuration ────────────────────────────────────────────────────
// Change these two values when flashing a new unit. Everything else is shared.

#define DEVICE_ID       "Device2"
#define DEVICE_API_KEY  "dev_secret_key"

// ── Network ───────────────────────────────────────────────────────────────────
#define WIFI_SSID       "OnePlus 12"
#define WIFI_PASSWORD   "20062006."

// ── Backend ───────────────────────────────────────────────────────────────────
#define INGEST_FUNCTION_URL "https://your-project.supabase.co/functions/v1/ingest-reading"
#define ENABLE_WIFI_INGEST  true            // Set false when forwarding through the USB bridge

// ── Behaviour ─────────────────────────────────────────────────────────────────
#define STAGE           "pre"             // "pre" or "post"
#define POST_INTERVAL_S 10               // seconds between POSTs
#define BUFFER_CAPACITY 50               // max readings buffered offline
