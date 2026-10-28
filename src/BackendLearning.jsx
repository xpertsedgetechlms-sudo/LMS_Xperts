import { useEffect, useState } from 'react'
import { backendRequest } from './backendClient'
import { PolishedForm } from './WorkspacePolish'
import { useFormGuard } from './workspaceHooks'
import './BackendModules.css'

const newQuestion = () => ({ prompt: '', options: ['', ''], answerIndex: 0 })

export default function BackendLearning({ page, role }) {
  const guard = useFormGuard()
  const [data,setData] = useState(null)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [revision,setRevision] = useState(0)
  const [editor,setEditor] = useState(null)
  const [questions,setQuestions] = useState([newQuestion()])
  const [taking,setTaking] = useState(null)
  const [selectedCourse,setSelectedCourse] = useState('')
  const [busy,setBusy] = useState(false)
  const student = role === 'Student'
  const admin = role === 'Admin'
  const base = '/api/workspace/learning'
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const paths = { courses:'/api/workspace/courses', lessons:`${base}/lessons`, quizzes:`${base}/quizzes`, attempts:`${base}/attempts`, progress:`${base}/progress`, certificates:`${base}/certificates` }
        const entries = await Promise.all(Object.entries(paths).map(async ([key,path]) => [key,await backendRequest(path,{signal:controller.signal})]))
        setData(Object.fromEntries(entries))
      } catch(err) { if(err.name !== 'AbortError')setError(err.message || 'Unable to reach the backend.') }
    }
    load()
    return () => controller.abort()
  },[revision,base])
  const refresh = () => setRevision(value => value + 1)
  async function mutate(path,body,method='POST') {
    setBusy(true);setError('');setMessage('')
    try { const result=await backendRequest(base+path,{method,body});refresh();return result }
    catch(err) { setError(Object.values(err.fields||{}).join(' ')||err.message||'Unable to save.');return null }
    finally {setBusy(false)}
  }
  function edit(kind,row={}) {
    guard.run(() => {
      setEditor({kind,...row});setQuestions(row.questions?.map(q=>({...q,options:[...q.options]}))||[newQuestion()]);setError('');setMessage('')
    })
  }
  async function save(event) {
    event.preventDefault()
    const values=Object.fromEntries(new FormData(event.currentTarget))
    const e=editor
    const body=e.kind==='lesson'
      ? {courseId:e.course_id||values.courseId,title:values.title,body:values.body,position:Number(values.position),published:values.published==='true'}
      : {courseId:e.course_id||values.courseId,title:values.title,passMark:Number(values.passMark),maxAttempts:Number(values.maxAttempts),published:values.published==='true',questions:questions.map((q,i)=>({prompt:values[`prompt-${i}`],options:q.options.map((_,j)=>values[`option-${i}-${j}`]),answerIndex:Number(values[`answer-${i}`])}))}
    const result=await mutate(`/${e.kind==='lesson'?'lessons':'quizzes'}${e.id?'/'+e.id:''}`,body,e.id?'PUT':'POST')
    if(!result)return false
    setEditor(null);setMessage('Saved to the database.')
  }
  async function submitQuiz(event) {
    event.preventDefault()
    const values=new FormData(event.currentTarget)
    const result=await mutate(`/quizzes/${taking.id}/attempts`,{answers:taking.questions.map((_,i)=>Number(values.get(`answer-${i}`)))})
    if(!result)return false
    setTaking(null);setMessage(`Quiz submitted. Score: ${result.score}%. ${result.passed?'Passed.':'Pass mark not reached.'}`)
  }
  const updateQuestion=(index,next)=>setQuestions(current=>current.map((q,i)=>i===index?next:q))
  async function downloadCertificate(row) {
    if(busy)return
    setBusy(true);setError('')
    try {
      const response=await fetch(`/api/workspace/learning/certificates/${row.id}/pdf`,{credentials:'include'})
      if(!response.ok){const problem=await response.json().catch(()=>({}));throw new Error(problem.message||'Unable to download this certificate.')}
      const url=URL.createObjectURL(await response.blob()),link=document.createElement('a')
      link.href=url;link.download=`${row.code}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
    }catch(err){setError(err.message||'Certificate download failed.')}finally{setBusy(false)}
  }
  if(!data)return <section className="ad-panel"><p role={error?'alert':'status'}>{error||'Loading learning records…'}</p>{error&&<button onClick={refresh}>Retry</button>}</section>
  const courses=data.courses
  const scoped=rows=>rows.filter(row=>!selectedCourse||row.course_id===selectedCourse||row.courseId===selectedCourse)
  return <div className="backend-modules">
    <div className="bm-toolbar"><label>Course <select className="bl-course-filter" value={selectedCourse} onChange={event=>guard.run(()=>setSelectedCourse(event.target.value))}><option value="">All accessible courses</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="wp-secondary" disabled={busy} onClick={refresh}>Refresh</button></div>
    {error&&<p className="dw-notice" role="alert">{error}</p>}{message&&<p className="dw-notice" role="status">{message}</p>}
    {!student&&['Curriculum','Quiz builder'].includes(page)&&<button className="ad-primary" disabled={busy||!!editor||!courses.length} onClick={()=>edit(page==='Curriculum'?'lesson':'quiz')}>+ Add {page==='Curriculum'?'lesson':'quiz'}</button>}
    {editor&&<PolishedForm className="ad-panel bm-form" key={`${editor.kind}-${editor.id||'new'}`} onSubmit={save}><fieldset disabled={busy}><legend>{editor.id?'Edit':'Create'} {editor.kind}</legend>
      <label>Course<select name="courseId" defaultValue={editor.course_id||selectedCourse||courses[0]?.id} required disabled={!!editor.id}>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Title<input name="title" maxLength={150} defaultValue={editor.title||''} required/></label>
      {editor.kind==='lesson'?<><label className="bl-full">Lesson content<textarea name="body" required maxLength={12000} defaultValue={editor.body||''}/></label><label>Lesson order<input type="number" name="position" min="0" step="1" defaultValue={editor.position_index||0} required/></label></>:<><label>Pass mark (%)<input name="passMark" type="number" min="1" max="100" defaultValue={editor.pass_mark||60} required/></label><label>Maximum attempts<input name="maxAttempts" type="number" min="1" max="10" defaultValue={editor.max_attempts||3} required/></label><div className="bl-full bl-question-list">{questions.map((q,i)=><section className="bl-question" key={i}><h3>Question {i+1}</h3><label>Question<input name={`prompt-${i}`} maxLength={2000} required value={q.prompt} onChange={event=>updateQuestion(i,{...q,prompt:event.target.value})}/></label>{q.options.map((option,j)=><label key={j}>Option {j+1}<input name={`option-${i}-${j}`} maxLength={500} required value={option} onChange={event=>updateQuestion(i,{...q,options:q.options.map((value,index)=>index===j?event.target.value:value)})}/></label>)}<label>Correct answer<select name={`answer-${i}`} value={q.answerIndex} onChange={event=>updateQuestion(i,{...q,answerIndex:Number(event.target.value)})}>{q.options.map((_,j)=><option key={j} value={j}>Option {j+1}</option>)}</select></label><div className="bm-row-actions">{q.options.length<6&&<button type="button" data-form-change onClick={()=>updateQuestion(i,{...q,options:[...q.options,'']})}>Add option</button>}{questions.length>1&&<button type="button" data-form-change onClick={()=>setQuestions(current=>current.filter((_,index)=>index!==i))}>Remove question</button>}</div></section>)}{questions.length<50&&<button type="button" data-form-change className="wp-secondary" onClick={()=>setQuestions(current=>[...current,newQuestion()])}>+ Add question</button>}</div></>}
      <label>Visibility<select name="published" defaultValue={String(editor.published||false)}><option value="false">Draft</option><option value="true">Published</option></select></label>
      <div className="wp-form-actions"><button type="button" className="wp-secondary" onClick={()=>guard.run(()=>setEditor(null))}>Cancel</button><button className="ad-primary" type="submit">{busy?'Saving…':'Save'}</button></div>
    </fieldset></PolishedForm>}
    {['Curriculum','Lessons'].includes(page)&&<div className="bl-question-list">{scoped(data.lessons).map(lesson=><article className="ad-panel" key={lesson.id}><p className="ad-kicker">{courses.find(c=>c.id===lesson.course_id)?.name} · Lesson {lesson.position_index+1}</p><h2>{lesson.title}</h2><p className="bl-lesson-body">{lesson.body}</p>{student?<button className="ad-primary" disabled={busy||lesson.completed} onClick={async()=>{if(await mutate(`/lessons/${lesson.id}/complete`))setMessage('Lesson completed. Your progress is saved.')}}>{lesson.completed?'Completed':'Mark as completed'}</button>:<div className="bm-row-actions"><span>{lesson.published?'Published':'Draft'}</span><button disabled={busy||!!editor} onClick={()=>edit('lesson',lesson)}>Edit</button></div>}</article>)}{!scoped(data.lessons).length&&<section className="ad-panel">No lessons available yet.</section>}</div>}
    {['Quiz builder','Quizzes'].includes(page)&&<>{scoped(data.quizzes).map(quiz=><article className="ad-panel" key={quiz.id}><h2>{quiz.title}</h2><p>{quiz.questions.length} questions · Pass mark {quiz.pass_mark}% · {student?`${quiz.attemptsUsed} / ${quiz.max_attempts} attempts used`:quiz.published?'Published':'Draft'}</p><div className="bm-row-actions">{student?<button disabled={busy||!!taking||quiz.attemptsUsed>=quiz.max_attempts} onClick={()=>guard.run(()=>{setTaking(quiz);setError('');setMessage('')})}>Start quiz</button>:<><button disabled={busy||!!editor} onClick={()=>edit('quiz',quiz)}>Edit questions</button><button disabled={busy} onClick={()=>mutate(`/quizzes/${quiz.id}/visibility`,{published:!quiz.published},'PUT')}>{quiz.published?'Unpublish':'Publish'}</button></>}</div></article>)}{!scoped(data.quizzes).length&&<section className="ad-panel">No quizzes available yet.</section>}{!student&&<p>Quizzes with submitted attempts are locked for editing. You can unpublish them and create a replacement.</p>}</>}
    {taking&&<PolishedForm className="ad-panel bm-form" key={taking.id} onSubmit={submitQuiz}><fieldset disabled={busy}><legend>{taking.title}</legend>{taking.questions.map((q,i)=><section key={q.id} className="bl-question bl-full"><h3>{i+1}. {q.prompt}</h3>{q.options.map((option,j)=><label className="bm-check" key={j}><input type="radio" name={`answer-${i}`} value={j} required/>{option}</label>)}</section>)}<div className="wp-form-actions"><button className="wp-secondary" type="button" onClick={()=>guard.run(()=>setTaking(null))}>Cancel</button><button className="ad-primary" type="submit">{busy?'Submitting…':'Submit answers'}</button></div></fieldset></PolishedForm>}
    {['My progress','Reports','Quizzes'].includes(page)&&<section className="ad-panel"><h2>{page==='Quizzes'?'Attempt history':'Learning progress'}</h2><div className="ad-table-wrap"><table><thead><tr>{(page==='Quizzes'?['Quiz','Score','Result','Submitted']:['Student','Course','Lessons','Quizzes passed','Certificate']).map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{page==='Quizzes'?scoped(data.attempts).map(a=><tr key={a.id}><td>{a.title}</td><td>{a.score}%</td><td>{a.passed?'Passed':'Not passed'}</td><td>{new Date(a.submitted_at).toLocaleString('en-IN')}</td></tr>):scoped(data.progress).map(p=><tr key={`${p.studentId}-${p.courseId}`}><td>{p.studentName}</td><td>{p.courseName}</td><td>{p.completed}/{p.lessons} · {p.percent}%</td><td>{p.passedQuizzes}/{p.quizzes}</td><td>{p.eligible?'Eligible':'Requirements pending'}</td></tr>)}</tbody></table></div></section>}
    {page==='Certificates'&&<><section className="ad-panel"><h2>Completion requirements</h2><p>Complete all published lessons, pass all published quizzes (at least one quiz is required), and score 50/100 or above on every course assignment. An administrator issues the certificate after these checks.</p>{admin&&scoped(data.progress).filter(p=>p.eligible&&!data.certificates.some(c=>c.student_id===p.studentId&&c.course_id===p.courseId)).map(p=><div className="bm-toolbar" key={`${p.studentId}-${p.courseId}`}><p>{p.studentName} · {p.courseName}</p><button className="ad-primary" disabled={busy} onClick={()=>mutate('/certificates',{studentId:p.studentId,courseId:p.courseId})}>Issue certificate</button></div>)}</section>{scoped(data.certificates).map(c=><article className="ad-panel bl-certificate" key={c.id}><p className="ad-kicker">XPERTSEDGE TECHNOLOGIES</p><h2>Certificate of Completion</h2><h3>{c.student_name}</h3><p>{c.course_name}</p><p>{c.code}</p><p>Issued {new Date(c.issued_at).toLocaleDateString('en-IN')} · {c.revoked?'REVOKED':'Valid'}</p><div className="bm-row-actions">{!c.revoked&&<button onClick={()=>downloadCertificate(c)}>Download PDF certificate</button>}{admin&&<button disabled={busy} onClick={()=>mutate(`/certificates/${c.id}`,{revoked:!c.revoked},'PUT')}>{c.revoked?'Restore':'Revoke'}</button>}</div></article>)}{!scoped(data.certificates).length&&<section className="ad-panel">No certificates issued yet.</section>}</>}
  </div>
}
