import { saveLocalFile, readLocalFile } from './workspaceStorage'

const allowed=['pdf','mp4','webm','txt','csv','png','jpg','jpeg','docx','xlsx','pptx','zip']
export async function uploadWorkspaceFile(file){
  if(!file||file.size===0)throw new Error('Choose a file with content.')
  if(file.size>20*1024*1024)throw new Error('Choose a file smaller than 20 MB.')
  const extension=file.name.split('.').pop().toLowerCase();if(!allowed.includes(extension))throw new Error('Supported files: PDF, MP4, WebM, documents, spreadsheets, images, TXT, CSV and ZIP.')
  const fileId=await saveLocalFile(file);return{fileId,fileName:file.name,size:file.size,storage:'device'}
}
export async function fileUrl(record){if(record.storage==='cloud')throw new Error('This file belongs to a disconnected storage service. Upload it again on this device.');const file=await readLocalFile(record.fileId);if(!file)throw new Error('File is not available on this device. Upload it again.');return URL.createObjectURL(file)}
export async function downloadWorkspaceFile(record){const url=await fileUrl(record);const a=document.createElement('a');a.href=url;a.download=record.fileName||'resource';if(record.storage==='cloud'){a.target='_blank';a.rel='noopener noreferrer'}a.click();if(url.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),60000)}
