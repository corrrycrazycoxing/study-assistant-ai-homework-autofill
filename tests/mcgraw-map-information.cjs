const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
function block(from,to){const a=source.indexOf(from),b=source.indexOf(to,a);assert(a>=0&&b>a);return source.slice(a,b);}

// Classify using the production field scanner, including sibling answer widgets.
function classify({text='Chapter 6 Framework Video',video=true,controls=[],check=false}={}){
  const scope={};
  const context={questionScope:()=>scope,problemText:()=>text,
    all:selector=>selector==='.button--check-my-work'?(check?[{}]:[]):selector==='input,textarea,select'?controls.filter(e=>['INPUT','TEXTAREA','SELECT'].includes(e.tagName)):selector.startsWith('input,textarea,select,')?controls:[],
    visible:e=>!e.hidden,inputVisible:e=>!e.media&&!e.hidden,mediaControl:e=>!!e.media,enabled:()=>true,
    StudyMedia:{videos:()=>video?[{}]:[]},S:{text:x=>String(x||'')},
    StudyConfig:{assignLabels(){}},StudySecurity:{snapshot:()=>({})},window:{top:null},
  };
  vm.createContext(context);
  vm.runInContext(block('  function informationPage(','  async function snapshot('),context);
  return ()=>context.ordinarySnapshot({key:'intro',question:text});
}
assert.equal(classify()().type,'information','observed field-free framework video can be traversed');
assert.equal(classify({video:false,text:'Instructions: the following information applies to the questions below.'})().type,'information');
assert.throws(classify({text:'Knowledge Check 01: Which value is required?'}),/No supported editable fields/,'an unanswered question is not classified as information');
assert.throws(classify({check:true}),/No supported editable fields/,'a loading or unsupported assessed question is not skipped');
assert.throws(classify({text:'Unrecognized empty page',video:false}),/No supported editable fields/);
const custom={tagName:'DIV',type:null,matches:()=>false};
assert.throws(classify({controls:[custom]}),/No supported editable fields/,'custom answer widgets block information traversal');
const mediaInput={media:true,tagName:'INPUT',type:'range'};
assert.equal(classify({controls:[mediaInput]})().type,'information','video volume controls are excluded from answer fields');

const askCode=block('  async function ask(){','  function validateNative(');
const advanceCode=block('  async function advanceQuestion(','  async function resume(');
function information(id,progress){return {key:id,text:'Information '+id,type:'information',progress,fields:[],root:{id},inputs:[]};}
function question(id,progress){return {key:id,text:'Question '+id,type:'native',progress,fields:[{id:'f0'}],securitySnapshot:{snapshotHash:id},root:{id},inputs:[{id:id+'-field'}]};}
async function flow(pages,{stall=false,cancel=false}={}){
  let index=0,clicks=0,polls=0;
  const messages=[],statuses=[],stops=[];
  const context={busy:false,request:null,result:null,run:{runId:'run-1'},epoch:1,count:0,completed:new Set(),informationVisited:new Set(),paused:null,
    controls(){},prefs:async()=>{},settings:{includePictures:false},status:text=>statuses.push(text),
    root:()=>pages[index].root,questionScope:()=>pages[index].root,problemText:()=>pages[index].text,key:()=>pages[index].key,
    snapshot:async()=>({...pages[index]}),guard:(snap,token)=>{if(token!==context.epoch||snap.key!==pages[index].key)throw Error('changed');},
    S:{text:value=>String(value||'')},$:()=>({textContent:pages[index].progress}),
    visible:e=>!e.hidden,enabled:e=>!e.disabled,inputVisible:()=>true,
    all:selector=>selector==='.footer__link--next'?[{hidden:true,click(){throw Error('hidden Next clicked');}},{click(){clicks++;if(!stall)index=(index+1)%pages.length;}}]:pages[index].inputs,
    message:async(type,data)=>{messages.push({type,data});return {received:true};},
    crypto:{randomUUID:()=> 'request-1'},prompt:()=> 'answerable question',StudyMedia:{graphics:()=>[],videos:()=>[]},
    current:()=>true,
    until:async(fn,message)=>{for(let i=0;i<8;i++){polls++;if(cancel&&clicks)context.epoch++;const value=fn();if(value)return value;}throw Error(message);},
    stop:async text=>{stops.push(text);context.epoch++;context.run=null;context.busy=false;},
  };
  vm.createContext(context);vm.runInContext(advanceCode+askCode,context);
  await context.ask();return {context,index,clicks,polls,messages,statuses,stops};
}
(async()=>{
  const run=await flow([information('video','Question 1 of 3'),information('instructions','Question 2 of 3'),question('answer','Question 3 of 3')]);
  assert.equal(run.clicks,2,'Start Auto crosses consecutive information pages');
  assert.equal(run.messages.filter(m=>m.type==='Question').length,1,'information pages never send an empty AI request');
  assert.equal(run.context.request.key,'answer','Auto reaches and requests the supported question');
  assert.equal(run.context.count,0,'information is not counted as an answered/graded question');
  assert(!run.messages.some(m=>m.data?.phase==='grade'),'information pages are never checked or graded');
  assert(run.polls>=6,'new pages must settle before another snapshot is taken');
  const last=await flow([information('last','Question 11 of 11')]);
  assert.equal(last.clicks,0);assert.match(last.stops[0],/last information page/);
  const linked=await flow([information('group','Question 1 linked to 2 3 up to 11 of 11 Total'),question('part2','Question 2 of 11')]);
  assert.equal(linked.clicks,1,'linked-group range is not mistaken for the final current question');
  const loop=await flow([information('again','Question 1 of 2'),information('other','Question 1 of 2')]);
  assert.match(loop.stops[0],/same information page again/);assert.equal(loop.clicks,2,'navigation cycles stop');
  const stalled=await flow([information('stalled','Question 1 of 2')],{stall:true});
  assert.match(stalled.stops[0],/did not finish loading/);assert.equal(stalled.clicks,1,'a failed Next is not replayed');
  const cancelled=await flow([information('start','Question 1 of 2'),question('next','Question 2 of 2')],{cancel:true});
  assert.equal(cancelled.messages.filter(m=>m.type==='Question').length,0,'Stop during navigation prevents the next AI request');
  const manual=await flow([information('manual','Question 1 of 1')]);
  manual.context.run=null;manual.context.epoch++;manual.context.busy=false;manual.context.stops=[];
  await manual.context.ask();assert.match(manual.statuses.at(-1),/Start Auto continues/,'Ask AI on information gives instructions without navigating');
  console.log('PASS Connect Auto information-page traversal, guards, cycles, linked progress and cancellation');
})().catch(error=>{console.error(error);process.exitCode=1;});
