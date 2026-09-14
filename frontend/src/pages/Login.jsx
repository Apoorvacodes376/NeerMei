import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Globe } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword(form)
      if (error) throw error
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      navigate(profile?.role === 'admin' ? '/monitoring/pre' : '/device')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) setError(error.message)
  }

  return (
    <div style={pageWrap}>
      <div style={card}>
        <h1 style={heading}>Sign In</h1>
        <p style={sub}>Welcome back to NeerMei</p>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field icon={<Mail size={16} />} type="email" placeholder="Email address" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          <Field icon={<Lock size={16} />} type="password" placeholder="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
          <button type="submit" disabled={loading} style={primaryBtn}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
        <div style={divider}><span style={{ padding: '0 0.75rem', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>or</span></div>
        <button onClick={handleGoogle} style={googleBtn}>
          <Globe size={16} /> Continue with Google
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1.25rem' }}>
          No account? <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ icon, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>{icon}</span>
      <input {...props} onChange={e => props.onChange(e.target.value)} style={inputStyle} />
    </div>
  )
}

const pageWrap = { minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }
const card = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '2.5rem', width: '100%', maxWidth: '420px' }
const heading = { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }
const sub = { fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }
const primaryBtn = { padding: '0.7rem', borderRadius: '8px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }
const googleBtn = { width: '100%', padding: '0.7rem', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }
const divider = { position: 'relative', textAlign: 'center', margin: '1.25rem 0', borderTop: '1px solid var(--border)' }
const inputStyle = { width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }
