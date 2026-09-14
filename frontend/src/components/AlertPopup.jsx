import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export default function AlertPopup() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!user) return
    const load = () => supabase.from('alerts').select('*').eq('user_id', user.id).eq('acknowledged', false).order('created_at', { ascending: false }).limit(5).then(({ data }) => setAlerts(data || []))
    load()
    const channel = supabase.channel(`user-alerts-${user.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` }, alert => {
      setAlerts(current => [alert.new, ...current].slice(0, 5))
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const dismiss = (id) => setAlerts(a => a.filter(x => x.id !== id))

  if (!alerts.length) return null

  return (
    <div style={{ position: 'fixed', bottom: '5rem', right: '1.5rem', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '340px' }}>
      {alerts.map(alert => (
        <div key={alert.id} style={{
          backgroundColor: 'var(--bg-surface)', border: `1px solid var(--danger)`,
          borderRadius: '10px', padding: '1rem', display: 'flex', gap: '0.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '0.2rem' }}>Abnormal Reading Detected</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{alert.message}</p>
          </div>
          <button onClick={() => dismiss(alert.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
