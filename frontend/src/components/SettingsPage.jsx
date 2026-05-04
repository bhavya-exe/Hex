import { useState, useEffect } from 'react'

const s = {
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  desc: { color: '#718096', fontSize: '14px', marginBottom: '32px' },
  section: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '24px', marginBottom: '20px' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px', borderBottom: '1px solid #2d3748', paddingBottom: '12px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1e2235' },
  label: { color: '#e2e8f0', fontSize: '14px' },
  sublabel: { color: '#718096', fontSize: '12px', marginTop: '2px' },
  select: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', padding: '8px 12px', fontSize: '13px' },
  input: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', padding: '8px 12px', fontSize: '13px', width: '80px', textAlign: 'center' },
  toggle: (on) => ({
    width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
    background: on ? '#e53e3e' : '#2d3748', position: 'relative', transition: 'background 0.2s'
  }),
  toggleDot: (on) => ({
    position: 'absolute', top: '4px', left: on ? '22px' : '4px',
    width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s'
  }),
  saveBtn: { padding: '10px 28px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  saved: { color: '#68d391', fontSize: '13px', marginLeft: '12px' }
}

function Toggle({ value, onChange }) {
  return (
    <button style={s.toggle(value)} onClick={() => onChange(!value)}>
      <div style={s.toggleDot(value)} />
    </button>
  )
}

export default function SettingsPage({ apiFetch }) {
  const [workers, setWorkers] = useState(4)
  const [timeout, setTimeout_] = useState(300)
  const [format, setFormat] = useState('json')
  const [verbose, setVerbose] = useState(false)
  const [autoScan, setAutoScan] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [saved, setSaved] = useState(false)

  // Webhook state
  const [webhooks, setWebhooks] = useState([])
  const [whName, setWhName] = useState('')
  const [whUrl, setWhUrl] = useState('')
  const [whType, setWhType] = useState('custom')
  const [whCritical, setWhCritical] = useState(true)
  const [whAll, setWhAll] = useState(false)
  const [whMsg, setWhMsg] = useState('')

  const fetchWebhooks = () => {
    if (!apiFetch) return
    apiFetch('/webhooks').then(r => r.json()).then(setWebhooks).catch(() => {})
  }

  useEffect(() => { fetchWebhooks() }, [])

  const handleSave = () => {
    localStorage.setItem('hex_settings', JSON.stringify({ workers, timeout, format, verbose, autoScan, notifications }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddWebhook = async (e) => {
    e.preventDefault()
    if (!whName || !whUrl) return
    const params = new URLSearchParams({ name: whName, url: whUrl, wtype: whType, notify_critical: whCritical, notify_all: whAll })
    const res = await apiFetch(`/webhooks?${params}`, { method: 'POST' })
    if (res.ok) {
      setWhName(''); setWhUrl(''); setWhMsg('✓ Webhook added')
      fetchWebhooks()
      setTimeout(() => setWhMsg(''), 2000)
    }
  }

  const handleToggleWebhook = async (wh) => {
    await apiFetch(`/webhooks/${wh.id}?enabled=${!wh.enabled}`, { method: 'PUT' })
    fetchWebhooks()
  }

  const handleDeleteWebhook = async (id) => {
    await apiFetch(`/webhooks/${id}`, { method: 'DELETE' })
    fetchWebhooks()
  }

  const handleTestWebhook = async (id) => {
    await apiFetch(`/webhooks/${id}/test`, { method: 'POST' })
    setWhMsg('✓ Test sent')
    setTimeout(() => setWhMsg(''), 2000)
  }

  return (
    <div>
      <div style={s.title}>Settings</div>
      <div style={s.desc}>Configure scanner behavior and preferences</div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Scanner Configuration</div>

        <div style={s.row}>
          <div>
            <div style={s.label}>Worker Threads</div>
            <div style={s.sublabel}>Number of parallel scan workers</div>
          </div>
          <input style={s.input} type="number" min="1" max="16" value={workers} onChange={e => setWorkers(Number(e.target.value))} />
        </div>

        <div style={s.row}>
          <div>
            <div style={s.label}>Scan Timeout</div>
            <div style={s.sublabel}>Maximum scan duration in seconds</div>
          </div>
          <input style={s.input} type="number" min="60" max="3600" value={timeout} onChange={e => setTimeout_(Number(e.target.value))} />
        </div>

        <div style={s.row}>
          <div>
            <div style={s.label}>Default Output Format</div>
            <div style={s.sublabel}>Format for scan reports</div>
          </div>
          <select style={s.select} value={format} onChange={e => setFormat(e.target.value)}>
            <option value="json">JSON</option>
            <option value="text">Text</option>
            <option value="table">Table</option>
            <option value="sarif">SARIF</option>
          </select>
        </div>

        <div style={{ ...s.row, borderBottom: 'none' }}>
          <div>
            <div style={s.label}>Verbose Logging</div>
            <div style={s.sublabel}>Show detailed scanner output</div>
          </div>
          <Toggle value={verbose} onChange={setVerbose} />
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Dashboard Preferences</div>

        <div style={s.row}>
          <div>
            <div style={s.label}>Auto-save Scans</div>
            <div style={s.sublabel}>Automatically save all scan results to history</div>
          </div>
          <Toggle value={autoScan} onChange={setAutoScan} />
        </div>

        <div style={{ ...s.row, borderBottom: 'none' }}>
          <div>
            <div style={s.label}>Critical Issue Alerts</div>
            <div style={s.sublabel}>Show alerts when critical vulnerabilities are found</div>
          </div>
          <Toggle value={notifications} onChange={setNotifications} />
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Scanner Information</div>
        <div style={s.row}>
          <div style={s.label}>Docker Image</div>
          <span style={{ color: '#718096', fontSize: '13px' }}>layerd/hex:latest</span>
        </div>
        <div style={s.row}>
          <div style={s.label}>Scanner Version</div>
          <span style={{ color: '#68d391', fontSize: '13px' }}>1.0.0</span>
        </div>
        <div style={{ ...s.row, borderBottom: 'none' }}>
          <div style={s.label}>Supported Formats</div>
          <span style={{ color: '#718096', fontSize: '13px' }}>.safetensors, .pkl, .onnx, .pth, .h5, .bin +9 more</span>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Webhook Notifications</div>
        <p style={{ color: '#718096', fontSize: '13px', marginBottom: '16px' }}>
          Send scan results to Slack, Discord, or a custom URL when a scan completes.
        </p>

        {webhooks.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {webhooks.map(wh => (
              <div key={wh.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #1e2235' }}>
                <Toggle value={!!wh.enabled} onChange={() => handleToggleWebhook(wh)} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{wh.name}</div>
                  <div style={{ color: '#718096', fontSize: '11px' }}>{wh.type.toUpperCase()} — {wh.url.substring(0, 50)}...</div>
                </div>
                <button onClick={() => handleTestWebhook(wh.id)} style={{ padding: '4px 10px', background: 'transparent', color: '#63b3ed', border: '1px solid #63b3ed44', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Test</button>
                <button onClick={() => handleDeleteWebhook(wh.id)} style={{ padding: '4px 10px', background: 'transparent', color: '#718096', border: '1px solid #2d3748', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddWebhook} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: '10px', alignItems: 'end' }}>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Name</div>
            <input style={{ ...s.select, width: '100%' }} placeholder="My Slack" value={whName} onChange={e => setWhName(e.target.value)} />
          </div>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Webhook URL</div>
            <input style={{ ...s.select, width: '100%' }} placeholder="https://hooks.slack.com/..." value={whUrl} onChange={e => setWhUrl(e.target.value)} />
          </div>
          <div>
            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '4px' }}>Type</div>
            <select style={s.select} value={whType} onChange={e => setWhType(e.target.value)}>
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <button type="submit" style={{ padding: '8px 16px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            Add
          </button>
        </form>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <label style={{ color: '#a0aec0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={whCritical} onChange={e => setWhCritical(e.target.checked)} />
            Notify on Critical findings
          </label>
          <label style={{ color: '#a0aec0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={whAll} onChange={e => setWhAll(e.target.checked)} />
            Notify on all scans
          </label>
        </div>
        {whMsg && <div style={{ color: '#68d391', fontSize: '13px', marginTop: '8px' }}>{whMsg}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button style={s.saveBtn} onClick={handleSave}>Save Settings</button>
        {saved && <span style={s.saved}>✓ Saved</span>}
      </div>
    </div>
  )
}
