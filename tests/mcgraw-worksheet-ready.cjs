const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
async function scenario({readyAt=400,settleAt=640,readonly=false,stopAt=Infinity,swapAt=Infinity}={}){
 let time=0,valid=true;const frame={isConnected:true},sheet={visible:true},doc={readyState:'loading',body:{classList:{contains:()=>!readonly&&time>=readyAt}}};frame.contentDocument=doc;
 const cell={id:'cell',className:'responseCell isN',getAttribute:()=>null,get textContent(){return time<settleAt?'loading':'ready';}};
 const ctx={Date:{now:()=>time},status(){},guard(){if(!valid)throw Error('Stopped');},accountingFrame:()=>time>=swapAt?{}:frame,
 $:()=>sheet,all:selector=>selector.startsWith('.edit_div')?[]:[cell],visible:e=>!!e?.visible,enabled:()=>true,S:{text:v=>v},
 until:async(fn,message,ms)=>{for(;time<ms;time+=80){doc.readyState=time>=readyAt?'complete':'loading';valid=time<stopAt;const v=fn();if(v)return v;}throw Error(message);}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  async function readyAccounting('),source.indexOf('  async function snapshot(')),ctx);
 return {value:await ctx.readyAccounting(frame,{},0),time,doc};
}
(async()=>{
 const ready=await scenario();assert.equal(ready.value,ready.doc);assert(ready.time>=880,'waits for mode, editor, then stable cells');
 const late=await scenario({readyAt:3000,settleAt:3200});assert(late.time>=3440,'late worksheet initialization is retried');
 await assert.rejects(scenario({readonly:true}),/review or read-only/);
 await assert.rejects(scenario({stopAt:160}),/Stopped/);
 await assert.rejects(scenario({swapAt:160}),/frame changed/);
 await assert.rejects(scenario({readyAt:20000}),/did not finish loading/);
 console.log('PASS McGraw worksheet readiness waits for editable mode and stable cells, retries delayed initialization, and preserves read-only, Stop and frame-change guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
