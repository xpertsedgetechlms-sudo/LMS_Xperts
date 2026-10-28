// Same-origin API adapter. Vite proxies /api in development; configure an
// equivalent HTTPS reverse proxy for hosting. No browser storage auth tokens.
export class BackendError extends Error {
  constructor(status,payload){super(payload.message||'The request could not be completed.');this.status=status;this.fields=payload.fields||{}}
}
async function responseBody(response){
  const body=response.status===204?null:await response.json().catch(()=>({message:'Invalid server response.'}))
  if(!response.ok)throw new BackendError(response.status,body||{})
  return body
}
export async function backendRequest(path,{method='GET',body,signal}={}){
  if(!path.startsWith('/api/'))throw new Error('Use a relative /api/ endpoint.')
  const headers={}
  if(!['GET','HEAD','OPTIONS'].includes(method.toUpperCase())){
    // Request a current token after login/logout instead of reusing an old one.
    const csrf=await responseBody(await fetch('/api/auth/csrf',{credentials:'include',signal}))
    headers[csrf.headerName]=csrf.token
  }
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData
  if(body!==undefined&&!multipart)headers['Content-Type']='application/json'
  return responseBody(await fetch(path,{method,headers,credentials:'include',body:body===undefined?undefined:multipart?body:JSON.stringify(body),signal}))
}
export const backendAuth={
  forgot:(email)=>backendRequest('/api/auth/forgot-password',{method:'POST',body:{email}}),
  reset:(token,password)=>backendRequest('/api/auth/reset-password',{method:'POST',body:{token,password}}),
  current:()=>backendRequest('/api/auth/me'),
  login:(email,password)=>backendRequest('/api/auth/login',{method:'POST',body:{email,password}}),
  register:(name,email,password)=>backendRequest('/api/auth/register',{method:'POST',body:{name,email,password}}),
  logout:()=>backendRequest('/api/auth/logout',{method:'POST'}),
}
