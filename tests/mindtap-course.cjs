const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const storage={},sent=[];
const chrome={storage:{session:{get:async key=>({[key]:storage[key]}),set:async values=>Object.assign(storage,values),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete storage[key];}}},tabs:{sendMessage:async(...args)=>{sent.push(args);return {received:true};}}};
const context={chrome,URL,Date,Error};vm.createContext(context);vm.runInContext(fs.readFileSync('shared/mindtap-course.js','utf8'),context);vm.runInContext(fs.readFileSync('background/mindtap-course.js','utf8'),context);
const course={url:'https://ng.cengage.com/static/nb/ui/evo/index.html?deploymentId=123',tab:{id:7},frameId:0};
const player={url:'https://aplia.apps.ng.cengage.com/af/servlet/quiz?quiz_action=showContents&deploymentId=123',tab:{id:7},frameId:4};
const other={url:'https://aplia.apps.ng.cengage.com/af/servlet/quiz?deploymentId=123',tab:{id:9},frameId:4};
const call=(message,sender)=>context.mindtapCourseMessage(message,sender);
(async()=>{
 const a={id:'1001',title:'Chapter 11 Homework',status:'Not started',gradeable:true,category:'apply',assessment:true,visible:true};
 const b={id:'1002',title:'Chapter 12 Homework',status:'Not started',gradeable:true,category:'apply',assessment:true,visible:true};
 await assert.rejects(call({type:'mindtapCourseStart',assignments:[{...a,status:'In progress'}]},course),/Not started/,'in-progress work cannot enter the course queue');
 await assert.rejects(call({type:'mindtapCourseStart',assignments:[{...a,gradeable:false}]},course),/Not started/,'ungraded activity cannot enter the queue');
 await assert.rejects(call({type:'mindtapCourseStart',assignments:[{...a,title:'Practice: Chapter review',category:'study',gradeable:false,practice:true}]},course),/Not started/,'optional practice categories cannot enter the default queue');
 await assert.rejects(call({type:'mindtapCourseStart',assignments:[{...a,title:'Chapter exam'}]},course),/Not started/,'exams cannot enter the queue');
 const elements={};
 const activities=[
  ['2001','Chapter 12 Homework','Not started','COUNTS TOWARDS GRADE',true],
  ['2002','Chapter 13 Homework','In progress','COUNTS TOWARDS GRADE',true],
  ['2003','Chapter 10 Homework','Submitted','COUNTS TOWARDS GRADE',true],
  ['2004','Chapter 12 Problems & Applications','Not started','PRACTICE',true],
  ['2005','Chapter 12 Quiz','Not started','COUNTS TOWARDS GRADE',true],
  ['2006','Chapter 12 Video','', '',true],
  ['2007','Hidden Homework','Not started','COUNTS TOWARDS GRADE',false]
 ].map(([id,title,status,grade,visible])=>{
   const section={innerText:id==='2004'?'Study It Chapter 12 Problems & Applications':'Apply It Chapter assignment'};
   const row={textContent:`${title} ${status} ${grade}`,classList:{contains:name=>name==='activity-activityType-2'},closest:selector=>selector==='.topic-level-3'?section:null,querySelector(selector){if(selector.startsWith('[id^="activity-status-"]'))return elements[`activity-status-${id}`];if(selector.startsWith('[id^="activity-gradable-"]'))return elements[`activity-gradable-${id}`];return null;}};
   elements[`activity-status-${id}`]={textContent:status};elements[`activity-gradable-${id}`]={textContent:grade};
   return {id:`activity-heading-${id}`,innerText:title,textContent:title,disabled:false,parentElement:{parentElement:row},closest(selector){return selector==='.activity-activityType-2'||selector==='li'?row:null;},getClientRects(){return visible?[{}]:[];}};
 });
 const mockDocument={querySelectorAll:()=>activities,getElementById:id=>elements[id]||null};
 const scanned=context.StudyMindTapCourse.scan(mockDocument),eligible=scanned.filter(item=>context.StudyMindTapCourse.eligible(item));
 assert.equal(JSON.stringify(eligible.map(item=>item.id)),JSON.stringify(['2001']),'the live-outline parser admits only visible, gradeable, not-started homework');
 const studyEligible=scanned.filter(item=>context.StudyMindTapCourse.eligible(item,['apply','study']));
 assert.ok(studyEligible.some(item=>item.id==='2004'),'users may opt into Study It practice assessments');
 assert.ok(context.StudyMindTapCourse.eligible({id:'2008',title:'Practice: Chapter review',status:'Not started',gradeable:false,practice:true,category:'study',assessment:true,visible:true},['study']),'optional selected practice items are supported');
 await assert.rejects(call({type:'mindtapCourseStart',assignments:[a]},player),/Not started/,'only the top-level course page can start a queue');
 assert.equal((await call({type:'mindtapCourseStart',assignments:[a,b],skipReviewPause:true},course)).received,true);
 assert.equal(storage.mindtapCourse.phase,'opening');assert.equal(sent.at(-1)[1].type,'mindtapCourseOpen');assert.equal(sent.at(-1)[1].item.id,'1001');
 assert.equal((await call({type:'mindtapCourseState'},course)).total,2);
 assert.equal((await call({type:'mindtapCourseReady'},other)).received,false,'a different tab cannot join the course run');
 const ready=await call({type:'mindtapCourseReady'},player);assert.equal(ready.start,true);assert.equal(ready.skipReviewPause,true);
 assert.equal((await call({type:'mindtapCourseFinished'},player)).phase,'review','finishing question navigation pauses for the user’s assignment review/submission');
 assert.equal(sent.at(-1)[1].type,'mindtapCourseReview');
 assert.equal((await call({type:'mindtapCourseContinue'},course)).title,b.title,'user confirmation advances to the next queued assignment');
 assert.equal(sent.at(-1)[1].type,'mindtapCourseOpen');assert.equal(sent.at(-1)[1].item.id,'1002');
 await call({type:'mindtapCourseReady'},player);
 await call({type:'mindtapCourseBlocked',reason:'Unsupported graph interaction'},player);
 assert.equal(storage.mindtapCourse.skipped[0].reason,'Unsupported graph interaction','unsupported work is reported as incomplete');
 assert.equal((await call({type:'mindtapCourseContinue'},course)).phase,'done');
 assert.equal(sent.at(-1)[1].done,true,'the last activity ends in a review summary');
 assert.equal((await call({type:'mindtapCourseStop'},course)).received,true);assert.equal(storage.mindtapCourse,undefined);
 const ui=fs.readFileSync('content-scripts/mindtap-course.js','utf8');
 const shared=fs.readFileSync('shared/mindtap-course.js','utf8');
 assert.match(shared,/activity-status-/,'the shared scanner reads MindTap activity status');
 assert.match(shared,/activity-gradable-/,'the shared scanner reads MindTap gradeability');
 assert.match(ui,/StudyMindTapCourse\.scan\(document\)/,'the course scanner uses the shared parser tested against the outline fixture');
 assert.match(ui,/data-category="apply" checked/,'Apply It is selected by default');
 assert.match(ui,/data-category="study"/,'the optional Study It category is available');
 assert.match(ui,/activity-heading-/,'eligible work opens through MindTap’s native activity button');
 assert.match(ui,/submit each assignment yourself/,'the user remains in control of final assignment submission');
 assert.doesNotMatch(ui,/submitAsstButton.{0,100}\.click\(/,'course navigation never clicks the final Submit Assignment button');
 const mindtap=fs.readFileSync('content-scripts/mindtap.js','utf8');
 assert.match(mindtap,/mindtapCourseReady/,'the assignment frame hands off from the course queue');
 assert.match(mindtap,/mindtapCourseFinished/,'question navigation returns to the manual submission checkpoint');
 console.log('PASS MindTap course eligibility, queue handoff, review gate and completion');
})().catch(error=>{console.error(error);process.exitCode=1;});
