import LearningPulse from './LearningPulse'
import { useState } from 'react'

import './AdminOverview.css'
import { instituteToday } from './instituteDate'
import { feeTotals } from './lmsLogic'
import { money } from './demoData'
import { PolishedForm } from './WorkspacePolish'
import { useFormGuard } from './workspaceHooks'

function dayLabel(date) { return date ? new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(`${date}T12:00:00+05:30`)) : 'Not recorded' }
function Empty({children}) {return <div className="ao-empty"><span aria-hidden="true">◇</span><p>{children}</p></div>}
function Metric({label,value,note,onClick,tone=''}) {return <button className={`ao-metric ${tone}`} onClick={onClick}><span>{label}<span aria-hidden="true">↗</span></span><strong>{value}</strong><small>{note}</small>{value==='—'&&<span className="wp-data-badge">Not connected</span>}</button>}

export function Announcements({store,role,onNotice}) {
  const guard=useFormGuard()
  const {announcements,setAnnouncements,batches,enrolled,courses}=store
  const [writing,setWriting]=useState(false)
  const [scope,setScope]=useState('All')
  const visible=announcements.filter(a=>a.status==='Published' || role==='Admin').filter(a=>role==='Admin'||a.audience==='All students'||(role==='Student'?enrolled.includes(batches.find(b=>b.id===a.audience)?.course):courses.some(c=>c.id===batches.find(b=>b.id===a.audience)?.course&&c.trainer===store.people.find(p=>p.id===store.activeTrainerId)?.name))).filter(a=>scope==='All'||a.audience===scope)
  function publish(e) {
    e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget))
    if(!f.title.trim()||!f.message.trim()){onNotice('Please enter a title and message.');return}
    setAnnouncements(current=>[{id:crypto.randomUUID(),title:f.title.trim(),message:f.message.trim(),audience:f.audience,status:f.status,date:instituteToday()},...current])
    setWriting(false);onNotice(f.status==='Published'?'Announcement published in this workspace. No email or external notification was sent.':'Announcement saved as a draft.')
  }
  return <section className="ad-panel"><div className="ad-panel-title"><div><h2>Announcements</h2><p>Keep your learning community informed</p></div>{role==='Admin'&&<button className="ad-primary" onClick={()=>guard.run(()=>setWriting(!writing))}>{writing?'Cancel':'+ New announcement'}</button>}</div>
    {writing&&<PolishedForm className="dw-form ao-compose" onSubmit={publish}><label>Title<input name="title" required maxLength={120}/></label><label>Message<textarea name="message" required maxLength={2000}/></label><label>Audience<select name="audience"><option value="All students">All students</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Publication status<select name="status"><option>Published</option><option>Draft</option></select></label><div className="wp-form-actions"><button type="button" className="wp-secondary" onClick={()=>guard.run(()=>setWriting(false))}>Cancel</button><button type="submit" className="ad-primary">Save announcement</button></div></PolishedForm>}
    {role==='Admin'&&<label className="ao-inline-label">Audience filter<select value={scope} onChange={e=>setScope(e.target.value)}><option value="All">All audiences</option><option value="All students">All students</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    {visible.length?<div className="ao-announcements">{visible.map(a=><article key={a.id}><div className="ao-announcement-meta"><span className={`ad-status ${a.status==='Published'?'active':'pending'}`}>{a.status}</span><span>{a.audience==='All students'?'All students':batches.find(b=>b.id===a.audience)?.name||'Selected batch'}</span><time>{dayLabel(a.date)}</time></div><h3>{a.title}</h3><p>{a.message}</p>{role==='Admin'&&<button className="ad-text-button" onClick={()=>{setAnnouncements(current=>current.map(item=>item.id===a.id?{...item,status:item.status==='Published'?'Draft':'Published'}:item));onNotice(a.status==='Published'?'Announcement moved to draft.':'Announcement published in this workspace.')}}>{a.status==='Published'?'Unpublish':'Publish'}</button>}</article>)}</div>:<Empty>No announcements yet. {role==='Admin'?'Create a batch update or a message for all students.':''}</Empty>}
  </section>
}

export function Attendance({store,onNotice}) {
  const {batches,people,attendance,setAttendance}=store
  const [batchId,setBatchId]=useState(batches[0]?.id||'')
  const [date,setDate]=useState(instituteToday)
  const batch=batches.find(b=>b.id===batchId)

  const learners=people.filter(p=>p.role==='Student'&&p.batchId===batchId&&p.status==='Active')
  const records=attendance.filter(r=>r.batchId===batchId&&r.date===date)
  const counts={Present:0,Absent:0,Late:0}
  learners.forEach(p=>{const value=records.find(r=>r.personId===p.id)?.status;if(value)counts[value]++})
  function mark(personId,status) {setAttendance(current=>[...current.filter(r=>!(r.batchId===batchId&&r.date===date&&r.personId===personId)),...(status?[{id:`${batchId}:${date}:${personId}`,batchId,date,personId,status}]:[])])}
  function exportCsv(){const rows=[['Student','Batch','Date','Attendance'],...learners.map(p=>[p.name,batch?.name,date,records.find(r=>r.personId===p.id)?.status||'Not marked'])];const url=URL.createObjectURL(new Blob([rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`attendance-${date}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  return <section className="ad-panel"><div className="ad-panel-title"><div><h2>Attendance register</h2><p>Attendance is recorded for students assigned to this batch.</p></div><button className="ad-text-button" disabled={!learners.length} onClick={exportCsv}>Export CSV</button></div><div className="ao-attendance-filters"><label>Batch<select value={batchId} onChange={e=>setBatchId(e.target.value)}>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Class date<input type="date" value={date} max={instituteToday()} required onChange={e=>setDate(e.target.value)}/></label></div><div className="ao-attendance-counts"><span><b>{counts.Present}</b> Present</span><span><b>{counts.Absent}</b> Absent</span><span><b>{counts.Late}</b> Late</span><span><b>{learners.length-records.filter(r=>learners.some(p=>p.id===r.personId)).length}</b> Not marked</span></div>
    {learners.length?<><div className="ad-table-wrap"><table><thead><tr><th>Student</th><th>Email</th><th>Attendance</th></tr></thead><tbody>{learners.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.email}</td><td><select aria-label={`Attendance for ${p.name}`} value={records.find(r=>r.personId===p.id)?.status||''} disabled={!date} onChange={e=>mark(p.id,e.target.value)}><option value="">Not marked</option><option>Present</option><option>Absent</option><option>Late</option></select></td></tr>)}</tbody></table></div><div className="dw-actions"><button className="ad-primary" disabled={!date} onClick={()=>{setAttendance(current=>[...current.filter(r=>!(r.batchId===batchId&&r.date===date)),...learners.map(p=>({id:`${batchId}:${date}:${p.id}`,batchId,date,personId:p.id,status:'Present'}))]);onNotice('All listed students marked present in this workspace.')}}>Mark all present</button><span className="ao-small-note">Changes are kept in this workspace.</span></div></>:<Empty>No active students assigned to this batch course.</Empty>}
  </section>
}

export default function AdminOverview({store,navigate,onNotice}) {
  const {courses,people,batches,sessions,submissions,announcements,attendance}=store
  const [range,setRange]=useState('This month')
  const [from,setFrom]=useState('')
  const [to,setTo]=useState('')
  const today=instituteToday()
  const start=range==='Today'?today:range==='This month'?`${today.slice(0,7)}-01`:range==='Custom'?from:''
  const end=range==='Today'||range==='This month'?today:range==='Custom'?to:''
  const invalid=range==='Custom'&&(!from||!to||from>to)
  const within=date=>!invalid&&!!date&&(!start||date>=start)&&(!end||date<=end)
  const students=people.filter(p=>p.role==='Student')
  const recent=students.filter(p=>within(p.joinedAt)).sort((a,b)=>b.joinedAt.localeCompare(a.joinedAt)).slice(0,5)
  const classes=sessions.filter(s=>within(s.date)&&(!s.status||s.status==='Scheduled')).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const todayClasses=sessions.filter(s=>s.date===today&&(!s.status||s.status==='Scheduled'))
  const activeBatches=batches.filter(b=>b.status==='Active'&&b.startDate<=today&&b.endDate>=today)
  const pendingStudents=store.enrolments.filter(e=>e.status==='Pending').length
  const recordedPaid=store.feePayments.reduce((sum,p)=>sum+Number(p.amount),0)
  const pendingFees=store.feeAccounts.reduce((sum,a)=>sum+feeTotals(a,store.feePayments).balance,0)
  const ungraded=submissions.filter(s=>s.status!=='Graded').length
  const unassigned=courses.filter(c=>!c.trainer||!people.some(p=>p.role==='Trainer'&&p.name===c.trainer&&p.status==='Active')).length
  const selectedAttendance=attendance.filter(r=>within(r.date))
  const present=selectedAttendance.filter(r=>r.status==='Present'||r.status==='Late').length
  const attendanceRate=selectedAttendance.length?Math.round(present/selectedAttendance.length*100):null
  const published=announcements.filter(a=>a.status==='Published')
  return <>
    <LearningPulse store={store} navigate={navigate}/>
    <section className="ao-rangebar" aria-label="Overview date filter"><div><strong>Activity overview</strong><small>Filter registrations, scheduled classes and attendance. Summary cards show current totals.</small></div><div className="ao-range-controls"><label><span className="dw-sr-only">Activity date range</span><select value={range} onChange={e=>setRange(e.target.value)}><option>Today</option><option>This month</option><option>All time</option><option>Custom</option></select></label>{range==='Custom'&&<><label><span className="dw-sr-only">Start date</span><input aria-label="Start date" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><span>to</span><label><span className="dw-sr-only">End date</span><input aria-label="End date" type="date" min={from} value={to} onChange={e=>setTo(e.target.value)}/></label></>}</div></section>
    {invalid&&<p className="ao-range-error" role="alert">Choose a valid start and end date.</p>}
    <section className="ao-metrics" aria-label="Institute summary"><Metric label="Collected Fees" value={store.feeAccounts.length?money(recordedPaid):'—'} note={store.feeAccounts.length?'Recorded payment entries':'No payment records connected'} onClick={()=>navigate('Payments')} tone="ao-green"/><Metric label="Pending Fees" value={store.feeAccounts.length?money(pendingFees):'—'} note={store.feeAccounts.length?'Based on recorded fee accounts':'Fee balance records not connected'} onClick={()=>navigate('Payments')} tone="ao-amber"/><Metric label="Active Batches" value={activeBatches.length} note="Currently running batches" onClick={()=>navigate('Batches')}/><Metric label="Students" value={students.length} note="Current student records" onClick={()=>navigate('Students')}/><Metric label="Trainers" value={people.filter(p=>p.role==='Trainer').length} note="Current trainer records" onClick={()=>navigate('Trainers')}/><Metric label="Courses" value={courses.length} note="Across your learning paths" onClick={()=>navigate('Courses')}/></section>
    <div className="ao-main-grid"><section className="ad-panel"><div className="ad-panel-title"><div><h2>Recent registrations</h2><p>Latest students in your selected date range</p></div><button className="ad-text-button" onClick={()=>navigate('Students')}>View students →</button></div>{recent.length?<div className="ad-table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Joined</th><th>Status</th></tr></thead><tbody>{recent.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>{p.email}</small></td><td>{p.course}</td><td>{dayLabel(p.joinedAt)}</td><td><span className={`ad-status ${p.status==='Active'?'active':'pending'}`}>{p.status}</span></td></tr>)}</tbody></table></div>:<Empty>No registrations in this date range.</Empty>}</section>
    <section className="ad-panel ao-actions"><div className="ad-panel-title"><div><h2>Pending actions</h2><p>Keep the important things moving</p></div><span className="ao-count">{pendingStudents+ungraded+unassigned}</span></div>{[[pendingStudents,'Pending enrolments','Enrolments','Review student access'],[ungraded,'Assignments to grade','Submissions','Review submitted work'],[unassigned,'Courses without an active trainer','Courses','Assign a teaching owner']].map(([count,title,target,description])=><button className="ao-action-row" key={title} onClick={()=>navigate(target)}><span className={`ao-action-number ${count?'needs-attention':''}`}>{count}</span><span><strong>{title}</strong><small>{description}</small></span><span aria-hidden="true">→</span></button>)}</section></div>
    <div className="ao-main-grid"><section className="ad-panel"><div className="ad-panel-title"><div><h2>Today’s classes</h2><p>{dayLabel(today)} · Asia/Kolkata</p></div><span className="ao-count">{todayClasses.length}</span></div>{todayClasses.length?<div className="ao-class-list">{todayClasses.map(s=><article key={s.id}><time>{s.time}</time><div><h3>{s.title}</h3><p>{courses.find(c=>c.id===s.course)?.name} · {s.trainer}</p><small>{batches.find(b=>b.id===s.batchId)?.name||'Batch not assigned'}</small></div>{s.meetingUrl?<a className="ao-join" href={s.meetingUrl} target="_blank" rel="noopener noreferrer">Join ↗</a>:<button className="ad-text-button" onClick={()=>onNotice('No meeting link has been added to this class.')}>Link pending</button>}</article>)}</div>:<Empty>No classes scheduled for today.</Empty>}<button className="ad-text-button" onClick={()=>navigate('Live classes')}>Manage class schedule →</button></section>
    <section className="ad-panel"><div className="ad-panel-title"><div><h2>Attendance snapshot</h2><p>For your selected date range</p></div><button className="ad-text-button" onClick={()=>navigate('Attendance')}>Open register →</button></div><div className="ao-attendance-snapshot"><strong>{attendanceRate===null?'—':`${attendanceRate}%`}</strong><span>{selectedAttendance.length?'Present or late out of marked records':'No attendance marked in this range'}</span></div><div className="ao-attendance-counts"><span><b>{selectedAttendance.filter(r=>r.status==='Present').length}</b> Present</span><span><b>{selectedAttendance.filter(r=>r.status==='Absent').length}</b> Absent</span><span><b>{selectedAttendance.filter(r=>r.status==='Late').length}</b> Late</span></div></section></div>
    <div className="ao-main-grid"><section className="ad-panel"><div className="ad-panel-title"><div><h2>Scheduled classes</h2><p>Sessions in the selected date range</p></div><button className="ad-text-button" onClick={()=>navigate('Live classes')}>View schedule →</button></div>{classes.length?<div className="ao-schedule-list">{classes.slice(0,5).map(s=><div key={s.id}><span>{dayLabel(s.date)}<small>{s.time}</small></span><strong>{s.title}</strong></div>)}</div>:<Empty>No sessions in this date range. Select All time to include future sessions.</Empty>}</section>
    <section className="ad-panel"><div className="ad-panel-title"><div><h2>Announcements</h2><p>Your latest published updates</p></div><button className="ad-text-button" onClick={()=>navigate('Announcements')}>Manage →</button></div>{published.length?<div className="ao-announcements">{published.slice(0,2).map(a=><article key={a.id}><div className="ao-announcement-meta"><span>{a.audience==='All students'?'All students':batches.find(b=>b.id===a.audience)?.name||'Selected batch'}</span><time>{dayLabel(a.date)}</time></div><h3>{a.title}</h3><p>{a.message}</p></article>)}</div>:<Empty>No published updates yet. Add your first announcement.</Empty>}<button className="ad-text-button" onClick={()=>navigate('Announcements')}>Create an announcement →</button></section></div>
  </>
}
