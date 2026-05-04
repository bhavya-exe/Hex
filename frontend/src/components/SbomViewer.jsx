import { useState, useEffect } from 'react'

const COLORS = { CRITICAL: '#fc4444', HIGH: '#f6ad55', MEDIUM: '#f6e05e', LOW: '#68d391' }

const s = {
  panel: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '24px', marginTop: '24px' },
  title: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '8px', padding: '14px', textAlign: 'center' },
  statLabel: { fontSize: '11px', color: '#718096', textTransform: 'uppercase' },
  statVal: { fontSize: '24px', fontWeight: '700', color: '#e2e8f0', marginTop: '6px' },
  section: { marginBottom: '20px' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#a0aec0', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e2235', fontSize: '13px' },
  label: { color: '#718096' },
  value: { color: '#e2e8f0', fontWeight: '500' },
  vulnCard: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '8px', padding: '14px', marginBottom: '10px' },
  badge: { padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginRight: '8px' },
  exportBtn: { padding: '6px 14px', background: 'transparent', color: '#63b3ed', border: '1px solid #63b3ed44', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  loading: { color: '#718096', textAlign: 'center', padding: '40px' },
  tag: { display: 'inline-block', padding: '2px 8px', background: '#2d3748', borderRadius: '4px', fontSize: '11px', color: '#a0aec0', marginRight: '4px' }
}

function SeverityBadge({ severity }) {
  const color = COLORS[severity] || '#a0aec0'
  return <span style={{ ...s.badge, color, background: color + '22', border: `1px solid ${color}44` }}>{severity}</span>
}

export default function SbomViewer({ scanId, apiFetch }) {
  const [sbom, setSbom] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!scanId) return
    setLoading(true)
    apiFetch(`/history/${scanId}/sbom`)
      .then(r => r.json())
      .then(setSbom)
      .finally(() => setLoading(false))
  }, [scanId])

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(sbom, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sbom-${scanId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={s.panel}><div style={s.loading}>Loading SBOM...</div></div>
  if (!sbom) return null

  return (
    <div style={s.panel}>
      <div style={s.title}>
        <span>📦 Software Bill of Materials (CycloneDX {sbom.specVersion})</span>
        <button style={s.exportBtn} onClick={handleExport}>⬇ Export SBOM JSON</button>
      </div>

      {/* Summary stats */}
      <div style={s.grid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Format</div>
          <div style={{ ...s.statVal, fontSize: '16px', marginTop: '8px' }}>{sbom.bomFormat}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Components</div>
          <div style={s.statVal}>{sbom.summary?.total_components}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Vulnerabilities</div>
          <div style={{ ...s.statVal, color: sbom.summary?.total_vulnerabilities > 0 ? '#fc4444' : '#68d391' }}>
            {sbom.summary?.total_vulnerabilities}
          </div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Security Grade</div>
          <div style={{ ...s.statVal, color: sbom.summary?.security_grade?.startsWith('A') ? '#68d391' : '#f6ad55' }}>
            {sbom.summary?.security_grade || 'N/A'}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Metadata</div>
        <div style={s.row}><span style={s.label}>Scan Timestamp</span><span style={s.value}>{sbom.metadata?.timestamp ? new Date(sbom.metadata.timestamp + 'Z').toLocaleString() : '—'}</span></div>
        <div style={s.row}><span style={s.label}>Scanner Tool</span><span style={s.value}>{sbom.metadata?.tools?.[0]?.name} v{sbom.metadata?.tools?.[0]?.version}</span></div>
        <div style={s.row}><span style={s.label}>Vendor</span><span style={s.value}>{sbom.metadata?.tools?.[0]?.vendor}</span></div>
        <div style={{ ...s.row, borderBottom: 'none' }}><span style={s.label}>Target Component</span><span style={s.value}>{sbom.metadata?.component?.name}</span></div>
      </div>

      {/* Components */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Components ({sbom.components?.length})</div>
        {sbom.components?.map((c, i) => (
          <div key={i} style={s.row}>
            <span style={s.label}>{c.name}</span>
            <span style={s.value}>
              <span style={s.tag}>{c.type}</span>
              <span style={{ color: '#63b3ed', fontSize: '12px' }}>{c.purl}</span>
              {c.properties?.map(p => (
                <span key={p.name} style={{ ...s.tag, marginLeft: '4px' }}>{p.name}: {p.value}</span>
              ))}
            </span>
          </div>
        ))}
      </div>

      {/* Vulnerabilities */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Vulnerabilities ({sbom.vulnerabilities?.length})</div>
        {sbom.vulnerabilities?.length === 0 && (
          <div style={{ color: '#68d391', fontSize: '13px' }}>✓ No vulnerabilities found</div>
        )}
        {sbom.vulnerabilities?.map((v, i) => (
          <div key={i} style={s.vulnCard}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <SeverityBadge severity={v.ratings?.[0]?.severity} />
              <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{v.id}</span>
              {v.ratings?.[0]?.score && (
                <span style={{ color: '#718096', fontSize: '12px', marginLeft: '8px' }}>CVSS: {v.ratings[0].score}</span>
              )}
            </div>
            <div style={{ color: '#a0aec0', fontSize: '12px', marginBottom: '6px' }}>{v.description}</div>
            {v.recommendation && (
              <div style={{ color: '#68d391', fontSize: '12px' }}>→ {v.recommendation}</div>
            )}
            {v.cwe?.length > 0 && (
              <div style={{ marginTop: '6px' }}>{v.cwe.map(c => <span key={c} style={s.tag}>{c}</span>)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
