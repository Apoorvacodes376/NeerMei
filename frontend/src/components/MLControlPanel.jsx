import { useEffect, useState } from 'react'
import { Play, Square, FlaskConical, Loader } from 'lucide-react'
import { invokeMl, queryReadings, supabase } from '../api/client.js'

export default function MLControlPanel({ stage, mode = 'dummy', onStatusChange, externalStatus }) {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [progressStage, setProgressStage] = useState('idle')
  const [accuracy, setAccuracy] = useState(null)
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [lastPrediction, setLastPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const applyStatus = data => {
    setStatus(data?.status || 'idle')
    setProgress(Number(data?.progress || 0))
    setProgressStage(data?.progress_stage || 'idle')
    setAccuracy(data?.accuracy == null ? null : Number(data.accuracy))
    onStatusChange?.(data?.status || 'idle')
  }

  useEffect(() => {
    supabase.from('devices').select('id, location').order('id').then(({ data }) => {
      setDevices(data || [])
      setDeviceId(current => current || data?.[0]?.id || '')
    })
  }, [])

  useEffect(() => {
    invokeMl(stage, 'status', { mode }).then(({ data }) => applyStatus(data)).catch(() => {})
  }, [stage, mode])

  useEffect(() => {
    if (externalStatus) setStatus(externalStatus)
  }, [externalStatus])

  useEffect(() => {
    if (!['collecting', 'training'].includes(status)) return undefined
    const poll = () => invokeMl(stage, 'status', { mode }).then(({ data }) => applyStatus(data)).catch(() => {})
    const interval = setInterval(poll, 500)
    return () => clearInterval(interval)
  }, [stage, mode, status])

  const handleTrain = async () => {
    setLoading(true); setError('')
    try {
      if (status === 'training') return
      const action = ['idle', 'completed', 'failed'].includes(status) ? 'train/start' : 'train/stop'
      const { data } = await invokeMl(stage, action, { mode })
      applyStatus(data)
    } catch (err) { setError(err.message || 'ML service unavailable') } finally { setLoading(false) }
  }

  const handleTest = async () => {
    setLoading(true); setError('')
    try {
      if (!deviceId) throw new Error('Select a device before testing the model')
      const { data: readings, error: readingError } = await queryReadings({
        deviceId,
        stage,
        source: mode === 'dummy' ? 'sample_upload' : 'live',
        limit: 1,
      })
      if (readingError) throw readingError
      const reading = readings?.[0]
      if (!reading) throw new Error(`No ${mode === 'dummy' ? 'uploaded' : 'live sensor'} data is available for this device`)
      const { label, ...sensorValues } = reading.sensor_values || {}
      const { data } = await invokeMl(stage, 'predict', { mode, ...sensorValues })
      setLastPrediction({ ...data, prediction: Number(data?.prediction) === 1 ? 'Purifiable' : 'Not Purifiable', isActual: true })
    } catch (err) { setError(err.message || 'ML service unavailable') } finally { setLoading(false) }
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', padding: '1.5rem' }}>
      <p style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
        ML Control — <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{stage}</span>
      </p>
      <select value={deviceId} onChange={event => setDeviceId(event.target.value)} style={deviceSelect} aria-label="ML test device">
        {!devices.length && <option value="">No devices available</option>}
        {devices.map(device => <option key={device.id} value={device.id}>{device.id}{device.location ? ` — ${device.location}` : ''}</option>)}
      </select>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={handleTrain} disabled={loading || status === 'training'} style={btnStyle(status === 'collecting' ? 'var(--danger)' : 'var(--success)')}>
          {loading ? <Loader size={15} className="animate-spin" /> : status === 'collecting' ? <Square size={15} /> : <Play size={15} />}
          {status === 'collecting' ? 'Stop Data Collection' : status === 'training' ? 'Training…' : 'Start Training'}
        </button>
        <button onClick={handleTest} disabled={loading || status === 'training' || !deviceId} style={btnStyle('var(--accent)')}>
          <FlaskConical size={15} /> Test Model
        </button>
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
        <span>Status: <strong style={{ color: status === 'failed' ? 'var(--danger)' : status === 'training' || status === 'collecting' ? 'var(--warning)' : 'var(--success)' }}>{status}</strong></span>
        {['collecting', 'training', 'completed'].includes(status) && <span>Progress: <strong>{progress}%</strong> {progressStage}</span>}
        {accuracy != null && <span style={{ color: 'var(--accent)' }}>Accuracy: <strong>{(accuracy * 100).toFixed(1)}%</strong></span>}
        {lastPrediction && (
          <span>Last prediction: <strong style={{ color: lastPrediction.isActual ? 'var(--accent)' : 'var(--danger)' }}>{lastPrediction.prediction}</strong> ({(lastPrediction.confidence * 100).toFixed(1)}%)</span>
        )}
      </div>
      {['collecting', 'training', 'completed'].includes(status) && <div style={progressTrack}><div style={{ ...progressFill, width: `${progress}%` }} /></div>}
      {status === 'failed' && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.75rem' }}>Training failed. Check the dataset and try again.</p>}
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.75rem' }}>{error}</p>}
    </div>
  )
}

const btnStyle = (bg) => ({
  display: 'flex', alignItems: 'center', gap: '0.4rem',
  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
  backgroundColor: bg, color: '#fff', cursor: 'pointer',
  fontSize: '0.85rem', fontWeight: 600,
})
const progressTrack = { height: '8px', borderRadius: '4px', backgroundColor: 'var(--border)', overflow: 'hidden', marginTop: '1rem' }
const progressFill = { height: '100%', borderRadius: '4px', backgroundColor: 'var(--accent)', transition: 'width 0.2s ease' }
const deviceSelect = { padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', marginBottom: '1rem', maxWidth: '240px' }
