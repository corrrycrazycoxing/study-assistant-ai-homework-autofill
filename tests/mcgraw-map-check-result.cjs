const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
async function scenario({text='Answer is complete and correct.',frameResult=true,existing=false,missing=false,stop=false,change=false,delay=0,checkMapWork=false,choices=[],disabled=false,enableAfter=Infinity,ready=true,edited=false,type='native',recorded=false,frameMismatch=false,stopAtPoll=Infinity}={}){
 let resultMode=existing,checks=0,returns=0,polls=0,documentVersion=0;const phases=[];
 const summary={textContent:text,visible:true,closest:()=>null},empty={};let resultDoc=frameResult?empty:null;
 const frame=frameResult?{get contentDocument(){return resultDoc;}}:null;
 const check={textContent:'Check my work',getAttribute:()=>null,visible:true,click(){checks++;resultMode=true;documentVersion++;}};
 const back={textContent:'Return to question',getAttribute:()=>null,visible:true,click(){returns++;resultMode=false;}};
 const ctx={settings:{checkMapWork},epoch:1,run:{runId:'run'},count:0,completed:new Set(),
 location:{href:'https://ezto.mheducation.com/ext/map/index.html#/q1'},prefs:async()=>{},guard(){if(ctx.epoch!==1)throw Error('Stopped');},root:()=>({}),key:()=>'q1',status(){},current:()=>true,verifyEntered(){if(edited)throw Error('An answer changed');},
 S:{text:v=>String(v||'').trim()},accountingFrame:()=>frame,questionScope:()=>({}),
 $:(selector,doc)=>selector==='#progress_bar_mgs'?resultMode&&polls>=delay&&doc===resultDoc?summary:null:{textContent:selector==='#question-info-holder'?'Item 1':'Question 1 of 13'},
 all:(selector,scope)=>selector==='.answer__span--mc'&&resultMode?choices:selector==='input[type="radio"]'?scope.inputs:selector==='.button--check-my-work'&&!missing?[check]:selector==='button'&&resultMode?[back]:selector==='.check-my-work-feedback,.feedback,[role="alert"]'&&!frameResult&&resultMode&&polls>=delay?[summary]:[],
 visible:e=>!!e?.visible,enabled:e=>e===check?!resultMode&&(!disabled||polls>=enableAfter):true,
 message:async(_type,data)=>{phases.push(data.phase);if(stop)ctx.epoch++;if(change)ctx.location.href+='changed';},
 until:async(fn,message)=>{for(let i=0;i<8;i++){polls++;if(polls===stopAtPoll)ctx.epoch++;if(frameResult&&resultMode&&polls>=delay)resultDoc={version:documentVersion};const v=fn();if(v)return v;}throw Error(message);}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  function checkResult('),source.indexOf('  async function advanceQuestion(')),ctx);
 const snap={key:'q1',type,recorded,readyToAdvance:ready,...(frameResult?{doc:frameMismatch?{}:resultDoc,frame}: {})};let error;try{await ctx.checkWork(snap,1);}catch(e){error=e;}
 return {checks,returns,phases,error,resultMode,checked:snap.checked};
}
(async()=>{
 for(const options of [{},{frameResult:false},{delay:3},{existing:true}]){const r=await scenario(options);assert.ifError(r.error);assert.equal(r.checks,options.existing?0:1);assert.equal(r.returns,1);assert.equal(r.resultMode,false);assert.equal(r.phases.at(-1),'advance');}
 for(const text of ['Answer is not complete.','Answer is complete but not entirely correct.','Incorrect.','Partial credit.']){const r=await scenario({text});assert.match(r.error.message,/incorrect or incomplete/);assert.equal(r.returns,0);assert(!r.phases.includes('advance'));}
 const unknown=await scenario({text:'Check my work mode. This does not indicate completion.'});assert.match(unknown.error.message,/did not confirm/);assert(!unknown.phases.includes('advance'));
 const choice=(name,checked,classes)=>({visible:true,inputs:[{name,checked}],classList:{contains:name=>classes.includes(name)}});
 const green=await scenario({text:'',frameResult:false,choices:[choice('g',false,[]),choice('g',true,['is-checked','is-correct'])]});assert.ifError(green.error);assert.equal(green.returns,1);
 for(const choices of [
  [choice('g',true,['is-checked']),choice('g',false,['is-correct'])],
  [choice('g',false,['is-checked','is-correct'])],
  [choice('g',true,['is-checked','is-correct']),choice('other',true,['is-checked'])],
  [choice('g',true,['is-checked','is-correct']),choice('g',true,['is-checked','is-correct'])],
  [{...choice('g',true,['is-checked','is-correct']),visible:false}]
 ]){const r=await scenario({text:'',frameResult:false,choices});assert(r.error);assert(!r.phases.includes('advance'));}
 const red=await scenario({text:'',frameResult:false,choices:[choice('g',true,['is-checked','is-incorrect']),choice('g',false,['is-correct'])]});assert.match(red.error.message,/incorrect or incomplete/);
 for(const options of [{missing:true},{disabled:true}]){const absent=await scenario(options);assert.ifError(absent.error);assert.equal(absent.checks,0);assert.equal(absent.checked,false);assert.equal(absent.phases.at(-1),'advance');}
 const recordedJournal=await scenario({missing:true,type:'journal',recorded:true});assert.ifError(recordedJournal.error);assert.equal(recordedJournal.checked,false);
 const unrecordedJournal=await scenario({missing:true,type:'journal'});assert.match(unrecordedJournal.error.message,/not all been recorded/);
 const delayedButton=await scenario({disabled:true,enableAfter:3});assert.ifError(delayedButton.error);assert.equal(delayedButton.checks,1,'a check that becomes available is still used');
 for(const options of [{missing:true,ready:false},{missing:true,edited:true},{disabled:true,edited:true},{missing:true,frameMismatch:true},{disabled:true,stopAtPoll:3},{missing:true,stop:true},{missing:true,change:true}]){const guarded=await scenario(options);assert(guarded.error);assert.equal(guarded.checks,0);}
 const stopped=await scenario({stop:true});assert.match(stopped.error.message,/Stopped/);assert.equal(stopped.checks,0);
 const changed=await scenario({change:true});assert.match(changed.error.message,/changed/);assert(!changed.phases.includes('advance'));
 const resultButton={textContent:'Return to question',getAttribute:()=>null};let snapshots=0,checked=0,advanced=0;
 const recovery={busy:false,request:null,result:null,run:{runId:'r'},epoch:0,count:0,completed:new Set(),controls(){},status(){},prefs:async()=>{},all:()=>[resultButton],visible:()=>true,enabled:()=>true,S:{text:v=>String(v??'')},key:()=> 'q1',guard(){},checkWork:async()=>{checked++;},message:async()=>({received:true}),advanceQuestion:async()=>{advanced++;return false;},snapshot:async()=>{snapshots++;throw Error('disabled result inputs cannot be captured');},stop:async text=>{throw Error(text);}};
 vm.createContext(recovery);vm.runInContext(source.slice(source.indexOf('  async function ask(){'),source.indexOf('  function validateNative(')),recovery);await recovery.ask();
 assert.equal(checked,1);assert.equal(advanced,1);assert.equal(snapshots,0,'Start Auto on a result checks feedback before scanning disabled controls');
 console.log('PASS available Connect check despite legacy toggle, current worksheet/native results, delayed feedback, existing result, incorrect/incomplete/unknown stop, unavailable-check fallback after verified entry, Stop and stale-question guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
