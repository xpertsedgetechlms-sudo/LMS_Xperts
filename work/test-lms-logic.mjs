import assert from 'node:assert/strict'
import {activeEnrolment,feeTotals,courseEligibility,initialCurriculum,initialQuizzes,publishedLessons} from '../src/lmsLogic.js'
assert.equal(activeEnrolment({status:'Active',expiresAt:'2026-10-16'},'2026-10-16'),true)
assert.equal(activeEnrolment({status:'Active',expiresAt:'2026-10-15'},'2026-10-16'),false)
assert.equal(activeEnrolment({status:'Revoked',expiresAt:''}),false)
assert.equal(activeEnrolment({status:'Pending',expiresAt:''}),false)
assert.deepEqual(feeTotals({id:'a',total:1000,discount:100},[{accountId:'a',amount:200},{accountId:'a',amount:250},{accountId:'other',amount:500}]),{total:900,paid:450,balance:450})
assert.deepEqual(feeTotals({id:'a',total:0.3,discount:0},[{accountId:'a',amount:0.1},{accountId:'a',amount:0.2}]),{total:0.3,paid:0.3,balance:0})
const state={courses:[{id:'dev',published:true}],curriculum:initialCurriculum,certificateRules:{},quizzes:initialQuizzes,enrolments:[{studentId:'s1',courseId:'dev',status:'Active',expiresAt:''}],lessonProgress:[],results:[]}
assert.equal(courseEligibility(state,'s1','dev').eligible,false)
state.lessonProgress=publishedLessons(initialCurriculum,'dev').map(l=>({studentId:'s1',courseId:'dev',lessonId:l.id}))
assert.equal(courseEligibility(state,'s1','dev').eligible,false)
state.results=[{studentId:'s1',quizId:'quiz-html',version:1,passed:true}]
assert.equal(courseEligibility(state,'s1','dev').eligible,true)
assert.equal(courseEligibility(state,'another-student','dev').eligible,false)
state.quizzes=[{...initialQuizzes[0],published:{...initialQuizzes[0].published,version:2}}]
assert.equal(courseEligibility(state,'s1','dev').eligible,false)
state.quizzes=initialQuizzes
state.enrolments[0].status='Revoked'
assert.equal(courseEligibility(state,'s1','dev').eligible,false)
assert.equal(publishedLessons({dev:[{published:false,lessons:[{published:true}]}]},'dev').length,0)
console.log('Access, fee arithmetic, published content and certificate eligibility checks passed.')
