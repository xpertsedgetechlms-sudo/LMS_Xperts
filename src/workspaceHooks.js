import { createContext, useContext, useEffect, useState } from 'react'
export const GuardContext=createContext(null)
export function useFormGuard(){return useContext(GuardContext)}
export function useMobileNavigation(){
  const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width: 720px)').matches)
  useEffect(()=>{const media=window.matchMedia('(max-width: 720px)');const update=()=>setMobile(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[])
  return mobile
}
