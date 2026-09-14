import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabase.js'

export default function Settings() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', alertThresholdPH: '8.5', alertThresholdTurbidity: '4', alertThresholdTDS: '500' })
  const [saved, setSaved] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    await supabase.from('profiles').update({ name: form.name }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      <h2 style={pageTitle}>Settings</h2>
      <p style={pageSub}>Account and device alert preferences</p>
      <form onSubmit={handleSave} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Section title="Account">
          <Field label="Name" value={form.name} onChange={set('name')} />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} />
        </Section>
        <Section title="Alert Thresholds">
          <Field label="Max pH" type="number" step="0.1" value={form.alertThresholdPH} onChange={set('alertThresholdPH')} />
          <Field label="Max Turbidity (NTU)" type="number" step="0.1" value={form.alertThresholdTurbidity} onChange={set('alertThresholdTurbidity')} />
          <Field label="Max TDS (ppm)" type="number" value={form.alertThresholdTDS} onChange={set('alertThresholdTDS')} />
        </Section>
        <button type="submit" style={saveBtn}>{saved ? 'Saved!' : 'Save Changes'}</button>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
      <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
      <input {...props} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }} />
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
const saveBtn = { padding: '0.65rem 1.5rem', borderRadius: '8px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', alignSelf: 'flex-start' }
