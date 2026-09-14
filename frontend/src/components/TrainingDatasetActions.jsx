import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { invokeMl } from '../api/client.js'
import { parseTrainingDataset } from '../lib/dataset.js'

export default function TrainingDatasetActions({ stage, mode, onModeChange, onTrainingStarted }) {
  const fileRef = useRef()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleUpload = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage(''); setError('')
    const uploadMode = 'dummy'
    try {
      const records = await parseTrainingDataset(file)
      onModeChange?.(uploadMode)
      await invokeMl(stage, 'train/start', { mode: uploadMode })
      onTrainingStarted?.()
      await invokeMl(stage, 'buffer/batch', { mode: uploadMode, entries: records.map(({ sensorValues, label }) => ({ sensorValues, label })) })
      await invokeMl(stage, 'train/stop', { mode: uploadMode })
      setMessage(`${records.length} rows uploaded; training started`)
    } catch (uploadError) {
      try { await invokeMl(stage, 'reset', { mode: uploadMode }) } catch {}
      setError(uploadError.message || 'Could not read this dataset')
    }
  }

  const handleDownload = () => {
    const csv = 'pH,turbidity,TDS,temperature,conductivity,label\n'
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = `${stage}-training-template.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div style={actionsWrap}>
      <label style={switchLabel} title="Use existing uploaded data or live sensor readings">
        <span>Existing data</span>
        <input type="checkbox" checked={mode === 'dummy'} onChange={event => onModeChange(event.target.checked ? 'dummy' : 'sensor')} style={switchInput} />
        <span style={{ ...switchTrack, backgroundColor: mode === 'dummy' ? 'var(--accent)' : 'var(--border)' }}><span style={{ ...switchThumb, transform: mode === 'dummy' ? 'translateX(18px)' : 'translateX(2px)' }} /></span>
        <span>Live sensor</span>
      </label>
      <input ref={fileRef} type="file" accept=".csv,.json" hidden onChange={handleUpload} />
      <button onClick={() => fileRef.current?.click()} style={iconBtn} title="Upload training dataset"><Upload size={16} /></button>
      <button onClick={handleDownload} style={iconBtn} title="Download training template"><Download size={16} /></button>
      {(message || error) && <span style={{ color: error ? 'var(--danger)' : 'var(--success)', fontSize: '0.75rem' }}>{error || message}</span>}
    </div>
  )
}

const actionsWrap = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'wrap' }
const switchLabel = { display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }
const switchInput = { position: 'absolute', opacity: 0, pointerEvents: 'none' }
const switchTrack = { width: '36px', height: '20px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', transition: 'background-color 0.15s' }
const switchThumb = { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'transform 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }
const iconBtn = { padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }