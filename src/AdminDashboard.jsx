import { useState } from 'react'
import './AdminDashboard.css'

const courses = [
  { name: 'Software Development', tag: 'Development', students: 42, trainer: 'Arun Kumar', progress: 74 },
  { name: 'Software Testing', tag: 'Quality engineering', students: 36, trainer: 'Priya S', progress: 62 },
  { name: 'AWS & DevOps', tag: 'Cloud computing', students: 28, trainer: 'Rahul M', progress: 81 },
  { name: 'Data Science', tag: 'Data & analytics', students: 24, trainer: 'Divya R', progress: 58 },
  { name: 'Scrum', tag: 'Agile delivery', students: 18, trainer: 'Karthik S', progress: 90 },
  { name: 'GenAI', tag: 'Artificial intelligence', students: 32, trainer: 'Meera N', progress: 45 },
]
const students = [
  { name: 'Aarav Kumar', course: 'Software Development', batch: 'SD • October', status: 'Active', progress: 74 },
  { name: 'Diya Sharma', course: 'AWS & DevOps', batch: 'AWS • Weekend', status: 'Active', progress: 81 },
  { name: 'Mohammed Ali', course: 'Software Testing', batch: 'QA • October', status: 'Pending', progress: 12 },
  { name: 'Ananya Rao', course: 'Data Science', batch: 'DS • Weekend', status: 'Active', progress: 58 },
  { name: 'Vikram Raj', course: 'GenAI', batch: 'AI • October', status: 'Active', progress: 45 },
]
const payments = [
  { name: 'Aarav Kumar', course: 'Software Development', amount: 15000, status: 'Paid' },
  { name: 'Diya Sharma', course: 'AWS & DevOps', amount: 18000, status: 'Paid' },
  { name: 'Mohammed Ali', course: 'Software Testing', amount: 12000, status: 'Pending' },
]
const navigation = ['Overview', 'Students', 'Trainers', 'Courses', 'Batches', 'Payments', 'Reports']
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

function Icon({ name }) {
  const paths = {
    Overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    Students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
    Trainers: 'm12 3 10 5-10 5L2 8z M5 10v7q7 5 14 0v-7 M22 8v7',
    Courses: 'M4 3h6q2 0 2 2v16q0-2-2-2H4z M20 3h-6q-2 0-2 2v16q0-2 2-2h6z',
    Batches: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 11h16',
    Payments: 'M3 5h18v14H3z M3 10h18 M7 15h4',
    Reports: 'M4 3v18h17 M8 16v-5 M13 16V7 M18 16V4',
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.Overview} /></svg>
}

export default function AdminDashboard() {
  const [page, setPage] = useState('Overview')
  const [search, setSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [filter, setFilter] = useState('All')
  function navigate(next) { setPage(next); setSearch(''); setFilter('All'); setSelectedCourse(null) }
  const matches = text => text.toLowerCase().includes(search.toLowerCase())
  const filteredStudents = students.filter(s => matches(`${s.name} ${s.course} ${s.batch}`) && (filter === 'All' || s.status === filter))

  return <div className="ad-shell">
    <aside className="ad-sidebar">
      <a className="ad-brand" href="#admin-preview"><img src="/Logo.png" alt="" /><span>XpertsEdge<small>ADMIN WORKSPACE</small></span></a>
      <p className="ad-nav-label">WORKSPACE</p>
      <nav aria-label="Admin navigation">{navigation.map((item, i) => <button key={item} className={page === item ? 'active' : ''} aria-current={page === item ? 'page' : undefined} onClick={() => navigate(item)}><Icon name={item} /><span>{item}</span>{i === 1 && <small>180</small>}</button>)}</nav>
      <div className="ad-sidebar-bottom"><span className="ad-demo-dot" /> Frontend preview<p>Sample data only</p><a href="/">← Back to sign in</a></div>
    </aside>
    <div className="ad-main">
      <header className="ad-topbar"><div><span className="ad-breadcrumb">Workspace / </span><strong>{page}</strong></div><div className="ad-top-actions"><span className="ad-demo-pill">DEMO MODE</span><span className="ad-avatar">AD</span><div className="ad-admin-name"><strong>Administrator</strong><small>XpertsEdge Technologies</small></div></div></header>
      <main className="ad-content">
        <div className="ad-heading"><div><p className="ad-kicker">YOUR INSTITUTE, AT A GLANCE</p><h1>{page === 'Overview' ? 'A good day to make progress.' : page}</h1><p>{page === 'Overview' ? 'Keep your learners, teaching team and courses moving forward.' : `Explore your ${page.toLowerCase()} workspace with sample records.`}</p></div><button className="ad-primary" onClick={() => navigate(page === 'Students' ? 'Courses' : 'Students')}>{page === 'Students' ? 'Explore courses' : 'View students'} <span>↗</span></button></div>
        <div className="ad-preview-note">Preview workspace · All names, numbers, fees and schedules below are illustrative.</div>
        {(page === 'Overview' || page === 'Reports') && <>
          <section className="ad-stats" aria-label="Institute overview">{[
            ['Students', '180', 'Across six learning paths', 'Students'],
            ['Courses', '6', 'Ready to explore', 'Courses'],
            ['Trainers', '6', 'Your teaching team', 'Trainers'],
            ['Payments', money(33000), 'Sample collected payments', 'Payments'],
          ].map(([label, value, note, target]) => <button className="ad-stat" key={label} onClick={() => navigate(target)}><span className="ad-stat-top">{label}<Icon name={target} /></span><strong>{value}</strong><small>{note}</small></button>)}</section>
          <div className="ad-overview-grid"><section className="ad-panel"><div className="ad-panel-title"><div><h2>Learning momentum</h2><p>Sample average progress by course</p></div><span className="ad-neutral-pill">6 courses</span></div><div className="ad-chart">{courses.map(c => <div className="ad-chart-row" key={c.name}><span>{c.name}</span><div><i style={{width:`${c.progress}%`}} /></div><strong>{c.progress}%</strong></div>)}</div></section><section className="ad-next-class"><p className="ad-kicker">UP NEXT · SAMPLE SESSION</p><div className="ad-class-icon"><Icon name="Batches" /></div><h2>Build. Deploy.<br />Repeat.</h2><p>AWS & DevOps · CI/CD foundations</p><div className="ad-class-meta"><span>Weekend batch</span><span>10:00–11:30 AM</span></div><button onClick={() => navigate('Batches')}>View batch schedule <span>↗</span></button></section></div>
        </>}
        {(page === 'Overview' || page === 'Students') && <section className="ad-panel"><div className="ad-panel-title"><div><h2>{page === 'Overview' ? 'Learner spotlight' : 'Student directory'}</h2><p>A closer look at your learning community</p></div>{page === 'Overview' && <button className="ad-text-button" onClick={() => navigate('Students')}>View all students →</button>}</div><div className="ad-toolbar"><label className="ad-search"><span>⌕</span><input aria-label="Search students" placeholder="Search name, course or batch..." value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Filter student status" value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Active</option><option>Pending</option></select></div><div className="ad-table-wrap"><table><thead><tr><th>Student</th><th>Course / batch</th><th>Progress</th><th>Status</th></tr></thead><tbody>{filteredStudents.map((s, i) => <tr key={s.name}><td><div className="ad-person"><span className={`ad-person-avatar color-${i%3}`}>{s.name.split(' ').map(n=>n[0]).join('')}</span><strong>{s.name}</strong></div></td><td>{s.course}<small>{s.batch}</small></td><td><div className="ad-progress"><span><i style={{width:`${s.progress}%`}} /></span>{s.progress}%</div></td><td><span className={`ad-status ${s.status.toLowerCase()}`}>{s.status}</span></td></tr>)}</tbody></table>{!filteredStudents.length && <p className="ad-empty">No students match this search.</p>}</div></section>}
        {page === 'Courses' && <><label className="ad-search ad-standalone-search"><span>⌕</span><input aria-label="Search courses" placeholder="Find a learning path..." value={search} onChange={e=>setSearch(e.target.value)} /></label><div className="ad-course-grid">{courses.filter(c=>matches(c.name)).map((c,i)=><article className="ad-panel ad-course" key={c.name}><div className={`ad-course-art art-${i%3}`}><Icon name="Courses" /><span>0{i+1}</span></div><p className="ad-kicker">{c.tag}</p><h2>{c.name}</h2><p>{c.students} sample enrolments · {c.trainer}</p><button className="ad-text-button" onClick={()=>setSelectedCourse(c)}>View course overview →</button></article>)}</div>{!courses.some(c=>matches(c.name)) && <p className="ad-empty">No courses found.</p>}{selectedCourse && <section className="ad-panel ad-course-detail"><button className="ad-text-button" onClick={()=>setSelectedCourse(null)}>Close overview ×</button><h2>{selectedCourse.name}</h2><p>Trainer: {selectedCourse.trainer}</p><p>Planned learning tools: video lessons, PDF notes, live sessions, assignments and quizzes.</p><p>Demo overview only. Content editing and enrolment controls will be connected later.</p></section>}</>}
        {page === 'Trainers' && <div className="ad-course-grid">{courses.map((c,i)=><article className="ad-panel ad-trainer" key={c.name}><span className={`ad-person-avatar color-${i%3}`}>{c.trainer.split(' ').map(n=>n[0]).join('')}</span><h2>{c.trainer}</h2><p>{c.name}</p><span className="ad-status active">Sample trainer</span></article>)}</div>}
        {page === 'Batches' && <section className="ad-panel"><div className="ad-panel-title"><div><h2>Batch schedule</h2><p>Illustrative sessions — confirm actual timings with your team</p></div></div><div className="ad-table-wrap"><table><thead><tr><th>Course</th><th>Batch</th><th>Time</th><th>Trainer</th></tr></thead><tbody>{courses.map((c,i)=><tr key={c.name}><td>{c.name}</td><td>{i%2 ? 'Weekend' : 'Weekday'}</td><td>{i%2 ? '10:00–11:30 AM' : '6:00–7:30 PM'}</td><td>{c.trainer}</td></tr>)}</tbody></table></div></section>}
        {page === 'Payments' && <section className="ad-panel"><div className="ad-panel-title"><div><h2>Payment overview</h2><p>Sample transactions. No real payment processing is connected.</p></div></div><div className="ad-table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Amount</th><th>Status</th></tr></thead><tbody>{payments.map(p=><tr key={p.name}><td>{p.name}</td><td>{p.course}</td><td>{money(p.amount)}</td><td><span className={`ad-status ${p.status === 'Paid' ? 'active' : 'pending'}`}>{p.status}</span></td></tr>)}</tbody></table></div></section>}
        <footer className="ad-footer">XpertsEdge Technologies <span>Building Success Beyond Boundaries</span></footer>
      </main>
    </div>
  </div>
}
