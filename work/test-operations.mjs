import assert from 'node:assert/strict'
import { reportRows,csvCell } from '../src/reportLogic.js'
import { validateSnapshot,readWorkspace,writeWorkspace } from '../src/workspaceStorage.js'
const state={courses:[{id:'dev',name:'Development'}],people:[{id:'s1',name:'Student'}],enrolments:[],feeAccounts:[{id:'f',studentId:'s1',courseId:'dev',total:1000,discount:100}],feePayments:[{id:'p',accountId:'f',amount:450,date:'2026-10-16'}]}
assert.equal(reportRows(state,'Fee balances').rows[0][4],450)
assert.equal(reportRows(state,'Payments','All','2026-11-01').rows.length,0)
assert.ok(csvCell('=SUM(1,2)').includes("'=SUM"))
const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}
writeWorkspace(state);assert.equal(readWorkspace().courses.length,1)
assert.throws(()=>validateSnapshot({courses:'invalid'}),/Invalid/)
console.log('Device storage, reports, fee balances and CSV checks passed.')
