import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title="Toggle theme"
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100,
        width: '44px', height: '44px', borderRadius: '50%',
        backgroundColor: 'var(--accent)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        transition: 'background-color 0.2s',
      }}
    >
      {theme === 'light' ? <Moon size={18} color="#fff" /> : <Sun size={18} color="#fff" />}
    </button>
  )
}
