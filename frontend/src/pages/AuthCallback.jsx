import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/login', { replace: true }); return }
      const pendingAdminCode = sessionStorage.getItem('pending-admin-code')
      if (pendingAdminCode) {
        const { error } = await supabase.rpc('claim_admin_role', { code: pendingAdminCode })
        sessionStorage.removeItem('pending-admin-code')
        if (error) {
          await supabase.auth.signOut()
          navigate('/login', { replace: true })
          return
        }
      }
      const pendingGoogleSignup = sessionStorage.getItem('pending-google-signup')
      if (pendingGoogleSignup) {
        sessionStorage.removeItem('pending-google-signup')
        const { deviceNumber } = JSON.parse(pendingGoogleSignup)
        if (deviceNumber) {
          const { error } = await supabase.from('devices').insert({ id: deviceNumber, owner_id: session.user.id, api_key: 'placeholder' })
          if (error) {
            if (error.code !== '23505') throw error
            const { data: existingDevice } = await supabase.from('devices').select('id').eq('id', deviceNumber).maybeSingle()
            if (!existingDevice) throw new Error('Device is already associated with another account')
          }
        }
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      navigate(profile?.role === 'admin' ? '/monitoring/pre' : '/device', { replace: true })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)' }}>Signing you in…</p>
    </div>
  )
}
