import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { invokeMl } from '../../api/client.js'

export default function Settings() {
  const [modes, setModes] = useState({ pre: 'dummy', post: 'dummy' })
  const [saved, setSaved] = useState('')

  useEffect(() => {
    supabase.from('active_model_modes').select('stage, mode').then(({ data }) => {
      if (data) setModes(current => data.reduce((next, row) => ({ ...next, [row.stage]: row.mode }), current))
    })
  }, [])

  const changeMode = async (stage, mode) => {
    setSaved('')
    const previous = modes[stage]
    setModes(current => ({ ...current, [stage]: mode }))
    try {
      await invokeMl(stage, 'reset', { mode })
    } catch {
      setModes(current => ({ ...current, [stage]: previous }))
      return
    }
    const { error } = await supabase.from('active_model_modes').upsert({ stage, mode, updated_at: new Date().toISOString() })
    if (error) setModes(current => ({ ...current, [stage]: previous }))
    else setSaved(`${stage} active mode updated`)
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <h2 style={pageTitle}>Admin Settings</h2>
      <p style={pageSub}>Choose which trained model supplies dashboard predictions for each stage.</p>
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {['pre', 'post'].map(stage => (
          <label key={stage} style={rowStyle}>
            <span>
              <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{stage}-purification</strong>
              <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Changing this clears the selected mode until it is retrained.</small>
            </span>
            <select value={modes[stage]} onChange={event => changeMode(stage, event.target.value)} style={selectStyle}>
              <option value="dummy">Existing data</option>
              <option value="sensor">Live sensor</option>
            </select>
          </label>
        ))}
      </div>
      {saved && <p style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '1rem' }}>{saved}</p>}
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem 1.1rem' }
const selectStyle = { padding: '0.55rem 0.7rem', borderRadius: '7px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }
