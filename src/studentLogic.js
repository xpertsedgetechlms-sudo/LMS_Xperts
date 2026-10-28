import { activeEnrolment,publishedLessons,courseEligibility } from './lmsLogic.js'
import { instituteToday } from './instituteDate.js'
export function studentScope(store){
  const person=store.people.find(p=>p.id===store.activeStudentId&&p.role==='Student')
  if(!person)return{person:null,courses:[],ids:[],tasks:[],submissions:[],results:[],attendance:[]}
  const ids=store.enrolments.filter(e=>person.status==='Active'&&e.studentId===person.id&&activeEnrolment(e)).map(e=>e.courseId)
  const courses=store.courses.filter(c=>c.published&&ids.includes(c.id)),allowed=courses.map(c=>c.id)
  return{person,courses,ids:allowed,tasks:store.tasks.filter(t=>allowed.includes(t.course)),submissions:store.submissions.filter(s=>s.studentId===person.id),results:store.results.filter(r=>r.studentId===person.id),attendance:store.attendance.filter(a=>a.personId===person.id)}
}
export function studentCourseProgress(store,course){
  const lessons=publishedLessons(store.curriculum,course.id),complete=l=>store.lessonProgress.some(p=>p.studentId===store.activeStudentId&&p.courseId===course.id&&p.lessonId===l.id),done=lessons.filter(complete).length
  return{...course,lessons,done,total:lessons.length,percent:lessons.length?Math.round(done/lessons.length*100):0,resumeLessonId:lessons.find(l=>!complete(l))?.id||lessons[0]?.id,eligibility:courseEligibility(store,store.activeStudentId,course.id)}
}
export function assignmentState(task,submission,today=instituteToday()){return submission?.status==='Graded'?'Graded':submission?'Submitted':task.due<today?'Overdue':'Pending'}
