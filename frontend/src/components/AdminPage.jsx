import { useState, useEffect } from 'react'

const s = {
  title: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  desc: { color: '#718096', fontSize: '14px', marginBottom: '32px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' },
  statCard: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '20px' },
  statLabel: { fontSize: '12px', color: '#718096', textTransform: 'uppercase' },
  statVal: { fontSize: '32px', fontWeight: '700', color: '#e2e8f0', marginTop: '8px' },
  panel: { background: '#1a1d2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '24px', marginBottom: '20px' },
  panelTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#718096', textTransform: 'uppercase', borderBottom: '1px solid #2d3748' },
  td: { padding: '12px', fontSize: '14px', borderBottom: '1px solid #1e2235', color: '#e2e8f0' },
  badge: (role) => ({
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
    color: role === 'admin' ? '#e53e3e' : '#68d391',
    background: role === 'admin' ? '#e53e3e22' : '#68d39122',
    border: `1px solid ${role === 'admin' ? '#e53e3e44' : '#68d39144'}`
  }),
  delBtn: { padding: '5px 12px', background: 'transparent', color: '#718096', border: '1px solid #2d3748', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  form: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
  input: { background: '#0f1117', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', padding: '10px 14px', fontSize: '14px' },
  addBtn: { padding: '10px 24px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  fieldLabel: { color: '#718096', fontSize: '12px', marginBottom: '6px' },
  error: { color: '#fc8181', fontSize: '13px' },
  success: { color: '#68d391', fontSize: '13px' }
}

export default function AdminPage({ apiFetch }) {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState({ text: '', type: '' })

  const fetchData = async () => {
    const [uRes, sRes] = await Promise.all([
      apiFetch('/admin/users'),
      apiFetch('/admin/stats')
    ])
    if (uRes.ok) setUsers(await uRes.json())
    if (sRes.ok) setStats(await sRes.json())
  }

  useEffect(() => { fetchData() }, [])

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUsername || !newPassword) return
    const form = new FormData()
    form.append('username', newUsername)
    form.append('password', newPassword)
    const res = await apiFetch('/auth/register', { method: 'POST', body: form })
    if (res.ok) {
      setMsg({ text: `User "${newUsername}" created`, type: 'success' })
      setNewUsername('')
      setNewPassword('')
      fetchData()
    } else {
      const err = await res.json()
      setMsg({ text: err.detail, type: 'error' })
    }
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  const handleDelete = async (username) => {
    if (!confirm(`Delete user "${username}"?`)) return
    await apiFetch(`/admin/users/${username}`, { method: 'DELETE' })
    fetchData()
  }

  const handleRoleToggle = async (username, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await apiFetch(`/admin/users/${username}/role?role=${newRole}`, { method: 'PUT' })
    fetchData()
  }

  return (
    <div>
      <div style={s.title}>Admin Panel</div>
      <div style={s.desc}>Manage users and view platform statistics</div>

      {stats && (
        <div style={s.grid}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Total Users</div>
            <div style={s.statVal}>{users.length}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Total Scans</div>
            <div style={s.statVal}>{stats.total_scans}</div>
          </div>
        </div>
      )}

      {stats?.by_user?.length > 0 && (
        <div style={s.panel}>
          <div style={s.panelTitle}>Scans by User</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Username</th>
                <th style={s.th}>Scans</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_user.map((u, i) => (
                <tr key={i}>
                  <td style={s.td}>👤 {u.scanned_by || 'system'}</td>
                  <td style={s.td}>{u.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={s.panel}>
        <div style={s.panelTitle}>User Management</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Username</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>Created</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username}>
                <td style={s.td}>{u.username}</td>
                <td style={s.td}><span style={s.badge(u.role)}>{u.role}</span></td>
                <td style={{ ...s.td, color: '#718096' }}>{new Date(u.created_at + 'Z').toLocaleDateString()}</td>
                <td style={s.td}>
                  {u.username !== 'admin' && (
                    <>
                      <button style={{ ...s.delBtn, marginRight: '8px' }} onClick={() => handleRoleToggle(u.username, u.role)}>
                        {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                      </button>
                      <button style={s.delBtn} onClick={() => handleDelete(u.username)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.panel}>
        <div style={s.panelTitle}>Add New User</div>
        <form style={s.form} onSubmit={handleAddUser}>
          <div>
            <div style={s.fieldLabel}>Username</div>
            <input style={s.input} placeholder="username" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
          </div>
          <div>
            <div style={s.fieldLabel}>Password</div>
            <input style={s.input} type="password" placeholder="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <button style={s.addBtn} type="submit">Add User</button>
        </form>
        {msg.text && <div style={{ ...( msg.type === 'success' ? s.success : s.error), marginTop: '12px' }}>{msg.text}</div>}
      </div>
    </div>
  )
}
