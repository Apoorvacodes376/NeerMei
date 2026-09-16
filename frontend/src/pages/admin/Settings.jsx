
export default function Settings() {
  return (
    <div style={{ maxWidth: '560px' }}>
      <h2 style={pageTitle}>Admin Settings</h2>
      <p style={pageSub}>Predictions use the fixed threshold ranges for each purification stage.</p>
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
