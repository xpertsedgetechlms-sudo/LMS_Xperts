import { useEffect, useState } from 'react'
import { activeEnrolment, publishedLessons } from './lmsLogic'
import { instituteToday } from './instituteDate'

export function CourseCover({course,index=0}) {
  const [failed,setFailed]=useState(false)
  const images={dev:'/course-images/dev.webp',test:'/course-images/test.webp',aws:'/course-images/aws.webp',data:'/course-images/data.webp',scrum:'/course-images/scrum.webp',ai:'/course-images/ai.webp'}
  const image=images[course.id]
  const marks=['</>','✓','☁','∑','↗','✳']
  if(image&&!failed)return <div className="learning-cover has-course-image" aria-hidden="true"><img src={image} alt="" width="800" height="450" loading="lazy" decoding="async" onError={()=>setFailed(true)}/></div>
  return <div className={`learning-cover cover-${index%6}`} aria-hidden="true"><span className="cover-grid"/><span className="cover-orbit"/><span className="cover-code">{marks[index%6]}</span><div><small>XPERTSEDGE / LEARNING PATH</small><strong>{course.category}</strong></div><span className="cover-index">{String(index+1).padStart(2,'0')}</span></div>
}

export default function LearningPulse({store,navigate,role='Admin',compact=false}) {
  const [now,setNow]=useState(()=>Date.now())
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[])
  const today=instituteToday()
  const trainer=store.people.find(p=>p.id===store.activeTrainerId)
  const courses=store.courses.filter(c=>role==='Admin'||(role==='Student'?store.enrolled.includes(c.id):(c.trainerId?c.trainerId===trainer?.id:c.trainer===trainer?.name)||store.batches.some(b=>b.course===c.id&&b.trainerId===trainer?.id)))
  const ids=courses.map(c=>c.id)
  const enrolments=store.enrolments.filter(e=>activeEnrolment(e,today)&&ids.includes(e.courseId)&&(role!=='Student'||e.studentId===store.activeStudentId))
  const completion=courses.map(c=>{
    const lessons=publishedLessons(store.curriculum,c.id)
    const learners=enrolments.filter(e=>e.courseId===c.id)
    const total=learners.length*lessons.length
    const done=learners.reduce((sum,e)=>sum+lessons.filter(l=>store.lessonProgress.some(p=>p.studentId===e.studentId&&p.courseId===c.id&&p.lessonId===l.id)).length,0)
    return {...c,learners:learners.length,percent:total?Math.round(done/total*100):0,total,done}
  })
  const capacity=completion.reduce((n,c)=>n+c.total,0), done=completion.reduce((n,c)=>n+c.done,0)
  const percent=capacity?Math.round(done/capacity*100):0
  const upcoming=store.sessions.filter(s=>(!s.status||s.status==='Scheduled')&&ids.includes(s.course)&&new Date(`${s.date}T${s.time}:00+05:30`).getTime()>=now).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0,3)
  return <div className={`learning-pulse pulse-${role.toLowerCase()}`}>
    {!compact&&<section className="learning-spotlight"><div className="spotlight-copy"><p className="spotlight-eyebrow">{role==='Admin'?'LEARNING OPERATIONS':role==='Trainer'?'TEACHING STUDIO':'YOUR LEARNING JOURNEY'}</p><h2>{role==='Admin'?<>Great learning.<br/><em>Clear direction.</em></>:role==='Trainer'?<>Teach with purpose.<br/><em>See the progress.</em></>:<>Your next skill.<br/><em>Starts right here.</em></>}</h2><p>{role==='Admin'?'A closer look at what your learners are building, completing and exploring.':role==='Trainer'?'Bring your courses, learner progress and upcoming sessions into focus.':'Pick up a lesson, put it into practice and keep your momentum going.'}</p><button onClick={()=>navigate(role==='Admin'?'Curriculum':'My courses')}>{role==='Admin'?'Open curriculum':'Explore my courses'} <span aria-hidden="true">↗</span></button></div><div className="spotlight-signal"><span className="signal-label">LESSON COMPLETION</span><div className="signal-ring" style={{'--progress':`${percent}%`}}><div><strong>{percent}<small>%</small></strong><span>completed</span></div></div><p>{done} of {capacity} learner lessons</p><small>{capacity?'Across active course enrolments':'Add enrolments and publish lessons to begin'}</small></div></section>}
    <div className="learning-insights"><section className="learning-progress"><header><div><span className="section-index">01 / PROGRESS</span><h2>{role==='Student'?'Your course progress':'Learning by course'}</h2></div><button className="ad-text-button" onClick={()=>navigate(role==='Admin'?'Courses':'My courses')}>View all ↗</button></header><div className="learning-bars">{completion.slice(0,4).map((c,i)=><div className="learning-bar-row" key={c.id}><span className={`bar-marker marker-${i}`}/><div><div className="learning-bar-label"><strong>{c.name}</strong><span>{c.percent}%</span></div><div className="learning-bar-track"><i style={{width:`${c.percent}%`}}/></div><small>{c.learners} active {c.learners===1?'learner':'learners'} · {c.done}/{c.total} lessons completed</small></div></div>)}{!completion.length&&<p className="learning-empty">Your assigned courses will appear here.</p>}</div></section><section className="learning-timeline"><header><div><span className="section-index">02 / COMING UP</span><h2>Next live sessions</h2></div><span className="timeline-zone">IST</span></header>{upcoming.map(s=><button className="timeline-session" key={s.id} onClick={()=>navigate('Live classes')}><time><strong>{s.date.slice(8)}</strong><small>{new Date(`${s.date}T12:00:00+05:30`).toLocaleDateString('en-IN',{month:'short'})}</small></time><span><strong>{s.title}</strong><small>{s.time} · {store.courses.find(c=>c.id===s.course)?.name}</small></span><span aria-hidden="true">↗</span></button>)}{!upcoming.length&&<div className="learning-empty"><p>No upcoming sessions.</p><button className="ad-text-button" onClick={()=>navigate('Live classes')}>Open class schedule ↗</button></div>}</section></div>
  </div>
}
