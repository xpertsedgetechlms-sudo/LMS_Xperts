import assert from 'node:assert/strict'
import {studentScope,studentCourseProgress,assignmentState} from '../src/studentLogic.js'
const store={activeStudentId:'s',people:[{id:'s',role:'Student',status:'Active'}],courses:[{id:'c',published:true},{id:'draft',published:false}],enrolments:[{studentId:'s',courseId:'c',status:'Active'},{studentId:'s',courseId:'draft',status:'Active'}],tasks:[{id:'task',course:'c'},{id:'hidden',course:'draft'}],submissions:[{studentId:'s',id:'own'},{studentId:'other'}],results:[],attendance:[{personId:'s'},{personId:'other'}],curriculum:{c:[{published:true,lessons:[{id:'one',published:true},{id:'two',published:true},{id:'draft',published:false}]}]},lessonProgress:[{studentId:'s',courseId:'c',lessonId:'one'},{studentId:'other',courseId:'c',lessonId:'two'}],certificateRules:{},quizzes:[]}
assert.deepEqual(studentScope(store).ids,['c'])
assert.deepEqual(studentScope(store).tasks.map(t=>t.id),['task'])
assert.equal(studentScope(store).submissions.length,1)
assert.equal(studentScope(store).attendance.length,1)
const progress=studentCourseProgress(store,store.courses[0]);assert.equal(progress.percent,50);assert.equal(progress.resumeLessonId,'two')
store.people[0].status='Inactive';assert.equal(studentScope(store).courses.length,0)
store.people[0].status='Active';store.enrolments[0].status='Revoked';assert.equal(studentScope(store).courses.length,0)
store.activeStudentId='missing';assert.equal(studentScope(store).person,null)
assert.equal(assignmentState({due:'2026-10-15'},null,'2026-10-16'),'Overdue')
assert.equal(assignmentState({due:'2026-10-16'},null,'2026-10-16'),'Pending')
assert.equal(assignmentState({due:'2026-10-15'},{status:'Submitted'},'2026-10-16'),'Submitted')
assert.equal(assignmentState({due:'2026-10-15'},{status:'Graded'},'2026-10-16'),'Graded')
console.log('Student access, account isolation, next lesson, progress and assignment status checks passed.')
