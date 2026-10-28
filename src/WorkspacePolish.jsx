import { Children, cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react'

import './WorkspacePolish.css'

import { GuardContext, useFormGuard } from './workspaceHooks'
export function FormGuardProvider({children}) {
  const dirty=useRef({})
  const pending=useRef(null)
  const dialog=useRef(null)
  const [open,setOpen]=useState(false)
  const mark=useCallback((id,value)=>{dirty.current[id]=value},[])
  const run=useCallback((action,onCancel)=>{if(Object.values(dirty.current).some(Boolean)){pending.current={action,onCancel};setOpen(true)}else action()},[])
  useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal()},[open])
  useEffect(()=>{const before=e=>{if(Object.values(dirty.current).some(Boolean)){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before)},[])
  function cancel(){const onCancel=pending.current?.onCancel;pending.current=null;dialog.current?.close();setOpen(false);onCancel?.()}
  function discard(){const action=pending.current?.action;pending.current=null;dirty.current={};dialog.current?.close();setOpen(false);action?.()}
  function captureLink(e){const a=e.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||e.defaultPrevented||a.href===window.location.href)return;if(!Object.values(dirty.current).some(Boolean))return;e.preventDefault();run(()=>{if(a.target==='_blank')window.open(a.href,'_blank','noopener,noreferrer');else window.location.assign(a.href)})}
  return <GuardContext.Provider value={{mark,run}}><div className="workspace-guard" onClickCapture={captureLink}>{children}</div>{open&&<dialog ref={dialog} className="unsaved-dialog" aria-labelledby="unsaved-title" onCancel={e=>{e.preventDefault();cancel()}}><p className="ad-kicker">UNSAVED CHANGES</p><h2 id="unsaved-title">Keep editing or discard?</h2><p>Your changes have not been saved. Leaving this form will discard them.</p><div className="unsaved-actions"><button className="wp-secondary" autoFocus onClick={cancel}>Keep editing</button><button className="wp-danger" onClick={discard}>Discard changes</button></div></dialog>}</GuardContext.Provider>
}

function fieldError(control){
  if(control.disabled||!control.name||control.type==='submit'||control.type==='button')return ''
  const label=Array.from(control.labels?.[0]?.childNodes||[]).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim()||'This field'
  if(control.required&&control.type!=='file'&&control.type!=='radio'&&control.type!=='checkbox'&&!String(control.value).trim())return `${label} is required.`
  const v=control.validity
  if(v.valueMissing)return control.type==='file'?'Choose a file to continue.':`Please complete ${label.toLowerCase()}.`
  if(v.typeMismatch)return control.type==='email'?'Enter a valid email address.':'Enter a valid URL, including https://.'
  if(v.tooShort)return `Use at least ${control.minLength} characters.`
  if(v.rangeUnderflow)return `Enter ${control.min} or more.`
  if(v.rangeOverflow)return `Enter ${control.max} or less.`
  if(v.stepMismatch||v.badInput)return 'Enter a valid number.'
  if(v.patternMismatch)return 'Check the format of this field.'
  if(control.type==='file'&&control.files?.[0]?.size>20*1024*1024)return 'Choose a file smaller than 20 MB.'
  return ''
}
export function PolishedForm({children,onSubmit,validate,className='',...props}) {
  const guard=useFormGuard()
  const mark=guard?.mark
  const id=useId().replaceAll(':','')
  const ref=useRef(null)
  const [errors,setErrors]=useState({})
  const [dirty,setDirty]=useState(false)
  const [submitted,setSubmitted]=useState(false)
  const [saving,setSaving]=useState(false)
  useEffect(()=>()=>mark?.(id,false),[mark,id])
  function changed(e){setDirty(true);guard?.mark(id,true);const field=e.target;if(field.name&&errors[field.name])setErrors(current=>({...current,[field.name]:fieldError(field)}))}
  function blur(e){const field=e.target;if(field.name&&(submitted||field.value))setErrors(current=>({...current,[field.name]:fieldError(field)}))}
  async function submit(e){
    e.preventDefault();const form=e.currentTarget;const next={}
    if(saving)return
    Array.from(form.elements).forEach(control=>{const error=fieldError(control);if(error)next[control.name]=error})
    Object.assign(next,validate?.(form)||{})
    setSubmitted(true);setErrors(next)
    const first=Object.keys(next).find(key=>next[key])
    if(first){form.elements.namedItem(first)?.focus?.();return}
    setSaving(true)
    try{const result=await onSubmit?.(e);if(result!==false){setDirty(false);guard?.mark(id,false)}}finally{setSaving(false)}
  }
  function enhance(nodes){return Children.map(nodes,node=>{
    if(!isValidElement(node))return node
    const nextChildren=node.props.children?enhance(node.props.children):node.props.children
    if(node.type==='label'){
      const controls=Children.toArray(node.props.children).filter(child=>isValidElement(child)&&['input','select','textarea'].includes(child.type))
      const control=controls[0];const name=control?.props.name;const error=errors[name]
      return cloneElement(node,{},nextChildren,control?.props.required&&<span className="wp-required" aria-hidden="true">Required</span>,error&&<span className="wp-field-error" id={`${id}-${name}-error`}>{error}</span>)
    }
    if(['input','select','textarea'].includes(node.type)){
      const name=node.props.name;const error=errors[name]
      return cloneElement(node,{'aria-invalid':error?'true':undefined,'aria-describedby':error?[node.props['aria-describedby'],`${id}-${name}-error`].filter(Boolean).join(' '):node.props['aria-describedby']},nextChildren)
    }
    return node.props.children?cloneElement(node,{},nextChildren):node
  })}
  return <form {...props} ref={ref} aria-busy={saving} noValidate className={`wp-form ${className}`} onReset={()=>{setErrors({});setSubmitted(false);setDirty(false);guard?.mark(id,false)}} onChange={changed} onClickCapture={e=>{if(e.target.closest?.('[data-form-change]')){setDirty(true);guard?.mark(id,true)}}} onBlurCapture={blur} onSubmit={submit}>{submitted&&Object.values(errors).some(Boolean)&&<div className="wp-error-summary" role="alert">Please check the highlighted fields before saving.</div>}{enhance(children)}<p className="wp-form-state" aria-live="polite">{saving?'Saving…':dirty?'Unsaved changes':''}</p></form>
}

export function Notifications({role,store,navigate}) {
  const ref=useRef(null)
  const [read,setRead]=useState([])
  const [now,setNow]=useState(()=>Date.now())
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[])
  const assigned=store.courses.filter(c=>c.trainer===store.people.find(p=>p.id===store.activeTrainerId)?.name||store.batches.some(b=>b.course===c.id&&b.trainerId===store.activeTrainerId)).map(c=>c.id)
  const notifications=[]
  if(role==='Admin')store.people.filter(p=>p.role==='Student'&&p.status==='Pending').forEach(p=>notifications.push({id:`enrol-${p.id}`,title:'Student account needs review',body:`${p.name} · ${p.course}`,page:'Students',kind:'Enrolment'}))
  if(role==='Admin')store.enrolments.filter(e=>e.status==='Pending').forEach(e=>notifications.push({id:`access-${e.id}`,title:'Course enrolment needs review',body:`${store.people.find(p=>p.id===e.studentId)?.name||'Student'} · ${store.courses.find(c=>c.id===e.courseId)?.name||'Course'}`,page:'Enrolments',kind:'Enrolment'}))
  if(role!=='Student')store.submissions.filter(s=>s.status!=='Graded'&&(role==='Admin'||assigned.includes(s.course))).forEach(s=>notifications.push({id:`submission-${s.id}`,title:'Assignment ready to grade',body:`${s.student} · ${store.tasks.find(t=>t.id===s.taskId)?.title||'Assignment'}`,page:'Submissions',kind:'Submission'}))
  store.sessions.filter(s=>(!s.status||s.status==='Scheduled')&&new Date(`${s.date}T${s.time}:00+05:30`).getTime()>=now&&(role==='Admin'||(role==='Student'?store.enrolled.includes(s.course):assigned.includes(s.course)))).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0,5).forEach(s=>notifications.push({id:`class-${s.id}`,title:s.title,body:`${s.date} · ${s.time} IST · ${store.courses.find(c=>c.id===s.course)?.name||'Course'}`,page:'Live classes',kind:'Upcoming class'}))
  const unread=notifications.filter(n=>!read.includes(n.id)).length
  return <><button className="wp-notification-button" aria-label={`Notifications, ${unread} unread`} onClick={()=>ref.current?.showModal()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unread>0&&<span>{unread>9?'9+':unread}</span>}</button><dialog ref={ref} className="wp-notification-panel" aria-labelledby="notification-title" onClick={e=>{if(e.target===e.currentTarget)ref.current?.close()}}><header><div><p className="ad-kicker">WORKSPACE ACTIVITY</p><h2 id="notification-title">Notifications</h2></div><button className="wp-icon-button" aria-label="Close notifications" onClick={()=>ref.current?.close()}>×</button></header><div className="wp-notification-tools"><span>{unread} unread</span><button onClick={()=>setRead(notifications.map(n=>n.id))} disabled={!unread}>Mark all as read</button></div><div className="wp-notification-list">{notifications.length?notifications.map(n=><button className={read.includes(n.id)?'is-read':''} key={n.id} onClick={()=>navigate(n.page,()=>{setRead(current=>[...new Set([...current,n.id])]);ref.current?.close()})}><span className="wp-notification-dot"/><span><small>{n.kind}</small><strong>{n.title}</strong><span>{n.body}</span></span><span aria-hidden="true">↗</span></button>):<div className="wp-empty-notifications"><h3>You’re all caught up</h3><p>Enrolments, submissions and upcoming classes will appear here.</p><button className="ad-primary" onClick={()=>navigate('Live classes',()=>ref.current?.close())}>View class schedule</button></div>}</div><footer>In-app activity only · No external notifications sent.</footer></dialog></>
}

export function MobileNavigation({children,dialogRef,label='Workspace navigation'}) {
  const [open,setOpen]=useState(false)
  const id=useId()
  return <><button className="wp-menu-button" aria-label="Open navigation" aria-expanded={open} aria-controls={id} onClick={()=>{dialogRef.current?.showModal();setOpen(true)}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><dialog ref={dialogRef} id={id} className="wp-mobile-sidebar" aria-label={label} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)dialogRef.current?.close()}}><div className="wp-mobile-sidebar-content">{children}</div></dialog></>
}
