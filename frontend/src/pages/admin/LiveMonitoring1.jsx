import { useState, useEffect, useRef } from 'react'
import { Upload, Download } from 'lucide-react'
import SensorTable from '../../components/SensorTable.jsx'
import LiveGraph from '../../components/LiveGraph.jsx'
import { queryReadings, supabase } from '../../api/client.js'
import { parseTrainingDataset, toReadingRows } from '../../lib/dataset.js'
import { THRESHOLDS, analyzeReading, formatRange } from '../../lib/thresholds.js'

export default function LiveMonitoring1() {
  const [rows, setRows] = useState([])
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [mode, setMode] = useState('sensor')
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('devices').select('id, location').order('id').then(({ data, error: deviceError }) => {
      if (deviceError) setError(deviceError.message)
      else {
        setDevices(data || [])
        setDeviceId(current => current || data?.[0]?.id || '')
      }
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!deviceId) return
      const { data, error: queryError } = await queryReadings({ deviceId, stage: 'pre', source: mode === 'dummy' ? 'sample_upload' : 'live', limit: 50 })
      if (queryError) setError(queryError.message)
      else setRows((data || []).map(toRow))
    }
    load()
    const interval = setInterval(() => {
      if (mode === 'dummy') load()
    }, 3000)
    const channel = mode === 'sensor' && deviceId
      ? supabase.channel(`live-readings-${deviceId}`).on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'readings', filter: `device_id=eq.${deviceId}` },
        payload => {
          if (payload.new.stage !== 'pre' || payload.new.source !== 'live') return
          setRows(current => [toRow(payload.new), ...current.filter(row => row.readingId !== payload.new.id)].slice(0, 50))
        },
      ).subscribe()
      : null
    return () => {
      clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
  }, [deviceId, mode])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const records = await parseTrainingDataset(file)
      if (!deviceId) throw new Error('Select a device before uploading data')
      const readingRows = toReadingRows(records, 'pre', deviceId)
      const { data, error: insertError } = await supabase.from('readings').insert(readingRows).select()
      if (insertError) throw insertError
      setMode('dummy')
      setRows((data || readingRows).map(toRow).slice(-50).reverse())
    } catch (uploadError) { setError(uploadError.message || 'Upload failed') }
  }

  const handleDownload = () => {
    const csv = ['timestamp,pH,turbidity,TDS,temperature', ...rows.map(r => [r.timestamp, r.pH, r.turbidity, r.TDS, r.temperature].join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'pre-readings.csv'; a.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={pageTitle}>Live Monitoring — Pre-Purification</h2>
          <p style={pageSub}>Real-time sensor readings before purification stage</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={handleUpload} />
          <select value={deviceId} onChange={e => setDeviceId(e.target.value)} style={deviceSelect} aria-label="Monitoring device">
            {!devices.length && <option value="">No devices available</option>}
            {devices.map(device => <option key={device.id} value={device.id}>{device.id}{device.location ? ` — ${device.location}` : ''}</option>)}
          </select>
          <label style={switchLabel}>
            <span>Existing data</span><input type="checkbox" checked={mode === 'sensor'} onChange={e => setMode(e.target.checked ? 'sensor' : 'dummy')} style={switchInput} />
            <span style={{ ...switchTrack, backgroundColor: mode === 'sensor' ? 'var(--accent)' : 'var(--border)' }}><span style={{ ...switchThumb, transform: mode === 'sensor' ? 'translateX(18px)' : 'translateX(2px)' }} /></span><span>Live sensor</span>
          </label>
          <button onClick={() => fileRef.current.click()} style={iconBtn} title="Upload sample dataset">
            <Upload size={16} />
          </button>
          <button onClick={handleDownload} style={iconBtn} title="Download current dataset">
            <Download size={16} />
          </button>
        </div>
      </div>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
      <LiveGraph data={rows.slice().reverse()} metrics={['pH', 'turbidity', 'TDS']} title="pH, Turbidity & TDS — Live" />
      <ThresholdSummary stage="pre" rows={rows} />
      <div style={{ marginTop: '1.5rem' }}>
        <SensorTable rows={rows.map(row => ({ ...row, outOfRange: analyzeReading('pre', row).outOfRange }))} />
      </div>
    </div>
  )
}

function ThresholdSummary({ stage, rows }) {
  const latest = rows[0]
  const analysis = latest && analyzeReading(stage, latest)
  return <div style={thresholdWrap}>
    <strong>Applicable thresholds</strong>
    <span>pH {formatRange(THRESHOLDS[stage].ranges.pH)}</span>
    <span>Turbidity {formatRange(THRESHOLDS[stage].ranges.turbidity)}</span>
    <span>TDS {formatRange(THRESHOLDS[stage].ranges.TDS)}</span>
    {analysis?.outOfRange.length > 0 && <span style={{ color: 'var(--danger)' }}>Out of range: {analysis.outOfRange.join(', ')}</span>}
  </div>
}

function toRow(reading) {
  return { readingId: reading.id, timestamp: reading.created_at, ...reading.sensor_values }
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
const iconBtn = { padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }
const switchLabel = { display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }
const switchInput = { position: 'absolute', opacity: 0, pointerEvents: 'none' }
const switchTrack = { width: '36px', height: '20px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center' }
const switchThumb = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'transform 0.15s' }
const thresholdWrap = { display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.9rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }
const deviceSelect = { padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.8rem', maxWidth: '220px' }
