import { supabase } from '../lib/supabase.js'

export async function queryReadings({ deviceId, stage, source, limit = 100 } = {}) {
  let query = supabase.from('readings').select('id, device_id, stage, sensor_values, source, created_at').order('created_at', { ascending: false }).limit(limit)
  if (deviceId) query = query.eq('device_id', deviceId)
  if (stage) query = query.eq('stage', stage)
  if (source) query = query.eq('source', source)
  return query
}

export async function invokeMl(stage, action, payload = {}) {
  const { mode: requestedMode, ...sensorValues } = payload
  const mode = requestedMode ?? (action === 'predict'
    ? (await supabase.from('active_model_modes').select('mode').eq('stage', stage).single()).data?.mode
    : 'dummy')
  const request = action === 'status'
    ? { method: 'GET' }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'predict'
          ? { mode, sensorValues }
          : { ...sensorValues, mode }),
      }
  const url = `${import.meta.env.VITE_ML_SERVICE_URL}/${stage}/${action}${action === 'status' ? `?mode=${mode}` : ''}`
  const response = await fetch(url, request)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || data.message || `ML service returned ${response.status}`)
  return { data }
}

export { supabase }
