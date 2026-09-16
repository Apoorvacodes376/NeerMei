import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import LiveGraph from '../../components/LiveGraph.jsx'
import { queryReadings, supabase } from '../../api/client.js'
import { analyzeReading } from '../../lib/thresholds.js'

export default function PurificationAnalysis() {
  const [data, setData] = useState([])
  const [latest, setLatest] = useState({ prediction: 'Unavailable', outOfRange: [] })
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const location = useLocation()

  useEffect(() => {
    if (!location.state?.reading) return
    setLatest({ prediction: location.state.prediction, reading: location.state.reading.sensor_values, outOfRange: location.state.outOfRange })
    setData([{ timestamp: location.state.reading.created_at, value: location.state.isWithinRange ? 1 : 0 }])
  }, [location.state])

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
      const result = analyzeReading('pre', reading.sensor_values)
      const point = { timestamp: reading.created_at, value: result.isWithinRange ? 1 : 0 }
      setLatest({ prediction: result.prediction, reading: reading.sensor_values, outOfRange: result.outOfRange })
      setData(d => [...d, point].slice(-60))
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [deviceId])

  const isPurifiable = latest.prediction === 'Purifiable'

  return (
    <div>
      <div style={headerStyle}><h2 style={pageTitle}>Purification Analysis</h2><DeviceSelect devices={devices} value={deviceId} onChange={setDeviceId} /></div>
      <p style={pageSub}>Pre-purification threshold prediction output</p>
      <div style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
        <StatCard label="Prediction" value={latest.prediction} color={isPurifiable ? 'var(--success)' : 'var(--danger)'} />
        {latest.outOfRange?.length > 0 && <StatCard label="Out of range" value={latest.outOfRange.join(', ')} color="var(--danger)" />}
      </div>
      <LiveGraph data={data} metrics={['value']} title="Purifiability Result — Live" />
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
