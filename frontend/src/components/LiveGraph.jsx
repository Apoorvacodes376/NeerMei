import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// TODO: replace `data` prop with live-appending data from polling/WebSocket

const COLORS = ['var(--accent)', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

export default function LiveGraph({ data = [], metrics = ['pH'], title = '' }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', padding: '1.25rem' }}>
      {title && <p style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</p>}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => new Date(v).toLocaleTimeString()} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }} />
          <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
          {metrics.map((m, i) => (
            <Line key={m} type="monotone" dataKey={m} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
