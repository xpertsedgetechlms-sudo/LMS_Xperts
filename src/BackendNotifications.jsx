import { useEffect, useRef, useState } from 'react'
import { backendRequest } from './backendClient'
import './BackendModules.css'

export default function BackendNotifications({navigate}) {
  const [open,setOpen]=useState(false),[rows,setRows]=useState(null),[error,setError]=useState('')
  const panel=useRef(null),button=useRef(null)
  useEffect(()=>{
    if(!open)return
    const controller=new AbortController()
    backendRequest('/api/workspace/notifications',{signal:controller.signal}).then(setRows).catch(err=>{if(err.name!=='AbortError')setError(err.message)})
    function close(event){if(!panel.current?.contains(event.target)&&!button.current?.contains(event.target))setOpen(false)}
    document.addEventListener('pointerdown',close)
    return()=>{controller.abort();document.removeEventListener('pointerdown',close)}
  },[open])
  async function view(row){try{await backendRequest(`/api/workspace/notifications/${row.id}/read`,{method:'POST'});setRows(current=>current.map(r=>r.id===row.id?{...r,read:true}:r));setOpen(false);navigate(row.page)}catch(err){setError(err.message)}}
  return <div className="bn-container"><button ref={button} className="wp-secondary" aria-label="Notifications" aria-expanded={open} aria-controls="database-notifications" onClick={()=>{setError('');setOpen(v=>!v)}}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button>{open&&<section ref={panel} className="bn-panel" id="database-notifications" aria-label="Notifications" onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);button.current?.focus()}}}><div className="bm-toolbar"><h2>Notifications</h2><button aria-label="Close notifications" onClick={()=>setOpen(false)}>×</button></div>{error?<p role="alert">{error}</p>:!rows?<p role="status">Loading…</p>:rows.length?rows.map(row=><button key={row.id} className={`bn-row ${row.read?'is-read':''}`} onClick={()=>view(row)}><strong>{row.title}</strong><span>{row.detail}</span><small>{row.read?'Read':'New'}</small></button>):<p>No notifications yet.</p>}</section>}</div>
}
