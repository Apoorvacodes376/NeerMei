import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import SensorTable from '../../components/SensorTable.jsx'
import LiveGraph from '../../components/LiveGraph.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { queryReadings } from '../../api/client.js'

export default function MyDevice() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const deviceId = user?.deviceIds?.[0]

  useEffect(() => {
    const load = async () => {
      const { data } = await queryReadings({ deviceId, stage: 'post', limit: 50 })
      if (data) setRows(data.map(reading => ({ timestamp: reading.created_at, ...reading.sensor_values })))
    }
    load()
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [deviceId])

  const handleDownload = () => {
    const csv = ['timestamp,pH,turbidity,TDS,temperature,conductivity', ...rows.map(r => Object.values(r).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'my-device-data.csv'; a.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={pageTitle}>My Device</h2>
          <p style={pageSub}>Live readings from your device{user?.deviceIds?.[0] ? ` — ${user.deviceIds[0]}` : ''}</p>
        </div>
        <button onClick={handleDownload} style={dlBtn}><Download size={15} /> Download My Data</button>
      </div>
      <LiveGraph data={rows.slice().reverse()} metrics={['pH', 'turbidity']} title="Live Sensor Readings" />
      <div style={{ marginTop: '1.5rem' }}><SensorTable rows={rows} /></div>
    </div>
  )
}

const pageTitle = { fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }
const pageSub = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }
const dlBtn = { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }
