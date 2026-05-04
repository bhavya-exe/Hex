import { useState, useEffect } from 'react'
import ScanUpload from './components/ScanUpload'
import Dashboard from './components/Dashboard'
import HistoryPage from './components/HistoryPage'
import LoginPage from './components/LoginPage'
import ComparePage from './components/ComparePage'
import SettingsPage from './components/SettingsPage'
import AboutPage from './components/AboutPage'
import AdminPage from './components/AdminPage'
import ModelLibrary from './components/ModelLibrary'
import ApiKeysPage from './components/ApiKeysPage'
import ModelRegistry from './components/ModelRegistry'

const apiFetch = (url, options = {}) => {
  const token = localStorage.getItem('hex_token')
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
}

const s = {
  app: { minHeight: '100vh', background: '#0f1117' },
  header: {
    background: '#1a1d2e', borderBottom: '1px solid #2d3748',
    padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  logo: { fontSize: '24px', fontWeight: '700', color: '#e53e3e', letterSpacing: '-0.5px' },
  subtitle: { fontSize: '13px', color: '#718096' },
  nav: { display: 'flex', gap: '8px', alignItems: 'center' },
  navBtn: (active) => ({
    padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
    background: active ? '#e53e3e' : 'transparent',
    color: active ? '#fff' : '#718096'
  }),
  userBadge: { color: '#68d391', fontSize: '13px', marginRight: '8px' },
  logoutBtn: {
    padding: '6px 14px', background: 'transparent', color: '#718096',
    border: '1px solid #2d3748', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
  },
  backBtn: {
    padding: '6px 14px', background: 'transparent', color: '#a0aec0',
    border: '1px solid #2d3748', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
    display: 'flex', alignItems: 'center', gap: '4px'
  },
  main: { padding: '32px' },
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '20px', fontSize: '13px', color: '#718096'
  }
}

const PAGE_LABELS = {
  scan: 'New Scan', result: 'Scan Results', history: 'History',
  compare: 'Compare', settings: 'Settings', about: 'About',
  admin: 'Admin', models: 'Models', apikeys: 'API Keys', registry: 'Registry'
}

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('hex_user'))
  const [userRole, setUserRole] = useState(localStorage.getItem('hex_role') || 'user')
  const [pageHistory, setPageHistory] = useState(() => {
    const saved = sessionStorage.getItem('hex_page_history')
    return saved ? JSON.parse(saved) : ['scan']
  })
  const [scanResult, setScanResult] = useState(() => {
    const saved = sessionStorage.getItem('hex_scan_result')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const page = pageHistory[pageHistory.length - 1]

  const navigateTo = (newPage) => {
    const newHistory = [...pageHistory, newPage]
    setPageHistory(newHistory)
    sessionStorage.setItem('hex_page_history', JSON.stringify(newHistory))
  }

  const goBack = () => {
    if (pageHistory.length <= 1) return
    const newHistory = pageHistory.slice(0, -1)
    setPageHistory(newHistory)
    sessionStorage.setItem('hex_page_history', JSON.stringify(newHistory))
  }

  const setPage = (newPage) => {
    setPageHistory([newPage])
    sessionStorage.setItem('hex_page_history', JSON.stringify([newPage]))
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await apiFetch('/history')
      if (res.ok) setHistory(await res.json())
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => { if (user) fetchHistory() }, [user])

  useEffect(() => {
    if (user) {
      apiFetch('/auth/me').then(r => r.json()).then(data => {
        if (data.role) {
          setUserRole(data.role)
          localStorage.setItem('hex_role', data.role)
        }
      }).catch(() => {})
    }
  }, [user])

  const handleLogin = (username, role) => {
    setUser(username)
    setUserRole(role || 'user')
    fetchHistory()
  }

  const handleLogout = () => {
    localStorage.removeItem('hex_token')
    localStorage.removeItem('hex_user')
    localStorage.removeItem('hex_role')
    sessionStorage.clear()
    setUser(null)
    setUserRole('user')
    setPageHistory(['scan'])
    setScanResult(null)
  }

  const handleResult = (result) => {
    setScanResult(result)
    sessionStorage.setItem('hex_scan_result', JSON.stringify(result))
    navigateTo('result')
    fetchHistory()
  }

  const handleViewScan = async (id) => {
    const res = await apiFetch(`/history/${id}`)
    if (!res.ok) return
    const data = await res.json()
    setScanResult(data)
    sessionStorage.setItem('hex_scan_result', JSON.stringify(data))
    navigateTo('result')
  }

  const handleDelete = async (id) => {
    await apiFetch(`/history/${id}`, { method: 'DELETE' })
    fetchHistory()
  }

  const canGoBack = pageHistory.length > 1

  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {canGoBack && (
            <button style={s.backBtn} onClick={goBack}>← Back</button>
          )}
          <div>
            <div style={s.logo}>⬡ HEX</div>
            <div style={s.subtitle}>AI Model Security Scanner by Layerd AI</div>
          </div>
        </div>
        <nav style={s.nav}>
          <button style={s.navBtn(page === 'scan' || page === 'result')} onClick={() => { setPage('scan'); setScanResult(null) }}>New Scan</button>
          <button style={s.navBtn(page === 'models')} onClick={() => setPage('models')}>Models</button>
          <button style={s.navBtn(page === 'history')} onClick={() => { setPage('history'); fetchHistory() }}>History</button>
          <button style={s.navBtn(page === 'compare')} onClick={() => { setPage('compare'); fetchHistory() }}>Compare</button>
          <button style={s.navBtn(page === 'settings')} onClick={() => setPage('settings')}>Settings</button>
          <button style={s.navBtn(page === 'about')} onClick={() => setPage('about')}>About</button>
          <button style={s.navBtn(page === 'apikeys')} onClick={() => setPage('apikeys')}>API Keys</button>
          <button style={s.navBtn(page === 'registry')} onClick={() => setPage('registry')}>Registry</button>
          {userRole === 'admin' && (
            <button style={s.navBtn(page === 'admin')} onClick={() => setPage('admin')}>Admin</button>
          )}
          <span style={s.userBadge}>👤 {user}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </nav>
      </header>
      <main style={s.main}>
        {/* Breadcrumb */}
        {pageHistory.length > 1 && (
          <div style={s.breadcrumb}>
            {pageHistory.map((p, i) => (
              <span key={i}>
                {i > 0 && <span style={{ margin: '0 4px' }}>›</span>}
                <span style={{ color: i === pageHistory.length - 1 ? '#e2e8f0' : '#718096' }}>
                  {PAGE_LABELS[p] || p}
                </span>
              </span>
            ))}
          </div>
        )}

        {page === 'scan' && (
          <ScanUpload onResult={handleResult} loading={loading} setLoading={setLoading} apiFetch={apiFetch} />
        )}
        {page === 'result' && scanResult && (
          <Dashboard result={scanResult} onReset={() => setPage('scan')} apiFetch={apiFetch} />
        )}
        {page === 'history' && (
          <HistoryPage scans={history} onView={handleViewScan} onDelete={handleDelete} loading={historyLoading} />
        )}
        {page === 'compare' && (
          <ComparePage scans={history} apiFetch={apiFetch} />
        )}
        {page === 'settings' && <SettingsPage apiFetch={apiFetch} />}
        {page === 'about' && <AboutPage />}
        {page === 'admin' && userRole === 'admin' && <AdminPage apiFetch={apiFetch} />}
        {page === 'models' && <ModelLibrary apiFetch={apiFetch} onResult={handleResult} />}
        {page === 'apikeys' && <ApiKeysPage apiFetch={apiFetch} />}
        {page === 'registry' && <ModelRegistry apiFetch={apiFetch} scans={history} />}
      </main>
    </div>
  )
}
