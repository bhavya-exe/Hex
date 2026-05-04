const COLORS = { CRITICAL: '#fc4444', HIGH: '#f6ad55', MEDIUM: '#f6e05e', LOW: '#68d391', INFO: '#63b3ed' }

const s = {
  panel: { background: '#1a1d2e', borderRadius: '10px', padding: '24px', border: '1px solid #2d3748' },
  title: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#718096', textTransform: 'uppercase', borderBottom: '1px solid #2d3748' },
  td: { padding: '12px', fontSize: '14px', borderBottom: '1px solid #1e2235', verticalAlign: 'top' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  empty: { color: '#718096', textAlign: 'center', padding: '40px' }
}

function SeverityBadge({ severity }) {
  const color = COLORS[severity] || '#a0aec0'
  return (
    <span style={{ ...s.badge, color, background: color + '22', border: `1px solid ${color}44` }}>
      {severity}
    </span>
  )
}

export default function ResultsTable({ results }) {
  return (
    <div style={s.panel}>
      <div style={s.title}>Findings ({results.length})</div>
      {results.length === 0 ? (
        <div style={s.empty}>No findings detected</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Severity</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Title</th>
              <th style={s.th}>Description</th>
              <th style={s.th}>Remediation</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td style={s.td}><SeverityBadge severity={r.severity} /></td>
                <td style={s.td}><span style={{ color: '#a0aec0' }}>{r.type}</span></td>
                <td style={{ ...s.td, color: '#e2e8f0', fontWeight: '500' }}>{r.title}</td>
                <td style={{ ...s.td, color: '#718096' }}>{r.description}</td>
                <td style={{ ...s.td, color: '#68d391', fontSize: '13px' }}>{r.remediation || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
