import { useEffect, useRef, useState } from 'react'

const s = {
  wrapper: { background: '#0a0c10', border: '1px solid #2d3748', borderRadius: '10px', overflow: 'hidden', marginTop: '24px' },
  header: { background: '#1a1d2e', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #2d3748' },
  dot: (color) => ({ width: '12px', height: '12px', borderRadius: '50%', background: color }),
  title: { color: '#718096', fontSize: '13px', marginLeft: '8px' },
  terminal: { padding: '16px', fontFamily: 'monospace', fontSize: '12px', height: '320px', overflowY: 'auto', lineHeight: '1.6' },
  line: (type) => ({
    color: type === 'error' ? '#fc8181' : type === 'status' ? '#63b3ed' : type === 'complete' ? '#68d391' : '#a0aec0',
    marginBottom: '2px'
  }),
  prefix: (type) => ({
    color: type === 'error' ? '#fc4444' : type === 'status' ? '#4299e1' : '#68d391',
    marginRight: '8px'
  }),
  progress: { height: '3px', background: '#2d3748', position: 'relative', overflow: 'hidden' },
  progressBar: (pct) => ({
    height: '100%', background: 'linear-gradient(90deg, #e53e3e, #f6ad55)',
    width: `${pct}%`, transition: 'width 0.3s ease'
  })
}

const PREFIX = { status: '●', log: '›', error: '✗', complete: '✓' }

export default function LiveScanTerminal({ file, token, onComplete, onCancel }) {
  const [lines, setLines] = useState([])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('connecting')
  const terminalRef = useRef()
  const wsRef = useRef()

  const addLine = (type, message) => {
    setLines(prev => [...prev, { type, message, id: Date.now() + Math.random() }])
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight
      }
    }, 50)
  }

  useEffect(() => {
    if (!file || !token) return

    const wsUrl = `ws://${window.location.host}/ws/scan`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = async () => {
      setStatus('running')
      addLine('status', 'Connected to scanner...')
      setProgress(10)

      // Send metadata
      ws.send(JSON.stringify({ filename: file.name, token }))
      setProgress(20)

      // Send file bytes
      const buffer = await file.arrayBuffer()
      ws.send(buffer)
      setProgress(30)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'status') {
        addLine('status', data.message)
        setProgress(p => Math.min(p + 15, 85))
      } else if (data.type === 'log') {
        addLine('log', data.message)
      } else if (data.type === 'error') {
        addLine('error', data.message)
        setStatus('error')
        setProgress(0)
      } else if (data.type === 'complete') {
        addLine('complete', 'Scan completed successfully')
        setProgress(100)
        setStatus('complete')
        setTimeout(() => onComplete(data.result), 800)
      }
    }

    ws.onerror = () => {
      addLine('error', 'WebSocket connection failed')
      setStatus('error')
    }

    ws.onclose = () => {
      if (status !== 'complete') {
        addLine('log', 'Connection closed')
      }
    }

    return () => ws.close()
  }, [file, token])

  const statusColor = { connecting: '#718096', running: '#63b3ed', complete: '#68d391', error: '#fc4444' }
  const statusLabel = { connecting: 'Connecting...', running: 'Scanning...', complete: 'Complete', error: 'Error' }

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <div style={s.dot('#fc4444')} />
        <div style={s.dot('#f6ad55')} />
        <div style={s.dot('#68d391')} />
        <span style={s.title}>hex scanner — {file?.name}</span>
        <span style={{ marginLeft: 'auto', color: statusColor[status], fontSize: '12px', fontWeight: '600' }}>
          ● {statusLabel[status]}
        </span>
        {status !== 'complete' && (
          <button onClick={onCancel} style={{ marginLeft: '12px', background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '12px' }}>
            ✕ Cancel
          </button>
        )}
      </div>

      <div style={s.progress}>
        <div style={s.progressBar(progress)} />
      </div>

      <div ref={terminalRef} style={s.terminal}>
        {lines.map(line => (
          <div key={line.id} style={s.line(line.type)}>
            <span style={s.prefix(line.type)}>{PREFIX[line.type]}</span>
            {line.message}
          </div>
        ))}
        {status === 'running' && (
          <div style={{ color: '#4a5568' }}>█</div>
        )}
      </div>
    </div>
  )
}
