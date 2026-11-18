const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const local={},session={},updates=[],listeners=[],now=2000000000000;
const area=data=>({get:async()=>structuredClone(data),set:async values=>{Object.assign(data,structuredClone(values));if(data===local)for(const listener of listeners)listener(Object.fromEntries(Object.entries(values).map(([key,newValue])=>[key,{newValue}])),'local');}});
const ctx={URL,Date:class extends Date{static now(){return now;}},StudyBuild:{id:'test'},config:async()=>({}),chrome:{runtime:{id:'ext'},storage:{session:area(session),local:area(local),onChanged:{addListener:fn=>listeners.push(fn)}},tabs:{query:async()=>[],update:async(id,data)=>updates.push({id,...data}),sendMessage:async()=>({received:true})}}};
vm.createContext(ctx);for(const path of ['shared/config.js','shared/canvas-mcgraw-course.js','shared/canvas-quiz.js','shared/course-ui.js','background/canvas-quiz-course.js','background/canvas-mcgraw-course.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx);ctx.StudyConfig.detect=()=> 'canvas';
const C=ctx.StudyCanvasMcGrawCourse,origin='https://canvas.example.edu',course=origin+'/courses/1',list=course+'/assignments';
const sender=url=>({id:'ext',frameId:0,tab:{id:1},documentId:'page',url});
const send=(type,values={},url=list)=>ctx.canvasMcGrawCourse({type,...values},sender(url));
const items=[{title:'Past homework',url:list+'/1',dueAt:now-1000},{title:'Future homework',url:list+'/2',dueAt:now+100000},{title:'Undated homework',url:list+'/3',dueAt:null}];
const input=checked=>({checked,addEventListener(name,callback){this.change=callback;}});
(async()=>{
 for(const [policy,expected] of [[{onlyPastDue:true},[true,false,false]],[{skipPastDue:true},[false,true,true]],[{},[true,true,true]],[{onlyPastDue:true,skipPastDue:true},[true,false,false]]])assert.deepEqual(items.map(i=>C.dateAllowed(i.dueAt,policy,now)),expected);
 const pageSkip=input(true),pageOnly=input(false),panelSkip=input(true),panelOnly=input(false);
 ctx.StudyCourseUI.dateSelection(pageSkip,pageOnly);ctx.StudyCourseUI.dateSelection(panelSkip,panelOnly);await Promise.resolve();await Promise.resolve();
 pageOnly.checked=true;pageOnly.change();assert(!pageSkip.checked);assert(panelOnly.checked&&!panelSkip.checked,'page and side panel share an exclusive selection');
 panelSkip.checked=true;panelSkip.change();assert(pageSkip.checked&&!pageOnly.checked);panelSkip.checked=false;panelSkip.change();assert(!pageSkip.checked&&!pageOnly.checked,'both off means all dates');
 pageOnly.checked=true;pageOnly.change();const laterSkip=input(true),laterOnly=input(false);ctx.StudyCourseUI.dateSelection(laterSkip,laterOnly);await Promise.resolve();await Promise.resolve();assert(laterOnly.checked&&!laterSkip.checked,'a later visit restores past-due only');
 let r=await send('canvasCourseStart',{items,onlyPastDue:true,skipPastDue:true});assert.equal(r.run.items.length,1);assert.equal(r.run.items[0].title,'Past homework');assert(r.run.onlyPastDue&&!r.run.skipPastDue);
 await send('canvasCourseListReady');r=await send('canvasCourseDetail',{title:'Past homework',canvasStatus:'unfinished',dueAt:now+100000},list+'/1');assert(r.skipped);assert.equal(r.run.phase,'returning','rescheduled future homework is rejected before provider launch');
 session.canvasMcGrawCourse.phase='done';r=await send('canvasCourseStart',{courses:[{title:'Course',url:course}],onlyPastDue:true},origin+'/');await send('canvasCourseScan',{items});assert.equal(session.canvasMcGrawCourse.items.length,1,'multi-course scan applies the same filter');
 session.canvasMcGrawCourse.phase='done';r=await send('canvasCourseStart',{items,skipPastDue:false});assert.equal(r.run.items.length,3,'all dates remains available');
 session.canvasMcGrawCourse.phase='done';r=await send('canvasCourseStart',{items,skipPastDue:true});assert.equal(r.run.items.length,2,'existing skip-past-due behavior stays compatible');
 session.canvasMcGrawCourse.phase='done';await assert.rejects(send('canvasCourseStart',{items:items.slice(1),onlyPastDue:true}),/No eligible assignments/);
 const quiz=course+'/quizzes/8';r=await send('canvasCourseStart',{items:[{title:'Assigned reading',url:quiz,kind:'quiz',dueAt:now-1000}],onlyPastDue:true,assignmentTypes:{homework:false,quiz:true}});await send('canvasCourseListReady');r=await send('canvasCourseQuizOverview',{title:'Assigned reading',dueAt:now+100000},quiz);assert(r.skipped);assert.equal(r.run,undefined);assert.equal(session.canvasMcGrawCourse.phase,'returning');assert.equal(updates.at(-1).url,list,'rescheduled quiz returns to the list before starting its timer');
 session.canvasMcGrawCourse.phase='done';
 local.canvasCourseIssueBank={[origin]:{
  [quiz]:{title:'Assigned reading',url:quiz,reason:'Import failed',savedAt:now-20},
  [quiz+'9']:{title:'Future reading',url:quiz+'9',reason:'Import failed',savedAt:now-20}
 }};
 const retryRows=[{title:'Assigned reading',url:quiz,kind:'quiz',dueAt:now-1000},{title:'Future reading',url:quiz+'9',kind:'quiz',dueAt:now+1000},{title:'Unfailed reading',url:quiz+'7',kind:'quiz',dueAt:now-1000},{...items[0]}];
 const retryOptions={retrySavedIssues:true,onlyPastDue:true,assignmentTypes:{homework:false,quiz:true}};
 await assert.rejects(send('canvasCourseStart',{...retryOptions,items:retryRows.slice(1)}),/saved issues match these filters/);
 await send('canvasCourseStart',{...retryOptions,courses:[{title:'Course',url:course}]},origin+'/');
 r=await send('canvasCourseScan',{items:retryRows});assert.deepEqual(Array.from(r.run.items,item=>item.url),[quiz],'multi-course retry respects dates and stays limited to saved issues');
 assert(local.canvasCourseIssueBank[origin][quiz+'9'],'filtered-out issue is preserved');
 for(const file of ['content-scripts/canvas-mcgraw-course.js','sidepanel/panel.html','sidepanel/panel.js'])assert.match(fs.readFileSync(file,'utf8'),/only-past-due|only-overdue/);
 assert.match(fs.readFileSync('sidepanel/panel.js','utf8'),/onlyPastDue:/);
 console.log('PASS past-due-only/all/upcoming compatibility, exclusive persisted shared controls, single/multi-course queue filtering, unknown dates and launch-time homework/quiz rechecks');
})().catch(error=>{console.error(error);process.exitCode=1;});
