import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Polls the Supabase devices table every intervalMs.
 * Returns { connected: bool, lastSeen: string|null, loading: bool }
 */
export function useDeviceStatus(deviceId, intervalMs = 15_000) {
  const [state, setState] = useState({ connected: true, lastSeen: null, loading: true })

  useEffect(() => {
    if (!deviceId) return
    let cancelled = false

    const check = async () => {
      try {
        const { data, error } = await supabase.from('devices').select('last_seen').eq('id', deviceId).maybeSingle()
        if (error) throw error
        const lastSeen = data?.last_seen || null
        const connected = lastSeen ? Date.now() - new Date(lastSeen).getTime() < 120000 : false
        if (!cancelled) setState({ connected, lastSeen, loading: false })
      } catch {
        if (!cancelled) setState(s => ({ ...s, connected: false, loading: false }))
      }
    }

    check()
    const id = setInterval(check, intervalMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [deviceId, intervalMs])

  return state
}
