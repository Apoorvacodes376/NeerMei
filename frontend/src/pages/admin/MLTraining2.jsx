import { useState } from 'react'
import MLControlPanel from '../../components/MLControlPanel.jsx'
import TrainingDatasetActions from '../../components/TrainingDatasetActions.jsx'

export default function MLTraining2() {
  const [mode, setMode] = useState('dummy')
  const [status, setStatus] = useState('idle')

  return (
    <div>
      <div style={headerStyle}>
        <div>
          <h2 style={pageTitle}>ML Training / Testing — Post-Purification</h2>
          <p style={pageSub}>Train and test the potability classifier on post-purification sensor data</p>
        </div>
        <TrainingDatasetActions stage="post" mode={mode} onModeChange={setMode} onTrainingStarted={() => setStatus('training')} />
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <MLControlPanel stage="post" mode={mode} externalStatus={status} onStatusChange={setStatus} />
      </div>
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }
