import { useState } from 'react'

const COLORS = { CRITICAL: '#fc4444', HIGH: '#f6ad55', MEDIUM: '#f6e05e', LOW: '#68d391', INFO: '#63b3ed' }

const s = {
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  desc: { color: '#718096', fontSize: '14px', marginBottom: '28px' },
  selectRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' },
  selectBox: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '20px' },
  label: { fontSize: '12px', color: '#718096', textTransform: 'uppercase', marginBottom: '10px' },
  select: { width: '100%', background: '#0f1117', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', padding: '10px', fontSize: '14px' },
  btn: { padding: '12px 32px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  deltaCard: { borderRadius: '10px', padding: '24px', marginBottom: '24px', textAlign: 'center', border: '1px solid' },
  scoreRow: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', marginBottom: '24px', alignItems: 'center' },
  scoreCard: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '20px', textAlign: 'center' },
  scoreVal: { fontSize: '40px', fontWeight: '800', marginTop: '8px' },
  arrow: { fontSize: '28px', textAlign: 'center', color: '#718096' },
  section: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '20px', marginBottom: '16px' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', marginBottom: '14px' },
  finding: { padding: '10px 0', borderBottom: '1px solid #1e2235', fontSize: '13px' },
  badge: { padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginRight: '8px' },
  empty: { color: '#4a5568', fontSize: '13px', fontStyle: 'italic' }
}

function SeverityBadge({ severity }) {
  const color = COLORS[severity] || '#a0aec0'
  return <span style={{ ...s.badge, color, background: color + '22', border: `1px solid ${color}44` }}>{severity}</span>
}

function ScoreCard({ label, scan }) {
  const color = scan.security_grade?.startsWith('A') ? '#68d391' : scan.security_grade?.startsWith('B') ? '#f6ad55' : '#fc4444'
  return (
    <div style={s.scoreCard}>
      <div style={{ color: '#718096', fontSize: '12px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#a0aec0', fontSize: '13px', marginTop: '4px' }}>📄 {scan.filename}</div>
      <div style={{ ...s.scoreVal, color }}>{scan.security_score ?? '—'}</div>
      <div style={{ color, fontSize: '20px', fontWeight: '700' }}>{scan.security_grade}</div>
      <div style={{ color: '#718096', fontSize: '12px', marginTop: '8px' }}>{scan.total_issues} issues</div>
    </div>
  )
}

function FindingsList({ findings, emptyMsg }) {
  if (!findings.length) return <div style={s.empty}>{emptyMsg}</div>
  return findings.map(f => (
    <div key={f.id} style={s.finding}>
      <SeverityBadge severity={f.severity} />
      <span style={{ color: '#e2e8f0' }}>{f.title}</span>
      <span style={{ color: '#718096', marginLeft: '8px' }}>— {f.description}</span>
    </div>
  ))
}

export default function ComparePage({ scans, apiFetch }) {
  const [scanA, setScanA] = useState('')
  const [scanB, setScanB] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCompare = async () => {
    if (!scanA || !scanB || scanA === scanB) {
      setError('Select two different scans to compare')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`/compare?scan_a=${scanA}&scan_b=${scanB}`)
      if (!res.ok) throw new Error('Comparison failed')
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const deltaColor = result ? (result.improved ? '#68d391' : result.score_delta < 0 ? '#fc4444' : '#f6ad55') : '#718096'
  const deltaLabel = result ? (result.improved ? '▲ Improved' : result.score_delta < 0 ? '▼ Regressed' : '→ No Change') : ''

  return (
    <div>
      <div style={s.title}>Scan Comparison</div>
      <div style={s.desc}>Select two scans to compare security posture over time</div>

      <div style={s.selectRow}>
        <div style={s.selectBox}>
          <div style={s.label}>Baseline (Older Scan)</div>
          <select style={s.select} value={scanA} onChange={e => setScanA(e.target.value)}>
            <option value="">Select scan...</option>
            {scans.map(s => (
              <option key={s.id} value={s.id}>{s.filename} — {new Date(s.scanned_at + 'Z').toLocaleDateString()} (Grade: {s.security_grade})</option>
            ))}
          </select>
        </div>
        <div style={s.selectBox}>
          <div style={s.label}>Latest (Newer Scan)</div>
          <select style={s.select} value={scanB} onChange={e => setScanB(e.target.value)}>
            <option value="">Select scan...</option>
            {scans.map(s => (
              <option key={s.id} value={s.id}>{s.filename} — {new Date(s.scanned_at + 'Z').toLocaleDateString()} (Grade: {s.security_grade})</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={{ color: '#fc8181', marginBottom: '16px', fontSize: '14px' }}>⚠ {error}</div>}

      <button style={s.btn} onClick={handleCompare} disabled={loading}>
        {loading ? 'Comparing...' : 'Compare Scans'}
      </button>

      {result && (
        <div style={{ marginTop: '32px' }}>
          {/* Score delta banner */}
          <div style={{ ...s.deltaCard, background: deltaColor + '11', borderColor: deltaColor + '44', color: deltaColor }}>
            <div style={{ fontSize: '28px', fontWeight: '800' }}>{result.score_delta > 0 ? '+' : ''}{result.score_delta} points</div>
            <div style={{ fontSize: '16px', marginTop: '4px' }}>{deltaLabel}</div>
          </div>

          {/* Score cards */}
          <div style={s.scoreRow}>
            <ScoreCard label="Baseline" scan={result.scan_a} />
            <div style={s.arrow}>→</div>
            <ScoreCard label="Latest" scan={result.scan_b} />
          </div>

          {/* Fixed issues */}
          <div style={s.section}>
            <div style={{ ...s.sectionTitle, color: '#68d391' }}>✓ Fixed Issues ({result.fixed.length})</div>
            <FindingsList findings={result.fixed} emptyMsg="No issues were fixed between these scans" />
          </div>

          {/* New issues */}
          <div style={s.section}>
            <div style={{ ...s.sectionTitle, color: '#fc4444' }}>✗ New Issues ({result.new_issues.length})</div>
            <FindingsList findings={result.new_issues} emptyMsg="No new issues introduced" />
          </div>

          {/* Persisting issues */}
          <div style={s.section}>
            <div style={{ ...s.sectionTitle, color: '#f6ad55' }}>⚠ Persisting Issues ({result.persisting.length})</div>
            <FindingsList findings={result.persisting} emptyMsg="No persisting issues" />
          </div>
        </div>
      )}
    </div>
  )
}
