import { publishedLessons } from './lmsLogic.js'

export function launchChecks(store) {
  const s=store.settings
  return [
    {title:'Support contact',ready:!!(s.email&&s.phone&&s.address),page:'Settings',detail:'Add the official support email, phone and institute address.'},
    {title:'Institute policies',ready:!!(s.privacyText&&s.termsText&&s.refundText)&&!(/draft/i.test(s.termsText+s.refundText)),page:'Launch centre',detail:'Drafts are available. Add institute-approved privacy, terms and refund wording before public launch.'},
    {title:'Published course information',ready:store.courses.some(c=>c.published)&&store.courses.filter(c=>c.published).every(c=>c.duration&&c.level&&c.outcomes&&c.prerequisites),page:'Courses',detail:'Add duration, level, prerequisites and learning outcomes to each published course.'},
    {title:'Course lessons',ready:store.courses.some(c=>c.published)&&store.courses.filter(c=>c.published).every(c=>publishedLessons(store.curriculum,c.id).length>0),page:'Curriculum',detail:'Published lessons exist. Review every lesson and replace starter content with institute material.'},
    {title:'Live class links',ready:store.sessions.some(s=>s.status!=='Cancelled'&&s.status!=='Completed')&&store.sessions.filter(s=>s.status!=='Cancelled'&&s.status!=='Completed').every(s=>/^https:\/\//.test(s.meetingUrl||'')),page:'Live classes',detail:'Add the real meeting links to scheduled classes.'},
  ]
}

export function enrolmentRequest(orders,studentId,course,now=new Date().toISOString()) {
  if(orders.some(o=>o.studentId===studentId&&(o.courseId===course.id||o.course===course.name)&&o.status==='Requested'))return null
  return {id:crypto.randomUUID(),studentId,courseId:course.id,course:course.name,amount:course.price==null?null:Number(course.price),status:'Requested',createdAt:now}
}
