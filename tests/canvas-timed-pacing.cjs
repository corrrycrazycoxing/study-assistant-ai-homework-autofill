const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const quizSource=fs.readFileSync('shared/canvas-quiz.js','utf8');
let now=100000;
const scope={Date:class extends Date{static now(){return now;}}};
vm.runInNewContext(quizSource,scope);
const Q=scope.StudyCanvasQuiz;
assert.equal(Q.duration('4 Minutes, 18 Seconds'),258);
assert.equal(Q.duration('1 Hour, 2 Minutes, 3 Seconds'),3723);
assert.equal(Q.duration('09:59'),599);
assert.equal(Q.duration('00:09:59'),599);
assert.equal(Q.duration('0 Minutes, 0 Seconds'),0);
for(const text of ['Time Elapsed: 4 Minutes','Your browser may allow 5 minutes beyond the limit','No Time Limit','-1 Minutes'])assert.equal(Q.duration(text),null);
const nodes={};
const doc={querySelector:selector=>nodes[selector]||null};
nodes['#quiz_student_details']={textContent:'Questions 10 Time Limit 10 Minutes'};
assert.equal(Q.timeLimit(doc),600);
nodes['#quiz-time-elapsed .time_header']={textContent:'Time Running:'};
nodes['#quiz-time-elapsed .time_running']={textContent:'10 Minutes, 0 Seconds'};
const clock=Q.clock(doc);
assert.equal(clock.read().remainingMs,600000);
now+=5000;
assert.equal(clock.read().remainingMs,595000,'a frozen or hidden native display cannot reset the deadline');
nodes['#quiz-time-elapsed .time_running'].textContent='9 Minutes, 54 Seconds';
assert.equal(clock.read().remainingMs,594000);
nodes['.end_at']={textContent:new Date(now+590000).toISOString()};
assert.equal(clock.read().remainingMs,590000,'an earlier native end time bounds the display');
nodes['.end_at_without_time_limit']={textContent:new Date(now+400000).toISOString()};
assert.equal(clock.read().remainingMs,400000);
const untimed=Q.clock({querySelector:selector=>selector.endsWith('.time_header')?{textContent:'Time Elapsed:'}:selector.endsWith('.time_running')?{textContent:'4 Minutes, 18 Seconds'}:null});
assert.equal(untimed.read(),null,'elapsed time cannot become a countdown');
const seeded=Q.clock({querySelector:()=>null});
seeded.seed(600,now-100000);
assert.equal(seeded.read().remainingMs,500000,'launch fallback counts the whole elapsed attempt');
now+=600000;
assert.equal(clock.read().remainingMs,0,'expired deadlines never wrap around');

vm.runInNewContext(fs.readFileSync('shared/pacing.js','utf8'),scope);
const P=scope.StudyPacing;
assert.equal(P.budgetDelay(120000,null),120000);
assert.equal(P.budgetDelay(120000,{remainingMs:600000,remainingFields:10,futureRequests:2,responseMs:20000}),51000);
assert.equal(P.budgetDelay(120000,{remainingMs:29000,remainingFields:1}),0,'reserve removes optional delays');
assert(P.budgetDelay(120000,{remainingMs:600000,remainingFields:10,futureRequests:2,responseMs:90000})<51000,'slower observed AI calls get more headroom');

async function waits(){
 let time=0,sleeps=0;
 const widgets=new Map();
 const body={append(){}};
 const document={body,hidden:false,createElement(){return {hidden:true,isConnected:true,style:{},attachShadow(){this.shadowRoot={set innerHTML(value){},getElementById(id){if(!widgets.has(id))widgets.set(id,{textContent:'',hidden:false});return widgets.get(id);}};return this.shadowRoot;}};}};
 const runtime={document,Date:class extends Date{static now(){return time;}},chrome:{runtime:{async sendMessage({ms}){sleeps++;time+=ms;if(sleeps===20)time+=240000;return {waited:true};}}}};
 vm.runInNewContext(fs.readFileSync('shared/pacing.js','utf8'),runtime);
 const pacer=runtime.StudyPacing.create(()=>({pacingMode:'human'}));
 pacer.begin({estimatedSeconds:600},1,{budget:()=>({remainingMs:300000-time,remainingFields:1,reserveMs:30000})});
 await pacer.beforeField(0,1,()=>true);
 assert(time<=270000,'a delayed tick must shorten the current wait before the review reserve');
 assert(time>240000,'the simulated AI/browser delay occurred');
 let valid=true;
 pacer.begin({estimatedSeconds:60},1,{budget:()=>({remainingMs:60000,remainingFields:1})});
 valid=false;await assert.rejects(pacer.beforeField(0,1,()=>valid),/changed|stopped/);
}
async function tenMinuteAttempt(){
 let elapsed=0,remainingFields=10,batchLeft=0,responseMs=20000;
 const elements=new Map();
 const document={body:{append(){}},hidden:false,createElement(){return {isConnected:true,style:{},attachShadow(){
  this.shadowRoot={set innerHTML(value){},getElementById(id){if(!elements.has(id))elements.set(id,{});return elements.get(id);}};
  return this.shadowRoot;
 }};}};
 const runtime={document,Date:class extends Date{static now(){return elapsed;}},chrome:{runtime:{async sendMessage({ms}){elapsed+=ms;return {waited:true};}}}};
 vm.runInNewContext(fs.readFileSync('shared/pacing.js','utf8'),runtime);
 const pacer=runtime.StudyPacing.create(()=>({pacingMode:'human'}));
 for(const [count,latency] of [[4,20000],[4,35000],[2,50000]]){
  elapsed+=latency;responseMs=latency;batchLeft=count;
  pacer.begin({estimatedSeconds:600,elapsedSeconds:latency/1000},count,{budget:()=>({
   remainingMs:600000-elapsed,remainingFields,reserveMs:30000,
   futureRequests:Math.ceil(Math.max(0,remainingFields-batchLeft)/count),responseMs
  })});
  for(let index=0;index<count;index++){
   await pacer.beforeField(index,count,()=>true);
   elapsed+=1000;remainingFields--;batchLeft--;
  }
  await pacer.afterQuestion(()=>true);
 }
 assert.equal(remainingFields,0);
 assert(elapsed<=570000,'ten questions with lengthy human estimates and three AI calls complete with the review reserve intact');
}
async function scrolling(){
 const source=fs.readFileSync('content-scripts/canvas.js','utf8');
 const start=source.indexOf('  async function fillAnswers(){'),end=source.indexOf('  async function stop(',start);
 const events=[],roots=[{contains:el=>el.question===1},{contains:el=>el.question===2}];
 const fields=[1,1,2].map((question,index)=>({key:'f'+index,el:{question},controls:[{selected:false,getBoundingClientRect:()=>({top:10,bottom:40})}],options:['A'],value:['A']}));
 const pending={id:'request',requestedAt:Date.now(),text:'Synthetic question',fields,signature:'unchanged',root:roots[0],members:roots.map(root=>({root}))};
 const sandbox={Date,Math,window:{innerHeight:800},pending,suggestion:{estimatedSeconds:60},responseMs:20000,
  validate:()=>fields,checkTime:()=>({remainingMs:600000}),remainingFields:()=>fields.length,
  StudyCanvasBatch:{refresh:()=>pending},snapshot(){},StudyConfig:{answerLabel:f=>f.key},
  selected:el=>el.selected,clickChoice:el=>{events.push('enter');el.selected=true;},retained:()=>true,say(){},delay:async()=>{},
  pacer:{begin(){},check(){},scroll:async root=>events.push(root===roots[0]?'question-1':'question-2'),beforeField:async index=>events.push('wait-'+index)}
 };
 vm.runInNewContext(source.slice(start,end)+'\nthis.fillAnswers=fillAnswers;',sandbox);
 await sandbox.fillAnswers();
 assert.deepEqual(events,['question-1','wait-0','enter','wait-1','enter','question-2','wait-2','enter'],'each batched question is scrolled into view before its pacing wait and entry');
}
(async()=>{await waits();await tenMinuteAttempt();await scrolling();console.log('PASS Canvas native countdowns, frozen display, launch fallback, deadline reserve, delayed waits, cancellation and per-question batch scrolling');})().catch(error=>{console.error(error);process.exitCode=1;});
