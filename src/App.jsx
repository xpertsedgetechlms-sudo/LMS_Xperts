import { usePublicSettings } from './usePublicSettings'
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
import { backendAuth } from './backendClient'
import PasswordReset from './PasswordReset'

const year = new Date().getFullYear()
const accountRole = user => ({ ADMIN: 'Admin', TRAINER: 'Trainer', STUDENT: 'Student' })[user?.role] || null

function DemoLogin({settings,onSignedIn}) {
  const [role, setRole] = useState('Student')
  const [mode, setMode] = useState('login')
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  function changeMode(next) { setMode(next); setMessage('') }
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setMessage('')
    const form = new FormData(event.currentTarget)
    if (mode === 'register') {
      const name = String(form.get('name') || '').trim()
      const email = String(form.get('email') || '').trim()
      const password = String(form.get('password') || '')
      if (name.length < 2) { setMessage('Please enter a full name with at least 2 characters.'); return }
      if (password !== form.get('confirmation')) { setMessage('Passwords do not match.'); return }
      if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
        setMessage('Use at least 12 characters and no more than 72 bytes for your password.')
        return
      }
      setBusy(true)
      try {
        await backendAuth.register(name, email, password)
        setMode('login')
        setShow(false)
        setMessage('Student account created successfully. Sign in with your email and password.')
      } catch (error) {
        if (error.status === 409) setMessage('This email is already registered.')
        else if (error.status === 429) setMessage('Too many attempts. Please try again later.')
        else {
          const fields = Object.values(error.fields || {}).filter(value => typeof value === 'string').join(' ')
          setMessage(fields || (error.status ? error.message : 'Cannot reach the server. Check that the backend is running.'))
        }
      } finally {
        setBusy(false)
      }
      return
    }
    if (mode === 'forgot') {
      setBusy(true)
      try { const result=await backendAuth.forgot(String(form.get('email')||'').trim()); setMessage(result.message) }
      catch(error) { setMessage(error.status===429?'Too many requests. Please try again later.':error.status?error.message:'Cannot reach the server. Please try again.') }
      finally { setBusy(false) }
      return
    }
    setBusy(true)
    try {
      const user = await backendAuth.login(String(form.get('email') || '').trim(), String(form.get('password') || ''))
      const actualRole = accountRole(user)
      if (!actualRole) throw new Error('Your account role is unavailable. Contact support.')
      if (actualRole !== role) {
        await backendAuth.logout()
        setMessage('This account is registered as ' + actualRole + '. Select the ' + actualRole + ' tab to sign in. For Admin access, use your institute administrator account.')
        return
      }
      window.history.replaceState({}, '', window.location.pathname + window.location.search)
      onSignedIn(user)
    } catch (error) {
      setMessage(error.status === 401 ? 'Invalid email or password.' : error.status === 429 ? 'Too many attempts. Please try again later.' : error.status ? error.message : 'Unable to sign in. Check that the backend is running.')
    } finally {
      setBusy(false)
    }
  }
  return <main id="main-content" tabIndex={-1} className="auth-layout"><aside className="auth-story"><a className="auth-brand" href="#"><img src={settings.logoUrl||'/Logo.png'} alt="" /><span><strong>XpertsEdge</strong><small>TECHNOLOGIES</small></span></a><div className="story-content"><p className="story-badge">YOUR NEXT CHAPTER STARTS HERE</p><h1>Building Success<span>Beyond Boundaries</span></h1><p className="story-description">A dedicated space to learn, practise and build. Pick up where you left off and take your next step.</p></div></aside>
    <section className="auth-panel" aria-label="Learning portal"><div className="auth-card"><p className="auth-eyebrow">LEARN. BUILD. GROW.</p><div className="portal-options" role="group" aria-label="Choose login portal">{['Student','Trainer','Admin'].map(item=><button type="button" key={item} disabled={busy} aria-pressed={role===item} className={role===item?'portal-active':''} onClick={()=>{setRole(item);changeMode('login')}}>{item}</button>)}</div>
    {role==='Student' && mode!=='forgot' && <div className="auth-switch"><button disabled={busy} className={mode==='login'?'is-active':''} onClick={()=>changeMode('login')}>Sign in</button><button disabled={busy} className={mode==='register'?'is-active':''} onClick={()=>changeMode('register')}>Create account</button></div>}
    <section className="login-section"><h2>{mode==='forgot'?'Forgot password?':mode==='register'?'Start your journey':`${role} Login`}</h2><p>{mode==='register'?'Create your student account.':`Explore your ${role.toLowerCase()} workspace.`}</p>
    <form key={`${role}-${mode}`} onSubmit={submit}><fieldset className="auth-fields" disabled={busy}>{mode==='register' && <div><label htmlFor="demo-name">Full name</label><input id="demo-name" name="name" placeholder="Your full name" minLength={2} maxLength={100} autoComplete="name" required /></div>}<div><label htmlFor="demo-email">Email address</label><input id="demo-email" name="email" maxLength={254} type="email" placeholder="you@example.com" required autoComplete="email" /></div>{mode!=='forgot' && <div><label htmlFor="demo-password">Password</label><div className="password-field"><input id="demo-password" name="password" type={show?'text':'password'} required minLength={mode==='register'?12:undefined} autoComplete={mode==='register'?'new-password':'current-password'} placeholder={mode==='register'?'At least 12 characters':'Enter your password'} /><button className="password-toggle" type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></div>}{mode==='register' && <div><label htmlFor="demo-confirm">Confirm password</label><input id="demo-confirm" name="confirmation" type="password" minLength={12} required autoComplete="off" /></div>}{mode==='login'&&<button type="button" className="auth-text-button forgot-link" onClick={()=>changeMode('forgot')}>Forgot password?</button>}<button type="submit">{busy?(mode==='register'?'Creating account…':mode==='forgot'?'Requesting reset link…':'Signing in…'):mode==='login'?`Continue as ${role}`:mode==='register'?'Create account':'Send reset link'}</button></fieldset></form><p className="auth-message" role="status">{message}</p>{mode!=='login'&&<button disabled={busy} className="auth-text-button" onClick={()=>changeMode('login')}>← Back to sign in</button>}</section><p className="account-note">Your learning journey starts here.</p><PolicyLinks/></div><footer className="auth-panel-footer">© {year} XpertsEdge Technologies</footer></section></main>
}

export function WorkspaceApp({user,onSignedIn,onSignOut}) {
  const cloudSession=null
  const seed=cloudSession?.initial
  const useField=(key,fallback)=>useStoredField(key,fallback,seed)
  const {run}=useFormGuard()
  const lastLocation=useRef(window.location.href)
  const [publicPage,setPublicPage]=useState(()=>window.location.hash.slice(1))
  const role = accountRole(user)
  const [courses,setCourses] = useField('courses',initialCourses)
  const [storedPeople,setPeople] = useField('people',() => initialPeople.map((p,i)=>({...p,batchId:p.role==='Student'?(p.course==='Software Development'?'b1':p.course==='Software Testing'?'b2':''):'',phone:'',joinedAt: i === 0 ? instituteToday() : '2026-10-12'})))
  const [tasks,setTasks] = useField('tasks',initialTasks)
  const [sessions,setSessions] = useField('sessions',initialSessions)
  const [submissions,setSubmissions] = useField('submissions',[])
  const [resources,setResources] = useField('resources',[])
  const [storedStudentId,setActiveStudentId]=useField('activeStudentId','s1')
  const [storedTrainerId,setActiveTrainerId]=useField('activeTrainerId','t0')
  const activeStudentId = role === 'Student' ? user.id : storedStudentId
  const activeTrainerId = role === 'Trainer' ? user.id : storedTrainerId
  const people = user ? [...storedPeople.filter(p => p.id !== user.id), {...user,role,status:'Active'}] : storedPeople
  const [curriculum,setCurriculum]=useField('curriculum',initialCurriculum)
  const [quizzes,setQuizzes]=useField('quizzes',initialQuizzes)
  const [enrolments,setEnrolments]=useField('enrolments',initialEnrolments)
  const [lessonProgress,setLessonProgress]=useField('lessonProgress',[])
  const [feeAccounts,setFeeAccounts]=useField('feeAccounts',[])
  const [feePayments,setFeePayments]=useField('feePayments',[])
  const [certificates,setCertificates]=useField('certificates',[])
  const [certificateRules,setCertificateRules]=useField('certificateRules',{})
  const [activity,setActivity]=useField('activity',[])
  const [storedSettings,setSettings]=useField('settings',defaultSettings)
  const publicSettings=usePublicSettings()
  const settings={...storedSettings,...publicSettings}
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
  useEffect(()=>{if(cloudSession)return;const update=()=>{const nextUrl=window.location.href;run(()=>{lastLocation.current=nextUrl;setPublicPage(window.location.hash.slice(1))},()=>window.history.replaceState({},'',lastLocation.current))};window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[run,cloudSession])
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
  const saveStatus=user ? `Signed in as ${user.name} (${role}). Courses, enrolments, batches, classes, attendance, files and assignments use the database. Other module changes remain on this device. ${localStatus}` : localStatus
  const store={authenticated:!!user,user,cloud:!!cloudSession,api:cloudSession?.api,refreshCloud:cloudSession?.onRefresh,signOut:onSignOut,snapshot,saveStatus,settings,setSettings:tracked(setSettings,settings,'Settings'),courses,setCourses:tracked(setCourses,courses,'Courses'),people,setPeople:tracked(setPeople,people,'People'),tasks,setTasks:tracked(setTasks,tasks,'Assignments'),sessions,setSessions:tracked(setSessions,sessions,'Live classes'),submissions,setSubmissions:tracked(setSubmissions,submissions,'Submissions'),resources,setResources:tracked(setResources,resources,'Resources'),enrolled,completed,results,setResults:tracked(setResults,results,'Quiz results'),orders,setOrders:tracked(setOrders,orders,'Enrolment previews'),batches,setBatches:tracked(setBatches,batches,'Batches'),announcements,setAnnouncements:tracked(setAnnouncements,announcements,'Announcements'),attendance,setAttendance:tracked(setAttendance,attendance,'Attendance'),activeStudentId,setActiveStudentId,activeTrainerId,setActiveTrainerId,curriculum,setCurriculum:tracked(setCurriculum,curriculum,'Curriculum'),quizzes,setQuizzes:tracked(setQuizzes,quizzes,'Quizzes'),enrolments,setEnrolments:tracked(setEnrolments,enrolments,'Enrolments'),lessonProgress,setLessonProgress:tracked(setLessonProgress,lessonProgress,'Learning progress'),feeAccounts,setFeeAccounts:tracked(setFeeAccounts,feeAccounts,'Fee accounts'),feePayments,setFeePayments:tracked(setFeePayments,feePayments,'Payments'),certificates,setCertificates:tracked(setCertificates,certificates,'Certificates'),certificateRules,setCertificateRules:tracked(setCertificateRules,certificateRules,'Certificate rules'),activity}
  if(['support','privacy','terms','refund'].includes(publicPage))return <main className="launch-public" id="main-content" tabIndex={-1}><header><img src={settings.logoUrl||'/Logo.png'} alt={settings.name}/><a href="#">← Back to learning portal</a></header>{publicPage==='support'?<><h1>Learning support</h1><SupportContent settings={settings}/></>:<PolicyContent settings={settings} type={publicPage}/>}<PolicyLinks/></main>
return role ? (
  <DemoWorkspace
    key={`${role}-${
      role === 'Student'
        ? activeStudentId
        : role === 'Trainer'
          ? activeTrainerId
          : 'admin'
    }`}
    role={role}
    store={store}
  />
) : (
  <>
    <DemoLogin settings={settings} onSignedIn={onSignedIn} />
  </>
)
}









export default function App() {
  const [resetToken,setResetToken]=useState(()=>window.location.hash.startsWith('#reset-password=')?window.location.hash.slice(16):null)
  useEffect(()=>{const update=()=>setResetToken(window.location.hash.startsWith('#reset-password=')?window.location.hash.slice(16):null);window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[])
  const [user,setUser] = useState(null)
  const [checking,setChecking] = useState(true)
  const [error,setError] = useState('')
  const [attempt,setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    backendAuth.current().then(account => {
      if (!accountRole(account)) throw new Error('Unknown account role.')
      if (active) setUser(account)
    }).catch(err => {
      if (active) {
        setUser(null)
        if (err.status !== 401) setError('Unable to verify your session. Check that the backend is running, then retry.')
      }
    }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [attempt])
  useEffect(() => {
    const update = () => backendAuth.current().then(setUser).catch(() => {})
    window.addEventListener('account-profile-updated', update)
    return () => window.removeEventListener('account-profile-updated', update)
  }, [])
  async function signOut() {
    try {
      await backendAuth.logout()
      setUser(null)
      window.location.hash = ''
    } catch {
      window.alert('Sign out failed. Check your connection and try again.')
    }
  }
  if (resetToken!==null) return <PasswordReset token={resetToken} onDone={()=>{window.history.replaceState({},'',window.location.pathname+window.location.search);setResetToken(null);setUser(null);setChecking(true);setError('');setAttempt(v=>v+1)}}/>
  if (checking) return <main className="courses-section" role="status">Checking your session…</main>
  if (error) return <main className="courses-section"><p role="alert">{error}</p><button onClick={() => { setChecking(true); setError(''); setAttempt(value => value + 1) }}>Retry connection</button></main>
  return <WorkspaceApp key={user?.id || 'signed-out'} user={user} onSignedIn={setUser} onSignOut={signOut}/>
}
