const s = {
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  desc: { color: '#718096', fontSize: '14px', marginBottom: '32px' },
  section: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '28px', marginBottom: '20px' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' },
  hero: { textAlign: 'center', padding: '32px', background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', marginBottom: '20px' },
  heroLogo: { fontSize: '48px', fontWeight: '800', color: '#e53e3e', marginBottom: '8px' },
  heroSub: { color: '#718096', fontSize: '15px' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', margin: '4px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  featureCard: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '8px', padding: '16px' },
  featureIcon: { fontSize: '24px', marginBottom: '8px' },
  featureTitle: { color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '4px' },
  featureDesc: { color: '#718096', fontSize: '12px' },
  stackRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e2235' },
  stackLabel: { color: '#a0aec0', fontSize: '14px' },
  stackVal: { color: '#68d391', fontSize: '13px', fontWeight: '600' },
  link: { color: '#63b3ed', fontSize: '13px', textDecoration: 'none' }
}

const FEATURES = [
  { icon: '🔍', title: 'Deep Model Scanning', desc: 'Analyzes 15+ ML model formats for vulnerabilities' },
  { icon: '🛡️', title: 'Backdoor Detection', desc: 'Neural Cleanse algorithm detects hidden triggers' },
  { icon: '🔐', title: 'JWT Authentication', desc: 'Secure login with token-based session management' },
  { icon: '📊', title: 'Scan History', desc: 'Persistent SQLite storage of all scan results' },
  { icon: '⚖️', title: 'Scan Comparison', desc: 'Compare two scans to track security improvements' },
  { icon: '📄', title: 'PDF & CSV Export', desc: 'Download full reports in multiple formats' },
  { icon: '🎯', title: 'CVSS v3.1 Scoring', desc: 'Industry-standard vulnerability severity scoring' },
  { icon: '📋', title: 'SBOM Generation', desc: 'CycloneDX-compliant Software Bill of Materials' },
]

const STACK = [
  { label: 'Frontend', value: 'React 18 + Vite' },
  { label: 'Charts', value: 'Recharts' },
  { label: 'Backend', value: 'FastAPI (Python)' },
  { label: 'Database', value: 'SQLite' },
  { label: 'Authentication', value: 'JWT (python-jose)' },
  { label: 'Password Hashing', value: 'bcrypt (passlib)' },
  { label: 'Scanner Engine', value: 'Hex by Layerd AI (Docker)' },
  { label: 'PDF Export', value: 'jsPDF + autoTable' },
  { label: 'Container', value: 'Docker + Docker Compose' },
]

export default function AboutPage() {
  return (
    <div>
      <div style={s.title}>About</div>
      <div style={s.desc}>HEX Dashboard — AI Model Security Scanner</div>

      <div style={s.hero}>
        <div style={s.heroLogo}>⬡ HEX</div>
        <div style={s.heroSub}>Enterprise-Grade AI/ML Model Security Scanner Dashboard</div>
        <div style={{ marginTop: '16px' }}>
          {['MIT License', 'v1.0.0', 'Go 1.21+', 'Docker'].map(tag => (
            <span key={tag} style={{ ...s.badge, background: '#2d3748', color: '#a0aec0' }}>{tag}</span>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>What is HEX?</div>
        <p style={{ color: '#a0aec0', fontSize: '14px', lineHeight: '1.7' }}>
          HEX is an enterprise-grade security scanner specifically designed for AI/ML models.
          This dashboard provides a web interface to the Hex scanner engine, allowing teams to
          upload models, run security scans, track history, compare results over time, and export
          reports — all from a single interface.
        </p>
        <p style={{ color: '#a0aec0', fontSize: '14px', lineHeight: '1.7', marginTop: '12px' }}>
          The scanner detects supply chain attacks, backdoors, adversarial vulnerabilities, PII leakage,
          prompt injection risks, and license compliance issues across 15+ ML model formats.
        </p>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Features</div>
        <div style={s.grid}>
          {FEATURES.map(f => (
            <div key={f.title} style={s.featureCard}>
              <div style={s.featureIcon}>{f.icon}</div>
              <div style={s.featureTitle}>{f.title}</div>
              <div style={s.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Tech Stack</div>
        {STACK.map((item, i) => (
          <div key={item.label} style={{ ...s.stackRow, ...(i === STACK.length - 1 ? { borderBottom: 'none' } : {}) }}>
            <span style={s.stackLabel}>{item.label}</span>
            <span style={s.stackVal}>{item.value}</span>
          </div>
        ))}
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Resources</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a href="https://github.com/Layerd-AI/layerd-hex" target="_blank" style={s.link}>→ GitHub Repository</a>
          <a href="https://www.layerd.com/docs/hex" target="_blank" style={s.link}>→ Official Documentation</a>
          <a href="https://hub.docker.com/r/layerd/hex" target="_blank" style={s.link}>→ Docker Hub</a>
          <a href="mailto:support@layerd.com" style={s.link}>→ Support: support@layerd.com</a>
        </div>
      </div>
    </div>
  )
}
