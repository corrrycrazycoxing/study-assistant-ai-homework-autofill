const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const stored={},tabs=new Map(),created=[],updates=[],messages=[],focus=[];let nextId=20,clock=1000;
class Clock extends Date{static now(){return clock;}}
const storage={get:async key=>({[key]:stored[key]}),set:async values=>Object.assign(stored,values),remove:async key=>{delete stored[key];}};
const chrome={storage:{local:storage,session:storage},tabs:{query:async()=>[...tabs.values()],create:async options=>{const tab={id:nextId++,windowId:7,status:'loading',...options};tabs.set(tab.id,tab);created.push(tab);return tab;},get:async id=>{if(!tabs.has(id))throw Error('Closed');return tabs.get(id);},update:async(id,options)=>{updates.push({id,...options});return {id,windowId:7};},sendMessage:async(tab,message,options)=>{messages.push({tab,message,options});return {received:true,saveClicked:message.type==='pearsonCourseSave'};}},windows:{update:async(id,options)=>focus.push({id,...options})}};
const scope={chrome,URL,Date:Clock,crypto:require('node:crypto').webcrypto};vm.createContext(scope);vm.runInContext(fs.readFileSync('background/pearson-course.js','utf8'),scope);
const list={url:'https://mylab.pearson.com/Student/DoAssignments.aspx?courseId=7',tab:{id:10},frameId:2};
const overview={...list,url:'https://mylab.pearson.com/Student/OverviewHomework.aspx?homeworkId=123'};
const call=(type,extra={},sender=overview)=>scope.pearsonCourseMessage({type,...extra},sender);
const start=()=>call('pearsonCourseStart',{assignments:[{title:'Lesson Section 8.3 Paired Tests',key:'javascript:doHomework(123, false, true)'}]},list);
const data={notStarted:true,score:0,mediaPending:true,pendingMediaIds:['1','2'],questionsPending:true,pendingQuestionIds:['3'],questionRoutes:[{number:'1',id:'3'}]};
(async()=>{
 await start();assert.equal((await call('pearsonCourseOverview',data)).action,'media');
 assert.equal((await call('pearsonCourseOpenMedia',{mediaId:'9'})).received,false);
 assert.equal((await call('pearsonCourseOpenMedia',{mediaId:'1'},{...overview,frameId:9})).received,false);
 const first=await call('pearsonCourseOpenMedia',{mediaId:'1'});assert.equal(created.length,1);
 const destination=new URL(created[0].url);assert.equal(destination.pathname,'/Student/MediaPopup.aspx');assert.equal(destination.searchParams.get('assignmentId'),'123');assert.equal(destination.searchParams.get('loc'),'1');assert.equal(destination.searchParams.get('OnOpenerViewed'),'doMedia_onViewed');assert.equal(created[0].openerTabId,10);
 assert.equal((await call('pearsonCourseOpenMedia',{mediaId:'1'})).token,first.token);assert.equal(created.length,1,'duplicate opening messages cannot create duplicate media tabs');
 assert.equal((await call('pearsonCourseOverview',data)).action,'media-wait');
 assert.equal((await call('pearsonCourseMediaReturn',{token:first.token})).waiting,true);assert.equal(updates.length,0,'loading video waits before returning');
 assert.equal((await call('pearsonCourseMediaReturn',{token:'wrong'})).received,false);assert.equal(updates.length,0);
 created[0].status='complete';assert.equal((await call('pearsonCourseMediaReturn',{token:first.token})).waiting,false);assert.equal(updates.at(-1).id,10);assert.equal(updates.at(-1).active,true);assert.equal(focus.at(-1).id,7);assert(tabs.has(created[0].id),'the video tab is left open');
 assert.equal((await call('pearsonCourseMediaReturn',{token:first.token})).received,false,'a stale return cannot steal focus again');
 const secondState=await call('pearsonCourseOverview',{...data,notStarted:false,score:20});assert.equal(secondState.action,'media');assert.equal(secondState.mediaId,'2','opening video 1 does not lose the verified assignment permission');
 const second=await call('pearsonCourseOpenMedia',{mediaId:'2'});created[1].status='complete';await call('pearsonCourseMediaReturn',{token:second.token});
 const questions=await call('pearsonCourseOverview',{...data,notStarted:false,score:40,mediaPending:false,pendingMediaIds:[]});assert.equal(questions.action,'question');assert.equal(stored.pearsonCourse.pendingMediaAssignments.length,0,'only Pearson’s refreshed media score clears the pending report');
 await call('pearsonCourseOpenQuestion',{questionId:'3'});const player=created.at(-1);assert.equal(player.active,true);assert.match(player.url,/PlayerHomework/);
 const ready=await call('pearsonCoursePlayerReady',{}, {url:'https://tdx.acs.pearson.com/Player/Player.aspx',tab:player,frameId:8,documentId:'doc'});assert.equal(ready.start,true,'after returning, the actual question player receives Auto authorization');
 await call('pearsonCourseStop',{},list);
 // Existing exact media tabs are reused; Stop leaves them open and cannot return focus.
 await start();await call('pearsonCourseOverview',data);const reused=await call('pearsonCourseOpenMedia',{mediaId:'1'});assert.equal(created.length,3);await call('pearsonCourseStop',{},list);const updateCount=updates.length;assert.equal((await call('pearsonCourseMediaReturn',{token:reused.token})).received,false);assert.equal(updates.length,updateCount);assert(tabs.has(created[0].id));
 // Loading/failed embeds are bounded and still leave the tab available to review.
 await start();await call('pearsonCourseOverview',{...data,pendingMediaIds:['4']});const slow=await call('pearsonCourseOpenMedia',{mediaId:'4'});clock+=12001;assert.equal((await call('pearsonCourseMediaReturn',{token:slow.token})).waiting,false);assert(tabs.has(created.at(-1).id));
 const locked=await call('pearsonCourseOverview',{...data,pendingMediaIds:['4'],questionsLocked:true,pendingQuestionIds:[],questionRoutes:[]});assert.equal(locked.action,'done');assert.match(locked.skippedAssignments[0].reason,/not unlocked/);assert.equal(stored.pearsonCourseBank,undefined,'locked questions cannot become a completed scan');
 assert(!messages.some(item=>/submit/i.test(item.message.type)),'opening links never submits an assignment');

 const ui=fs.readFileSync('content-scripts/pearson-course.js','utf8');
 const helper=ui.slice(ui.indexOf('  async function returnAfterMedia('),ui.indexOf('  let overviewReadAttempts='));
 let calls=0,reloads=0;const statuses=[];
 const client={launchGeneration:0,send:async()=>({received:true,waiting:++calls===1}),status:text=>statuses.push(text),location:{reload:()=>reloads++},setTimeout:fn=>{fn();}};
 vm.createContext(client);vm.runInContext(helper,client);await client.returnAfterMedia({token:'t'});assert.equal(calls,2);assert.equal(reloads,1);assert.match(statuses.at(-1),/checking unlocked questions/);
 calls=0;client.send=async()=>{client.launchGeneration++;return {received:true,waiting:true};};await client.returnAfterMedia({token:'t'});assert.equal(reloads,1,'Stop during media wait prevents reload');
 client.send=async()=>{client.launchGeneration++;return {received:true,waiting:false};};await client.returnAfterMedia({token:'t'});assert.equal(reloads,1,'Stop arriving while the return response is in flight also prevents reload');
 client.send=async()=>({received:false});await client.returnAfterMedia({token:'stale'});assert.equal(reloads,1);
 const zeroHelper=ui.slice(ui.indexOf('  function unstartedWork('),ui.indexOf('  let host,'));
 const zero={scored:()=>({earned:0})};vm.createContext(zero);vm.runInContext(zeroHelper,zero);const counts=['Scored Media: 0','Correct: 0','Partial Credit: 0','Incorrect: 0'];assert.equal(zero.unstartedWork('0% (0 points out of 12)',counts,[],[{}]),true,'zero-score lessons can open media before their question links unlock');assert.equal(zero.unstartedWork('0% (0 points out of 12)',counts,[],[]),false);
 console.log('PASS Pearson media tabs, bounded wait, exact-owner return, unlocked-question Auto handoff, pending review, reuse and Stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
