import { instituteDate } from './instituteDate.js'
import { activeEnrolment, feeTotals, publishedLessons } from './lmsLogic.js'
export const csvCell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"'
export function reportRows(store,type,courseId='All',from='',to=''){
  const within=date=>(!from||date>=from)&&(!to||date<=to)
  const course=id=>store.courses.find(c=>c.id===id)?.name||id
  const person=id=>store.people.find(p=>p.id===id)?.name||id
  const allowed=id=>courseId==='All'||id===courseId
  if(type==='Enrolments')return {headers:['Student','Course','Access','Expiry','Created'],rows:store.enrolments.filter(e=>allowed(e.courseId)&&within(e.createdAt||'')).map(e=>[person(e.studentId),course(e.courseId),e.status==='Active'&&!activeEnrolment(e)?'Expired':e.status,e.expiresAt||'No expiry',e.createdAt||'Not recorded'])}
  if(type==='Payments')return {headers:['Date','Student','Course','Amount INR','Method','Reference'],rows:store.feePayments.map(p=>({...p,account:store.feeAccounts.find(a=>a.id===p.accountId)})).filter(p=>p.account&&allowed(p.account.courseId)&&within(p.date)).map(p=>[p.date,person(p.account.studentId),course(p.account.courseId),p.amount,p.method,p.reference])}
  if(type==='Fee balances')return {headers:['Student','Course','Net fee INR','Paid INR','Balance INR','Due date'],rows:store.feeAccounts.filter(a=>allowed(a.courseId)&&within(a.dueDate||'')).map(a=>{const totals=feeTotals(a,store.feePayments);return[person(a.studentId),course(a.courseId),totals.total,totals.paid,totals.balance,a.dueDate]})}
  if(type==='Attendance')return {headers:['Date','Student','Batch','Course','Status'],rows:store.attendance.map(a=>({...a,batch:store.batches.find(b=>b.id===a.batchId)})).filter(a=>a.batch&&allowed(a.batch.course)&&within(a.date)).map(a=>[a.date,person(a.personId),a.batch.name,course(a.batch.course),a.status])}
  if(type==='Quiz results')return {headers:['Student','Course','Quiz','Version','Status','Score','Percentage','Outcome','Submitted'],rows:store.results.filter(r=>allowed(r.courseId)&&within(instituteDate(r.submittedAt||r.startedAt||''))).map(r=>[person(r.studentId),course(r.courseId),r.title||store.quizzes.find(q=>q.id===r.quizId)?.published?.title,r.version,r.status,r.score??'',r.percent??'',r.status==='Submitted'?(r.passed?'Passed':'Not passed'):'Incomplete',r.submittedAt||''])}
  return {headers:['Student','Course','Completed lessons','Published lessons','Progress %'],rows:store.enrolments.filter(e=>allowed(e.courseId)&&activeEnrolment(e)&&within(e.createdAt||'')).map(e=>{const lessons=publishedLessons(store.curriculum,e.courseId),done=lessons.filter(l=>store.lessonProgress.some(p=>p.studentId===e.studentId&&p.courseId===e.courseId&&p.lessonId===l.id)).length;return[person(e.studentId),course(e.courseId),done,lessons.length,lessons.length?Math.round(done/lessons.length*100):0]})}
}
