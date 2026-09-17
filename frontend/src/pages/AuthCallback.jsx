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
