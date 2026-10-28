import { useEffect, useState } from 'react'
import { backendRequest } from './backendClient'
import { PolishedForm } from './WorkspacePolish'
import './BackendModules.css'

function activityArea(route) {
  const names=[['/profile','Profile'],['/users','Accounts'],['/certificates','Certificates'],['/lessons','Lessons'],['/quizzes','Quizzes'],['/courses','Courses'],['/enrolments','Enrolments'],['/batches','Batches'],['/sessions','Live classes'],['/attendance','Attendance'],['/resources','Content library'],['/files','File uploads'],['/assignments','Assignments'],['/submissions','Submissions'],['/fees','Fees & receipts'],['/announcements','Announcements'],['/settings','Institute settings']]
  return names.find(([part])=>route.includes(part))?.[1]||'Workspace'
}
function activityAction(row) {
  if(row.route.endsWith('/grade'))return 'Graded submission'
  if(row.route.endsWith('/complete'))return 'Completed lesson'
  if(row.route.endsWith('/members'))return 'Updated batch members'
  if(row.route.endsWith('/attempts'))return 'Submitted quiz'
  return ({POST:'Created / submitted',PUT:'Updated',DELETE:'Removed',PATCH:'Updated'})[row.request_method]||'Saved'
}
export default function BackendAccount({page}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  const [index,setIndex]=useState(0),[search,setSearch]=useState(''),[filter,setFilter]=useState('')
  const profile=page==='Profile'
  useEffect(()=>{
    const controller=new AbortController()
    async function load(){
      try{
        const path=profile?'/api/workspace/profile':`/api/admin/activity?page=${index}&size=25&search=${encodeURIComponent(filter)}`
        const value=await backendRequest(path,{signal:controller.signal})
        setData(value);setError('')
      }catch(err){if(err.name!=='AbortError')setError(err.message||'Unable to reach the backend.')}
    }
    load();return()=>controller.abort()
  },[profile,index,filter,revision])
  async function save(event){
    event.preventDefault();setBusy(true);setError('');setMessage('')
    const form=new FormData(event.currentTarget)
    try{
      const value=await backendRequest('/api/workspace/profile',{method:'PUT',body:{name:String(form.get('name')).trim(),phone:String(form.get('phone')||'').trim(),bio:String(form.get('bio')||'').trim(),specialisation:String(form.get('specialisation')||'').trim()}})
      setData(value);setMessage('Your profile is saved to the database.');setRevision(v=>v+1)
      window.dispatchEvent(new Event('account-profile-updated'))
    }catch(err){setError(Object.values(err.fields||{}).join(' ')||err.message);return false}finally{setBusy(false)}
  }
  if(!data)return <section className="ad-panel"><p role={error?'alert':'status'}>{error||'Loading account records…'}</p>{error&&<button onClick={()=>setRevision(v=>v+1)}>Retry</button>}</section>
  return <div className="backend-modules">
    {error&&<p role="alert" className="dw-notice">{error}</p>}{message&&<p role="status" className="dw-notice">{message}</p>}
    {profile?<PolishedForm key={revision} className="ad-panel bm-form" onSubmit={save}><fieldset disabled={busy}><legend>Your account profile</legend>
      <label>Full name<input name="name" minLength={2} maxLength={100} required defaultValue={data.name}/></label>
      <label>Login email<input type="email" value={data.email} readOnly/><small>Contact an administrator to change your login email. Your role is {data.role.toLowerCase()}.</small></label>
      <label>Phone<input name="phone" type="tel" maxLength={30} defaultValue={data.phone}/></label>
      {data.role==='TRAINER'&&<label>Specialisation<input name="specialisation" maxLength={150} defaultValue={data.specialisation}/></label>}
      <label className="bl-full">About you<textarea name="bio" maxLength={2000} defaultValue={data.bio}/></label>
      <div className="wp-form-actions"><button className="wp-secondary" type="reset">Reset changes</button><button className="ad-primary" type="submit">{busy?'Saving…':'Save profile'}</button></div>
    </fieldset></PolishedForm>:<section className="ad-panel">
      <div className="bm-toolbar"><div><h2>Activity history</h2><p>Successful database changes recorded after this update. Passwords, file contents and request bodies are excluded.</p></div><button className="wp-secondary" onClick={()=>setRevision(v=>v+1)}>Refresh</button></div>
      <form className="bm-toolbar" onSubmit={event=>{event.preventDefault();setIndex(0);setFilter(search.trim())}}><label className="ad-search"><input aria-label="Search activity by account name" placeholder="Search account name" value={search} onChange={event=>setSearch(event.target.value)}/></label><button className="wp-secondary" type="submit">Search</button></form>
      <div className="ad-table-wrap"><table><thead><tr><th>Time</th><th>Account</th><th>Action</th><th>Area</th><th>Status</th></tr></thead><tbody>{data.items.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString('en-IN')}</td><td>{row.actor_name}</td><td>{activityAction(row)}</td><td>{activityArea(row.route)}</td><td>Saved</td></tr>)}</tbody></table></div>
      {!data.items.length&&<p>No matching activity records yet.</p>}
      <div className="bm-toolbar"><p>{data.total} records · Page {index+1} of {Math.max(1,Math.ceil(data.total/25))}</p><div className="bm-row-actions"><button disabled={index===0} onClick={()=>setIndex(v=>v-1)}>Previous</button><button disabled={(index+1)*25>=data.total} onClick={()=>setIndex(v=>v+1)}>Next</button></div></div>
    </section>}
  </div>
}
