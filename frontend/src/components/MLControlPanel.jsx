import { useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { queryReadings, supabase } from '../api/client.js'
import { analyzeReading } from '../lib/thresholds.js'

export default function MLControlPanel({ stage, mode = 'dummy' }) {
  const navigate = useNavigate()
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dataMode, setDataMode] = useState(mode)

  useEffect(() => {
    supabase.from('devices').select('id, location').order('id').then(({ data }) => {
      setDevices(data || [])
      setDeviceId(current => current || data?.[0]?.id || '')
    })
  }, [])

  const handlePredict = async () => {
    setLoading(true)
    setError('')
    try {
      if (!deviceId) throw new Error('Select a device before predicting')
      const { data: readings, error: readingError } = await queryReadings({ deviceId, stage, source: dataMode === 'dummy' ? 'sample_upload' : 'live', limit: 1 })
      if (readingError) throw readingError
      const reading = readings?.[0]
      if (!reading) throw new Error(`No ${dataMode === 'dummy' ? 'existing' : 'live sensor'} data is available for this device`)
      const analysis = analyzeReading(stage, reading.sensor_values)
      navigate(stage === 'pre' ? '/purification' : '/outcome', { state: { ...analysis, reading } })
    } catch (err) {
      setError(err.message || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', padding: '1.5rem' }}>
      <p style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>Threshold Prediction — <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{stage}</span></p>
      <select value={deviceId} onChange={event => setDeviceId(event.target.value)} style={deviceSelect} aria-label="Prediction device">
        {!devices.length && <option value="">No devices available</option>}
        {devices.map(device => <option key={device.id} value={device.id}>{device.id}{device.location ? ` — ${device.location}` : ''}</option>)}
      </select>
      <label style={switchLabel}>
        <span>Existing data</span><input type="checkbox" checked={dataMode === 'sensor'} onChange={event => setDataMode(event.target.checked ? 'sensor' : 'dummy')} style={switchInput} />
        <span style={{ ...switchTrack, backgroundColor: dataMode === 'sensor' ? 'var(--accent)' : 'var(--border)' }}><span style={{ ...switchThumb, transform: dataMode === 'sensor' ? 'translateX(18px)' : 'translateX(2px)' }} /></span><span>Live sensor</span>
      </label>
      <button onClick={handlePredict} disabled={loading || !deviceId} style={btnStyle}><FlaskConical size={15} /> {loading ? 'Predicting…' : 'Predict Model'}</button>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.75rem' }}>{error}</p>}
    </div>
  )
}

const btnStyle = { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }
const deviceSelect = { padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', marginBottom: '1rem', maxWidth: '240px', display: 'block' }
const switchLabel = { display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer', marginBottom: '1rem' }
const switchInput = { position: 'absolute', opacity: 0, pointerEvents: 'none' }
const switchTrack = { width: '36px', height: '20px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center' }
const switchThumb = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'transform 0.15s' }
