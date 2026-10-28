import assert from 'node:assert/strict'
import { trainerScope,learnerProgress,trainerReportStore,reviewRows,gradeSubmission } from '../src/trainerLogic.js'
const store={activeTrainerId:'t',people:[{id:'t',name:'Trainer',role:'Trainer'},{id:'s',name:'Learner',role:'Student',status:'Active',batchId:'b'},{id:'other',name:'Other',role:'Student',status:'Active',batchId:'other-b'}],courses:[{id:'c',name:'Assigned',trainerId:'t'},{id:'x',name:'Unassigned',trainerId:'other-t'}],batches:[{id:'b',course:'c'},{id:'other-b',course:'x'},{id:'unassigned',course:'c',trainerId:''}],enrolments:[{id:'e',courseId:'c',studentId:'s',status:'Active',expiresAt:''},{id:'other-e',courseId:'x',studentId:'other',status:'Active'}],submissions:[{id:'sub',studentId:'s',course:'c',status:'Submitted'},{id:'other-sub',studentId:'other',course:'x'}],curriculum:{c:[{published:true,lessons:[{id:'l',published:true},{id:'draft',published:false}]}]},lessonProgress:[{studentId:'s',courseId:'c',lessonId:'l'},{studentId:'other',courseId:'c',lessonId:'l'}]}
assert.deepEqual(trainerScope(store).ids,['c'])
assert.deepEqual(trainerScope(store).learners.map(p=>p.id),['s'])
assert.deepEqual(trainerScope(store).batches.map(b=>b.id),['b'])
assert.deepEqual(trainerScope(store).submissions.map(s=>s.id),['sub'])
assert.equal(learnerProgress(store,'s','c').percent,100)
assert.equal(learnerProgress(store,'unknown','c').percent,0)
store.enrolments[0].status='Revoked';assert.equal(trainerScope(store).learners.length,0)
store.activeTrainerId='missing';assert.equal(trainerScope(store).courses.length,0)
console.log('Trainer assignments, batch scope, learner isolation and published lesson progress checks passed.')

store.activeTrainerId='t';store.enrolments[0].status='Active';store.tasks=[{id:'task',title:'Web page'}];store.quizzes=[];store.results=[{id:'r',studentId:'s',courseId:'c'},{id:'foreign',studentId:'s',courseId:'x'}];store.attendance=[{batchId:'b',personId:'s',date:'2026-10-16',status:'Present'},{batchId:'other-b',personId:'other',status:'Present'}];
const before={id:'pending',studentId:'s',course:'c',taskId:'task',grade:'',status:'Submitted',submittedAt:'2026-10-16T09:00:00Z'};
const graded=gradeSubmission(before,{grade:'0',feedback:'Please retry',outcome:'Not passed'},'t','2026-10-16T10:00:00Z');
assert.equal(graded.grade,0);assert.equal(graded.outcome,'Not passed');assert.equal(graded.gradedAt,'2026-10-16T10:00:00Z');assert.equal(graded.submittedAt,before.submittedAt);assert.equal(before.status,'Submitted');
const revised=gradeSubmission(graded,{grade:90,feedback:'Good revision',outcome:'Passed'},'t','2026-10-17T10:00:00Z');assert.equal(revised.gradeHistory.length,2);assert.equal(revised.gradeHistory[0].outcome,'Not passed');
for(const grade of ['',-1,101,'invalid'])assert.throws(()=>gradeSubmission(before,{grade,feedback:'Review',outcome:'Passed'},'t'),/Score/);
assert.throws(()=>gradeSubmission(before,{grade:50,feedback:'Review',outcome:''},'t'),/Choose/);
assert.throws(()=>gradeSubmission(before,{grade:50,feedback:' ',outcome:'Passed'},'t'),/feedback/);
store.submissions=[before,{...revised,id:'graded',submittedAt:'2026-10-17T09:00:00Z'},{id:'legacy',studentId:'s',course:'c',status:'Submitted'},{id:'foreign',studentId:'other',course:'x',status:'Submitted'}];
assert.deepEqual(reviewRows(store,{status:'Passed'}).map(s=>s.id),['graded']);assert.deepEqual(reviewRows(store,{status:'All',sort:'submitted-desc'}).map(s=>s.id),['graded','pending','legacy']);assert.deepEqual(reviewRows(store,{status:'All',sort:'submitted-asc'}).map(s=>s.id),['pending','graded','legacy']);assert.equal(reviewRows(store,{course:'x',status:'All'}).length,0);
const report=trainerReportStore(store);assert.equal(report.results.length,1);assert.equal(report.results[0].id,'r');assert.equal(report.attendance.length,1);assert.equal(report.feePayments.length,0);assert.deepEqual(report.courses.map(c=>c.id),['c']);
console.log('Trainer grading validation, review history, date sorting and report isolation checks passed.');
