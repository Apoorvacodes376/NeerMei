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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: device, error: deviceError } = await supabase
    .from('devices').select('id, owner_id').eq('id', deviceId).eq('api_key', apiKey).maybeSingle()
  if (deviceError || !device) return json({ message: 'Invalid device credentials' }, 401)

  const { data: reading, error } = await supabase
    .from('readings')
    .insert({ device_id: deviceId, stage, sensor_values: sensorValues, source: 'live' })
    .select().single()
  if (error) return json({ message: error.message }, 500)

  const pH = Number(sensorValues.pH)
  const turbidity = Number(sensorValues.turbidity)
  const tds = Number(sensorValues.TDS)
  const abnormal = pH < 6.5 || pH > 8.5 || turbidity > 4 || tds > 500
  if (abnormal && device.owner_id) {
    const details = [
      pH < 6.5 || pH > 8.5 ? `pH ${pH}` : null,
      turbidity > 4 ? `turbidity ${turbidity}` : null,
      tds > 500 ? `TDS ${tds}` : null,
    ].filter(Boolean).join(', ')
    await supabase.from('alerts').insert({
      device_id: deviceId,
      user_id: device.owner_id,
      message: `Abnormal reading detected: ${details}`,
      severity: 'high',
    })
  }

  await supabase.from('devices').update({ last_seen: new Date().toISOString() }).eq('id', deviceId)
  return json(reading, 201)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}