import { Link } from 'react-router-dom'
import { Droplets, ShieldCheck, BarChart2, Cpu } from 'lucide-react'

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Droplets size={48} color="var(--accent)" />
        </div>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '1.25rem', maxWidth: '700px' }}>
          Real-Time Water Quality Monitoring
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '560px', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          NeerMei combines IoT sensors, machine learning, and live analytics to ensure safe, purified water — from source to tap.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/signup" style={primaryBtn}>Get Started</Link>
          <Link to="/insights" style={secondaryBtn}>View Public Insights</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '5rem', width: '100%', maxWidth: '900px' }}>
          {[
            { icon: Cpu, title: 'IoT Sensors', desc: 'Real-time pH, turbidity, TDS and more from connected devices.' },
            { icon: BarChart2, title: 'ML Analysis', desc: 'Predictive models classify water purifiability and potability.' },
            { icon: ShieldCheck, title: 'Safety Alerts', desc: 'Instant notifications when readings cross unsafe thresholds.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', textAlign: 'left' }}>
              <Icon size={24} color="var(--accent)" style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{title}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About Us */}
      <section id="about" style={{ padding: '5rem 2rem', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>About Us</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>
            NeerMei is a water-quality intelligence platform built to bridge the gap between raw sensor data and actionable safety decisions. Our system integrates edge IoT hardware with cloud-based ML pipelines to deliver continuous, automated water quality assessments.
          </p>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            We believe clean water monitoring should be transparent, accessible, and data-driven. NeerMei empowers both administrators and end-users with the tools to understand, track, and act on water quality in real time.
          </p>
        </div>
      </section>
    </div>
  )
}

const primaryBtn = {
  padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700,
  backgroundColor: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: '0.95rem',
}
const secondaryBtn = {
  padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700,
  backgroundColor: 'transparent', color: 'var(--accent)', textDecoration: 'none',
  border: '2px solid var(--accent)', fontSize: '0.95rem',
}
