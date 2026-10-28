import { officialContact,courseFees,policyDrafts } from './instituteContent.js'
import { useEffect, useState } from 'react'

export const WORKSPACE_KEY='xpertsedge.workspace.v1'
export const defaultSettings={name:'XpertsEdge Technologies',...officialContact,...policyDrafts,contentRevision:1,website:'',description:'Building Success Beyond Boundaries',address:'',logoUrl:'/Logo.png',timezone:'Asia/Kolkata',currency:'INR'}
export const collectionKeys=['courses','people','tasks','sessions','submissions','resources','quizzes','enrolments','lessonProgress','feeAccounts','feePayments','certificates','activity','results','orders','batches','announcements','attendance']
export function validateSnapshot(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid workspace backup.')
  for(const key of collectionKeys){if(value[key]!==undefined&&(!Array.isArray(value[key])||value[key].some(row=>!row||typeof row!=='object'||Array.isArray(row))))throw new Error(`Invalid ${key} records.`)}
  for(const key of ['settings','curriculum','certificateRules'])if(value[key]!==undefined&&(!value[key]||typeof value[key]!=='object'||Array.isArray(value[key])))throw new Error(`Invalid ${key}.`)
  for(const key of ['courses','people'])for(const row of value[key]||[])if(typeof row.id!=='string'||typeof row.name!=='string')throw new Error(`Invalid ${key}: ID and name are required.`)
  for(const modules of Object.values(value.curriculum||{}))if(!Array.isArray(modules)||modules.some(m=>!m||typeof m.id!=='string'||!Array.isArray(m.lessons)||m.lessons.some(l=>!l||typeof l.id!=='string'||typeof l.title!=='string')))throw new Error('Invalid course curriculum.')
  return value
}
export function readWorkspace(){try{const raw=localStorage.getItem(WORKSPACE_KEY);if(!raw)return{};const value=validateSnapshot(JSON.parse(raw).data);if(value.settings?.contentRevision!==1){value.settings={...value.settings,...officialContact,...policyDrafts,contentRevision:1};value.courses=value.courses?.map(c=>Object.hasOwn(courseFees,c.id)?{...c,price:courseFees[c.id]}:c)}return value}catch{return{}}}
export function writeWorkspace(data){localStorage.setItem(WORKSPACE_KEY,JSON.stringify({version:1,savedAt:new Date().toISOString(),data}))}
export function useStoredField(key,fallback,seed){return useState(()=>seed?(seed[key]??(typeof fallback==='function'?fallback():fallback)):(readWorkspace()[key]??(typeof fallback==='function'?fallback():fallback)))}
export function useWorkspacePersistence(snapshot,enabled=true){
  const [status,setStatus]=useState('Loading saved data…')
  useEffect(()=>{if(!enabled)return;let next;try{writeWorkspace(snapshot);next='Saved on this device'}catch{next='Saving failed: browser storage is full or unavailable. Export a backup from Settings.'}const timer=setTimeout(()=>setStatus(next),0);return()=>clearTimeout(timer)},[snapshot,enabled])
  return status
}

function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open('xpertsedge-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('File storage is unavailable in this browser.'))})}
export async function saveLocalFile(file){const db=await database(),id=crypto.randomUUID();try{await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,id);tx.oncomplete=resolve;tx.onerror=()=>reject(new Error('File could not be saved. Browser storage may be full.'))});return id}finally{db.close()}}
export async function readLocalFile(id){const db=await database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Unable to read the saved file.'))})}finally{db.close()}}
