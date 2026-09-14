
const COLS = ['timestamp', 'pH', 'turbidity', 'TDS', 'temperature', 'conductivity']

export default function SensorTable({ rows = [] }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-sidebar)' }}>
            {COLS.map(c => (
              <th key={c} style={{ padding: '0.65rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={COLS.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No data available</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--border)', backgroundColor: i % 2 === 0 ? 'var(--bg-surface)' : 'transparent' }}>
              {COLS.map(c => (
                <td key={c} style={{ padding: '0.6rem 1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {c === 'timestamp' ? new Date(row[c]).toLocaleString() : row[c] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
