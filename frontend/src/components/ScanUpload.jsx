import { useRef, useState } from 'react'
import LiveScanTerminal from './LiveScanTerminal'

const s = {
  wrapper: { maxWidth: '600px', margin: '80px auto', textAlign: 'center' },
  title: { fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  desc: { color: '#718096', marginBottom: '40px', fontSize: '15px' },
  dropzone: {
    border: '2px dashed #2d3748', borderRadius: '12px', padding: '60px 40px',
    cursor: 'pointer', transition: 'border-color 0.2s', background: '#1a1d2e'
  },
  dropzoneHover: { borderColor: '#e53e3e' },
  icon: { fontSize: '48px', marginBottom: '16px' },
  dropText: { color: '#a0aec0', fontSize: '15px' },
  fileName: { color: '#68d391', marginTop: '12px', fontSize: '14px' },
  btn: {
    marginTop: '24px', padding: '12px 32px', background: '#e53e3e', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%'
  },
  demoBtn: {
    marginTop: '12px', padding: '10px 32px', background: 'transparent', color: '#718096',
    border: '1px solid #2d3748', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', width: '100%'
  },
  error: { color: '#fc8181', marginTop: '12px', fontSize: '14px' }
}

export default function ScanUpload({ onResult, loading, setLoading, apiFetch }) {
  const inputRef = useRef()
  const [file, setFile] = useState(null)
  const [hover, setHover] = useState(false)
  const [error, setError] = useState('')
  const [liveScanning, setLiveScanning] = useState(false)

  const handleFile = (f) => { setFile(f); setError('') }
  const handleDrop = (e) => {
    e.preventDefault(); setHover(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleScan = () => {
    if (!file) return
    setError('')
    setLiveScanning(true)
  }

  const handleLiveComplete = (result) => {
    setLiveScanning(false)
    setFile(null)
    onResult(result)
  }

  const handleLiveCancel = () => {
    setLiveScanning(false)
  }

  const handleDemo = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/scan/demo', { method: 'POST' })
      if (!res.ok) throw new Error('Demo scan failed')
      const data = await res.json()
      onResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const token = localStorage.getItem('hex_token')

  return (
    <div style={{ maxWidth: liveScanning ? '800px' : '600px', margin: '40px auto' }}>
      {!liveScanning && (
        <>
          <div style={{ textAlign: 'center' }}>
            <div style={s.title}>Scan Your AI Model</div>
            <div style={s.desc}>Upload any ML model file to detect vulnerabilities, backdoors, and compliance issues</div>
          </div>

          <div
            style={{ ...s.dropzone, ...(hover ? s.dropzoneHover : {}) }}
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setHover(true) }}
            onDragLeave={() => setHover(false)}
            onDrop={handleDrop}
          >
            <div style={s.icon}>🔍</div>
            <div style={s.dropText}>Drop your model file here or click to browse</div>
            <div style={{ color: '#4a5568', fontSize: '12px', marginTop: '8px' }}>
              .safetensors, .pkl, .onnx, .pth, .h5, .bin and more
            </div>
            {file && <div style={s.fileName}>✓ {file.name}</div>}
            <input ref={inputRef} type="file" hidden onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {error && <div style={s.error}>⚠ {error}</div>}

          <button style={s.btn} onClick={handleScan} disabled={!file || loading}>
            Run Security Scan
          </button>
          <button style={s.demoBtn} onClick={handleDemo} disabled={loading}>
            {loading ? 'Loading...' : 'Try with demo report'}
          </button>
        </>
      )}

      {liveScanning && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Running Security Scan</div>
            <div style={{ color: '#718096', fontSize: '14px', marginTop: '4px' }}>Live scanner output</div>
          </div>
          <LiveScanTerminal
            file={file}
            token={token}
            onComplete={handleLiveComplete}
            onCancel={handleLiveCancel}
          />
        </div>
      )}
    </div>
  )
}
