import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405)

  const { deviceId, apiKey, stage, sensorValues } = await request.json()
  if (!deviceId || !apiKey || !stage || !sensorValues) {
    return json({ message: 'deviceId, apiKey, stage and sensorValues are required' }, 400)
  }
  if (!['pre', 'post'].includes(stage) || typeof sensorValues !== 'object' || Array.isArray(sensorValues)) {
    return json({ message: 'Invalid stage or sensor values' }, 400)
  }
  const sensorNumbers = ['pH', 'turbidity', 'TDS']
  if (sensorNumbers.some(key => !Number.isFinite(Number(sensorValues[key])))) {
    return json({ message: 'Sensor values must be numeric' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: device, error: deviceError } = await supabase
    .from('devices').select('id, owner_id').eq('id', deviceId).eq('api_key', apiKey).maybeSingle()
  if (deviceError || !device) return json({ message: 'Invalid device credentials' }, 401)

  const thresholds = stage === 'pre'
    ? {
        pH: { min: 6, max: 8.5 },
        turbidity: { min: 1, max: 5 },
        TDS: { min: 0, max: 2000 },
      }
    : {
        pH: { min: 6, max: 8.5 },
        turbidity: { min: 0, max: 1 },
        TDS: { min: 0, max: 500 },
      }

  const pH = Number(sensorValues.pH)
  const turbidity = Number(sensorValues.turbidity)
  const tds = Number(sensorValues.TDS)
  const outOfRange = [
    !Number.isFinite(pH) || pH < thresholds.pH.min || pH > thresholds.pH.max ? 'pH' : null,
    !Number.isFinite(turbidity) || turbidity < thresholds.turbidity.min || turbidity > thresholds.turbidity.max
      ? 'turbidity'
      : null,
    !Number.isFinite(tds) || tds < thresholds.TDS.min || tds > thresholds.TDS.max ? 'TDS' : null,
  ].filter((parameter): parameter is string => parameter !== null)
  const passes = outOfRange.length === 0
  const result = stage === 'pre'
    ? (passes ? 'purifiable' : 'not purifiable')
    : (passes ? 'safe' : 'not safe')

  const { data: reading, error } = await supabase
    .from('readings')
    .insert({
      device_id: deviceId,
      stage,
      sensor_values: { ...sensorValues, result, outOfRange },
      source: 'live',
    })
    .select().single()
  if (error) return json({ message: error.message }, 500)

  if (!passes && device.owner_id) {
    const details = outOfRange.map((parameter) => `${parameter} ${sensorValues[parameter]}`).join(', ')
    await supabase.from('alerts').insert({
      device_id: deviceId,
      user_id: device.owner_id,
      message: `${stage === 'pre' ? 'Non-purifiable' : 'Unsafe'} reading detected: ${details}`,
      severity: 'high',
    })
  }

  await supabase.from('devices').update({ last_seen: new Date().toISOString() }).eq('id', deviceId)
  return json(reading, 201)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}