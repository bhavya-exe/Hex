import { useState } from 'react'

const s = {
  wrapper: { minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' },
  logo: { fontSize: '28px', fontWeight: '700', color: '#e53e3e', textAlign: 'center', marginBottom: '4px' },
  subtitle: { color: '#718096', fontSize: '13px', textAlign: 'center', marginBottom: '32px' },
  label: { display: 'block', fontSize: '13px', color: '#a0aec0', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #2d3748',
    borderRadius: '8px', color: '#e2e8f0', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box'
  },
  btn: {
    width: '100%', padding: '12px', background: '#e53e3e', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px'
  },
  error: { color: '#fc8181', fontSize: '13px', marginBottom: '12px', textAlign: 'center' },
  hint: { color: '#4a5568', fontSize: '12px', textAlign: 'center', marginTop: '16px' }
}

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('username', username)
      form.append('password', password)

      const res = await fetch('/auth/login', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Login failed')
      }
      const data = await res.json()
      localStorage.setItem('hex_token', data.access_token)
      localStorage.setItem('hex_user', data.username)
      localStorage.setItem('hex_role', data.role || 'user')
      onLogin(data.username, data.role)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.logo}>⬡ HEX</div>
        <div style={s.subtitle}>AI Model Security Scanner</div>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Username</label>
          <input style={s.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoFocus />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          {error && <div style={s.error}>⚠ {error}</div>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={s.hint}>Default: admin / admin123</div>
      </div>
    </div>
  )
}
