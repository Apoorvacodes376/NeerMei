import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'

const SEV_ICON = { high: AlertTriangle, medium: Info, low: Info }
const SEV_COLOR = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--text-secondary)' }

export default function UserAlerts() {
  const [alerts, setAlerts] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const load = () => supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setAlerts(data || []))
    load()
    const channel = supabase.channel(`user-alert-history-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` }, load).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  return (
    <div>
      <h2 style={pageTitle}>Alerts</h2>
      <p style={pageSub}>Alert history for your device</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
        {alerts.map(alert => {
          const Icon = SEV_ICON[alert.severity]
          return (
            <div key={alert.id} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: `4px solid ${SEV_COLOR[alert.severity]}`, borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem' }}>
              <Icon size={18} color={SEV_COLOR[alert.severity]} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{alert.message}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0' }}>Device: {alert.device_id}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(alert.created_at).toLocaleString()}</p>
              </div>
              {alert.acknowledged
                ? <CheckCircle size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                : <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '999px', backgroundColor: SEV_COLOR[alert.severity], color: '#fff', fontWeight: 600, height: 'fit-content' }}>New</span>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
