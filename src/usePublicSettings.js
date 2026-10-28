import { useEffect, useState } from 'react'
import { backendRequest } from './backendClient'

export function usePublicSettings() {
  const [settings,setSettings]=useState({})
  useEffect(()=>{
    let active=true
    const load=()=>backendRequest('/api/public/settings').then(value=>{if(active)setSettings(value)}).catch(()=>{})
    load();window.addEventListener('institute-settings-updated',load)
    return()=>{active=false;window.removeEventListener('institute-settings-updated',load)}
  },[])
  return settings
}
