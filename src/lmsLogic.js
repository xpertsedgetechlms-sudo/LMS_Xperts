import { initialCourses, questions, lessons } from './demoData.js'
import { instituteToday } from './instituteDate.js'

export const initialCurriculum=Object.fromEntries(initialCourses.map(c=>[c.id,[{id:`${c.id}-module-1`,title:'Getting started',published:true,lessons:lessons.map((l,i)=>({id:`${c.id}-lesson-${i+1}`,title:l.title,type:'Reading',content:l.body,url:'',published:true}))}]]))
const quizSeed={courseId:'dev',moduleId:'dev-module-1',title:'HTML foundations',instructions:'Answer every question before submitting.',durationMinutes:10,passPercent:60,maxAttempts:3,questions:questions.map((q,i)=>({id:`question-${i}`,text:q.text,options:[...q.options,'None of these'],correct:q.answer,marks:1}))}
export const initialQuizzes=[{id:'quiz-html',revision:1,draft:quizSeed,published:{...quizSeed,version:1,publishedAt:'2026-10-16'}}]
export const initialEnrolments=[{id:'enrol-s1-dev',studentId:'s1',courseId:'dev',status:'Active',expiresAt:'',createdAt:'2026-10-01'},{id:'enrol-s1-test',studentId:'s1',courseId:'test',status:'Active',expiresAt:'',createdAt:'2026-10-01'}]
export function activeEnrolment(e,today=instituteToday()){return e.status==='Active'&&(!e.expiresAt||e.expiresAt>=today)}
export function publishedLessons(curriculum,courseId){return (curriculum[courseId]||[]).filter(m=>m.published).flatMap(m=>m.lessons.filter(l=>l.published).map(l=>({...l,moduleTitle:m.title})))}
export function feeTotals(account,payments){const cents=value=>Math.round(value*100)/100;const total=cents(Math.max(0,Number(account.total)-Number(account.discount||0)));const paid=cents(payments.filter(p=>p.accountId===account.id).reduce((sum,p)=>sum+Number(p.amount),0));return{total,paid,balance:cents(Math.max(0,total-paid))}}
export function courseEligibility(store,studentId,courseId){
  const lessons=publishedLessons(store.curriculum,courseId)
  const completed=lessons.filter(l=>store.lessonProgress.some(p=>p.studentId===studentId&&p.courseId===courseId&&p.lessonId===l.id)).length
  const percent=lessons.length?Math.round(completed/lessons.length*100):0
  const rule=store.certificateRules[courseId]||{minProgress:100,requireQuiz:true}
  const quizzes=store.quizzes.filter(q=>q.published?.courseId===courseId)
  const quizzesPassed=quizzes.every(q=>store.results.some(r=>r.studentId===studentId&&r.quizId===q.id&&r.version===q.published.version&&r.passed))
  const enrolled=store.enrolments.some(e=>e.studentId===studentId&&e.courseId===courseId&&activeEnrolment(e))
  const reasons=[]
  if(!store.courses.some(c=>c.id===courseId&&c.published))reasons.push('Course must be published.')
  if(!enrolled)reasons.push('Active course access is required.')
  if(!lessons.length)reasons.push('Publish at least one lesson.')
  if(percent<rule.minProgress)reasons.push(`Complete at least ${rule.minProgress}% of published lessons.`)
  if(rule.requireQuiz&&!quizzesPassed)reasons.push('Pass every published quiz for this course.')
  return{eligible:reasons.length===0,reasons,percent,completed,totalLessons:lessons.length,quizzesPassed,rule}
}
export const escapeHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')
export function downloadHtml(filename,body){const url=URL.createObjectURL(new Blob([body],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function printHtml(body){const win=window.open('','_blank');if(!win)return false;win.document.open();win.document.write(body);win.document.close();win.focus();setTimeout(()=>win.print(),300);return true}
export const documentShell=(title,body)=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:15px/1.7 Arial,sans-serif;color:#244557;max-width:900px;margin:50px auto;padding:30px}h1,h2{color:#1d6147}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #dce5e8;text-align:left}small{color:#78909c}hr{border:0;border-top:1px solid #dce5e8;margin:30px 0}@media print{body{margin:0;max-width:none}}</style></head><body>${body}</body></html>`
