import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authHeader = request.headers.get('Authorization')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader ?? '' } },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ message: 'Authentication required' }, 401)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return json({ message: 'Admin access required' }, 403)

  const { stage, action, payload = {} } = await request.json()
  if (!['pre', 'post'].includes(stage) || !['train/start', 'train/stop', 'buffer', 'reset', 'predict', 'status'].includes(action)) {
    return json({ message: 'Invalid ML request' }, 400)
  }
  const mode = payload.mode ?? (action === 'predict'
    ? (await supabase.from('active_model_modes').select('mode').eq('stage', stage).single()).data?.mode
    : 'dummy')
  if (!['dummy', 'sensor'].includes(mode)) return json({ message: 'Invalid model mode' }, 400)
  const servicePayload = action === 'buffer'
    ? { ...payload, mode }
    : action === 'predict'
      ? { mode, sensorValues: payload }
      : { ...payload, mode }
  const method = action === 'status' ? 'GET' : 'POST'
  try {
    const response = await fetch(`${Deno.env.get('ML_SERVICE_URL') ?? 'http://localhost:8000'}/${stage}/${action}${method === 'GET' ? `?mode=${mode}` : ''}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(servicePayload) : undefined,
    })
    const result = await response.json()
    if (response.ok && action === 'train/stop' && result.status === 'trained') {
      const { data: latest } = await supabase.from('model_versions').select('version').eq('stage', stage).eq('mode', mode).order('version', { ascending: false }).limit(1).maybeSingle()
      await supabase.from('model_versions').insert({
        stage,
        mode,
        algorithm: 'random_forest',
        version: (latest?.version ?? 0) + 1,
        trained_at: result.trained_at,
        accuracy: result.accuracy,
        artifact_path: `${stage}_${mode}_model.joblib`,
      })
    }
    return json(result, response.status)
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'ML service unavailable' }, 502)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}