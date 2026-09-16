import MLControlPanel from '../../components/MLControlPanel.jsx'

export default function MLTraining1() {
  return (
    <div>
      <div style={headerStyle}>
        <div>
          <h2 style={pageTitle}>Threshold Prediction — Pre-Purification</h2>
          <p style={pageSub}>Analyze pH, turbidity, and TDS against the purifiable ranges</p>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <MLControlPanel stage="pre" />
      </div>
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }
