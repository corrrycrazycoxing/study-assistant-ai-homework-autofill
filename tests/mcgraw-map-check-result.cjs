const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
const start=source.indexOf('  async function checkWork('),end=source.indexOf('\n  async function resume()',start);
assert(start>=0&&end>start);
let resultMode=false,checks=0,returns=0;
const phases=[];
const check={textContent:'Check my work',getAttribute:()=>null,click(){checks++;resultMode=true;}};
const back={textContent:'Return to question',getAttribute:()=>null,click(){returns++;resultMode=false;}};
const context={settings:{},epoch:1,run:{runId:'run-1'},count:0,completed:new Set(),
  location:{href:'https://ezto.mheducation.com/ext/map/index.html#/question-1'},
  prefs:async()=>{},guard(){},root:()=>({}),key:()=>'question-1',status(){},
  S:{text:value=>String(value||'').trim()},
  $:selector=>({textContent:selector==='#question-info-holder'?'Item 1':'Question 1 of 11'}),
  all:selector=>selector==='.button--check-my-work'?[check]:selector==='button'&&resultMode?[back]:[],
  visible:()=>true,enabled:element=>element===check?!resultMode:true,
  message:async(_type,data)=>phases.push(data.phase),
  until:async(fn,message)=>{const value=fn();if(!value)throw Error(message);return value;},
};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
(async()=>{
  const snap={key:'question-1'};
  await context.checkWork(snap,1);
  assert.equal(checks,1,'check work is sent once');
  assert.equal(returns,1,'the full-page result view is closed');
  assert.equal(resultMode,false);
  assert.deepEqual(phases,['grade','advance']);
  assert.equal(snap.key,'question-1');
  console.log('PASS Connect full-page Check my work result returns before advancing');
})().catch(error=>{console.error(error);process.exitCode=1;});
