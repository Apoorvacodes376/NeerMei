import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import TopNavLayout from './components/TopNavLayout.jsx'
import SidebarLayout from './components/SidebarLayout.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Insights from './pages/Insights.jsx'
import LiveMonitoring1 from './pages/admin/LiveMonitoring1.jsx'
import MLTraining1 from './pages/admin/MLTraining1.jsx'
import PurificationAnalysis from './pages/admin/PurificationAnalysis.jsx'
import PostPurificationData from './pages/admin/PostPurificationData.jsx'
import MLTraining2 from './pages/admin/MLTraining2.jsx'
import Outcome from './pages/admin/Outcome.jsx'
import AlertsHistorical from './pages/admin/AlertsHistorical.jsx'
import AdminSettings from './pages/admin/Settings.jsx'
import MyDevice from './pages/user/MyDevice.jsx'
import UserAlerts from './pages/user/UserAlerts.jsx'
import Settings from './pages/user/Settings.jsx'
import AuthCallback from './pages/AuthCallback.jsx'

function RequireAuth({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/device" replace />
  return children
}

export default function App() {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Loading />

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes with top navbar */}
        <Route element={<TopNavLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={user ? <Navigate to={isAdmin ? '/monitoring/pre' : '/device'} replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to={isAdmin ? '/monitoring/pre' : '/device'} replace /> : <Signup />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Route>

        {/* Authenticated routes with sidebar */}
        <Route element={<RequireAuth><SidebarLayout /></RequireAuth>}>
          {/* Admin pages */}
          <Route path="/monitoring/pre" element={<RequireAuth adminOnly><LiveMonitoring1 /></RequireAuth>} />
          <Route path="/ml/pre" element={<RequireAuth adminOnly><MLTraining1 /></RequireAuth>} />
          <Route path="/purification" element={<RequireAuth adminOnly><PurificationAnalysis /></RequireAuth>} />
          <Route path="/monitoring/post" element={<RequireAuth adminOnly><PostPurificationData /></RequireAuth>} />
          <Route path="/ml/post" element={<RequireAuth adminOnly><MLTraining2 /></RequireAuth>} />
          <Route path="/outcome" element={<RequireAuth adminOnly><Outcome /></RequireAuth>} />
          <Route path="/alerts-admin" element={<RequireAuth adminOnly><AlertsHistorical /></RequireAuth>} />
          <Route path="/admin-settings" element={<RequireAuth adminOnly><AdminSettings /></RequireAuth>} />
          {/* User pages */}
          <Route path="/device" element={<MyDevice />} />
          <Route path="/alerts" element={<UserAlerts />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ThemeToggle />
    </BrowserRouter>
  )
}

function Loading() {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>Loading…</div>
}
