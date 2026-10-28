import { useEffect, useState } from 'react'
import { backendRequest } from './backendClient'
import { PolishedForm } from './WorkspacePolish'
import { useFormGuard } from './workspaceHooks'

const titles={privacy:'Privacy policy',terms:'Terms of use',refund:'Refund and cancellation'}
export function PublicInstitutePolicy({settings,type}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
  useEffect(()=>{const controller=new AbortController();backendRequest('/api/public/policies',{signal:controller.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError('Unable to load the institute policy.')});return()=>controller.abort()},[attempt])
  const record=data?.find(p=>p.kind===type)
  return <section className="ad-panel launch-policy"><p className="ad-kicker">{settings.name}</p><h1>{titles[type]||'Institute policy'}</h1>{error?<><p role="alert">{error}</p><button onClick={()=>{setError('');setAttempt(v=>v+1)}}>Retry policy</button></>:!data?<p role="status">Loading policy…</p>:record?.published_text?<><p className="launch-copy">{record.published_text}</p><small>Approved and published {new Date(record.approved_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</small></>:<p>The institute has not approved and published this policy yet. Contact {settings.email||'the institute'} for the final written terms before enrolling or paying.</p>}</section>
}

export default function InstitutePolicies() {
  const [records,setRecords]=useState(null),[kind,setKind]=useState('privacy'),[revision,setRevision]=useState(0),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const guard=useFormGuard()
  useEffect(()=>{const controller=new AbortController();backendRequest('/api/admin/policies',{signal:controller.signal}).then(setRecords).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[revision])
  const row=records?.find(p=>p.kind===kind)
  async function save(event){
    event.preventDefault();if(busy)return false
    const form=new FormData(event.currentTarget),action=event.nativeEvent.submitter?.value||'save'
    setError('');setMessage('')
    const text=String(form.get('text')||'')
    if(action==='publish'&&(text!==row.draft_text||form.get('approved')!=='on')){setError('Save draft changes first, then confirm institute approval before publishing.');return false}
    setBusy(true)
    try{
      await backendRequest(`/api/admin/policies/${kind}${action==='publish'?'/publish':''}`,{method:action==='publish'?'POST':'PUT',body:action==='publish'?{revision:row.revision,approved:true}:{text,revision:row.revision}})
      setMessage(action==='publish'?'Institute approval recorded. This version is now public.':'Draft saved. The previously published version, if any, stays public.');setRevision(v=>v+1)
    }catch(e){setError(e.message||'Unable to save policy.');return false}finally{setBusy(false)}
  }
  return <section className="ad-panel"><h2>Institute policy review</h2><p>Authorised institute staff must review and approve wording. Saving a draft does not publish it. Remove draft labels and unresolved review notes before approval.</p>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<label>Policy<select value={kind} disabled={busy} onChange={e=>{const next=e.target.value;const change=()=>{setKind(next);setError('');setMessage('')};if(guard)guard.run(change);else change()}}>{Object.entries(titles).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label>{row?<PolishedForm key={`${kind}-${row.revision}`} className="bm-form" onSubmit={save}><fieldset disabled={busy}><legend>{titles[kind]} - revision {row.revision}</legend><p>{row.approved_at?`Last publication: ${new Date(row.approved_at).toLocaleDateString('en-IN')} by ${row.approved_name}`:'Not approved or published yet.'}</p><label className="bl-full">Review text<textarea name="text" required minLength={100} maxLength={12000} rows={16} defaultValue={row.draft_text}/></label><label className="bm-check bl-full"><input type="checkbox" name="approved"/>I am authorised by the institute and confirm this saved wording has been reviewed and approved for public use.</label><div className="wp-form-actions"><button type="submit" value="save" className="wp-secondary">Save review draft</button><button type="submit" value="publish" className="ad-primary">Approve and publish policy</button></div></fieldset></PolishedForm>:!error&&<p>Loading policy drafts…</p>}</section>
}
