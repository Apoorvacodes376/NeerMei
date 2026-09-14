import { useEffect, useState } from 'react'
import { Send, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

const SEV_COLOR = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--text-secondary)' }

export default function AlertsHistorical() {
  const [alerts, setAlerts] = useState([])
  const [filter, setFilter] = useState('')
  const [sendForm, setSendForm] = useState({ deviceId: '', message: '', severity: 'medium' })

  useEffect(() => {
    supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(200).then(({ data }) => setAlerts(data || []))
  }, [])

  const filtered = filter ? alerts.filter(a => a.device_id?.toLowerCase().includes(filter.toLowerCase())) : alerts

  const handleSend = async () => {
    if (!sendForm.deviceId || !sendForm.message) return
    const { data: device } = await supabase.from('devices').select('owner_id').eq('id', sendForm.deviceId).maybeSingle()
    if (!device?.owner_id) return
    const { data } = await supabase.from('alerts').insert({ device_id: sendForm.deviceId, user_id: device.owner_id, message: sendForm.message, severity: sendForm.severity }).select().single()
    if (data) setAlerts(a => [data, ...a])
    setSendForm({ deviceId: '', message: '', severity: 'medium' })
  }

  const acknowledge = async (id) => {
    await supabase.from('alerts').update({ acknowledged: true }).eq('id', id)
    setAlerts(a => a.map(x => x.id === id ? { ...x, acknowledged: true } : x))
  }

  return (
    <div>
      <h2 style={pageTitle}>Alerts & Historical Data</h2>
      <p style={pageSub}>View past alerts and send manual alerts to specific devices</p>

      {/* Send Alert */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', margin: '1.5rem 0' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Send Manual Alert</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input placeholder="Device ID" value={sendForm.deviceId} onChange={e => setSendForm(f => ({ ...f, deviceId: e.target.value }))} style={inputStyle} />
          <input placeholder="Message" value={sendForm.message} onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))} style={{ ...inputStyle, flex: 2 }} />
          <select value={sendForm.severity} onChange={e => setSendForm(f => ({ ...f, severity: e.target.value }))} style={inputStyle}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button onClick={handleSend} style={sendBtn}><Send size={15} /> Send</button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Filter size={15} color="var(--text-secondary)" />
        <input placeholder="Filter by device ID…" value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, width: '220px' }} />
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map(alert => (
          <div key={alert.id} style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid var(--border)`, borderLeft: `4px solid ${SEV_COLOR[alert.severity]}`, borderRadius: '8px', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{alert.message}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{alert.device_id} · {new Date(alert.created_at).toLocaleString()}</p>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: SEV_COLOR[alert.severity], color: '#fff', fontWeight: 600 }}>{alert.severity}</span>
            {!alert.acknowledged && (
              <button onClick={() => acknowledge(alert.id)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Acknowledge
              </button>
            )}
            {alert.acknowledged && <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Acknowledged</span>}
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '1rem 0' }}>No alerts found.</p>}
      </div>
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
const inputStyle = { padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }
const sendBtn = { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }
