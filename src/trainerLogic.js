import { activeEnrolment,publishedLessons } from './lmsLogic.js'
export function trainerScope(store){
  const person=store.people.find(p=>p.id===store.activeTrainerId)
  if(!person||person.role!=='Trainer')return{person:null,courses:[],ids:[],batches:[],enrolments:[],learners:[],submissions:[]}
  const owns=c=>c.trainerId?c.trainerId===person?.id:!!person&&c.trainer===person.name
  const batches=store.batches.filter(b=>b.trainerId===person?.id||(b.trainerId===undefined&&store.courses.some(c=>c.id===b.course&&owns(c))))
  const courses=store.courses.filter(c=>owns(c)||batches.some(b=>b.course===c.id)),ids=courses.map(c=>c.id)
  const enrolments=store.enrolments.filter(e=>activeEnrolment(e)&&ids.includes(e.courseId)&&store.people.some(p=>p.id===e.studentId&&p.status==='Active'&&(store.courses.some(c=>c.id===e.courseId&&owns(c))||batches.some(b=>b.id===p.batchId&&b.course===e.courseId))))
  const learners=store.people.filter(p=>p.role==='Student'&&enrolments.some(e=>e.studentId===p.id))
  const submissions=store.submissions.filter(s=>ids.includes(s.course)&&learners.some(p=>p.id===s.studentId))
  return{person,courses,ids,batches,enrolments,learners,submissions}
}
export function learnerProgress(store,studentId,courseId){const lessons=publishedLessons(store.curriculum,courseId),done=lessons.filter(l=>store.lessonProgress.some(p=>p.studentId===studentId&&p.courseId===courseId&&p.lessonId===l.id)).length;return{done,total:lessons.length,percent:lessons.length?Math.round(done/lessons.length*100):0}}
export function trainerReportStore(store){const scope=trainerScope(store),pair=(studentId,courseId)=>scope.enrolments.some(e=>e.studentId===studentId&&e.courseId===courseId);return{courses:scope.courses,people:scope.learners,enrolments:scope.enrolments,batches:scope.batches,curriculum:store.curriculum,quizzes:store.quizzes.filter(q=>scope.ids.includes((q.published||q.draft)?.courseId)),lessonProgress:store.lessonProgress.filter(p=>pair(p.studentId,p.courseId)),results:store.results.filter(r=>pair(r.studentId,r.courseId)),attendance:store.attendance.filter(a=>scope.batches.some(b=>b.id===a.batchId)&&scope.learners.some(p=>p.id===a.personId)),feeAccounts:[],feePayments:[],submissions:scope.submissions}}
export function reviewRows(store,{status='Pending',course='All',query='',sort='submitted-desc'}={}){
  const rows=trainerScope(store).submissions.filter(s=>(status==='All'||(status==='Pending'?s.status!=='Graded':status==='Graded'?s.status==='Graded':s.status==='Graded'&&s.outcome===status))&&(course==='All'||s.course===course)&&`${store.people.find(p=>p.id===s.studentId)?.name||s.student} ${store.tasks.find(t=>t.id===s.taskId)?.title||''}`.toLowerCase().includes(query.toLowerCase()))
  return [...rows].sort((a,b)=>{if(sort==='learner')return (store.people.find(p=>p.id===a.studentId)?.name||a.student||'').localeCompare(store.people.find(p=>p.id===b.studentId)?.name||b.student||'');if(sort==='score-desc'){const x=a.status==='Graded'&&a.grade!==''?Number(a.grade):-1,y=b.status==='Graded'&&b.grade!==''?Number(b.grade):-1;return y-x}const field=sort==='graded-desc'?'gradedAt':'submittedAt',x=Date.parse(a[field]),y=Date.parse(b[field]);if(Number.isNaN(x))return Number.isNaN(y)?a.id.localeCompare(b.id):1;if(Number.isNaN(y))return -1;return sort==='submitted-asc'?x-y:y-x})
}
export function gradeSubmission(row,{grade,feedback,outcome},trainerId,at=new Date().toISOString()){
  const score=Number(grade);if(grade===''||!Number.isFinite(score)||score<0||score>100)throw new Error('Score must be between 0 and 100.')
  if(!['Passed','Not passed'].includes(outcome))throw new Error('Choose Passed or Not passed.')
  if(!feedback?.trim())throw new Error('Enter learner feedback.')
  const entry={grade:score,feedback:feedback.trim(),outcome,gradedAt:at,gradedBy:trainerId}
  return{...row,...entry,status:'Graded',gradeHistory:[...(row.gradeHistory||[]),entry]}
}
