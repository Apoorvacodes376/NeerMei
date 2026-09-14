import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Droplets, Activity, Brain, FlaskConical, CheckCircle, Bell, Cpu, Settings, LogOut } from 'lucide-react'
import AlertPopup from './AlertPopup.jsx'

const adminNav = [
  { to: '/monitoring/pre', label: 'Live Monitoring 1', icon: Activity },
  { to: '/ml/pre', label: 'ML Training 1', icon: Brain },
  { to: '/purification', label: 'Purification Analysis', icon: FlaskConical },
  { to: '/monitoring/post', label: 'Post-Purification Data', icon: Activity },
  { to: '/ml/post', label: 'ML Training 2', icon: Brain },
  { to: '/outcome', label: 'Outcome', icon: CheckCircle },
  { to: '/alerts-admin', label: 'Alerts & History', icon: Bell },
  { to: '/admin-settings', label: 'Admin Settings', icon: Settings },
]

const userNav = [
  { to: '/device', label: 'My Device', icon: Cpu },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function SidebarLayout() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = isAdmin ? adminNav : userNav

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        <div style={{ padding: '0 1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Droplets size={22} color="var(--accent)" />
          <span style={{ fontWeight: 800, color: 'var(--accent)' }}>NM</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>NeerMei</span>
        </div>
        <div style={{ padding: '0 1.25rem 1rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Signed in as</p>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</p>
          <span style={{
            fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '999px',
            backgroundColor: isAdmin ? 'var(--accent)' : 'var(--success)',
            color: '#fff', fontWeight: 600,
          }}>{isAdmin ? 'Admin' : 'User'}</span>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem' }}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.75rem', borderRadius: '8px', textDecoration: 'none',
              fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
              backgroundColor: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            })}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} style={{
          margin: '0 0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.875rem', color: 'var(--danger)',
        }}>
          <LogOut size={16} /> Log Out
        </button>
      </aside>
      <main style={{ flex: 1, padding: '2rem', backgroundColor: 'var(--bg)', overflowY: 'auto' }}>
        <Outlet />
      </main>
      <AlertPopup />
    </div>
  )
}
