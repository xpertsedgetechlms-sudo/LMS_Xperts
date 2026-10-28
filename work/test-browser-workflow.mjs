import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { createServer } from 'vite'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const require=createRequire(process.env.LMS_PLAYWRIGHT_PACKAGE)
const {chromium}=require('playwright')
const output=process.env.LMS_BROWSER_OUTPUT
const password=process.env.LMS_BROWSER_PASSWORD
assert.ok(password&&output&&process.env.LMS_TEST_BACKEND,'Run through the isolated browser verification test.')
await fs.mkdir(output,{recursive:true})
const report={checks:[],screenshots:[],pageErrors:[],apiErrors:[],passed:false}
const checked=message=>{report.checks.push(message);console.log('PASS:',message)}
const server=await createServer({root,configFile:path.join(root,'vite.config.js'),server:{host:'127.0.0.1',port:5317,strictPort:true,proxy:{'/api':process.env.LMS_TEST_BACKEND}}})
let browser,current
const form=page=>page.locator('form:has(fieldset)').last()
async function field(page,name,value){await form(page).locator(`[name="${name}"]`).fill(value)}
async function option(page,name,value){await form(page).locator(`select[name="${name}"]`).selectOption(value)}
async function save(page,name='Save to database'){
  const editor=form(page)
  await editor.getByRole('button',{name,exact:true}).click()
  await editor.waitFor({state:'detached',timeout:20000})
  await page.waitForLoadState('networkidle',{timeout:20000})
}
async function waitText(page,text){await page.getByText(text,{exact:false}).first().waitFor({state:'visible',timeout:20000})}
async function nav(page,role,name){
  current=page
  const menu=page.getByRole('button',{name:'Open navigation',exact:true})
  if(await menu.isVisible())await menu.click()
  await page.getByRole('navigation',{name:`${role} navigation`,exact:true}).getByRole('button',{name,exact:true}).click()
  const heading=name==='Overview'?(role==='Admin'?'Your learning command centre.':role==='Trainer'?'A space to inspire progress.':'Your next chapter starts here.'):name
  await page.locator('#main-content h1').filter({hasText:heading}).waitFor()
  await page.waitForLoadState('networkidle',{timeout:20000})
  await page.getByText(/Loading (database records|learning records|account records|fees|module)/).waitFor({state:'hidden',timeout:20000})
}
async function login(page,role,email){
  current=page
  await page.goto('http://127.0.0.1:5317/')
  await page.getByRole('button',{name:role,exact:true}).click()
  await page.getByLabel('Email address',{exact:true}).fill(email)
  await page.getByLabel('Password',{exact:true}).fill(password)
  await page.getByRole('button',{name:`Continue as ${role}`,exact:true}).click()
  await page.getByRole('navigation',{name:`${role} navigation`,exact:true}).waitFor({timeout:20000})
  await waitText(page,'Welcome,')
  checked(`${role} login opens the server-assigned workspace`)
}
async function screenshot(page,name){
  await page.locator('img').evaluateAll(images=>images.forEach(img=>{img.loading='eager'}))
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))))
  await page.screenshot({path:path.join(output,name+'.png'),fullPage:true,animations:'disabled'})
  report.screenshots.push(name+'.png')
}
function pdf(){
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>','<< /Length 44 >>\nstream\nBT /F1 14 Tf 20 150 Td (Browser notes) Tj ET\nendstream','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  let text='%PDF-1.4\n',offsets=[0]
  for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`}
  const xref=Buffer.byteLength(text);text+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(text)
}
try{
  await server.listen()
  browser=await chromium.launch({channel:'chrome',headless:true,timeout:20000})
  async function newPage(){const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>report.pageErrors.push(error.message));page.on('response',response=>{if(response.url().includes('/api/')&&response.status()>=400&&!(response.status()===401&&response.url().endsWith('/api/auth/me')))report.apiErrors.push({url:new URL(response.url()).pathname,status:response.status()})});return page}
  const admin=await newPage(),trainer=await newPage(),student=await newPage()
  await login(admin,'Admin','admin@browser.example')
  await nav(admin,'Admin','Trainers')
  await admin.getByRole('button',{name:'+ Add trainer',exact:true}).click()
  await field(admin,'name','Browser Trainer');await field(admin,'email','trainer@browser.example');await field(admin,'password',password);await save(admin,'Save account')
  await waitText(admin,'Browser Trainer');checked('Admin creates a real Trainer account through the form')
  await nav(admin,'Admin','Students')
  await admin.getByRole('button',{name:'+ Add student',exact:true}).click()
  await field(admin,'name','Browser Student');await field(admin,'email','student@browser.example');await field(admin,'password',password);await save(admin,'Save account')
  await waitText(admin,'Browser Student');checked('Admin creates a real Student account through the form')
  await nav(admin,'Admin','Courses')
  await admin.getByRole('button',{name:'+ Add course',exact:true}).click()
  await field(admin,'name','Unsaved test')
  await form(admin).getByRole('button',{name:'Cancel',exact:true}).click()
  await admin.getByRole('dialog').getByRole('button',{name:'Keep editing',exact:true}).click()
  await form(admin).getByRole('button',{name:'Cancel',exact:true}).click()
  await admin.getByRole('dialog').getByRole('button',{name:'Discard changes',exact:true}).click()
  checked('Unsaved course changes support keep-editing and discard')
  await admin.getByRole('button',{name:'+ Add course',exact:true}).click()
  await field(admin,'name','Browser Course');await field(admin,'courseId','browser-course');await field(admin,'category','Development');await field(admin,'description','Browser verification programme');await field(admin,'price','1000')
  await option(admin,'trainerId',{label:'Browser Trainer'});await option(admin,'published','true');await save(admin)
  await waitText(admin,'Browser Course');checked('Admin creates/publishes a course and assigns its trainer')
  await nav(admin,'Admin','Enrolments')
  await admin.getByRole('button',{name:'+ Add enrolment',exact:true}).click()
  await option(admin,'courseId','browser-course');await option(admin,'studentId',{label:'Browser Student · student@browser.example'});await option(admin,'status','ACTIVE');await save(admin)
  await admin.getByRole('button',{name:'Manage access',exact:true}).waitFor({timeout:20000})
  checked('Admin activates student enrolment through the UI')
  await screenshot(admin,'admin-desktop-enrolments')
  await login(trainer,'Trainer','trainer@browser.example')
  await nav(trainer,'Trainer','My batches');await trainer.getByRole('button',{name:'+ Add batch',exact:true}).click()
  await field(trainer,'name','Browser Batch');await field(trainer,'schedule','Weekdays 10 AM');await field(trainer,'startsOn','2026-11-01');await field(trainer,'endsOn','2027-01-31');await save(trainer)
  await trainer.getByRole('button',{name:'Manage learners',exact:true}).click();await form(trainer).getByLabel('Browser Student · student@browser.example',{exact:true}).check();await save(trainer)
  checked('Trainer creates a batch and assigns an enrolled learner')
  await nav(trainer,'Trainer','Live classes');await trainer.getByRole('button',{name:'+ Add session',exact:true}).click()
  await field(trainer,'title','Browser Live Class');await option(trainer,'batchId',{label:'Browser Batch · Browser Course'});await field(trainer,'startsAt','2026-11-01T10:00');await field(trainer,'meetingUrl','https://meet.example.com/browser-test');await save(trainer)
  assert.equal(await trainer.getByRole('link',{name:'Join class ↗',exact:true}).getAttribute('href'),'https://meet.example.com/browser-test')
  checked('Trainer schedules a batch class with a valid HTTPS join link')
  await nav(trainer,'Trainer','Attendance');await trainer.getByRole('button',{name:'+ Mark attendance',exact:true}).click();await save(trainer)
  await waitText(trainer,'present');checked('Trainer records attendance')
  await nav(trainer,'Trainer','Assignments');await trainer.getByRole('button',{name:'+ Add assignment',exact:true}).click()
  await field(trainer,'title','Browser Assignment');await field(trainer,'description','Upload your browser-tested solution.');await field(trainer,'dueAt','2027-01-01T10:00');await save(trainer)
  await nav(trainer,'Trainer','Content library');await trainer.getByRole('button',{name:'+ Add resource',exact:true}).click()
  await field(trainer,'title','Browser Course Notes');await form(trainer).locator('input[type=file]').setInputFiles({name:'browser-notes.pdf',mimeType:'application/pdf',buffer:pdf()});await save(trainer)
  checked('Trainer uploads private PDF course material')
  await nav(trainer,'Trainer','Curriculum');await trainer.getByRole('button',{name:'+ Add lesson',exact:true}).click()
  await field(trainer,'title','Browser Lesson');await field(trainer,'body','Read this lesson and complete the exercise.');await option(trainer,'published','true');await save(trainer,'Save')
  await nav(trainer,'Trainer','Quiz builder');await trainer.getByRole('button',{name:'+ Add quiz',exact:true}).click()
  await field(trainer,'title','Browser Quiz');await field(trainer,'prompt-0','Choose the correct answer');await field(trainer,'option-0-0','Correct choice');await field(trainer,'option-0-1','Incorrect choice');await option(trainer,'published','true');await save(trainer,'Save')
  checked('Trainer publishes a lesson and an MCQ quiz')
  await screenshot(trainer,'trainer-desktop-quiz')
  await student.goto('http://127.0.0.1:5317/')
  await student.getByRole('button',{name:'Create account',exact:true}).click()
  await field(student,'name','Browser Self Registration');await field(student,'email','registered@browser.example');await field(student,'password',password);await field(student,'confirmation',password+'x')
  await form(student).getByRole('button',{name:'Create account',exact:true}).click();await waitText(student,'Passwords do not match.')
  await field(student,'confirmation',password);await form(student).getByRole('button',{name:'Create account',exact:true}).click();await waitText(student,'Student account created successfully.')
  checked('Student self-registration validates confirmation and creates a database account')
  await login(student,'Student','student@browser.example')
  assert.equal(await student.locator('.dw-role-switch').count(),0)
  assert.equal(await student.getByRole('navigation').getByRole('button',{name:'Students',exact:true}).count(),0)
  checked('Student workspace has no role switch or Admin navigation')
  await nav(student,'Student','Live classes');await waitText(student,'Browser Live Class')
  await nav(student,'Student','Content library')
  await student.getByRole('button',{name:'View / play',exact:true}).click();await student.locator('.bm-preview iframe').waitFor();await student.getByRole('button',{name:'Close preview',exact:true}).click()
  const download=student.waitForEvent('download');await student.getByRole('button',{name:'Download',exact:true}).click();assert.equal((await download).suggestedFilename(),'browser-notes.pdf')
  checked('Enrolled Student sees the class and previews/downloads private notes')
  await nav(student,'Student','Assignments');await student.getByRole('button',{name:'Submit / replace file',exact:true}).click()
  await form(student).locator('input[type=file]').setInputFiles({name:'solution.txt',mimeType:'text/plain',buffer:Buffer.from('Browser workflow solution')});await field(student,'note','Browser UI submission');await save(student)
  checked('Student uploads an assignment submission through the form')
  await nav(trainer,'Trainer','Submissions');await trainer.getByRole('button',{name:'Grade',exact:true}).click();await field(trainer,'grade','90');await field(trainer,'feedback','Browser feedback verified');await save(trainer)
  checked('Trainer grades the submitted assignment')
  await nav(student,'Student','Submissions');await waitText(student,'Browser feedback verified')
  await nav(student,'Student','Lessons');await student.getByRole('button',{name:'Mark as completed',exact:true}).click();await student.getByRole('button',{name:'Completed',exact:true}).waitFor()
  await nav(student,'Student','Quizzes');await student.getByRole('button',{name:'Start quiz',exact:true}).click();await form(student).getByRole('radio',{name:'Correct choice',exact:true}).check();await save(student,'Submit answers');await waitText(student,'Score: 100%')
  await nav(student,'Student','My progress');await waitText(student,'Eligible')
  checked('Student reads feedback, completes a lesson, passes the quiz and becomes eligible')
  await nav(admin,'Admin','Certificates');await admin.getByRole('button',{name:'Issue certificate',exact:true}).click();await admin.locator('.bl-certificate').waitFor()
  await nav(student,'Student','Certificates');await student.locator('.bl-certificate').waitFor();const certificate=student.waitForEvent('download');await student.getByRole('button',{name:'Download PDF certificate',exact:true}).click();assert.match((await certificate).suggestedFilename(),/^XE-.*\.pdf$/)
  checked('Admin issues a certificate and the Student downloads their own record')
  await nav(student,'Student','Profile');await field(student,'name','Browser Student Updated');await field(student,'phone','9000000000');await field(student,'bio','Browser profile saved');await form(student).getByRole('button',{name:'Save profile',exact:true}).click();await waitText(student,'Your profile is saved to the database.')
  await student.reload();await nav(student,'Student','Profile');assert.equal(await form(student).locator('[name=phone]').inputValue(),'9000000000');assert.equal(await form(student).locator('[name=name]').inputValue(),'Browser Student Updated')
  checked('Profile name/phone/bio persist across a browser reload')
  await nav(admin,'Admin','Activity history');await waitText(admin,'Profile');await screenshot(admin,'admin-desktop-activity')
  checked('Admin activity history shows the database mutations')
  for(const [page,role,pages] of [[admin,'Admin',['Overview','Students','Courses','Enrolments','Payments','Activity history','Settings']],[trainer,'Trainer',['Overview','My batches','Attendance','Content library','Assignments','Submissions','Profile']],[student,'Student',['Overview','Explore courses','My courses','Lessons','Quizzes','My progress','Certificates','Profile','My Fees & Receipts']]]){
    await page.setViewportSize({width:390,height:844})
    for(const name of pages){await nav(page,role,name);await page.locator('#main-content').waitFor();const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.width+1,`${role} / ${name}: horizontal overflow ${dimensions.scroll} > ${dimensions.width}`)}
    await nav(page,role,role==='Student'?'Explore courses':role==='Trainer'?'Profile':'Overview')
    await screenshot(page,`${role.toLowerCase()}-mobile`)
    checked(`${role}: mobile navigation and ${pages.length} pages fit a 390px viewport`)
  }
  await student.getByRole('button',{name:'Sign out',exact:true}).first().click();await student.getByRole('button',{name:'Student',exact:true}).waitFor();await student.reload();await student.getByRole('button',{name:'Student',exact:true}).waitFor()
  checked('Sign out clears the authenticated workspace across reload')
  assert.deepEqual(report.pageErrors,[],'No uncaught browser JavaScript errors')
  assert.deepEqual(report.apiErrors,[],'No unexpected API error responses')
  report.passed=true
}catch(error){
  report.error=String(error.stack||error).replaceAll(password,'[redacted]')
  console.error(report.error)
  if(current)await screenshot(current,'failure').catch(()=>{})
  process.exitCode=1
}finally{
  await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify(report,null,2))
  await browser?.close();await server.close()
  console.log(report.passed?'BROWSER WORKFLOW PASSED':'BROWSER WORKFLOW FAILED')
}
