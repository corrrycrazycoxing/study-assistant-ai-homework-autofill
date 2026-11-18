const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const origin='https://demo.instructure.com';
async function fixture({foreignNext=false,hold=false}={}){
 const local={},session={},requests=[],sent=[],updates=[];let release;
 const area=data=>({get:async()=>structuredClone(data),set:async value=>Object.assign(data,structuredClone(value))});
 const ctx={URL,Date,AbortController,AbortSignal,crypto:require('node:crypto').webcrypto,config:async()=>({platformMode:'canvas',featureSettings:{platforms:{mcgraw:false}}}),panelSender:()=>true,chrome:{runtime:{id:'ext'},permissions:{contains:async()=>true},storage:{local:area(local),session:area(session)},tabs:{query:async()=>[],get:async()=>({url:origin+'/dashboard'}),sendMessage:async(...args)=>sent.push(args),update:async(...args)=>updates.push(args),create:()=>{throw Error('metadata scans must not open tabs');}}},fetch:async(url,options)=>{
   requests.push({url,...options});assert.equal(options.method,'GET');assert.equal(options.credentials,'include');assert.equal(options.redirect,'error');
   if(hold)await new Promise((resolve,reject)=>{release=resolve;options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});
   const u=new URL(url);let data=[],link='';
   if(u.pathname==='/api/v1/courses'&&!u.searchParams.has('page')){data=[{id:1,name:'Accounting',workflow_state:'available'}];link='<'+(foreignNext?'https://evil.test/steal':origin+'/api/v1/courses?page=2')+'>; rel="next"';}
   else if(u.pathname==='/api/v1/courses'){data=[{id:2,name:'Reading',workflow_state:'available'}];}
   else if(u.pathname==='/api/v1/courses/1/assignments')data=[
    {id:10,name:'Week 1 introduction',submission_types:['discussion_topic'],description:'PRIVATE QUESTION MUST NOT BE SAVED'},
    {id:11,name:'Reading',quiz_id:9,submission_types:['online_quiz']},
    {id:12,name:'Upload worksheet',submission_types:['online_upload']},
    {id:13,name:'Framework Video',submission_types:['external_tool'],external_tool_tag_attributes:{url:'https://connect.router.integration.prod.mheducation.com/app/'}},
    {id:14,name:'Essay',submission_types:['online_text_entry']},
    {id:15,name:'Unknown',submission_types:['future_widget']},
    {id:16,name:'Unpublished',published:false,submission_types:['online_quiz']}
   ];
   else if(u.pathname==='/api/v1/courses/2/assignments'){
     assert.deepEqual(u.searchParams.getAll('include[]'),['submission']);
     const due_at=new Date(Date.now()-86400000).toISOString();
     data=[
       {id:21,name:'Art as Activism',quiz_id:51,submission_types:['online_quiz'],due_at,submission:{missing:true,workflow_state:'graded',score:0,body:'PRIVATE SUBMISSION MUST NOT BE SAVED'}},
       {id:22,name:'Imagining Otherwise',quiz_id:52,submission_types:['online_quiz'],due_at,submission:{missing:true,workflow_state:'unsubmitted'}},
       {id:23,name:'Completed reading',quiz_id:53,submission_types:['online_quiz'],due_at,submission:{missing:true,workflow_state:'graded',submitted_at:due_at}},
       {id:24,name:'Writing Assignment',submission_types:['online_text_entry'],due_at,submission:{missing:true,workflow_state:'unsubmitted'}},
       {id:25,name:'Locked reading',quiz_id:55,submission_types:['online_quiz'],due_at,locked_for_user:true,submission:{missing:true,workflow_state:'unsubmitted'}}
     ];
   }
   return {ok:true,url,status:200,headers:{get:name=>name==='link'?link:name==='content-type'?'application/json':''},text:async()=>JSON.stringify(data)};
 }};
 vm.createContext(ctx);for(const file of ['shared/config.js','shared/canvas-mcgraw-course.js','background/canvas-catalog.js','background/canvas-mcgraw-course.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 const sender={id:'ext',tab:{id:1},frameId:0,url:origin+'/dashboard'},api=ctx.StudyCanvasCatalog;
 const send=(type,extra={})=>api.handle({type,...extra},sender);
 const finish=async()=>{for(let i=0;i<100;i++){await new Promise(setImmediate);if(local.canvasCatalogs?.[origin]?.phase!=='scanning')return;}throw Error('scan did not finish');};
 return {ctx,local,session,requests,sent,updates,sender,send,finish,release:()=>release?.()};
}
(async()=>{
 const f=await fixture();await f.send('canvasCatalogScan');await f.finish();const data=await f.send('canvasCatalogGet');
 assert.equal(data.catalog.phase,'ready');assert.equal(data.catalog.courses.length,2);assert.equal(data.catalog.processed,2);assert.equal(f.requests.length,4);
 assert(f.requests.every(r=>new URL(r.url).origin===origin&&new URL(r.url).pathname.startsWith('/api/v1/')));
 assert.equal(f.sent.length,0);assert.equal(f.updates.length,0,'background scanning never navigates the active tab');
 const accounting=data.catalog.courses[0];assert.deepEqual(Array.from(accounting.items,item=>item.type),['discussion','quiz','upload','homework','written','unknown']);
 assert(!JSON.stringify(f.local).includes('PRIVATE QUESTION'));assert.equal(accounting.items[1].url,origin+'/courses/1/quizzes/9');
 const count=f.requests.length;await f.send('canvasCatalogGet',{refreshIfStale:true});assert.equal(f.requests.length,count,'fresh inventory is reused');
 await f.send('canvasCatalogPolicy',{courseId:1,enabled:true,assignmentTypes:{homework:false,quiz:true}});
 assert.equal(f.local.canvasCoursePolicies[origin][origin+'/courses/1'].types.quiz,true);assert.deepEqual(f.local.canvasCourseSelections[origin],[origin+'/courses/1']);
 await assert.rejects(f.send('canvasCatalogPolicy',{origin:'https://evil.test',courseId:1,enabled:true,assignmentTypes:{homework:true,quiz:true}}),/site changed/);
 await assert.rejects(f.send('canvasCatalogPolicy',{courseId:1,enabled:true,assignmentTypes:{discussion:true}}),/Invalid assignment/);
 await assert.rejects(f.ctx.StudyCanvasCatalog.handle({type:'canvasCatalogScan'},{...f.sender,id:'foreign'}),/Open Canvas/);
 // A quiz-only inventory policy works with McGraw disabled and overrides defaults.
 const C=f.ctx.StudyCanvasMcGrawCourse,course={title:'Accounting',url:origin+'/courses/1'};
 const runSend=(type,extra={},page=origin+'/dashboard')=>f.ctx.canvasMcGrawCourse({type,...extra},{...f.sender,url:page});
 await runSend('canvasCourseStart',{courses:[course],assignmentTypes:{homework:true,quiz:false}});
 assert.equal(f.session.canvasMcGrawCourse.includeCanvasQuizzes,true);assert.equal(f.session.canvasMcGrawCourse.courses.length,1);
 await runSend('canvasCourseScan',{items:[{title:'Week 1 introduction',url:origin+'/courses/1/assignments/10'},{title:'Reading',url:origin+'/courses/1/quizzes/9'},{title:'Framework Video',url:origin+'/courses/1/assignments/13'},{title:'New unknown quiz',url:origin+'/courses/1/quizzes/999'}]},origin+'/courses/1/assignments');
 assert.equal(f.session.canvasMcGrawCourse.items.length,1,'known discussion, homework and newly unknown rows cannot enter a quiz-only queue');
 assert.equal(f.session.canvasMcGrawCourse.items[0].kind,'quiz');
 await runSend('canvasCourseListReady',{},origin+'/courses/1/assignments');
 await f.send('canvasCatalogPolicy',{courseId:1,enabled:false,assignmentTypes:{homework:false,quiz:true}});
 assert.equal(f.session.canvasMcGrawCourse.phase,'attention');assert(f.sent.some(args=>args[1].type==='studyStop'),'disabling a current selection stops it');
 const blockedQuiz=origin+'/courses/1/quizzes/9';
 f.local.canvasCourseIssueBank={[origin]:{[blockedQuiz]:{title:'Reading',url:blockedQuiz,reason:'No reading matches',savedAt:1}},'https://other.example':{keep:{title:'Other site'}}};
 await assert.rejects(f.send('canvasCatalogIssueClear',{url:blockedQuiz,origin:'https://evil.test'}),/site changed/);
 await assert.rejects(f.ctx.StudyCanvasCatalog.handle({type:'canvasCatalogIssueClear',url:blockedQuiz},{...f.sender,id:'foreign'}),/Open Canvas/);
 assert((await f.send('canvasCatalogGet')).issueBank[blockedQuiz]);
 const cleared=await f.send('canvasCatalogIssueClear',{url:blockedQuiz});
 assert.equal(cleared.issueBank[blockedQuiz],undefined);
 assert(f.local.canvasCourseIssueBank['https://other.example'].keep);
 await assert.rejects(f.send('canvasCatalogIssueClear',{url:blockedQuiz}),/no longer/);
 // The sanitizer is deliberately conservative with ambiguous metadata.
 assert.equal(C.catalog([{title:'Quiz upload',url:origin+'/courses/1/assignments/12',kind:'upload'}],origin+'/courses/1/assignments')[0].type,'upload');
 // The background inventory can finish after Course Auto starts scanning.
 const reading=data.catalog.courses[1],readingList=reading.url+'/assignments';
 const [art,imagining,completed,writing,locked]=reading.items;
 assert(art.missing&&!art.scored,'an automatic missing zero does not establish submission');
 assert(completed.scored&&!completed.missing,'a recorded submission beats a stale missing flag');
 assert(!locked.missing);assert(!JSON.stringify(f.local).includes('PRIVATE SUBMISSION'));
 f.session.canvasMcGrawCourse.phase='done';
 f.local.canvasCatalogs[origin].courses[1]={...reading,items:[],scannedAt:null};
 await runSend('canvasCourseStart',{courses:[reading],onlyPastDue:true,assignmentTypes:{homework:false,quiz:true}});
 f.local.canvasCatalogs[origin].courses[1]=reading;
 const listRows=[{title:art.title,url:art.assignmentUrl,scored:true,dueAt:Date.now()+3600000},{title:writing.title,url:writing.assignmentUrl},{title:completed.title,url:completed.assignmentUrl}];
 await runSend('canvasCourseScan',{items:listRows},readingList);
 assert.deepEqual(Array.from(f.session.canvasMcGrawCourse.items,item=>item.url),[art.url,imagining.url],
   'live metadata supplies due dates, distinguishing missing zeros, unrendered quizzes, writing and completed work');
 f.session.canvasMcGrawCourse.phase='done';
 f.local.canvasCourseIssueBank[origin]={[imagining.assignmentUrl]:{title:imagining.title,url:imagining.assignmentUrl,reason:'Source unavailable'}};
 const resumed=await runSend('canvasCourseStart',{items:listRows,onlyPastDue:true,retrySavedIssues:true,assignmentTypes:{homework:false,quiz:true}},readingList);
 assert.deepEqual(Array.from(resumed.run.items,item=>item.url),[imagining.url],'single-course retry connects the saved assignment alias to the missing quiz');
 assert.equal(C.emptyQueueReason(reading.items,readingList,{homework:true,quiz:false},{},null),'Canvas quizzes are off for this course. Enable Canvas quiz in the course inventory.');
 const bad=await fixture({foreignNext:true});await bad.send('canvasCatalogScan');await bad.finish();assert.equal(bad.local.canvasCatalogs[origin].phase,'error');assert(!bad.requests.some(r=>r.url.includes('evil.test')));
 const stopped=await fixture({hold:true});await stopped.send('canvasCatalogScan');await new Promise(setImmediate);await stopped.send('canvasCatalogStop');await stopped.finish();assert.equal(stopped.local.canvasCatalogs[origin].phase,'cancelled');assert.equal(stopped.updates.length,0);
 console.log('PASS background Canvas metadata pagination, GET-only scans, no tab navigation, cached per-course types, policy filtering, unknown/discussion protection, cancellation and origin guards');
})().catch(error=>{console.error(error);process.exitCode=1;});
