import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async (sessionUser) => {
    if (!sessionUser) { setUser(null); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('id, name, role').eq('id', sessionUser.id).single()
    const { data: devices } = await supabase.from('devices').select('id').eq('owner_id', sessionUser.id)
    setUser({ id: sessionUser.id, name: profile?.name || sessionUser.user_metadata?.name || sessionUser.email, email: sessionUser.email, role: profile?.role || 'user', deviceIds: devices?.map(device => device.id) || [] })
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => loadUser(session?.user)).catch(() => {
      setUser(null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => loadUser(session?.user), 0)
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = () => supabase.auth.signOut()
  const refreshUser = async () => {
    const { data: { user: sessionUser } } = await supabase.auth.getUser()
    await loadUser(sessionUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
