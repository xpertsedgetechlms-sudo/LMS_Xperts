import { useState } from 'react'
import { backendAuth } from './backendClient'

export default function PasswordReset({token,onDone}) {
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [done,setDone]=useState(false)
  const [show,setShow]=useState(false)
  const valid=/^[A-Za-z0-9_-]{43}$/.test(token)
  async function submit(event) {
    event.preventDefault()
    if(busy)return
    const fields=new FormData(event.currentTarget), password=String(fields.get('password')||'')
    if(password!==fields.get('confirmation')){setMessage('Passwords do not match.');return}
    if(password.length<12||new TextEncoder().encode(password).length>72){setMessage('Use at least 12 characters and at most 72 UTF-8 bytes.');return}
    setBusy(true);setMessage('')
    try { const result=await backendAuth.reset(token,password);setMessage(result.message);setDone(true) }
    catch(error){setMessage(error.status===429?'Too many attempts. Please try again later.':error.status?error.message:'Unable to reach the server. Please try again.')}
    finally {setBusy(false)}
  }
  return <main className="auth-layout"><aside className="auth-story"><div className="story-content"><p className="story-badge">XPERTSEDGE TECHNOLOGIES</p><h1>A fresh start.<span>Secure your account.</span></h1><p className="story-description">Choose a new password. Your reset link expires after 30 minutes and works only once.</p></div></aside><section className="auth-panel"><div className="auth-card"><section className="login-section"><h2>Reset your password</h2>{!valid?<p role="alert">This reset link is invalid. Return to sign in and request a new link.</p>:!done&&<form onSubmit={submit}><fieldset className="auth-fields" disabled={busy}><div><label htmlFor="reset-new">New password</label><div className="password-field"><input id="reset-new" name="password" type={show?'text':'password'} minLength={12} maxLength={72} autoComplete="new-password" required/><button type="button" className="password-toggle" aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div><small>At least 12 characters; up to 72 UTF-8 bytes.</small></div><div><label htmlFor="reset-confirm">Confirm new password</label><input id="reset-confirm" name="confirmation" type="password" minLength={12} maxLength={72} autoComplete="new-password" required/></div><button type="submit">{busy?'Updating password…':'Save new password'}</button></fieldset></form>}<p className="auth-message" role="status">{message}</p><button type="button" disabled={busy} className="auth-text-button" onClick={onDone}>Back to sign in</button></section></div></section></main>
}
