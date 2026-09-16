export async function parseTrainingDataset(file) {
  const text = await file.text()
  const isJson = file.name.toLowerCase().endsWith('.json')
  const parsed = isJson ? JSON.parse(text) : parseCsv(text)
  const rows = isJson ? (Array.isArray(parsed) ? parsed : parsed.data) : parsed.rows
  const headers = isJson ? Object.keys(rows?.[0] || {}) : parsed.headers
  if (!rows?.length) throw new Error('Dataset is empty')
  const featureColumns = ['pH', 'turbidity', 'TDS', 'temperature']
  if (featureColumns.some(column => !headers.includes(column))) throw new Error('Dataset must contain pH, turbidity, TDS, and temperature columns')
  return rows.map(row => {
    const timestamp = row.timestamp || row.time || row.created_at || new Date().toISOString()
    const sensorValues = Object.fromEntries(featureColumns.map(column => [column, toValue(row[column])]))
    if (Object.values(sensorValues).some(value => value === null)) {
      throw new Error('Input columns must contain numeric values or parseable timestamps')
    }
    return { timestamp, sensorValues }
  })
}

export function toReadingRows(records, stage, deviceId = 'DEV-001') {
  return records.map(record => ({
    device_id: deviceId,
    stage,
    sensor_values: record.sensorValues,
    source: 'sample_upload',
    created_at: record.timestamp,
  }))
}

function toValue(value) {
  const number = Number(value)
  if (Number.isFinite(number)) return number
  const timestamp = Date.parse(String(value))
  return Number.isNaN(timestamp) ? null : timestamp
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const headers = lines.shift().split(',').map(header => header.trim())
  const rows = lines.map(line => line.split(',').reduce((row, value, index) => ({ ...row, [headers[index]]: value.trim() }), {}))
  return { headers, rows }
}
