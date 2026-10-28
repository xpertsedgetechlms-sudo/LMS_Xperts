import assert from 'node:assert/strict'
import {backendAuth,backendRequest,BackendError} from '../src/backendClient.js'
const previous=globalThis.fetch,calls=[]
try{
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options})
    return url.endsWith('/csrf')?new Response(JSON.stringify({headerName:'X-CSRF-TOKEN',token:'fresh-token'}),{status:200}):new Response(JSON.stringify({role:'STUDENT'}),{status:200})
  }
  assert.equal((await backendAuth.login('student@example.com','test-only-password')).role,'STUDENT')
  assert.deepEqual(calls.map(c=>c.url),['/api/auth/csrf','/api/auth/login'])
  assert.equal(calls[1].options.headers['X-CSRF-TOKEN'],'fresh-token')
  assert.equal(calls[1].options.credentials,'include')
  assert.deepEqual(JSON.parse(calls[1].options.body),{email:'student@example.com',password:'test-only-password'})
  const upload = new FormData()
  upload.append('file', new Blob(['assignment']), 'work.txt')
  await backendRequest('/api/workspace/files', {method:'POST',body:upload})
  const multipart = calls.at(-1).options
  assert.equal(multipart.body,upload)
  assert.equal(multipart.headers['Content-Type'],undefined,'Fetch must set the multipart boundary')
  assert.equal(multipart.headers['X-CSRF-TOKEN'],'fresh-token')
  assert.equal(multipart.credentials,'include')
  await assert.rejects(()=>backendRequest('https://untrusted.example/api'),/relative/)
  globalThis.fetch=async()=>new Response(JSON.stringify({message:'Sign in to continue.'}),{status:401})
  await assert.rejects(()=>backendAuth.current(),e=>e instanceof BackendError&&e.status===401)
  globalThis.fetch=async()=>new Response(null,{status:204})
  assert.equal(await backendRequest('/api/test'),null)
  console.log('Backend client verifies same-origin paths, session cookies, CSRF-before-login, server errors and empty responses.')
}finally{globalThis.fetch=previous}
