import { Database, Upload } from 'lucide-react'

export default function TrainingDatasetActions({ stage, mode, onModeChange, onTrainingStarted }) {
  const handleStart = () => {
    onTrainingStarted?.()
  }

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        Dataset mode
        <select value={mode} onChange={event => onModeChange(event.target.value)} style={selectStyle} aria-label={`${stage} dataset mode`}>
          <option value="dummy">Uploaded dataset</option>
          <option value="sensor">Live sensor data</option>
        </select>
      </label>
      <button type="button" onClick={handleStart} style={buttonStyle} title={`Use ${stage} training dataset`}>
        {mode === 'dummy' ? <Upload size={15} /> : <Database size={15} />}
        Use dataset
      </button>
    </div>
  )
}

const containerStyle = { display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }
const selectStyle = { padding: '0.5rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.8rem' }
const buttonStyle = { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }