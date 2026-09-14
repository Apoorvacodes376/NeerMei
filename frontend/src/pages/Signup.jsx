import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Cpu, KeyRound, Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export default function Signup() {
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState('user')
  const [form, setForm] = useState({ name: '', email: '', password: '', deviceNumber: '', adminCode: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name, device_number: accountType === 'user' ? form.deviceNumber : '' } },
      })
      if (error) throw error
      if (!data.session) {
        if (accountType === 'admin') sessionStorage.setItem('pending-admin-code', form.adminCode.trim())
        setError('Check your email to confirm your account.')
        return
      }

      if (accountType === 'admin') {
        const { error: claimError } = await supabase.rpc('claim_admin_role', { code: form.adminCode.trim() })
        if (claimError) {
          setError('Invalid admin code. Your account was created as a regular user.')
          await supabase.auth.signOut()
          return
        }
        await refreshUser()
        navigate('/monitoring/pre')
        return
      }

      navigate('/device')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) setError(error.message)
  }

  return (
    <div style={pageWrap}>
      <div style={card}>
        <h1 style={heading}>Create Account</h1>
        <p style={sub}>Start monitoring your water quality</p>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={accountTypeControl} role="group" aria-label="Account type">
            <button type="button" onClick={() => setAccountType('user')} style={accountType === 'user' ? selectedType : typeButton}>Normal user</button>
            <button type="button" onClick={() => setAccountType('admin')} style={accountType === 'admin' ? selectedType : typeButton}>Admin</button>
          </div>
          {[
            { icon: <User size={16} />, key: 'name', type: 'text', placeholder: 'Full name' },
            { icon: <Mail size={16} />, key: 'email', type: 'email', placeholder: 'Email address' },
            { icon: <Lock size={16} />, key: 'password', type: 'password', placeholder: 'Password' },
            accountType === 'user'
              ? { icon: <Cpu size={16} />, key: 'deviceNumber', type: 'text', placeholder: 'Device / Model number', label: 'Device ID' }
              : { icon: <KeyRound size={16} />, key: 'adminCode', type: 'password', placeholder: 'Admin key', label: 'Admin key' },
          ].map(({ icon, key, label, ...rest }) => (
            <div key={key} style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>{icon}</span>
              <input {...rest} aria-label={label} value={form[key]} onChange={e => set(key)(e.target.value)} style={inputStyle} required />
            </div>
          ))}
          <button type="submit" disabled={loading} style={primaryBtn}>{loading ? 'Creating account…' : 'Create Account'}</button>
        </form>
        {accountType === 'user' && <>
          <div style={divider}><span style={{ padding: '0 0.75rem', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>or</span></div>
          <button onClick={handleGoogle} style={googleBtn}><Globe size={16} /> Continue with Google</button>
        </>}
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1.25rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
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
const accountTypeControl = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '8px' }
const typeButton = { padding: '0.55rem', border: 'none', borderRadius: '6px', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }
const selectedType = { ...typeButton, backgroundColor: 'var(--accent)', color: '#fff' }
