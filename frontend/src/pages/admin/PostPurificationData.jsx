import { useState, useEffect, useRef } from 'react'
import { WifiOff, Upload, Download } from 'lucide-react'
import SensorTable from '../../components/SensorTable.jsx'
import LiveGraph from '../../components/LiveGraph.jsx'
import { useDeviceStatus } from '../../hooks/useDeviceStatus.js'
import { invokeMl, queryReadings, supabase } from '../../api/client.js'
import { parseTrainingDataset, toReadingRows } from '../../lib/dataset.js'

export default function PostPurificationData() {
  const [rows, setRows] = useState([])
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [mode, setMode] = useState('sensor')
  const [error, setError] = useState('')
  const { connected } = useDeviceStatus(deviceId)
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
      const { data, error: queryError } = await queryReadings({ deviceId, stage: 'post', source: mode === 'dummy' ? 'sample_upload' : 'live', limit: 50 })
      if (queryError) setError(queryError.message)
      else setRows((data || []).map(reading => ({ timestamp: reading.created_at, ...reading.sensor_values })))
    }
    load()
    const interval = setInterval(() => {
      load()
    }, 3000)
    return () => clearInterval(interval)
  }, [deviceId, mode])

  const handleUpload = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      const records = await parseTrainingDataset(file)
      if (!deviceId) throw new Error('Select a device before uploading data')
      const readingRows = toReadingRows(records, 'post', deviceId)
      const { data, error: insertError } = await supabase.from('readings').insert(readingRows).select()
      if (insertError) throw insertError
      setMode('dummy')
      setRows((data || readingRows).map(reading => ({ timestamp: reading.created_at, ...reading.sensor_values })).slice(-50).reverse())
      await invokeMl('post', 'train/start', { mode: 'dummy' })
      await invokeMl('post', 'buffer/batch', { mode: 'dummy', entries: records.map(({ sensorValues, label }) => ({ sensorValues, label })) })
    } catch (uploadError) { setError(uploadError.message || 'Upload failed') }
  }

  const handleDownload = () => {
    const csv = ['timestamp,pH,turbidity,TDS,temperature,conductivity', ...rows.map(r => Object.values(r).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'post-readings.csv'; a.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={pageTitle}>Post-Purification Data</h2>
          <p style={pageSub}>Sensor readings after purification stage</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {!connected && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.8rem' }}><WifiOff size={16} /> Hardware disconnected</div>}
          <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={handleUpload} />
          <select value={deviceId} onChange={e => setDeviceId(e.target.value)} style={deviceSelect} aria-label="Monitoring device">
            {!devices.length && <option value="">No devices available</option>}
            {devices.map(device => <option key={device.id} value={device.id}>{device.id}{device.location ? ` — ${device.location}` : ''}</option>)}
          </select>
          <label style={switchLabel}>
            <span>Existing data</span><input type="checkbox" checked={mode === 'dummy'} onChange={e => setMode(e.target.checked ? 'dummy' : 'sensor')} style={switchInput} />
            <span style={{ ...switchTrack, backgroundColor: mode === 'dummy' ? 'var(--accent)' : 'var(--border)' }}><span style={{ ...switchThumb, transform: mode === 'dummy' ? 'translateX(18px)' : 'translateX(2px)' }} /></span><span>Live sensor</span>
          </label>
          <button onClick={() => fileRef.current.click()} style={iconBtn} title="Upload sample dataset"><Upload size={16} /></button>
          <button onClick={handleDownload} style={iconBtn} title="Download current dataset"><Download size={16} /></button>
        </div>
      </div>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
      <LiveGraph data={rows.slice().reverse()} metrics={['pH', 'TDS']} title="pH & TDS — Post-Purification Live" />
      <div style={{ marginTop: '1.5rem' }}><SensorTable rows={rows} /></div>
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
const iconBtn = { padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }
const switchLabel = { display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }
const switchInput = { position: 'absolute', opacity: 0, pointerEvents: 'none' }
const switchTrack = { width: '36px', height: '20px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center' }
const switchThumb = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'transform 0.15s' }
const deviceSelect = { padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.8rem', maxWidth: '220px' }
