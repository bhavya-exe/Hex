import { useState, useEffect } from 'react'

const s = {
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  desc: { color: '#718096', fontSize: '14px', marginBottom: '28px' },
  section: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '24px', marginBottom: '20px' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#718096', textTransform: 'uppercase', borderBottom: '1px solid #2d3748' },
  td: { padding: '12px', fontSize: '14px', borderBottom: '1px solid #1e2235', color: '#e2e8f0' },
  input: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', padding: '10px 14px', fontSize: '14px', width: '300px' },
  btn: { padding: '10px 20px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  delBtn: { padding: '5px 12px', background: 'transparent', color: '#718096', border: '1px solid #2d3748', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  keyBox: { background: '#0f1117', border: '1px solid #68d391', borderRadius: '8px', padding: '16px', marginBottom: '20px' },
  keyText: { fontFamily: 'monospace', color: '#68d391', fontSize: '14px', wordBreak: 'break-all' },
  warning: { color: '#f6ad55', fontSize: '13px', marginTop: '8px' },
  badge: { padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  codeBlock: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '12px', color: '#a0aec0', overflowX: 'auto' }
}

export default function ApiKeysPage({ apiFetch }) {
  const [keys, setKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = () => {
    apiFetch('/apikeys').then(r => r.json()).then(setKeys).catch(() => {})
  }

  useEffect(() => { fetchKeys() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    const res = await apiFetch(`/apikeys?name=${encodeURIComponent(newKeyName)}`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setNewKey(data.key)
      setNewKeyName('')
      fetchKeys()
    }
  }

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    await apiFetch(`/apikeys/${id}`, { method: 'DELETE' })
    fetchKeys()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div style={s.title}>API Keys</div>
      <div style={s.desc}>Generate API keys to integrate Hex into your CI/CD pipelines programmatically</div>

      {newKey && (
        <div style={s.keyBox}>
          <div style={{ color: '#68d391', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>✓ New API Key Generated</div>
          <div style={s.keyText}>{newKey}</div>
          <div style={s.warning}>⚠ Copy this key now — it will not be shown again</div>
          <button onClick={handleCopy} style={{ ...s.delBtn, marginTop: '10px', color: '#63b3ed', borderColor: '#63b3ed44' }}>
            {copied ? '✓ Copied' : 'Copy to Clipboard'}
          </button>
        </div>
      )}

      <div style={s.section}>
        <div style={s.sectionTitle}>Create New API Key</div>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input style={s.input} placeholder="Key name (e.g. GitHub Actions)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
          <button style={s.btn} type="submit">Generate Key</button>
        </form>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Your API Keys ({keys.length})</div>
        {keys.length === 0 ? (
          <div style={{ color: '#718096', fontSize: '14px' }}>No API keys yet. Create one above.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Key Prefix</th>
                <th style={s.th}>Created</th>
                <th style={s.th}>Last Used</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td style={s.td}>{k.name}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', color: '#68d391' }}>{k.key_prefix}...</td>
                  <td style={{ ...s.td, color: '#718096' }}>{new Date(k.created_at + 'Z').toLocaleDateString()}</td>
                  <td style={{ ...s.td, color: '#718096' }}>{k.last_used ? new Date(k.last_used + 'Z').toLocaleString() : 'Never'}</td>
                  <td style={s.td}>
                    <button style={s.delBtn} onClick={() => handleRevoke(k.id)}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Usage Examples</div>
        <p style={{ color: '#718096', fontSize: '13px', marginBottom: '12px' }}>Use your API key in the <code style={{ color: '#68d391' }}>X-API-Key</code> header:</p>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#a0aec0', fontSize: '12px', marginBottom: '6px' }}>cURL — Scan a file</div>
          <div style={s.codeBlock}>{`curl -X POST http://localhost:8000/scan \\
  -H "X-API-Key: hex_your_key_here" \\
  -F "file=@model.safetensors"`}</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#a0aec0', fontSize: '12px', marginBottom: '6px' }}>GitHub Actions</div>
          <div style={s.codeBlock}>{
`- name: Scan AI Model
  run: |
    curl -X POST \${HEX_URL}/scan \\
      -H "X-API-Key: \${HEX_API_KEY}" \\
      -F "file=@model.bin" \\
      -o scan-results.json`
          }</div>
        </div>

        <div>
          <div style={{ color: '#a0aec0', fontSize: '12px', marginBottom: '6px' }}>Python</div>
          <div style={s.codeBlock}>{`import requests

response = requests.post(
    "http://localhost:8000/scan",
    headers={"X-API-Key": "hex_your_key_here"},
    files={"file": open("model.pkl", "rb")}
)
print(response.json()["summary"])`}</div>
        </div>
      </div>
    </div>
  )
}
