#!/usr/bin/env node
/**
 * NeerMei USB Serial Bridge
 * Reads sensor lines from ESP32 over USB serial and POSTs them to the backend.
 * Same JSON contract as the WiFi path — backend/frontend are transport-agnostic.
 *
 * Usage:
 *   node bridge.js [--port /dev/ttyUSB0] [--baud 115200]
 *
 * Env vars (or edit defaults below):
 *   INGEST_FUNCTION_URL https://your-project.supabase.co/functions/v1/ingest-reading
 *   DEVICE_API_KEY dev_secret_key
 *   DEVICE_ID     DEV-001
 *   STAGE         pre
 *   SERIAL_PORT   /dev/ttyUSB0  (Windows: COM3)
 */

const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

const INGEST_FUNCTION_URL = process.env.INGEST_FUNCTION_URL || 'http://localhost:54321/functions/v1/ingest-reading'
const DEVICE_API_KEY = process.env.DEVICE_API_KEY || 'dev_secret_key'
const DEVICE_ID      = process.env.DEVICE_ID      || 'DEV-001'
const STAGE          = process.env.STAGE          || 'pre'
const SERIAL_PORT    = process.env.SERIAL_PORT    || 'COM3'
const BAUD_RATE      = parseInt(process.env.BAUD_RATE || '115200', 10)

// Matches: [READ] pH=7.12 turb=1.23 TDS=310.0 temp=24.5 cond=420.0 ts=2024-01-15T10:30:00Z
const LINE_RE = /\[READ\]\s+pH=([\d.]+)\s+turb=([\d.]+)\s+TDS=([\d.]+)\s+temp=([\d.]+)\s+cond=([\d.]+)\s+ts=(\S+)/

async function postReading(sensorValues, timestamp) {
  try {
    const response = await fetch(INGEST_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: DEVICE_ID, apiKey: DEVICE_API_KEY, stage: STAGE, sensorValues, timestamp }),
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(await response.text())
    console.log(`[POST OK] ${timestamp}`)
  } catch (err) {
    console.error(`[POST FAIL] ${err.message}`)
  }
}

const port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE })
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

port.on('open', () => console.log(`[Bridge] Listening on ${SERIAL_PORT} @ ${BAUD_RATE} baud`))
port.on('error', err => { console.error('[Bridge] Serial error:', err.message); process.exit(1) })

parser.on('data', line => {
  const m = line.match(LINE_RE)
  if (!m) return
  const [, pH, turbidity, TDS, temperature, conductivity, timestamp] = m
  postReading(
    { pH: parseFloat(pH), turbidity: parseFloat(turbidity), TDS: parseFloat(TDS), temperature: parseFloat(temperature), conductivity: parseFloat(conductivity) },
    timestamp
  )
})
