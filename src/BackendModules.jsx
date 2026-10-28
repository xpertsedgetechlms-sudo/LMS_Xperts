import { useEffect, useState } from 'react'
import { backendRequest } from './backendClient'
import BackendCourses from './BackendCourses'
import { PolishedForm } from './WorkspacePolish'
import { useFormGuard } from './workspaceHooks'
import { CourseCover } from './LearningPulse'
import './BackendModules.css'

const label = value => String(value || '').replaceAll('_', ' ').toLowerCase()
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not set'
const localInput = value => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''

export default function BackendModules({ page, role, user, onNavigate }) {
  const guard = useFormGuard()
  const [preview, setPreview] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState(null)
  const admin = role === 'Admin'
  const student = role === 'Student'
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError('')
      try {
        const get = path => backendRequest(path, { signal: controller.signal })
        const paths = {
          courses: admin ? '/api/admin/courses' : '/api/workspace/courses',
          batches: '/api/workspace/batches', sessions: '/api/workspace/sessions', attendance: '/api/workspace/attendance',
          assignments: '/api/workspace/assignments', resources: '/api/workspace/resources', submissions: '/api/workspace/submissions',
          ...(admin ? { enrolments: '/api/admin/enrolments' } : student ? { enrolments: '/api/student/enrolments' } : {}),
          ...(!student ? { learners: '/api/workspace/learners' } : {}),
        }
        const entries = await Promise.all(Object.entries(paths).map(async ([key,path]) => [key,await get(path)]))
        let people = []
        if (admin) {
          for (let index = 0; ; index++) {
            const batch = await get(`/api/admin/users?page=${index}`)
            people.push(...batch)
            if (batch.length < 50) break
          }
        }
        setData({ ...Object.fromEntries(entries), people })
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.status === 401 ? 'Your session expired. Sign out and sign in again.' : err.message || 'Unable to reach the backend.')
      }
    }
    load()
    return () => controller.abort()
  }, [admin, student, revision])
  const courseName = id => data?.courses.find(c => c.id === id)?.name || id
  const personName = id => data?.people.find(p => p.id === id)?.name || data?.learners?.find(p => p.studentId === id)?.name || (id === user.id ? user.name : id)
  const open = (kind, row = {}) => guard.run(() => { setEditor({ kind, ...row }); setError(''); setNotice(''); setHistory(null) })
  async function upload(file, courseId, assignmentId) {
    if (!file || !file.size || file.size > 20 * 1024 * 1024) throw new Error('Choose a non-empty file up to 20 MB.')
    const form = new FormData()
    form.append('file', file)
    form.append('courseId', courseId)
    if (assignmentId) form.append('assignmentId', assignmentId)
    return backendRequest('/api/workspace/files', { method: 'POST', body: form })
  }
  async function save(event) {
    event.preventDefault()
    if (busy) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const kind = editor.kind
    setBusy(true)
    setError('')
    try {
      let path, body, method = editor.id ? 'PUT' : 'POST'
      if (kind === 'course') {
        path = `/api/admin/courses${editor.id ? `/${editor.id}` : ''}`
        body = { id: editor.id || values.courseId, name: values.name, category: values.category, description: values.description, price: values.price === '' ? null : Number(values.price), published: values.published === 'true', trainerId: values.trainerId || null, duration: values.duration, level: values.level }
      } else if (kind === 'enrolment') {
        path = `/api/admin/enrolments${editor.id ? `/${editor.id}` : ''}`
        body = { status: values.status, expiresAt: values.expiresAt || null, ...(!editor.id ? { courseId: values.courseId, studentId: values.studentId } : {}) }
      } else if (kind === 'batch') {
        path = `/api/workspace/batches${editor.id ? `/${editor.id}` : ''}`
        body = { courseId: values.courseId, name: values.name, schedule: values.schedule, startsOn: values.startsOn, endsOn: values.endsOn }
      } else if (kind === 'members') {
        path = `/api/workspace/batches/${editor.id}/members`
        body = { studentIds: new FormData(event.currentTarget).getAll('studentIds') }
        method = 'PUT'
      } else if (kind === 'session') {
        path = `/api/workspace/sessions${editor.id ? `/${editor.id}` : ''}`
        body = { courseId: values.courseId, batchId: values.batchId || null, title: values.title, startsAt: new Date(values.startsAt).toISOString(), durationMinutes: Number(values.durationMinutes), meetingUrl: values.meetingUrl, status: values.status }
      } else if (kind === 'attendance') {
        path = '/api/workspace/attendance'; method = 'POST'
        body = { sessionId: values.sessionId, studentId: values.studentId, status: values.status }
      } else if (kind === 'assignment') {
        path = `/api/workspace/assignments${editor.id ? `/${editor.id}` : ''}`
        body = { courseId: values.courseId, title: values.title, description: values.description, dueAt: new Date(values.dueAt).toISOString() }
      } else if (kind === 'resource') {
        const file = await upload(values.file, values.courseId)
        path = '/api/workspace/resources'; method = 'POST'
        body = { courseId: values.courseId, title: values.title, fileId: file.id }
      } else if (kind === 'submission') {
        const file = await upload(values.file, editor.course_id, editor.id)
        path = '/api/workspace/submissions'; method = 'POST'
        body = { assignmentId: editor.id, fileId: file.id, note: values.note }
      } else if (kind === 'grade') {
        path = `/api/workspace/submissions/${editor.id}/grade`; method = 'PUT'
        body = { grade: Number(values.grade), feedback: values.feedback }
      }
      await backendRequest(path, { method, body })
      setEditor(null)
      setNotice('Saved to PostgreSQL successfully.')
      setRevision(value => value + 1)
    } catch (err) {
      setError(Object.values(err.fields || {}).join(' ') || err.message || 'Unable to save. Check the backend connection.')
      return false
    } finally { setBusy(false) }
  }
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])
  async function download(row, showPreview = false) {
    setError('')
    try {
      const response = await fetch(`/api/workspace/files/${row.file_id}`, { credentials: 'include' })
      if (!response.ok) throw new Error('This file is unavailable or your course access has expired.')
      const url = URL.createObjectURL(await response.blob())
      if (showPreview) { setPreview({ url, type: row.content_type, name: row.name }); return }
      const a = document.createElement('a'); a.href = url; a.download = row.name || row.file_name || 'download'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) { setError(err.message) }
  }
  async function viewHistory(row) {
    try { setHistory(await backendRequest(`/api/workspace/submissions/${row.id}/history`)) } catch (err) { setError(err.message) }
  }
  if (!data) return <section className="ad-panel"><p role={error ? 'alert' : 'status'}>{error || 'Loading database records…'}</p>{error && <button onClick={() => setRevision(v => v + 1)}>Retry</button>}</section>
  const kindByPage = { Courses: 'course', Enrolments: 'enrolment', Batches: 'batch', 'My batches': 'batch', 'Live classes': 'session', Attendance: 'attendance', 'Content library': 'resource', Assignments: 'assignment' }
  const canCreate = admin || (!student && !['Courses','Enrolments'].includes(page))
  const rowLists = { Courses: data.courses, Enrolments: data.enrolments, Batches: data.batches, 'My batches': data.batches, 'Live classes': data.sessions, Attendance: data.attendance, 'Content library': data.resources, Assignments: data.assignments, Submissions: data.submissions }
  const rows = (rowLists[page] || []).filter(row => `${row.name || row.title || ''} ${courseName(row.course_id || row.courseId)} ${personName(row.student_id || row.studentId)}`.toLowerCase().includes(search.toLowerCase()))
  const e = editor || {}
  const selectedCourse = e.courseId || e.course_id || data.courses[0]?.id || ''
  const courseField = <label>Course<select name="courseId" required defaultValue={selectedCourse} disabled={!!e.id && !['resource','enrolment'].includes(e.kind)}>{data.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{e.id && !['resource','enrolment'].includes(e.kind) && <input type="hidden" name="courseId" value={selectedCourse}/>}</label>
  const field = (name, title, options = {}) => <label key={name}>{title}<input name={name} required defaultValue={e[name] ?? ''} {...options}/></label>
  return <div className="backend-modules">
    {error && <p className="dw-notice" role="alert">{error}</p>}
    {notice && <p className="dw-notice" role="status">{notice}</p>}
    {page !== 'Explore courses' && <div className="bm-toolbar"><p>Database connected · {role} access</p><div><button className="wp-secondary" disabled={busy} onClick={() => setRevision(v => v + 1)}>Refresh</button>{kindByPage[page] && canCreate && <button className="ad-primary" disabled={busy || !!editor || (!data.courses.length && page !== 'Courses')} onClick={() => open(kindByPage[page])}>+ {page === 'Attendance' ? 'Mark attendance' : 'Add ' + label(kindByPage[page])}</button>}</div></div>}
    {editor && <PolishedForm className="ad-panel bm-form" key={`${e.kind}-${e.id || 'new'}`} onSubmit={save}><fieldset disabled={busy}><legend>{e.id ? 'Manage' : 'Create'} {label(e.kind)}</legend>
      {['course','batch'].includes(e.kind) && field('name', 'Name', { maxLength: 150 })}
      {['enrolment','batch','session','assignment','resource'].includes(e.kind) && !(e.kind === 'enrolment' && e.id) && courseField}
      {e.kind === 'course' && <>{!e.id && field('courseId','Course ID',{ pattern: '[a-z0-9-]{1,60}',maxLength:60,placeholder:'e.g. python-foundations' })}{field('category','Category',{maxLength:100})}<label>Description<textarea name="description" required maxLength={2000} defaultValue={e.description || ''}/></label><label>Course fee (INR)<input name="price" type="number" min="0" step="0.01" max="9999999999.99" defaultValue={e.price ?? ''}/></label><label>Trainer<select name="trainerId" defaultValue={e.trainerId || ''}><option value="">Not assigned</option>{data.people.filter(p => p.role === 'TRAINER' && p.enabled).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{field('duration','Duration',{required:false,maxLength:100})}{field('level','Level',{required:false,maxLength:50})}<label>Visibility<select name="published" defaultValue={String(e.published ?? false)}><option value="false">Draft</option><option value="true">Published</option></select></label></>}
      {e.kind === 'enrolment' && <>{!e.id && <label>Student<select name="studentId" required>{data.people.filter(p => p.role === 'STUDENT' && p.enabled).map(p => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}</select></label>}<label>Status<select name="status" defaultValue={e.status || 'PENDING'}><option>PENDING</option><option>ACTIVE</option><option>REVOKED</option></select></label><label>Expires on (optional)<input name="expiresAt" type="date" defaultValue={e.expiresAt || ''}/></label></>}
      {e.kind === 'batch' && <>{field('schedule','Schedule',{maxLength:300})}{field('startsOn','Start date',{type:'date',defaultValue:e.starts_on || ''})}{field('endsOn','End date',{type:'date',defaultValue:e.ends_on || ''})}</>}
      {e.kind === 'members' && <div><p>Select active course learners for {e.name}.</p>{data.learners?.filter(p => p.courseId === e.course_id && p.active).map(p => <label className="bm-check" key={p.studentId}><input name="studentIds" type="checkbox" value={p.studentId} defaultChecked={e.members?.some(m => m.student_id === p.studentId)}/>{p.name} · {p.email}</label>)}</div>}
      {['session','assignment','resource'].includes(e.kind) && field('title','Title',{maxLength:150})}
      {e.kind === 'session' && <><label>Batch<select name="batchId" defaultValue={e.batch_id || ''} disabled={!!e.id}><option value="">All enrolled students</option>{data.batches.map(b => <option key={b.id} value={b.id}>{b.name} · {courseName(b.course_id)}</option>)}</select>{e.id && <input name="batchId" type="hidden" value={e.batch_id || ''}/>}</label>{field('startsAt','Class starts (your device timezone)',{type:'datetime-local',defaultValue:localInput(e.starts_at)})}{field('durationMinutes','Duration (minutes)',{type:'number',min:5,max:480,defaultValue:e.duration_minutes || 60})}{field('meetingUrl','HTTPS meeting URL',{type:'url',maxLength:2000,defaultValue:e.meeting_url || ''})}<label>Status<select name="status" defaultValue={e.status || 'SCHEDULED'}><option>SCHEDULED</option><option>COMPLETED</option><option>CANCELLED</option></select></label></>}
      {e.kind === 'attendance' && <><label>Class<select name="sessionId" required defaultValue={e.session_id}>{data.sessions.filter(s => s.status !== 'CANCELLED').map(s => <option key={s.id} value={s.id}>{s.title} · {courseName(s.course_id)}</option>)}</select></label><label>Student<select name="studentId" required defaultValue={e.student_id}>{[...new Map((data.learners || []).filter(p => p.active).map(p => [p.studentId,p])).values()].map(p => <option key={p.studentId} value={p.studentId}>{p.name}</option>)}</select></label><label>Status<select name="status" defaultValue={e.status || 'PRESENT'}>{['PRESENT','ABSENT','LATE','EXCUSED'].map(s => <option key={s}>{s}</option>)}</select></label><small>The server verifies course enrolment and batch membership.</small></>}
      {e.kind === 'assignment' && <><label>Instructions<textarea name="description" required maxLength={4000} defaultValue={e.description || ''}/></label>{field('dueAt','Due date/time (your device timezone)',{type:'datetime-local',defaultValue:localInput(e.due_at)})}</>}
      {['resource','submission'].includes(e.kind) && <label>File (maximum 20 MB)<input name="file" type="file" accept=".pdf,.mp4,.webm,.txt,.png,.jpg,.jpeg,.zip" required/><small>PDF, MP4, WebM, TXT, PNG, JPEG or ZIP. Files are stored privately in PostgreSQL.</small></label>}
      {e.kind === 'submission' && <label>Submission notes<textarea name="note" maxLength={4000} defaultValue=""/><small>Late submissions are timestamped. Graded submissions cannot be replaced.</small></label>}
      {e.kind === 'grade' && <>{field('grade','Score / 100',{type:'number',min:0,max:100,defaultValue:e.grade ?? ''})}<label>Feedback<textarea name="feedback" maxLength={4000} defaultValue={e.feedback || ''}/></label><small>Each grading change is recorded in the audit history.</small></>}
      <div className="wp-form-actions"><button className="wp-secondary" type="button" onClick={() => guard.run(() => setEditor(null))}>Cancel</button><button className="ad-primary" type="submit">{busy ? 'Saving…' : 'Save to database'}</button></div>
    </fieldset></PolishedForm>}
    {page === 'Overview' && <section className="ad-panel"><h2>Welcome, {user.name}</h2><p>Your {role.toLowerCase()} account is verified by the backend.</p><div className="bm-summary">{[['Accessible courses',data.courses.length],['Batches',data.batches.length],['Live classes',data.sessions.length],['Assignments',data.assignments.length],['Submissions',data.submissions.length]].map(([name,count]) => <div key={name}><strong>{count}</strong><span>{name}</span></div>)}</div><p>Use the sidebar to manage your courses and learning activities.</p>{role === 'Admin' && <section aria-label="Account management"><h3>Manage institute accounts</h3><p>Create trainer and student login accounts, edit details, or disable access.</p><div className="bm-row-actions"><button className="ad-primary" onClick={() => onNavigate('Trainers')}>Manage trainers</button><button className="wp-secondary" onClick={() => onNavigate('Students')}>Manage students</button></div><p>Open a directory and select Add trainer or Add student to create an account.</p></section>}</section>}
    {page === 'Explore courses' && <BackendCourses onView={setSelected}/>}
    {selected && <section className="ad-panel"><h2>{selected.name}</h2><p>{selected.description}</p><p>Course access is activated by an administrator after enrolment confirmation. Contact the institute to enrol.</p><button className="ad-text-button" onClick={() => setSelected(null)}>Close details</button></section>}
    {page === 'My courses' && <div className="ad-course-grid">{data.courses.map(c => <article className="catalogue-card" key={c.id}><CourseCover course={c}/><div className="catalogue-card-content"><h2>{c.name}</h2><p>{c.description}</p><p>Use Lessons, Content library, Assignments and Live classes to access course material.</p><button className="ad-text-button" onClick={() => onNavigate(student ? 'Lessons' : 'Curriculum')}>Open lessons →</button></div></article>)}{!data.courses.length && <p>No active course access yet. Contact the institute.</p>}</div>}
    {rowLists[page] && <section className="ad-panel"><label className="ad-search ad-standalone-search"><input aria-label="Search database records" placeholder="Search records..." value={search} onChange={event => setSearch(event.target.value)}/></label><div className="ad-table-wrap"><table><thead><tr><th>Record</th><th>Course / student</th><th>Details</th><th>Actions</th></tr></thead><tbody>{rows.map((row,index) => <tr key={row.id || `${row.session_id}-${row.student_id}-${index}`}>
      <td><strong>{row.name || row.title || personName(row.studentId || row.student_id)}</strong>{row.description && <small className="bm-description">{row.description}</small>}</td>
      <td>{courseName(row.course_id || row.courseId)}{(row.studentId || row.student_id) && <small>{personName(row.studentId || row.student_id)}</small>}</td>
      <td>{page === 'Courses' ? `${row.published ? 'Published' : 'Draft'} · ${row.price == null ? 'Enquire for fee' : '₹' + row.price}` : page === 'Enrolments' ? `${label(row.status)} · ${row.expiresAt || 'No expiry'}` : ['Batches','My batches'].includes(page) ? `${row.schedule} · ${row.starts_on} – ${row.ends_on}` : page === 'Live classes' ? `${dateTime(row.starts_at)} · ${row.duration_minutes} min · ${label(row.status)}` : page === 'Attendance' ? `${label(row.status)} · ${dateTime(row.starts_at)}` : page === 'Assignments' ? `Due ${dateTime(row.due_at)}` : page === 'Content library' ? `${row.name} · ${(row.size_bytes / 1048576).toFixed(2)} MB` : <>{dateTime(row.submitted_at)}<small>{new Date(row.submitted_at) > new Date(row.due_at) ? 'Late submission' : 'Submitted on time'}</small><small>{row.grade == null ? 'Awaiting grade' : `${row.grade}/100 · ${row.feedback || 'No feedback'}`}</small><small>{row.note}</small></>}</td>
      <td><div className="bm-row-actions">
        {page === 'Courses' && admin && <button onClick={() => open('course',row)}>Edit</button>}
        {page === 'Enrolments' && admin && <button onClick={() => open('enrolment',row)}>Manage access</button>}
        {['Batches','My batches'].includes(page) && !student && <><button onClick={() => open('batch',row)}>Edit</button><button onClick={() => open('members',row)}>Manage learners</button></>}
        {page === 'Live classes' && <>{row.status === 'SCHEDULED' && <a href={row.meeting_url} target="_blank" rel="noopener noreferrer">Join class ↗</a>}{!student && <button onClick={() => open('session',row)}>Edit</button>}</>}
        {page === 'Attendance' && !student && <button onClick={() => open('attendance',row)}>Correct attendance</button>}
        {page === 'Content library' && <>{/^(video\/|application\/pdf$|image\/)/.test(row.content_type) && <button onClick={() => download(row,true)}>View / play</button>}<button onClick={() => download(row)}>Download</button></>}
        {page === 'Assignments' && (student ? data.submissions.some(s => s.assignment_id === row.id && s.grade != null) ? <span>Graded</span> : <button onClick={() => open('submission',row)}>Submit / replace file</button> : <button onClick={() => open('assignment',row)}>Edit</button>)}
        {page === 'Submissions' && <><button onClick={() => download(row)}>Download submission</button>{!student && <button onClick={() => open('grade',row)}>Grade</button>}<button onClick={() => viewHistory(row)}>Grade history</button></>}
      </div></td>
    </tr>)}</tbody></table></div>{!rows.length && <p>No records yet.</p>}</section>}
    {preview && <section className="ad-panel bm-preview" aria-label="File preview"><div className="bm-toolbar"><h2>{preview.name}</h2><button className="wp-secondary" onClick={() => setPreview(null)}>Close preview</button></div>{preview.type.startsWith('video/') ? <video src={preview.url} controls preload="metadata"/> : preview.type.startsWith('image/') ? <img src={preview.url} alt={preview.name}/> : <iframe src={preview.url} title={preview.name}/>}</section>}
    {history && <section className="ad-panel"><h2>Grading history</h2>{history.length ? history.map((entry,i) => <p key={i}>{dateTime(entry.graded_at)} · {entry.grade}/100 · {entry.feedback}</p>) : <p>No grade has been recorded.</p>}<button onClick={() => setHistory(null)}>Close</button></section>}
  </div>
}
