import { supabase } from '../lib/supabase.js'

export async function queryReadings({ deviceId, stage, source, limit = 100 } = {}) {
  let query = supabase.from('readings').select('id, device_id, stage, sensor_values, source, created_at').order('created_at', { ascending: false }).limit(limit)
  if (deviceId) query = query.eq('device_id', deviceId)
  if (stage) query = query.eq('stage', stage)
  if (source) query = query.eq('source', source)
  return query
}

export { supabase }
