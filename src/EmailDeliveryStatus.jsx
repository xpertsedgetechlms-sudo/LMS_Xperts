import { useEffect, useState } from 'react'
import { backendRequest } from './backendClient'

export default function EmailDeliveryStatus() {
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0)
  const [busy,setBusy]=useState(false)
  async function retry(id){
    if(busy)return
    setBusy(true)
    try{await backendRequest(`/api/admin/email-notifications/${id}/retry`,{method:'POST'});setRevision(v=>v+1)}catch(err){setError(err.message||'Retry failed.')}finally{setBusy(false)}
  }
  useEffect(()=>{
    const controller=new AbortController()
    backendRequest('/api/admin/email-notifications',{signal:controller.signal}).then(value=>{setData(value);setError('')}).catch(err=>{if(err.name!=='AbortError')setError(err.message||'Unable to load email status.')})
    return()=>controller.abort()
  },[revision])
  return <section className="ad-panel"><div className="bm-row-actions"><h2>Email notifications</h2><button type="button" onClick={()=>setRevision(v=>v+1)}>Refresh email status</button></div>{error&&<p role="alert">{error}</p>}{!data&&!error&&<p role="status">Loading email delivery status…</p>}{data&&<><p>{data.enabled?'Email sending is enabled. Messages are checked every 30 seconds.':'Email sending is not activated. Messages stay queued until SMTP and notifications are enabled.'}</p><p>Enrolment access, assignment updates and live class changes. “Sent” means accepted by SMTP; inbox delivery is not guaranteed.</p><div className="bm-summary">{data.counts.map(row=><div key={row.status}><strong>{row.total}</strong><span>{row.status.toLowerCase()}</span></div>)}</div>{data.records.length?<><p>Latest 50 messages</p><div className="ad-table-wrap"><table><thead><tr><th>Student</th><th>Message</th><th>Status</th><th>Attempts</th><th>Details</th></tr></thead><tbody>{data.records.map(row=><tr key={row.id}><td>{row.student_name}</td><td>{row.subject}</td><td>{row.status}{row.status==='FAILED'&&<button type="button" disabled={busy||!data.enabled} onClick={()=>retry(row.id)}>Retry email</button>}</td><td>{row.attempts}</td><td>{row.last_error|| (row.sent_at?new Date(row.sent_at).toLocaleString('en-IN'):new Date(row.created_at).toLocaleString('en-IN'))}</td></tr>)}</tbody></table></div></>:<p>No email notifications queued yet.</p>}</>}</section>
}
