import { useState, useEffect } from 'react'
import LiveGraph from '../../components/LiveGraph.jsx'
import { invokeMl, queryReadings, supabase } from '../../api/client.js'

export default function PurificationAnalysis() {
  const [data, setData] = useState([])
  const [latest, setLatest] = useState({ prediction: 'Unavailable', confidence: 0 })
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
      const { data: readings } = await queryReadings({ deviceId, stage: 'pre', limit: 1 })
      const reading = readings?.[0]
      if (!reading) return
      try {
        const { data: result } = await invokeMl('pre', 'predict', reading.sensor_values)
        const point = { timestamp: reading.created_at, confidence: Number(result.confidence || 0) }
        setLatest({ prediction: Number(result.prediction) === 1 ? 'Purifiable' : 'Not Purifiable', confidence: point.confidence })
        setData(d => [...d, point].slice(-60))
      } catch { setLatest({ prediction: 'Unavailable', confidence: 0 }) }
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [deviceId])

  const pct = (latest.confidence * 100).toFixed(1)
  const isPurifiable = latest.prediction === 'Purifiable'

  return (
    <div>
      <div style={headerStyle}><h2 style={pageTitle}>Purification Analysis</h2><DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} /></div>
      <p style={pageSub}>Pre-purification ML model prediction output</p>
      <div style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
        <StatCard label="Prediction" value={latest.prediction} color={isPurifiable ? 'var(--success)' : 'var(--danger)'} />
        <StatCard label="Confidence" value={`${pct}%`} color="var(--accent)" />
      </div>
      <LiveGraph data={data} metrics={['confidence']} title="Purifiability Confidence — Live" />
    </div>
  )
}

function DeviceSelect({ devices, value, onChange }) {
  return <select value={value} onChange={event => onChange(event.target.value)} style={deviceSelect} aria-label="Analysis device">
    {!devices.length && <option value="">No devices available</option>}
    {devices.map(device => <option key={device.id} value={device.id}>{device.id}{device.location ? ` — ${device.location}` : ''}</option>)}
  </select>
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem 2rem', minWidth: '160px' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</p>
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }
const deviceSelect = { padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.8rem' }
