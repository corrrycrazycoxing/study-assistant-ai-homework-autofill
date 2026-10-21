const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const start=source.indexOf('  let courseChecked=false,'),end=source.indexOf('  globalThis.StudyMonitor?.setRecovery(',start);
const code=source.slice(start,end);
async function scenario({mounted=true,ready=true,oldRun=false,start=true,guided=false,heading=true,transient=false,retryForever=false}={}){
  const events=[],observers=[],timers=new Map();let actualStarts=0,oldStopped=false,readyRequests=0,timerId=0;
  const scope={panel:{isConnected:mounted},running:false,courseRun:false,originalPause:null,coursePaceOriginal:null,courseContext:null,coursePanel:{show:()=>{}},settingsReady:Promise.resolve(),settings:{pacingMode:guided?'review':'normal',pauseBeforeSubmit:true},
    document:{documentElement:{},querySelectorAll:()=>ready?[{textContent:'Current question',getClientRects:()=>[{}]}]:[],querySelector:()=>ready&&heading?{textContent:'Question 1'}:null},
    setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
    clean:s=>String(s||'').trim(),say:text=>events.push(text),mount:()=>{},MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}},StudyMonitor:{notice:()=>{}},
    chrome:{runtime:{sendMessage:async message=>{
      events.push(message.type);
      if(message.type==='pearsonRunState'){await Promise.resolve();return {running:oldRun,runId:'old'};}
      if(message.type==='pearsonRunStop'){oldStopped=true;return {received:true};}
      if(message.type==='pearsonCoursePlayerReady'){if(oldRun)assert(oldStopped,'old run cleanup must finish before course claims the player');readyRequests++;if(retryForever||transient&&readyRequests===1)return {retry:true,error:'Waiting for assignment identity.'};return {start,skipReviewPause:true};}
      return {received:true};
    }}},
    startAuto:async()=>{actualStarts++;assert(events.includes('pearsonCoursePlayerReady'));assert(!oldRun||oldStopped);scope.running=true;},
  };
  vm.createContext(scope);vm.runInContext(code,scope);
  // Drain queued startup operations, then simulate redundant DOM changes.
  for(let i=0;i<12;i++)await Promise.resolve();
  for(const observer of observers)observer();
  for(let i=0;i<12;i++)await Promise.resolve();
  const tick=async()=>{const next=timers.entries().next().value;if(next){timers.delete(next[0]);next[1]();}for(let i=0;i<20;i++)await Promise.resolve();};
  return {scope,events,get actualStarts(){return actualStarts;},observers,timers,tick};
}
(async()=>{
  const wrapper=await scenario({mounted:false});assert.deepEqual(wrapper.events,[],'outer wrapper frames never stop/adopt a child question run');assert.equal(wrapper.actualStarts,0);
  const loading=await scenario({ready:false});assert.deepEqual(loading.events,[],'empty content does not consume the one course handoff');
  loading.scope.document.querySelectorAll=()=>[{textContent:'Loaded question',getClientRects:()=>[{}]}];loading.scope.document.querySelector=()=>({textContent:'Question 1'});
  await loading.tick();assert.equal(loading.scope.running,true,'rendered question starts even when visibility changes without a child-list mutation');
  const noHeading=await scenario({heading:false});assert.equal(noHeading.actualStarts,1,'a missing decorative question heading cannot block a verified course handoff');
  const direct=await scenario();assert.equal(direct.actualStarts,1);assert.equal(direct.scope.courseRun,true);assert.equal(direct.scope.settings.pauseBeforeSubmit,false);
  const recovered=await scenario({oldRun:true});assert.equal(recovered.actualStarts,1);assert(recovered.events.indexOf('pearsonRunStop')<recovered.events.indexOf('pearsonCoursePlayerReady'));
  const unrelated=await scenario({start:false});assert.equal(unrelated.actualStarts,0);
  const transient=await scenario({transient:true});assert.equal(transient.actualStarts,0);assert.equal(transient.timers.size,1);await transient.tick();assert.equal(transient.actualStarts,1,'a temporary handoff rejection is retried once identity is ready');assert.equal(transient.timers.size,0);
  const bounded=await scenario({retryForever:true});for(let i=0;i<70;i++)await bounded.tick();assert.equal(bounded.actualStarts,0);assert.equal(bounded.timers.size,0);assert(bounded.events.some(text=>text.startsWith('Course Auto could not connect:')),'a failed handoff has a visible bounded failure');
  const guided=await scenario({guided:true});assert.equal(guided.actualStarts,0);assert(guided.events.includes('pearsonCoursePlayerBlocked'));
  console.log('PASS Pearson course player startup, wrapper isolation, delayed render, old-run ordering and exactly-once Auto');
})().catch(error=>{console.error(error);process.exitCode=1;});
