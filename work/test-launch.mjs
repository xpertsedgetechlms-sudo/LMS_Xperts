import assert from 'node:assert/strict'
import { launchChecks,enrolmentRequest } from '../src/launchLogic.js'
const course={id:'c',name:'Course',published:true,price:500,duration:'8 weeks',level:'Beginner',outcomes:'Build a project',prerequisites:'None'}
const store={settings:{email:'support@example.com',phone:'1234567890',address:'Institute address',privacyText:'Approved wording',termsText:'Approved wording',refundText:'Approved wording'},courses:[course],curriculum:{c:[{published:true,lessons:[{id:'l',published:true}]}]},sessions:[{status:'Scheduled',meetingUrl:'https://example.com/meeting'}]}
assert.equal(launchChecks(store).every(c=>c.ready),true)
store.settings.privacyText='';assert.equal(launchChecks(store).find(c=>c.title==='Institute policies').ready,false)
store.sessions[0].meetingUrl='';assert.equal(launchChecks(store).find(c=>c.title==='Live class links').ready,false)
const orders=[],request=enrolmentRequest(orders,'s',course,'2026-10-16T10:00:00Z')
assert.equal(request.status,'Requested');assert.equal(request.amount,500);assert.equal(orders.length,0)
orders.push(request);assert.equal(enrolmentRequest(orders,'s',course),null);assert.ok(enrolmentRequest(orders,'other',course))
assert.equal(enrolmentRequest([{...request,status:'Simulated'}],'s',course).status,'Requested')
console.log('Launch configuration and duplicate-safe course request checks passed. Requests do not create enrolment or payment records.')
