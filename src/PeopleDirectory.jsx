import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './PeopleDirectory.css'
import TrainerDetails from './TrainerDetails'
import { feeTotals, courseEligibility } from './lmsLogic'
import { money } from './demoData'

const csvValue = value => {
  let text=String(value??'')
  if(/^[=+@\-\t\r]/.test(text)) text="'"+text
  return '"'+text.replaceAll('"','""')+'"'
}
function exportPeople(rows) {
  const data=[['Name','Email','Phone','Course','Batch ID','Status','Joined'],...rows.map(p=>[p.name,p.email,p.phone,p.course,p.batchId,p.status,p.joinedAt])]
  const url=URL.createObjectURL(new Blob(['\ufeff'+data.map(row=>row.map(csvValue).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download='xpertsedge-directory.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function SortIcon({direction}) {return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={direction==='asc'?'m7 14 5-5 5 5':direction==='desc'?'m7 10 5 5 5-5':'m8 9 4-4 4 4m-8 6 4 4 4-4'}/></svg>}
function PageCheckbox({all,some,onChange}) {
  const ref=useRef(null)
  useEffect(()=>{if(ref.current)ref.current.indeterminate=some&&!all},[all,some])
  return <input ref={ref} type="checkbox" aria-label="Select all rows on this page" checked={all} onChange={onChange}/>
}

function StudentDrawer({person,store,onClose,onEdit}) {
  const ref=useRef(null)
  useEffect(()=>{ref.current?.showModal()},[])
  const batch=store.batches.find(b=>b.id===person.batchId)
  const courses=store.courses.filter(c=>store.enrolments.some(e=>e.studentId===person.id&&e.courseId===c.id))
  const attendance=store.attendance.filter(a=>a.personId===person.id).sort((a,b)=>b.date.localeCompare(a.date))
  const attended=attendance.filter(a=>a.status==='Present'||a.status==='Late').length
  const initials=person.name.split(' ').map(p=>p[0]).slice(0,2).join('')
  return createPortal(<dialog ref={ref} className="pd-drawer" aria-labelledby="student-drawer-title" onClose={onClose} onClick={e=>{if(e.target===e.currentTarget)ref.current?.close()}}>
    <div className="pd-drawer-content"><header className="pd-drawer-header"><div><p>STUDENT DETAILS</p><h2 id="student-drawer-title">Learning profile</h2></div><button type="button" className="pd-close" aria-label="Close student details" onClick={()=>ref.current?.close()}>×</button></header>
    <div className="pd-profile-cover"><span className="pd-big-avatar">{initials}</span><div><h3>{person.name}</h3><p>{person.email}</p><span className={`ad-status ${person.status==='Active'?'active':'pending'}`}>{person.status}</span></div></div>
    <div className="pd-drawer-scroll"><section className="pd-detail-section"><div className="pd-section-heading"><h3>Profile</h3><button onClick={()=>{ref.current?.close();onEdit(person)}}>Edit profile →</button></div><dl><div><dt>Student ID</dt><dd>{person.id}</dd></div><div><dt>Phone</dt><dd>{person.phone||'Not provided'}</dd></div><div><dt>Joining date</dt><dd>{person.joinedAt||'Not recorded'}</dd></div><div><dt>Batch</dt><dd>{batch?.name||'Not assigned'}</dd></div></dl></section>
    <section className="pd-detail-section"><h3>Courses</h3>{courses.length?courses.map(c=><article className="pd-course-detail" key={c.id}><span className="pd-course-initial">{c.name[0]}</span><div><strong>{c.name}</strong><small>Trainer: {c.trainer||'Not assigned'}</small><small>Progress: {courseEligibility(store,person.id,c.id).percent}%</small><small>{batch?.schedule||'Schedule not assigned'}</small></div></article>):<p className="pd-empty-text">No course assigned.</p>}</section>
    <section className="pd-detail-section"><h3>Fees & payments</h3>{store.feeAccounts.some(a=>a.studentId===person.id)?store.feeAccounts.filter(a=>a.studentId===person.id).map(a=>{const t=feeTotals(a,store.feePayments);return <div className="pd-course-detail lms-section" key={a.id}><div><strong>{store.courses.find(c=>c.id===a.courseId)?.name}</strong><small>Total {money(t.total)} · Recorded paid {money(t.paid)}</small><small>Balance {money(t.balance)}</small></div></div>}):<div className="pd-neutral-state"><span aria-hidden="true">—</span><div><strong>No fee records available</strong><p>No fee account has been recorded for this student. No balance is assumed.</p></div></div>}</section>
    <section className="pd-detail-section"><div className="pd-section-heading"><h3>Attendance</h3><span className="pd-detail-count">{attendance.length} records</span></div>{attendance.length?<><div className="pd-attendance-overview"><strong>{Math.round(attended/attendance.length*100)}%</strong><span>Present or late out of marked classes</span></div><div className="pd-attendance-history">{attendance.slice(0,10).map(a=><div key={`${a.batchId}-${a.date}`}><span>{a.date}<small>{store.batches.find(b=>b.id===a.batchId)?.name||'Batch'}</small></span><span className={`ad-status ${a.status==='Absent'?'pending':'active'}`}>{a.status}</span></div>)}</div></>:<p className="pd-empty-text">Attendance has not been marked for this student.</p>}</section></div>
    <footer className="pd-drawer-footer"><button className="ad-primary" onClick={()=>ref.current?.close()}>Done</button><span>Changes are kept for this page session.</span></footer></div>
  </dialog>,document.body)
}

export default function PeopleDirectory({personRole,store,onEdit,onAdd,onNotice}) {
  const {people,setPeople,courses,batches}=store
  const [query,setQuery]=useState('')
  const [status,setStatus]=useState('All')
  const [course,setCourse]=useState('All')
  const [batch,setBatch]=useState('All')
  const [sort,setSort]=useState({key:'name',direction:'asc'})
  const [page,setPage]=useState(1)
  const [size,setSize]=useState(5)
  const [selection,setSelection]=useState([])
  const [activeId,setActiveId]=useState(null)
  const [bulkStatus,setBulkStatus]=useState('')
  const [bulkBatch,setBulkBatch]=useState('')
  const rolePeople=people.filter(p=>p.role===personRole)
  const filtered=rolePeople.filter(p=>(`${p.name} ${p.email} ${p.phone||''} ${p.course}`.toLowerCase().includes(query.toLowerCase()))&&(status==='All'||p.status===status)&&(course==='All'||p.course===course)&&(batch==='All'||(batch==='none'?!p.batchId:p.batchId===batch)))
  const sorted=[...filtered].sort((a,b)=>{const result=String(a[sort.key]||'').localeCompare(String(b[sort.key]||''),undefined,{numeric:true,sensitivity:'base'});return (sort.direction==='asc'?result:-result)||a.id.localeCompare(b.id)})
  const pages=Math.max(1,Math.ceil(sorted.length/size))
  const currentPage=Math.min(page,pages)
  const rows=sorted.slice((currentPage-1)*size,currentPage*size)
  const selected=rolePeople.filter(p=>selection.includes(p.id))
  const activePerson=rolePeople.find(p=>p.id===activeId)
  const all=rows.length>0&&rows.every(p=>selection.includes(p.id))
  const some=rows.some(p=>selection.includes(p.id))
  const filtersActive=!!query||status!=='All'||course!=='All'||batch!=='All'
  function updateFilter(setter,value){setter(value);setPage(1);setSelection([])}
  function togglePage(){setSelection(current=>all?current.filter(id=>!rows.some(p=>p.id===id)):[...new Set([...current,...rows.map(p=>p.id)])])}
  function toggleOne(id){setSelection(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id])}
  function sortBy(key){setSort(current=>({key,direction:current.key===key&&current.direction==='asc'?'desc':'asc'}));setPage(1)}
  function clearFilters(){setQuery('');setStatus('All');setCourse('All');setBatch('All');setPage(1);setSelection([])}
  function applyStatus(){if(!bulkStatus||!selected.length)return;setPeople(current=>current.map(p=>selection.includes(p.id)&&p.role===personRole?{...p,status:bulkStatus}:p));onNotice(`${selected.length} ${personRole.toLowerCase()} record(s) updated to ${bulkStatus}.`);setSelection([]);setBulkStatus('')}
  function assignBatch(){const target=batches.find(b=>b.id===bulkBatch);const targetCourse=courses.find(c=>c.id===target?.course);if(!target||!targetCourse||!selected.length)return;setPeople(current=>current.map(p=>selection.includes(p.id)&&p.role==='Student'?{...p,batchId:target.id,course:targetCourse.name}:p));onNotice(`${selected.length} student record(s) assigned to ${target.name} and ${targetCourse.name}.`);setSelection([]);setBulkBatch('')}
  const heading=personRole==='Student'?'Student directory':'Trainer directory'
  const sortHeader=(title,key)=><th scope="col" aria-sort={sort.key===key?(sort.direction==='asc'?'ascending':'descending'):'none'}><button className="pd-sort" onClick={()=>sortBy(key)} aria-label={`Sort by ${title.toLowerCase()}`}>{title}<SortIcon direction={sort.key===key?sort.direction:undefined}/></button></th>
  return <section className="ad-panel pd-directory"><div className="pd-directory-heading"><div><p className="ad-kicker">YOUR LEARNING COMMUNITY</p><h2>{heading}<span>{rolePeople.length}</span></h2><p>{personRole==='Student'?'Find a learner, review their journey and manage access.':'Manage your teaching team and course assignments.'}</p></div><div className="pd-heading-actions"><button className="pd-secondary" disabled={!sorted.length} onClick={()=>exportPeople(sorted)}>Export filtered CSV</button><button className="ad-primary" onClick={onAdd}>+ Add {personRole.toLowerCase()}</button></div></div>
    <div className="pd-filters"><label className="pd-search"><span className="dw-sr-only">Search {personRole.toLowerCase()}s</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input placeholder="Search name, email, phone..." value={query} onChange={e=>updateFilter(setQuery,e.target.value)}/></label><label><span>Status</span><select value={status} onChange={e=>updateFilter(setStatus,e.target.value)}><option value="All">All statuses</option><option>Active</option><option>Pending</option><option>Inactive</option></select></label><label><span>Course</span><select value={course} onChange={e=>{updateFilter(setCourse,e.target.value);setBatch('All')}}><option value="All">All courses</option>{courses.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></label>{personRole==='Student'&&<label><span>Batch</span><select value={batch} onChange={e=>updateFilter(setBatch,e.target.value)}><option value="All">All batches</option><option value="none">Not assigned</option>{batches.filter(b=>course==='All'||courses.find(c=>c.id===b.course)?.name===course).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}{filtersActive&&<button className="ad-text-button" onClick={clearFilters}>Clear filters</button>}</div>
    {selected.length>0&&<div className="pd-bulk" role="region" aria-label="Bulk actions"><strong>{selected.length} selected</strong><label><span className="dw-sr-only">Bulk status</span><select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)}><option value="">Change status...</option><option>Active</option><option>Pending</option><option>Inactive</option></select></label><button className="pd-secondary" disabled={!bulkStatus} onClick={applyStatus}>Apply status</button>{personRole==='Student'&&<><label><span className="dw-sr-only">Bulk batch</span><select value={bulkBatch} onChange={e=>setBulkBatch(e.target.value)}><option value="">Assign batch...</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><button className="pd-secondary" disabled={!bulkBatch} onClick={assignBatch}>Assign batch & course</button></>}<button className="ad-text-button" onClick={()=>exportPeople(selected)}>Export selected</button><button className="pd-clear-selection" aria-label="Clear selection" onClick={()=>setSelection([])}>×</button></div>}
    <div className="ad-table-wrap"><table className="pd-table"><thead><tr><th scope="col"><PageCheckbox all={all} some={some} onChange={togglePage}/></th>{sortHeader('Name','name')}{sortHeader('Course','course')}{personRole==='Student'&&<th scope="col">Batch</th>}{sortHeader('Joined','joinedAt')}{sortHeader('Status','status')}<th scope="col">Actions</th></tr></thead><tbody>{rows.map(p=><tr key={p.id} className={selection.includes(p.id)?'pd-selected':''}><td><input type="checkbox" aria-label={`Select ${p.name}`} checked={selection.includes(p.id)} onChange={()=>toggleOne(p.id)}/></td><td><div className="pd-person"><span className="pd-person-avatar" aria-hidden="true">{p.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><div>{personRole==='Student'?<button className="pd-person-name" onClick={()=>setActiveId(p.id)} aria-label={`View ${p.name} details`}>{p.name}</button>:<button className="pd-person-name" onClick={()=>setActiveId(p.id)} aria-label={`View ${p.name} details`}>{p.name}</button>}<small>{p.email}</small></div></div></td><td>{p.course||'Not assigned'}</td>{personRole==='Student'&&<td>{batches.find(b=>b.id===p.batchId)?.name||'Not assigned'}</td>}<td>{p.joinedAt||'Not recorded'}</td><td><span className={`ad-status ${p.status==='Active'?'active':'pending'}`}>{p.status}</span></td><td><div className="pd-row-actions">{personRole==='Student'&&<button className="ad-text-button" onClick={()=>setActiveId(p.id)}>View</button>}<button className="ad-text-button" aria-label={`Edit ${p.name}`} onClick={()=>onEdit(p)}>Edit</button></div></td></tr>)}</tbody></table>{!rows.length&&<div className="pd-no-results"><h3>No matching records</h3><p>Try another search or remove a filter.</p>{filtersActive&&<button className="ad-text-button" onClick={clearFilters}>Reset filters</button>}</div>}</div>
    <footer className="pd-pagination"><p role="status">{sorted.length?`${(currentPage-1)*size+1}–${Math.min(currentPage*size,sorted.length)} of ${sorted.length}`:'0 records'}{selected.length>0&&` · ${selected.length} selected across pages`}</p><div><label>Rows per page<select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label><button className="pd-page-button" aria-label="Previous page" disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>←</button><span>Page {currentPage} of {pages}</span><button className="pd-page-button" aria-label="Next page" disabled={currentPage>=pages} onClick={()=>setPage(currentPage+1)}>→</button></div></footer>
    {activePerson&&(personRole==='Student'?<StudentDrawer person={activePerson} store={store} onClose={()=>setActiveId(null)} onEdit={onEdit}/>:<TrainerDetails person={activePerson} store={store} onClose={()=>setActiveId(null)} onEdit={onEdit} onNotice={onNotice}/>)}
  </section>
}
