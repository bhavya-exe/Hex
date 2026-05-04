import { useState, useEffect } from 'react'

const EXT_COLORS = {
  '.bin': '#f6ad55', '.pkl': '#fc4444', '.onnx': '#63b3ed',
  '.safetensors': '#68d391', '.pt': '#f6ad55', '.h5': '#b794f4',
  '.pth': '#f6ad55', '.onnx': '#63b3ed'
}

const EXT_ICONS = {
  '.bin': '🔶', '.pkl': '⚠️', '.onnx': '🔷', '.safetensors': '✅',
  '.pt': '🔶', '.h5': '🟣', '.pth': '🔶', '.pkl': '⚠️'
}

const s = {
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  desc: { color: '#718096', fontSize: '14px', marginBottom: '28px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  card: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '20px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  icon: { fontSize: '24px' },
  filename: { color: '#e2e8f0', fontSize: '14px', fontWeight: '600', wordBreak: 'break-all' },
  ext: (ext) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
    color: EXT_COLORS[ext] || '#a0aec0',
    background: (EXT_COLORS[ext] || '#a0aec0') + '22'
  }),
  size: { color: '#718096', fontSize: '12px', marginTop: '4px' },
  scanBtn: { width: '100%', padding: '9px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginTop: '12px' },
  scanningBtn: { width: '100%', padding: '9px', background: '#2d3748', color: '#718096', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontSize: '13px', marginTop: '12px' },
  empty: { color: '#718096', textAlign: 'center', padding: '60px', background: '#1a1d2e', borderRadius: '10px' },
  warning: { background: '#3a2a1a', border: '1px solid #f6ad5544', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#f6ad55', fontSize: '13px' }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ModelLibrary({ apiFetch, onResult }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/models')
      .then(r => r.json())
      .then(setModels)
      .catch(() => setError('Could not load model library'))
      .finally(() => setLoading(false))
  }, [])

  const handleScan = async (filename) => {
    setScanning(filename)
    setError('')
    try {
      const res = await apiFetch(`/models/${encodeURIComponent(filename)}/scan`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Scan failed')
      }
      const data = await res.json()
      onResult(data)
    } catch (e) {
      setError(`Failed to scan ${filename}: ${e.message}`)
    } finally {
      setScanning(null)
    }
  }

  if (loading) return <div style={s.empty}>Loading model library...</div>

  return (
    <div>
      <div style={s.title}>Model Library</div>
      <div style={s.desc}>Pre-loaded AI/ML model files ready for security scanning</div>

      <div style={s.warning}>
        ⚠ Note: .pkl and .bin files use pickle serialization which may trigger critical security findings. This is expected behavior.
      </div>

      {error && <div style={{ color: '#fc8181', marginBottom: '16px', fontSize: '14px' }}>⚠ {error}</div>}

      {models.length === 0 ? (
        <div style={s.empty}>
          No models found. Run <code style={{ color: '#68d391' }}>python create_models.py</code> in the backend folder to generate sample models.
        </div>
      ) : (
        <div style={s.grid}>
          {models.map(model => (
            <div key={model.name} style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.icon}>{EXT_ICONS[model.ext] || '📄'}</span>
                <div>
                  <div style={s.filename}>{model.name}</div>
                  <div style={s.size}>{formatSize(model.size)}</div>
                </div>
              </div>
              <span style={s.ext(model.ext)}>{model.ext}</span>
              <button
                style={scanning === model.name ? s.scanningBtn : s.scanBtn}
                onClick={() => handleScan(model.name)}
                disabled={scanning !== null}
              >
                {scanning === model.name ? '⏳ Scanning...' : '🔍 Scan Model'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
