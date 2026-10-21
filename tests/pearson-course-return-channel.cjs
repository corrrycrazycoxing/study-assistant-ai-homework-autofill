const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const stored={},outgoing=[],storage={get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,stored[key]])),set:async values=>Object.assign(stored,values),remove:async key=>delete stored[key]};
let waiting=false;
const bg={URL,Date,Error,crypto:require('node:crypto').webcrypto,chrome:{storage:{session:storage,local:storage},tabs:{sendMessage:async(tab,message,options)=>{outgoing.push({tab,message,options});assert(!(waiting&&tab===10&&options?.frameId===2&&message.type==='pearsonCourseReturnToList'),'background cannot navigate the frame awaiting this response');return {received:true};}}}};
vm.createContext(bg);vm.runInContext(fs.readFileSync('background/pearson-course.js','utf8'),bg);
const ui=fs.readFileSync('content-scripts/pearson-course.js','utf8');
const list={url:'https://mylab.pearson.com/courses/123/assignments',tab:{id:10},frameId:2};
const overview={...list,url:'https://mylab.pearson.com/Student/OverviewHomework.aspx?homeworkId=456'};
const gate={...list,url:'https://mylab.pearson.com/Student/DoHomework.aspx?homeworkId=456'};
const assignments=[{title:'Lesson Section 6.1',key:'javascript:doHomework(456, false, true);'},{title:'HW Section 6.2',key:'javascript:doHomework(789, false, true);'}];
const call=(type,sender,fields={})=>bg.pearsonCourseMessage({type,...fields},sender);
(async()=>{
  await call('pearsonCourseStart',list,{assignments,includeStarted:true});await call('pearsonCourseGate',gate,{canStart:false,requireQuestionRoutes:true});
  const types=[];const client={chrome:{runtime:{sendMessage:async message=>{types.push(message.type);waiting=true;try{const result=await bg.pearsonCourseMessage(message,overview);if(message.type==='pearsonCourseOverview')throw Error('A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received');return result;}finally{waiting=false;}}}}};
  vm.createContext(client);vm.runInContext(ui.slice(ui.indexOf('  const send='),ui.indexOf('  const openAssignment=')),client);
  const send=vm.runInContext('send',client);
  const result=await send('pearsonCourseOverview',{canResume:false,notStarted:false,questionsPending:false,pendingQuestionIds:[]});
  assert.equal(result.action,'list');assert.equal(result.listUrl,list.url);assert.equal(stored.pearsonCourse.index,1);assert.deepEqual(types,['pearsonCourseOverview','pearsonCourseReturnState'],'a closed channel queries the committed return; it never retries the mutation');
  const repeat=await call('pearsonCourseOverview',overview,{canResume:false,questionsPending:false});assert.equal(repeat.action,'list');assert.equal(stored.pearsonCourse.index,1,'reloading the old overview cannot advance twice');
  assert.equal((await call('pearsonCourseReturnState',{...overview,frameId:9})).received,false);
  assert.equal((await call('pearsonCourseReturnState',{...overview,url:overview.url.replace('456','999')})).received,false);
  assert.equal((await call('pearsonCourseList',list)).title,assignments[1].title);assert.equal(stored.pearsonCourse.listReturn,undefined,'arrival on the actual list clears the committed return');
  assert.equal((await call('pearsonCourseReturnState',overview)).received,false,'an obsolete overview cannot recover after list arrival');

  // A saved player can close and refresh its opener. That opener's pending
  // overview request must also receive its destination without self-navigation.
  await call('pearsonCourseStart',list,{assignments});stored.pearsonCourse.phase='verify';stored.pearsonCourse.assignmentId='456';stored.pearsonCourse.returnAfterSave=true;
  waiting=true;const saved=await call('pearsonCourseOverview',overview,{questionsPending:false,pendingQuestionIds:[]});waiting=false;assert.equal(saved.action,'list');assert.equal(stored.pearsonCourse.index,1);assert.equal(outgoing.length,0);

  // The separate background-to-content navigation lane must acknowledge first,
  // then navigate on the next task instead of tearing down its response channel.
  const tasks=[],events=[];let listener;
  const content={URL,URLSearchParams,overview:true,gate:false,list:false,location:{origin:'https://mylab.pearson.com',search:'?homeworkId=456',assign:url=>events.push('navigate:'+url),reload:()=>events.push('reload')},setTimeout:fn=>tasks.push(fn),status:()=>{},chrome:{runtime:{onMessage:{addListener:fn=>{listener=fn;}}}}};
  vm.createContext(content);vm.runInContext(ui.slice(ui.indexOf('  chrome.runtime.onMessage.addListener('),ui.indexOf('  if(embeddedCourse)window.addEventListener(')),content);
  listener({type:'pearsonCourseReturnToList',url:list.url},{},reply=>events.push('reply:'+reply.received));assert.deepEqual(events,['reply:true']);tasks.shift()();assert.deepEqual(events,['reply:true','navigate:'+list.url]);
  events.length=0;listener({type:'pearsonCourseVerify',assignmentId:'456'},{},reply=>events.push('reply:'+reply.received));assert.deepEqual(events,['reply:true']);tasks.shift()();assert.deepEqual(events,['reply:true','reload']);
  console.log('PASS Pearson response-before-return navigation, dropped-channel recovery, exactly-once queue advancement and iframe acknowledgement');
})().catch(error=>{console.error(error);process.exitCode=1;});
