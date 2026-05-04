import ResultsTable from './ResultsTable'
import SbomViewer from './SbomViewer'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { exportCSV, exportPDF } from '../utils/exportReport'
import { useState } from 'react'

const COLORS = { CRITICAL: '#fc4444', HIGH: '#f6ad55', MEDIUM: '#f6e05e', LOW: '#68d391', INFO: '#63b3ed' }

const s = {
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#fff' },
  filename: { color: '#718096', fontSize: '14px', marginTop: '4px' },
  resetBtn: {
    padding: '8px 20px', background: 'transparent', color: '#a0aec0',
    border: '1px solid #2d3748', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
  },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' },
  card: { background: '#1a1d2e', borderRadius: '10px', padding: '20px', border: '1px solid #2d3748' },
  cardLabel: { fontSize: '12px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardValue: { fontSize: '32px', fontWeight: '700', marginTop: '8px' },
  grade: { fontSize: '48px', fontWeight: '800' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' },
  panel: { background: '#1a1d2e', borderRadius: '10px', padding: '24px', border: '1px solid #2d3748' },
  panelTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' },
  verdict: { fontSize: '14px', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' },
  exportBtn: {
    padding: '8px 16px', background: 'transparent', color: '#a0aec0',
    border: '1px solid #2d3748', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginLeft: '8px'
  }
}

function gradeColor(grade) {
  if (!grade) return '#68d391'
  if (grade.startsWith('A')) return '#68d391'
  if (grade.startsWith('B')) return '#f6ad55'
  return '#fc4444'
}

export default function Dashboard({ result, onReset, apiFetch }) {
  const { summary = {}, results = [], filename } = result
  const [activeTab, setActiveTab] = useState('findings')

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setActiveTab(id)} style={{
      padding: '8px 18px', borderRadius: '8px', border: activeTab === id ? 'none' : '1px solid #2d3748',
      cursor: 'pointer', fontSize: '14px', fontWeight: '500',
      background: activeTab === id ? '#e53e3e' : 'transparent',
      color: activeTab === id ? '#fff' : '#718096'
    }}>{label}</button>
  )

  const pieData = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(k => ({
    name: k,
    value: summary[k.toLowerCase()] || 0
  })).filter(d => d.value > 0)

  const verdictBg = summary.verdict?.includes('SAFE') ? '#1a3a2a' : '#3a1a1a'
  const verdictColor = summary.verdict?.includes('SAFE') ? '#68d391' : '#fc8181'

  return (
    <div>
      <div style={s.topBar}>
        <div>
          <div style={s.title}>Scan Results</div>
          <div style={s.filename}>📄 {filename}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.exportBtn} onClick={() => exportCSV(result)}>⬇ CSV</button>
          <button style={s.exportBtn} onClick={() => exportPDF(result)}>⬇ PDF</button>
          <button style={s.resetBtn} onClick={onReset}>← New Scan</button>
        </div>
      </div>

      {summary.verdict && (
        <div style={{ ...s.verdict, background: verdictBg, color: verdictColor, border: `1px solid ${verdictColor}33` }}>
          {summary.verdict}
        </div>
      )}

      <div style={s.cards}>
        <div style={s.card}>
          <div style={s.cardLabel}>Security Score</div>
          <div style={{ ...s.cardValue, color: gradeColor(summary.security_grade) }}>{summary.security_score ?? '-'}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Grade</div>
          <div style={{ ...s.grade, color: gradeColor(summary.security_grade) }}>{summary.security_grade ?? '-'}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Total Issues</div>
          <div style={{ ...s.cardValue, color: '#e2e8f0' }}>{summary.total_issues}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Critical</div>
          <div style={{ ...s.cardValue, color: COLORS.CRITICAL }}>{summary.critical}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>High</div>
          <div style={{ ...s.cardValue, color: COLORS.HIGH }}>{summary.high}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Medium</div>
          <div style={{ ...s.cardValue, color: COLORS.MEDIUM }}>{summary.medium}</div>
        </div>
      </div>

      <div style={s.row}>
        <div style={s.panel}>
          <div style={s.panelTitle}>Severity Breakdown</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#718096', textAlign: 'center', paddingTop: '60px' }}>No issues found</div>
          )}
        </div>

        <div style={s.panel}>
          <div style={s.panelTitle}>Quick Summary</div>
          {['critical', 'high', 'medium', 'low'].map(level => (
            <div key={level} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2d3748' }}>
              <span style={{ color: COLORS[level.toUpperCase()], textTransform: 'capitalize', fontWeight: '600' }}>{level}</span>
              <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{summary[level]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {tabBtn('findings', '🔍 Findings')}
        {tabBtn('sbom', '📦 SBOM')}
      </div>

      {activeTab === 'findings' && <ResultsTable results={results} />}
      {activeTab === 'sbom' && <SbomViewer scanId={result.scan_id} apiFetch={apiFetch} />}
    </div>
  )
}
