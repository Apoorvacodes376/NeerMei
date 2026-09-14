import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { invokeMl, queryReadings, supabase } from '../../api/client.js'

export default function Outcome() {
  const [history, setHistory] = useState([])
  const [latest, setLatest] = useState({ status: 'Unavailable', confidence: 0 })
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')

  useEffect(() => {
    supabase.from('devices').select('id, location').order('id').then(({ data: deviceRows }) => {
      setDevices(deviceRows || [])
      setDeviceId(current => current || deviceRows?.[0]?.id || '')
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!deviceId) return
      const { data: readings } = await queryReadings({ deviceId, stage: 'post', limit: 12 })
      if (!readings?.length) return
      const predictions = await Promise.all(readings.slice().reverse().map(async reading => {
        try {
          const { data: result } = await invokeMl('post', 'predict', reading.sensor_values)
          return { time: new Date(reading.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }), purified: Number(result.prediction) === 1 ? 1 : 0, confidence: Number(result.confidence || 0) }
        } catch { return null }
      }))
      const points = predictions.filter(Boolean)
      if (points.length) {
        const current = points[points.length - 1]
        setHistory(points)
        setLatest({ status: current.purified ? 'Purified' : 'Not Purified', confidence: current.confidence })
      }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [deviceId])

  const purifiedCount = history.filter(h => h.purified).length
  const pct = ((purifiedCount / history.length) * 100).toFixed(0)

  return (
    <div>
      <div style={headerStyle}><h2 style={pageTitle}>Outcome</h2><DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} /></div>
      <p style={pageSub}>Final purification status from post-purification ML classifier</p>
      <div style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
        {[
          { label: 'Current Status', value: latest.status, color: latest.status === 'Purified' ? 'var(--success)' : 'var(--danger)' },
          { label: 'Confidence', value: `${(latest.confidence * 100).toFixed(1)}%`, color: 'var(--accent)' },
          { label: 'Purified Rate (last 12)', value: `${pct}%`, color: 'var(--success)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem 2rem', minWidth: '160px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</p>
          </div>
        ))}
      </div>
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>Purification Status Over Time</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={v => v ? 'Yes' : 'No'} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip formatter={(v) => v ? 'Purified' : 'Not Purified'} contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }} />
            <Bar dataKey="purified" radius={[4, 4, 0, 0]}>
              {history.map((entry, i) => <Cell key={i} fill={entry.purified ? 'var(--success)' : 'var(--danger)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DeviceSelect({ devices, value, onChange }) {
  return <select value={value} onChange={event => onChange(event.target.value)} style={deviceSelect} aria-label="Outcome device">
    {!devices.length && <option value="">No devices available</option>}
    {devices.map(device => <option key={device.id} value={device.id}>{device.id}{device.location ? ` — ${device.location}` : ''}</option>)}
  </select>
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }
const deviceSelect = { padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.8rem' }
