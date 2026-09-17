<<<<<<< HEAD
# NeerMei — Water Quality Monitoring Platform

Real-time IoT water quality monitoring with ML-based purifiability classification, live dashboard, and automated alerts.

---

## Architecture

```
ESP32 firmware / bridge ──► Supabase ingest-reading Edge Function ──► Postgres
                                      │
React + Vite ── Supabase Auth + RLS
   │
   └── local ML calls ──► Python ML service (http://localhost:8000)
```

---

## Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase project with email/password and Google providers enabled
- PlatformIO (for firmware, optional)

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd Neer-Mei

# Install all JS deps + Python deps in one shot
npm install          # installs concurrently at root
npm run install:all  # installs backend, frontend, bridge deps + pip requirements
```

---

## 2. Supabase Setup

1. Apply `supabase/migrations/20260912000000_initial_schema.sql` in the Supabase SQL editor.
2. Enable Email and Google under Authentication → Providers.
3. Deploy `supabase/functions/ingest-reading` for real sensor/bridge readings.

## 3. Environment Files

Copy each example and fill in values:

```bash
cp backend/.env.example   backend/.env
cp frontend/.env.example  frontend/.env
cp ml-service/.env.example ml-service/.env
```

Key values in `frontend/.env`:
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase browser anon key |
| `VITE_ML_SERVICE_URL` | Local FastAPI URL, normally `http://localhost:8000` |

The backend `.env` is only needed for the health server and contains `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and server-only service/function settings. Never expose a service role key in the frontend.

---

## 4. Run All Services

```bash
npm run dev
```

This starts three processes concurrently:
- **backend** on http://localhost:5000
- **frontend** on http://localhost:5173
- **ml-service** on http://localhost:8000

The Python ML service must remain running while using the dashboard. If it is stopped, ML controls and predictions will fail with a local connection error.

Or run individually:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd ml-service && uvicorn main:app --reload --port 8000
```

---

## 5. Firmware (ESP32)

1. Install [PlatformIO](https://platformio.org/) (VS Code extension or CLI)
2. Edit `firmware/src/device_config.h`:
   - Set `WIFI_SSID` / `WIFI_PASSWORD`
   - Set `INGEST_FUNCTION_URL` to the deployed `ingest-reading` function URL
   - Set `DEVICE_API_KEY` to the key stored for that device in Supabase
   - Change `DEVICE_ID` per unit (e.g. `DEV-001`, `DEV-002`)
3. Flash: `cd firmware && pio run --target upload`

**OLED wiring (SSD1306 128×64):**
- SDA → GPIO 21, SCL → GPIO 22 (ESP32 default I2C)

---

## 6. USB Serial Bridge (venue WiFi fallback)

If venue WiFi is unreliable, connect the ESP32 via USB and run:

```bash
cd bridge
# Windows: set SERIAL_PORT=COM3
# macOS/Linux: set SERIAL_PORT=/dev/ttyUSB0
SERIAL_PORT=COM3 DEVICE_API_KEY=dev_secret_key node bridge.js
```

Set `INGEST_FUNCTION_URL` to the deployed `ingest-reading` function. The bridge reads the ESP32 serial output and POSTs the same payload as the WiFi firmware.

---

## 7. End-to-End Test Path

Follow these steps to verify the full loop from data → ML → frontend → alerts:

### Step 1 — Start services
```bash
npm run dev        # in one terminal
```

### Step 2 — Admin flow
1. Open http://localhost:5173 → **Login** as an admin Supabase user
2. Navigate to **Live Monitoring 1** — available pre-purification readings appear in the table and graph
3. Navigate to **ML Training 1** → click **Start Training**, wait 2s, click **Stop Training** — status shows accuracy
4. Click **Test Model** — Last prediction appears with confidence score
5. Navigate to **Purification Analysis** — confidence graph live-appends
6. Navigate to **Post-Purification Data** — post readings visible
7. Navigate to **ML Training 2** → repeat Train/Test cycle for post-purification classifier
8. Navigate to **Outcome** — current status shows "Purified" / "Not Purified" with confidence; bar chart shows history
9. Navigate to **Alerts & History** — available alerts are visible; use the filter to narrow by device and click **Acknowledge**

### Step 3 — User flow
1. Log out → **Login** as a Supabase user linked to a device
2. Navigate to **My Device** — only `DEV-001` readings visible (no other devices)
3. Navigate to **Alerts** — alerts for the linked device are visible
4. Unacknowledged alerts appear in the popup — dismiss one
5. Navigate to **Settings** — update alert thresholds, click Save

### Step 4 — Public insights (no login)
1. Log out → navigate to http://localhost:5173/insights
2. Aggregate stats (pH, turbidity, TDS, safety %) and 14-day trend graph visible — no auth required
3. Confirm no device-level data is exposed

### Step 5 — Hardware disconnected indicator
1. On any Live Monitoring page, the "hardware disconnected" icon appears when the device's `last_seen` value is older than two minutes.

### Step 6 — Upload sample dataset
1. On **Live Monitoring 1**, click the **Upload** icon
2. Select a CSV with `timestamp,pH,turbidity,TDS,temperature,conductivity` columns
3. Readings are ingested and appear in the table

---

## Project Structure

```
Neer-Mei/
├── frontend/          React + Vite dashboard
├── backend/           Node.js + Express + MongoDB API
├── ml-service/        Python FastAPI ML microservice
├── firmware/          ESP32 PlatformIO project
│   └── src/
│       ├── device_config.h   ← change per unit
│       ├── sensors.h         ← stub → real sensor drop-in
│       ├── display.h         ← OLED driver
│       ├── buffer.h          ← offline RAM buffer
│       └── main.cpp
├── bridge/            USB serial → backend bridge (Node.js)
├── seed/
│   ├── seed.js               ← creates demo data
│   └── sample-readings.csv   ← reusable upload file
└── package.json       root concurrently scripts
```

---

## API Quick Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/google` | — | Google OAuth |
| POST | `/api/readings` | Device API key | Ingest sensor reading |
| GET | `/api/readings` | JWT | Get readings (role-scoped) |
| POST | `/api/readings/sample-upload` | JWT | Upload CSV/JSON |
| GET | `/api/readings/export` | JWT | Download CSV |
| GET | `/api/devices/:id/status` | JWT | lastSeen + connected flag |
| POST | `/api/ml/:stage/train/start` | JWT admin | Start training |
| POST | `/api/ml/:stage/train/stop` | JWT admin | Stop + retrain |
| POST | `/api/ml/:stage/predict` | JWT | Run prediction |
| GET | `/api/ml/:stage/status` | JWT | Training status |
| POST | `/api/alerts` | JWT admin | Create alert |
| GET | `/api/alerts` | JWT | Get alerts (role-scoped) |
| PATCH | `/api/alerts/:id/acknowledge` | JWT | Acknowledge alert |
| GET | `/api/public/insights` | — | Aggregate public data |
=======
# NeerMei
>>>>>>> 54cd9e3b8cf9f49ca8e6fc619a7e009a5c3d7a04
