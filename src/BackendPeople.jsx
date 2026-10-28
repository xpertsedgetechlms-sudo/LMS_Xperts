import { useEffect, useState } from 'react'
import { backendRequest } from './backendClient'

export default function BackendPeople({ personRole }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [revision, setRevision] = useState(0)
  const title = personRole === 'STUDENT' ? 'Student' : 'Trainer'
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const all = []
        for (let page = 0; ; page++) {
          const batch = await backendRequest(`/api/admin/users?page=${page}`, { signal: controller.signal })
          all.push(...batch)
          if (batch.length < 50) break
        }
        setRows(all.filter(row => row.role === personRole))
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.status === 401 ? 'Your session expired. Sign out and sign in again.' : err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [personRole, revision])
  async function save(event) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const body = { name: String(form.get('name')).trim(), email: String(form.get('email')).trim() }
    if (editor.id) body.enabled = form.get('enabled') === 'true'
    else {
      body.role = personRole
      body.password = String(form.get('password'))
      if (new TextEncoder().encode(body.password).length > 72) { setError('Password must not exceed 72 UTF-8 bytes.'); return }
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await backendRequest(editor.id ? `/api/admin/users/${editor.id}` : '/api/admin/users', { method: editor.id ? 'PUT' : 'POST', body })
      setEditor(null)
      setNotice(`${title} account ${editor.id ? 'updated' : 'created'} in the database.`)
      setRevision(value => value + 1)
    } catch (err) {
      setError(Object.values(err.fields || {}).join(' ') || err.message || 'Unable to save account.')
    } finally {
      setBusy(false)
    }
  }
  const filtered = rows.filter(row => `${row.name} ${row.email}`.toLowerCase().includes(search.toLowerCase()))
  return <section className="ad-panel pd-directory">
    <div className="ad-panel-title"><div><h2>{title} directory</h2><p>Accounts stored in PostgreSQL. Course and batch assignments are managed separately.</p></div><button className="ad-primary" disabled={busy || !!editor} onClick={() => { setError(''); setEditor({ name: '', email: '' }) }}>+ Add {title.toLowerCase()}</button></div>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {editor && <form key={editor.id || 'new'} className="dw-form dw-spaced" onSubmit={save}><fieldset disabled={busy}>
      <legend>{editor.id ? 'Edit' : 'Create'} {title.toLowerCase()} account</legend>
      <label>Full name<input name="name" defaultValue={editor.name} minLength={2} maxLength={100} required /></label>
      <label>Email<input name="email" type="email" defaultValue={editor.email} maxLength={254} required /></label>
      {editor.id ? <label>Account access<select name="enabled" defaultValue={String(editor.enabled)}><option value="true">Active</option><option value="false">Disabled</option></select></label> : <label>Initial password<input name="password" type="password" minLength={12} maxLength={72} autoComplete="new-password" required /><small>12 or more characters, maximum 72 UTF-8 bytes. Share credentials privately; email delivery is not connected.</small></label>}
      <div className="wp-form-actions"><button type="button" className="wp-secondary" onClick={() => setEditor(null)}>Cancel</button><button className="ad-primary" type="submit">{busy ? 'Saving…' : 'Save account'}</button></div>
    </fieldset></form>}
    <label className="ad-search ad-standalone-search"><input aria-label="Search accounts" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} /></label>
    {loading ? <p role="status">Loading accounts…</p> : error && !editor ? <button className="ad-text-button" onClick={() => setRevision(value => value + 1)}>Retry</button> : <><div className="ad-table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Access</th><th>Joined</th><th>Action</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.email}</td><td>{row.enabled ? 'Active' : 'Disabled'}</td><td>{new Date(row.createdAt).toLocaleDateString('en-IN')}</td><td><button className="ad-text-button" disabled={busy || !!editor} onClick={() => { setError(''); setEditor(row) }}>Edit / manage access</button></td></tr>)}</tbody></table></div>{!filtered.length && <p>No matching {title.toLowerCase()} accounts.</p>}</>}
  </section>
}
