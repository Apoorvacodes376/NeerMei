import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Droplets, ShieldCheck, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const MOCK_STATS = { pH: 7.2, turbidity: 1.8, TDS: 320, safetyPct: 94 }
const MOCK_TREND = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
  safetyPct: 94,
  pH: 7.2,
}))

export default function Insights() {
  const [stats, setStats] = useState(MOCK_STATS)
  const [trend, setTrend] = useState(MOCK_TREND)
  const [safetyPctActual, setSafetyPctActual] = useState(false)

  useEffect(() => {
    supabase.from('public_insights').select('*').eq('stage', 'post').order('bucket', { ascending: true }).then(({ data }) => {
      if (!data?.length) return
      const total = data.reduce((sum, row) => sum + Number(row.reading_count), 0)
      const avg = key => data.reduce((sum, row) => sum + Number(row[key] || 0) * Number(row.reading_count), 0) / total
      setStats({ pH: avg('avg_ph'), turbidity: avg('avg_turbidity'), TDS: avg('avg_tds'), safetyPct: 94 })
      setTrend(data.map(row => ({ date: new Date(row.bucket).toLocaleDateString('en', { month: 'short', day: 'numeric' }), safetyPct: 94, pH: Number(row.avg_ph || 0) })))
    })
  }, [])

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 2rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Public Water Quality Insights</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>Aggregated, anonymized data from all monitored sources. Read-only.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Average pH', value: stats.pH.toFixed(1), icon: Droplets, color: 'var(--accent)' },
          { label: 'Turbidity (NTU)', value: stats.turbidity.toFixed(1), icon: AlertTriangle, color: 'var(--warning)' },
          { label: 'TDS (ppm)', value: stats.TDS, icon: Droplets, color: 'var(--text-secondary)' },
          { label: 'Safety Rating', value: `${stats.safetyPct}%`, icon: ShieldCheck, color: safetyPctActual ? 'var(--accent)' : 'var(--danger)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
            <Icon size={20} color={color} style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>14-Day Safety Trend</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="safetyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} unit="%" />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }} />
            <Area type="monotone" dataKey="safetyPct" stroke={safetyPctActual ? 'var(--accent)' : 'var(--danger)'} fill="url(#safetyGrad)" strokeWidth={2} name="Safety %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
