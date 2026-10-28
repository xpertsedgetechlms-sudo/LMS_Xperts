import EmailDeliveryStatus from './EmailDeliveryStatus'
import InstitutePolicies from './InstitutePolicies'
import { useEffect, useState } from 'react'
import { backendRequest } from './backendClient'
import { PolishedForm } from './WorkspacePolish'
import './BackendModules.css'

export default function BackendOperations({page,role}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  useEffect(()=>{
    const controller=new AbortController()
    const paths={Settings:'/api/public/settings',Reports:'/api/workspace/reports',Announcements:'/api/workspace/announcements'}
    async function load(){try{const [records,courses]=await Promise.all([backendRequest(paths[page],{signal:controller.signal}),backendRequest('/api/workspace/courses',{signal:controller.signal})]);setData({records,courses})}catch(err){if(err.name!=='AbortError')setError(err.message)}}
    load();return()=>controller.abort()
  },[page,revision])
  async function save(event){
    event.preventDefault();setBusy(true);setError('');setMessage('')
    const form=event.currentTarget,values=Object.fromEntries(new FormData(form))
    try{await backendRequest(page==='Settings'?'/api/admin/settings':'/api/workspace/announcements',{method:page==='Settings'?'PUT':'POST',body:page==='Settings'?values:{...values,courseId:values.courseId||null}});setMessage('Saved to the database.');setRevision(v=>v+1);if(page==='Settings')window.dispatchEvent(new Event('institute-settings-updated'));else form.reset()}
    catch(err){setError(Object.values(err.fields||{}).join(' ')||err.message);return false}finally{setBusy(false)}
  }
  if(!data)return <section className="ad-panel"><p role={error?'alert':'status'}>{error||'Loading database records…'}</p>{error&&<button onClick={()=>setRevision(v=>v+1)}>Retry</button>}</section>
  return <div className="backend-modules">{error&&<p role="alert" className="dw-notice">{error}</p>}{message&&<p role="status" className="dw-notice">{message}</p>}
    {page==='Settings'&&<PolishedForm key={revision} className="ad-panel bm-form" onSubmit={save}><fieldset disabled={busy}><legend>Institute contact settings</legend><label>Institute name<input name="name" maxLength={100} required defaultValue={data.records.name}/></label><label>Support email<input name="email" type="email" maxLength={254} required defaultValue={data.records.email}/></label><label>Phone / WhatsApp<input name="phone" maxLength={30} required defaultValue={data.records.phone}/></label><label>Address<textarea name="address" maxLength={1000} defaultValue={data.records.address}/></label><div className="wp-form-actions"><button type="reset" className="wp-secondary">Reset changes</button><button type="submit" className="ad-primary">{busy?'Saving…':'Save settings'}</button></div></fieldset><p>Contact details are shared with the portal and help chat. SMTP, payment secrets and deployment configuration belong in server environment settings.</p></PolishedForm>}
    {page==='Settings'&&role==='Admin'&&<EmailDeliveryStatus/>}
    {page==='Settings'&&role==='Admin'&&<InstitutePolicies/>}
    {page==='Reports'&&<section className="ad-panel"><h2>Database report</h2><p>Counts are restricted to your accessible courses and accounts.</p><div className="bm-summary">{Object.entries(data.records).map(([key,value])=><div key={key}><strong>{value}</strong><span>{key.replace(/([A-Z])/g,' $1')}</span></div>)}</div></section>}
    {page==='Announcements'&&<>{role!=='Student'&&<PolishedForm className="ad-panel bm-form" onSubmit={save}><fieldset disabled={busy}><legend>Publish announcement</legend><label>Audience<select name="courseId" required={role!=='Admin'}>{role==='Admin'&&<option value="">Institute-wide</option>}{data.courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Title<input name="title" required maxLength={150}/></label><label className="bl-full">Message<textarea name="body" required maxLength={4000}/></label><button type="submit" className="ad-primary">{busy?'Publishing…':'Publish'}</button></fieldset></PolishedForm>}{data.records.map(row=><article className="ad-panel" key={row.id}><p className="ad-kicker">{data.courses.find(c=>c.id===row.course_id)?.name||'Institute announcement'}</p><h2>{row.title}</h2><p className="bl-lesson-body">{row.body}</p><small>{new Date(row.created_at).toLocaleString('en-IN')}</small></article>)}{!data.records.length&&<section className="ad-panel">No announcements yet.</section>}</>}
  </div>
}
