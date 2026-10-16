import { SupportContent, PolicyContent, PolicyLinks } from './LaunchCentre'
import { defaultSettings, useStoredField, useWorkspacePersistence } from './workspaceStorage'
import { useEffect, useRef, useState } from 'react'
import './App.css'
import './AdminDashboard.css'
import './DemoWorkspace.css'
import DemoWorkspace from './DemoWorkspace'
import { useFormGuard } from './workspaceHooks'
import { instituteToday } from './instituteDate'
import { activeEnrolment, initialCurriculum, initialQuizzes, initialEnrolments } from './lmsLogic'
import { initialCourses, initialPeople, initialTasks, initialSessions } from './demoData'

const year = new Date().getFullYear()
const routeRole = () => ({ '#admin-preview': 'Admin', '#student-preview': 'Student', '#trainer-preview': 'Trainer' })[window.location.hash] || null

function DemoLogin({settings}) {
  const [role, setRole] = useState('Student')
  const [mode, setMode] = useState('login')
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('')
  function changeMode(next) { setMode(next); setMessage('') }
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (mode === 'register') {
      if (form.get('password') !== form.get('confirmation')) { setMessage('Passwords do not match.'); return }
      setMessage('Registration form checked. Account creation is not connected yet.')
      return
    }
    if (mode === 'forgot') { setMessage('Frontend preview: no email was sent. Password recovery will be connected with the database later.'); return }
    window.location.hash = `${role.toLowerCase()}-preview`
  }
  return <main id="main-content" tabIndex={-1} className="auth-layout"><aside className="auth-story"><a className="auth-brand" href="#"><img src={settings.logoUrl||'/Logo.png'} alt="" /><span><strong>XpertsEdge</strong><small>TECHNOLOGIES</small></span></a><div className="story-content"><p className="story-badge">YOUR NEXT CHAPTER STARTS HERE</p><h1>Building Success<span>Beyond Boundaries</span></h1><p className="story-description">A dedicated space to learn, practise and build. Pick up where you left off and take your next step.</p></div></aside>
    <section className="auth-panel" aria-label="Learning portal"><div className="auth-card"><p className="auth-eyebrow">LEARN. BUILD. GROW.</p><div className="portal-options" role="group" aria-label="Choose login portal">{['Student','Trainer','Admin'].map(item=><button type="button" key={item} aria-pressed={role===item} className={role===item?'portal-active':''} onClick={()=>{setRole(item);changeMode('login')}}>{item}</button>)}</div>
    {role==='Student' && mode!=='forgot' && <div className="auth-switch"><button className={mode==='login'?'is-active':''} onClick={()=>changeMode('login')}>Sign in</button><button className={mode==='register'?'is-active':''} onClick={()=>changeMode('register')}>Create account</button></div>}
    <section className="login-section"><h2>{mode==='forgot'?'Forgot password?':mode==='register'?'Start your journey':`${role} Login`}</h2><p>{mode==='register'?'Create your student account.':`Explore your ${role.toLowerCase()} workspace.`}</p>
    <form key={`${role}-${mode}`} onSubmit={submit}><fieldset className="auth-fields">{mode==='register' && <div><label htmlFor="demo-name">Full name</label><input id="demo-name" name="name" placeholder="Sample Student" required /></div>}<div><label htmlFor="demo-email">Email address {mode==='login'?'(optional)':''}</label><input id="demo-email" name="email" type="email" placeholder="you@example.com" required={mode!=='login'} autoComplete="off" /></div>{mode!=='forgot' && <div><label htmlFor="demo-password">{mode==='login'?'Password (optional)':'Password'}</label><div className="password-field"><input id="demo-password" name="password" type={show?'text':'password'} required={mode==='register'} minLength={mode==='register'?12:undefined} autoComplete="off" placeholder="Use sample text only" /><button className="password-toggle" type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></div>}{mode==='register' && <div><label htmlFor="demo-confirm">Confirm password</label><input id="demo-confirm" name="confirmation" type="password" minLength={12} required autoComplete="off" /></div>}{mode==='login'&&<button type="button" className="auth-text-button forgot-link" onClick={()=>changeMode('forgot')}>Forgot password?</button>}<button type="submit">{mode==='login'?`Continue as ${role}`:mode==='register'?'Create account':'Send reset link'}</button></fieldset></form><p className="auth-message" role="status">{message}</p>{mode!=='login'&&<button className="auth-text-button" onClick={()=>changeMode('login')}>← Back to sign in</button>}</section><p className="account-note">Your learning journey starts here.</p><PolicyLinks/></div><footer className="auth-panel-footer">© {year} XpertsEdge Technologies</footer></section></main>
}

export function WorkspaceApp() {
  const cloudSession=null
  const seed=cloudSession?.initial
  const useField=(key,fallback)=>useStoredField(key,fallback,seed)
  const {run}=useFormGuard()
  const lastLocation=useRef(window.location.href)
  const [publicPage,setPublicPage]=useState(()=>window.location.hash.slice(1))
  const [role,setRole] = useState(()=>cloudSession?.role||routeRole())
  const [courses,setCourses] = useField('courses',initialCourses)
  const [people,setPeople] = useField('people',() => initialPeople.map((p,i)=>({...p,batchId:p.role==='Student'?(p.course==='Software Development'?'b1':p.course==='Software Testing'?'b2':''):'',phone:'',joinedAt: i === 0 ? instituteToday() : '2026-10-12'})))
  const [tasks,setTasks] = useField('tasks',initialTasks)
  const [sessions,setSessions] = useField('sessions',initialSessions)
  const [submissions,setSubmissions] = useField('submissions',[])
  const [resources,setResources] = useField('resources',[])
  const [activeStudentId,setActiveStudentId]=useField('activeStudentId','s1')
  const [activeTrainerId,setActiveTrainerId]=useField('activeTrainerId','t0')
  const [curriculum,setCurriculum]=useField('curriculum',initialCurriculum)
  const [quizzes,setQuizzes]=useField('quizzes',initialQuizzes)
  const [enrolments,setEnrolments]=useField('enrolments',initialEnrolments)
  const [lessonProgress,setLessonProgress]=useField('lessonProgress',[])
  const [feeAccounts,setFeeAccounts]=useField('feeAccounts',[])
  const [feePayments,setFeePayments]=useField('feePayments',[])
  const [certificates,setCertificates]=useField('certificates',[])
  const [certificateRules,setCertificateRules]=useField('certificateRules',{})
  const [activity,setActivity]=useField('activity',[])
  const [settings,setSettings]=useField('settings',defaultSettings)
  useEffect(()=>{document.title=(settings.name||'XpertsEdge Technologies')+' | Learning Portal';const icon=document.querySelector('link[rel="icon"]');if(icon)icon.href=settings.logoUrl||'/Logo.png'},[settings.name,settings.logoUrl])
  const enrolled=enrolments.filter(e=>people.some(p=>p.id===activeStudentId&&p.status==='Active')&&courses.some(c=>c.id===e.courseId&&c.published)&&e.studentId===activeStudentId&&activeEnrolment(e)).map(e=>e.courseId)
  const completed=lessonProgress.filter(p=>p.studentId===activeStudentId).map(p=>p.courseId+':'+p.lessonId)
  const [results,setResults] = useField('results',[])
  const [orders,setOrders] = useField('orders',[])
  const [batches,setBatches] = useField('batches',[
    {id:'b1',name:'October weekday',course:'dev',schedule:'Mon / Wed · 6:00 PM',startDate:'2026-10-01',endDate:'2026-12-31',status:'Active'},
    {id:'b2',name:'Weekend QA',course:'test',schedule:'Saturday · 10:00 AM',startDate:'2026-10-01',endDate:'2027-01-31',status:'Active'},
  ])
  const [announcements,setAnnouncements] = useField('announcements',[])
  const [attendance,setAttendance] = useField('attendance',[])
  useEffect(()=>{if(cloudSession)return;const update=()=>{const nextRole=routeRole();const nextUrl=window.location.href;run(()=>{lastLocation.current=nextUrl;setPublicPage(window.location.hash.slice(1));setRole(nextRole)},()=>window.history.replaceState({},'',lastLocation.current))};window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[run,cloudSession])
  function recordActivity(entity,before,after) {
    if(JSON.stringify(before)===JSON.stringify(after))return
    let action='Updated';let detail='Workspace records changed.'
    if(Array.isArray(after)){
      const added=after.filter(item=>!before.some(old=>old.id===item.id))
      const changed=after.filter(item=>before.some(old=>old.id===item.id&&JSON.stringify(old)!==JSON.stringify(item)))
      const removed=before.filter(item=>!after.some(next=>next.id===item.id))
      action=added.length?'Created':removed.length?'Removed':'Updated'
      const items=added.length?added:removed.length?removed:changed
      detail=items.slice(0,3).map(item=>item.name||item.title||item.studentId||item.id).join(', ')||'Workspace records changed.'
    }
    setActivity(current=>[{id:crypto.randomUUID(),at:new Date().toISOString(),actor:role||'Workspace',entity,action,detail},...current].slice(0,500))
  }
  const tracked=(setter,value,entity)=>update=>{const next=typeof update==='function'?update(value):update;setter(next);recordActivity(entity,value,next)}
  const snapshot={courses,people,tasks,sessions,submissions,resources,activeStudentId,activeTrainerId,curriculum,quizzes,enrolments,lessonProgress,feeAccounts,feePayments,certificates,certificateRules,activity,results,orders,batches,announcements,attendance,settings}
  const localStatus=useWorkspacePersistence(snapshot,!cloudSession)
  const saveStatus=localStatus
  const store={cloud:!!cloudSession,api:cloudSession?.api,refreshCloud:cloudSession?.onRefresh,signOut:cloudSession?.onSignOut,snapshot,saveStatus,settings,setSettings:tracked(setSettings,settings,'Settings'),courses,setCourses:tracked(setCourses,courses,'Courses'),people,setPeople:tracked(setPeople,people,'People'),tasks,setTasks:tracked(setTasks,tasks,'Assignments'),sessions,setSessions:tracked(setSessions,sessions,'Live classes'),submissions,setSubmissions:tracked(setSubmissions,submissions,'Submissions'),resources,setResources:tracked(setResources,resources,'Resources'),enrolled,completed,results,setResults:tracked(setResults,results,'Quiz results'),orders,setOrders:tracked(setOrders,orders,'Enrolment previews'),batches,setBatches:tracked(setBatches,batches,'Batches'),announcements,setAnnouncements:tracked(setAnnouncements,announcements,'Announcements'),attendance,setAttendance:tracked(setAttendance,attendance,'Attendance'),activeStudentId,setActiveStudentId,activeTrainerId,setActiveTrainerId,curriculum,setCurriculum:tracked(setCurriculum,curriculum,'Curriculum'),quizzes,setQuizzes:tracked(setQuizzes,quizzes,'Quizzes'),enrolments,setEnrolments:tracked(setEnrolments,enrolments,'Enrolments'),lessonProgress,setLessonProgress:tracked(setLessonProgress,lessonProgress,'Learning progress'),feeAccounts,setFeeAccounts:tracked(setFeeAccounts,feeAccounts,'Fee accounts'),feePayments,setFeePayments:tracked(setFeePayments,feePayments,'Payments'),certificates,setCertificates:tracked(setCertificates,certificates,'Certificates'),certificateRules,setCertificateRules:tracked(setCertificateRules,certificateRules,'Certificate rules'),activity}
  if(['support','privacy','terms','refund'].includes(publicPage))return <main className="launch-public" id="main-content" tabIndex={-1}><header><img src={settings.logoUrl||'/Logo.png'} alt={settings.name}/><a href="#">← Back to learning portal</a></header>{publicPage==='support'?<><h1>Learning support</h1><SupportContent settings={settings}/></>:<PolicyContent settings={settings} type={publicPage}/>}<PolicyLinks/></main>
  return role ? <DemoWorkspace key={`${role}-${role==='Student'?activeStudentId:role==='Trainer'?activeTrainerId:'admin'}`} role={role} store={store} /> : <DemoLogin settings={settings} />
}









export default function App(){return <WorkspaceApp/>}
