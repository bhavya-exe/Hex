import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = { CRITICAL: '#fc4444', HIGH: '#f6ad55', MEDIUM: '#f6e05e', LOW: '#68d391' }

const s = {
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  desc: { color: '#718096', fontSize: '14px', marginBottom: '28px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s' },
  cardHover: { borderColor: '#e53e3e' },
  modelName: { fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' },
  meta: { color: '#718096', fontSize: '12px', marginBottom: '12px' },
  grade: (g) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
    color: g?.startsWith('A') ? '#68d391' : g?.startsWith('B') ? '#f6ad55' : '#fc4444',
    background: (g?.startsWith('A') ? '#68d391' : g?.startsWith('B') ? '#f6ad55' : '#fc4444') + '22'
  }),
  panel: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '24px', marginBottom: '20px' },
  panelTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#718096', textTransform: 'uppercase', borderBottom: '1px solid #2d3748' },
  td: { padding: '12px', fontSize: '14px', borderBottom: '1px solid #1e2235', color: '#e2e8f0' },
  backBtn: { padding: '6px 14px', background: 'transparent', color: '#a0aec0', border: '1px solid #2d3748', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  input: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', padding: '8px 12px', fontSize: '13px' },
  addBtn: { padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  empty: { color: '#718096', textAlign: 'center', padding: '60px', background: '#1a1d2e', borderRadius: '10px' }
}

function GradeTag({ grade }) {
  return <span style={s.grade(grade)}>{grade || 'N/A'}</span>
}

function ModelDetail({ modelName, apiFetch, onBack, scans }) {
  const [data, setData] = useState(null)
  const [trend, setTrend] = useState([])
  const [regName, setRegName] = useState(modelName)
  const [regVersion, setRegVersion] = useState('')
  const [regScanId, setRegScanId] = useState('')
  const [regNotes, setRegNotes] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    apiFetch(`/registry/${encodeURIComponent(modelName)}`).then(r => r.json()).then(setData)
    apiFetch(`/registry/${encodeURIComponent(modelName)}/trend`).then(r => r.json()).then(setTrend)
  }, [modelName])

  const handleRegister = async (e) => {
    e.preventDefault()
    const params = new URLSearchParams({ model_name: regName, version: regVersion, scan_id: regScanId, notes: regNotes })
    const res = await apiFetch(`/registry?${params}`, { method: 'POST' })
    if (res.ok) {
      setMsg('✓ Version registered')
      setRegVersion(''); setRegScanId(''); setRegNotes('')
      apiFetch(`/registry/${encodeURIComponent(modelName)}`).then(r => r.json()).then(setData)
      apiFetch(`/registry/${encodeURIComponent(modelName)}/trend`).then(r => r.json()).then(setTrend)
    } else {
      const err = await res.json()
      setMsg(`✗ ${err.detail}`)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const handleDelete = async (id) => {
    await apiFetch(`/registry/${id}`, { method: 'DELETE' })
    apiFetch(`/registry/${encodeURIComponent(modelName)}`).then(r => r.json()).then(setData)
  }

  if (!data) return <div style={s.empty}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <div style={s.title}>{modelName}</div>
      </div>

      {/* Trend chart */}
      {trend.length > 1 && (
        <div style={s.panel}>
          <div style={s.panelTitle}>Security Score Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="version" stroke="#718096" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#718096" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="security_score" stroke="#e53e3e" strokeWidth={2} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Versions table */}
      <div style={s.panel}>
        <div style={s.panelTitle}>
          <span>Versions ({data.versions?.length})</span>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Version</th>
              <th style={s.th}>File</th>
              <th style={s.th}>Grade</th>
              <th style={s.th}>Score</th>
              <th style={s.th}>Critical</th>
              <th style={s.th}>Registered</th>
              <th style={s.th}>By</th>
              <th style={s.th}>Notes</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.versions?.map(v => (
              <tr key={v.id}>
                <td style={{ ...s.td, fontFamily: 'monospace', color: '#63b3ed' }}>v{v.version}</td>
                <td style={{ ...s.td, color: '#718096', fontSize: '12px' }}>{v.filename}</td>
                <td style={s.td}><GradeTag grade={v.security_grade} /></td>
                <td style={s.td}>{v.security_score ?? '—'}</td>
                <td style={{ ...s.td, color: COLORS.CRITICAL, fontWeight: '700' }}>{v.critical ?? '—'}</td>
                <td style={{ ...s.td, color: '#718096', fontSize: '12px' }}>{new Date(v.registered_at + 'Z').toLocaleDateString()}</td>
                <td style={{ ...s.td, color: '#718096', fontSize: '12px' }}>{v.registered_by}</td>
                <td style={{ ...s.td, color: '#718096', fontSize: '12px' }}>{v.notes || '—'}</td>
                <td style={s.td}>
                  <button style={{ padding: '4px 10px', background: 'transparent', color: '#718096', border: '1px solid #2d3748', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }} onClick={() => handleDelete(v.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Register new version */}
      <div style={s.panel}>
        <div style={s.panelTitle}>Register New Version</div>
        <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 2fr 1fr auto', gap: '10px', alignItems: 'end' }}>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Version</div>
            <input style={s.input} placeholder="1.0.0" value={regVersion} onChange={e => setRegVersion(e.target.value)} required />
          </div>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Scan ID</div>
            <select style={{ ...s.input, width: '100%' }} value={regScanId} onChange={e => setRegScanId(e.target.value)} required>
              <option value="">Select scan...</option>
              {scans.map(s => <option key={s.id} value={s.id}>{s.filename} — {new Date(s.scanned_at + 'Z').toLocaleDateString()} (Grade: {s.security_grade})</option>)}
            </select>
          </div>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Notes</div>
            <input style={{ ...s.input, width: '100%' }} placeholder="Optional notes..." value={regNotes} onChange={e => setRegNotes(e.target.value)} />
          </div>
          <button style={s.addBtn} type="submit">Register</button>
        </form>
        {msg && <div style={{ color: msg.startsWith('✓') ? '#68d391' : '#fc8181', fontSize: '13px', marginTop: '10px' }}>{msg}</div>}
      </div>
    </div>
  )
}

export default function ModelRegistry({ apiFetch, scans }) {
  const [models, setModels] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newModel, setNewModel] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [newScanId, setNewScanId] = useState('')
  const [msg, setMsg] = useState('')
  const [hoverId, setHoverId] = useState(null)

  const fetchModels = () => {
    apiFetch('/registry').then(r => r.json()).then(data => {
      setModels(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchModels() }, [])

  const handleRegisterNew = async (e) => {
    e.preventDefault()
    const params = new URLSearchParams({ model_name: newModel, version: newVersion, scan_id: newScanId })
    const res = await apiFetch(`/registry?${params}`, { method: 'POST' })
    if (res.ok) {
      setMsg('✓ Model registered')
      setNewModel(''); setNewVersion(''); setNewScanId('')
      fetchModels()
    } else {
      const err = await res.json()
      setMsg(`✗ ${err.detail}`)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  if (selected) {
    return <ModelDetail modelName={selected} apiFetch={apiFetch} onBack={() => { setSelected(null); fetchModels() }} scans={scans} />
  }

  return (
    <div>
      <div style={s.title}>Model Registry</div>
      <div style={s.desc}>Track AI/ML models across versions with security score history</div>

      {loading ? (
        <div style={s.empty}>Loading registry...</div>
      ) : models.length === 0 ? (
        <div style={s.empty}>No models registered yet. Register a scan result below.</div>
      ) : (
        <div style={s.grid}>
          {models.map(m => (
            <div
              key={m.model_name}
              style={{ ...s.card, ...(hoverId === m.model_name ? s.cardHover : {}) }}
              onClick={() => setSelected(m.model_name)}
              onMouseEnter={() => setHoverId(m.model_name)}
              onMouseLeave={() => setHoverId(null)}
            >
              <div style={s.modelName}>📦 {m.model_name}</div>
              <div style={s.meta}>{m.version_count} version{m.version_count !== 1 ? 's' : ''} · Last updated {new Date(m.last_updated + 'Z').toLocaleDateString()}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <GradeTag grade={m.security_grade} />
                <span style={{ color: '#718096', fontSize: '12px' }}>Score: {m.security_score ?? 'N/A'}</span>
                {m.critical > 0 && <span style={{ color: COLORS.CRITICAL, fontSize: '12px', fontWeight: '700' }}>⚠ {m.critical} critical</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={s.panel}>
        <div style={s.panelTitle}>Register Model</div>
        <form onSubmit={handleRegisterNew} style={{ display: 'grid', gridTemplateColumns: '1fr auto 2fr auto', gap: '10px', alignItems: 'end' }}>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Model Name</div>
            <input style={{ ...s.input, width: '100%' }} placeholder="bert-base-uncased" value={newModel} onChange={e => setNewModel(e.target.value)} required />
          </div>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Version</div>
            <input style={s.input} placeholder="1.0.0" value={newVersion} onChange={e => setNewVersion(e.target.value)} required />
          </div>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Link to Scan</div>
            <select style={{ ...s.input, width: '100%' }} value={newScanId} onChange={e => setNewScanId(e.target.value)} required>
              <option value="">Select scan result...</option>
              {scans.map(s => <option key={s.id} value={s.id}>{s.filename} — {new Date(s.scanned_at + 'Z').toLocaleDateString()} (Grade: {s.security_grade})</option>)}
            </select>
          </div>
          <button style={s.addBtn} type="submit">Register</button>
        </form>
        {msg && <div style={{ color: msg.startsWith('✓') ? '#68d391' : '#fc8181', fontSize: '13px', marginTop: '10px' }}>{msg}</div>}
      </div>
    </div>
  )
}
