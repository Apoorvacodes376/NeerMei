import { Outlet, NavLink, Link } from 'react-router-dom'
import { Droplets } from 'lucide-react'

export default function TopNavLayout() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <nav style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Droplets size={24} color="var(--accent)" />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '-0.5px' }}>NM</span>
          <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>NeerMei</span>
        </Link>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {[
            { to: '/', label: 'Home', end: true },
            { to: '/#about', label: 'About Us', scroll: true },
            { to: '/insights', label: 'Insights' },
            { to: '/login', label: 'Login' },
            { to: '/signup', label: 'Sign Up' },
          ].map(({ to, label, end, scroll }) =>
            scroll ? (
              <a key={label} href={to} style={navLinkStyle}>{label}</a>
            ) : (
              <NavLink key={label} to={to} end={end} style={({ isActive }) => ({
                ...navLinkStyle,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
              })}>
                {label}
              </NavLink>
            )
          )}
        </div>
      </nav>
      <Outlet />
    </div>
  )
}

const navLinkStyle = {
  textDecoration: 'none',
  fontSize: '0.9rem',
  color: 'var(--text-secondary)',
  transition: 'color 0.15s',
}
