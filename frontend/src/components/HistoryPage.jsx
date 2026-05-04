import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'

const COLORS = { CRITICAL: '#fc4444', HIGH: '#f6ad55', MEDIUM: '#f6e05e', LOW: '#68d391' }
const LINE_COLORS = ['#e53e3e', '#63b3ed', '#68d391', '#f6ad55', '#b794f4', '#fc8181', '#4fd1c5']

const s = {
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  empty: { color: '#718096', textAlign: 'center', padding: '60px', background: '#1a1d2e', borderRadius: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#1a1d2e', borderRadius: '10px', overflow: 'hidden' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: '#718096', textTransform: 'uppercase', borderBottom: '1px solid #2d3748' },
  td: { padding: '14px 16px', fontSize: '14px', borderBottom: '1px solid #1e2235', color: '#e2e8f0' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  viewBtn: { padding: '6px 14px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  delBtn: { padding: '6px 14px', background: 'transparent', color: '#718096', border: '1px solid #2d3748', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginLeft: '8px' },
  panel: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '24px', marginBottom: '24px' },
  panelTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
  tab: (active) => ({
    padding: '8px 20px', borderRadius: '8px', border: active ? 'none' : '1px solid #2d3748', cursor: 'pointer',
    fontSize: '14px', fontWeight: '500',
    background: active ? '#e53e3e' : '#1a1d2e',
    color: active ? '#fff' : '#718096',
  }),
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' },
  select: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', padding: '7px 12px', fontSize: '13px' },
  filterLabel: { color: '#718096', fontSize: '13px' }
}

function GradeBadge({ grade }) {
  const color = grade?.startsWith('A') ? '#68d391' : grade?.startsWith('B') ? '#f6ad55' : '#fc4444'
  return <span style={{ ...s.badge, color, background: color + '22', border: `1px solid ${color}44` }}>{grade || 'N/A'}</span>
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '8px', padding: '12px' }}>
      <div style={{ color: '#718096', fontSize: '12px', marginBottom: '8px' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: '13px' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function HistoryPage({ scans, onView, onDelete, loading }) {
  const [activeTab, setActiveTab] = useState('table')
  const [metric, setMetric] = useState('security_score')
  const [filterModel, setFilterModel] = useState('all')

  // Get unique model names
  const modelNames = useMemo(() => {
    const names = [...new Set(scans.map(s => s.filename))]
    return names
  }, [scans])

  // Build chart data — one line per unique model, x-axis is scan date
  const chartData = useMemo(() => {
    const filtered = filterModel === 'all' ? scans : scans.filter(s => s.filename === filterModel)
    const sorted = [...filtered].sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at))

    if (filterModel !== 'all') {
      // Single model — simple time series
      return sorted.map(s => ({
        date: new Date(s.scanned_at).toLocaleDateString(),
        [s.filename]: s[metric] ?? 0
      }))
    }

    // Multiple models — group by date, each model is a line
    const byDate = {}
    sorted.forEach(s => {
      const date = new Date(s.scanned_at).toLocaleDateString()
      if (!byDate[date]) byDate[date] = { date }
      byDate[date][s.filename] = s[metric] ?? 0
    })
    return Object.values(byDate)
  }, [scans, metric, filterModel])

  const activeModels = useMemo(() => {
    if (filterModel !== 'all') return [filterModel]
    return [...new Set(scans.map(s => s.filename))]
  }, [scans, filterModel])

  const metricLabel = {
    security_score: 'Security Score',
    total_issues: 'Total Issues',
    critical: 'Critical Issues',
    high: 'High Issues'
  }

  if (loading) return <div style={s.empty}>Loading history...</div>

  return (
    <div>
      <div style={s.title}>Scan History</div>

      {scans.length === 0 ? (
        <div style={s.empty}>No scans yet. Upload a model to get started.</div>
      ) : (
        <>
          <div style={s.tabs}>
            <button style={s.tab(activeTab === 'table')} onClick={() => setActiveTab('table')}>📋 Table View</button>
            <button style={s.tab(activeTab === 'chart')} onClick={() => setActiveTab('chart')}>📈 Trend Charts</button>
          </div>

          {activeTab === 'chart' && (
            <div style={s.panel}>
              <div style={s.panelTitle}>Security Trends Over Time</div>

              <div style={s.filterRow}>
                <span style={s.filterLabel}>Metric:</span>
                <select style={s.select} value={metric} onChange={e => setMetric(e.target.value)}>
                  <option value="security_score">Security Score</option>
                  <option value="total_issues">Total Issues</option>
                  <option value="critical">Critical Issues</option>
                  <option value="high">High Issues</option>
                </select>
                <span style={s.filterLabel}>Model:</span>
                <select style={s.select} value={filterModel} onChange={e => setFilterModel(e.target.value)}>
                  <option value="all">All Models</option>
                  {modelNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="date" stroke="#718096" fontSize={12} />
                  <YAxis stroke="#718096" fontSize={12} domain={metric === 'security_score' ? [0, 100] : ['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#a0aec0', fontSize: '13px' }} />
                  {metric === 'security_score' && (
                    <ReferenceLine y={70} stroke="#68d391" strokeDasharray="4 4" label={{ value: 'Safe threshold', fill: '#68d391', fontSize: 11 }} />
                  )}
                  {activeModels.map((model, i) => (
                    <Line
                      key={model}
                      type="monotone"
                      dataKey={model}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 5, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                      activeDot={{ r: 7 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Summary stats below chart */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '20px' }}>
                {[
                  { label: 'Total Scans', value: scans.length },
                  { label: 'Models Scanned', value: modelNames.length },
                  { label: 'Avg Score', value: Math.round(scans.reduce((a, s) => a + (s.security_score || 0), 0) / scans.length) },
                  { label: 'Critical Found', value: scans.reduce((a, s) => a + (s.critical || 0), 0) }
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#0f1117', borderRadius: '8px', padding: '14px', textAlign: 'center', border: '1px solid #2d3748' }}>
                    <div style={{ color: '#718096', fontSize: '11px', textTransform: 'uppercase' }}>{stat.label}</div>
                    <div style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: '700', marginTop: '6px' }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'table' && (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>File</th>
                  <th style={s.th}>Scanned At</th>
                  <th style={s.th}>By</th>
                  <th style={s.th}>Grade</th>
                  <th style={s.th}>Score</th>
                  <th style={s.th}>Critical</th>
                  <th style={s.th}>High</th>
                  <th style={s.th}>Total Issues</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => (
                  <tr key={scan.id}>
                    <td style={{ ...s.td, fontWeight: '500' }}>📄 {scan.filename}</td>
                    <td style={{ ...s.td, color: '#718096' }}>{new Date(scan.scanned_at + 'Z').toLocaleString()}</td>
                    <td style={{ ...s.td, color: '#718096', fontSize: '12px' }}>{scan.scanned_by || '—'}</td>
                    <td style={s.td}><GradeBadge grade={scan.security_grade} /></td>
                    <td style={s.td}>{scan.security_score ?? '—'}</td>
                    <td style={{ ...s.td, color: COLORS.CRITICAL, fontWeight: '700' }}>{scan.critical}</td>
                    <td style={{ ...s.td, color: COLORS.HIGH, fontWeight: '700' }}>{scan.high}</td>
                    <td style={s.td}>{scan.total_issues}</td>
                    <td style={s.td}>
                      <button style={s.viewBtn} onClick={() => onView(scan.id)}>View</button>
                      <button style={s.delBtn} onClick={() => onDelete(scan.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
