const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const base=require('node:path').join(__dirname,'../');
function pacing(){const scope={};vm.runInNewContext(readFileSync(base+'shared/pacing.js','utf8'),scope);return scope.StudyPacing;}
const P=pacing(),math={text:'Calculate a confidence interval and standard deviation using a calculator.',fields:[{key:'f0',kind:'number'},{key:'f1',kind:'number'}]};
assert.equal(P.duration({pacingMode:'slow',reviewMaxSeconds:120},600),120);
assert.equal(P.duration({pacingMode:'human'}, {estimatedSeconds:420,questionType:'calculation',fieldSeconds:{f0:60,f1:360}},math),420);
assert.equal(P.duration({pacingMode:'human',humanSpeed:'faster'}, {estimatedSeconds:420,questionType:'calculation'},math),294);
assert.equal(P.duration({pacingMode:'human',humanSpeed:'deliberate'}, {estimatedSeconds:420,questionType:'calculation'},math),588);
assert(P.duration({pacingMode:'human'},null,math)>P.duration({pacingMode:'human'},null,{text:'Choose the definition.',fields:[{key:'f0',kind:'radio',options:['A','B']}]}));
for(const bad of [NaN,Infinity,-1,'420',{},[]]){const e=P.estimate({pacingMode:'human'},{estimatedSeconds:bad},math);assert(Number.isFinite(e.seconds)&&e.seconds>=60);}
console.log('PASS timing bounds, profiles, type-dependent fallback and malformed AI timing');
async function relayTests(){
 let listener,observers=[],sent=[],intervals=[],timers=[],editorValue='';
 class Area{constructor(){this.tagName='TEXTAREA';this.disabled=false;this.events=[];}getClientRects(){return [{}];}getAttribute(){return null;}focus(){}dispatchEvent(e){this.events.push(e.type);return true;}}
 Object.defineProperty(Area.prototype,'value',{get:()=>editorValue,set:v=>{editorValue=v;}});
 const editor=new Area(),button={disabled:false,getClientRects:()=>[{}],getAttribute:()=>null,click(){editorValue='';}},messages=[];
 let busy=false;
 const document={documentElement:{},querySelectorAll(selector){if(selector==='textarea')return [editor];if(selector==='[data-testid="send-button"]')return [button];if(selector==='[data-testid="chat-message-assistant"]')return messages;if(selector==='[data-testid="stop-button"]')return busy?[button]:[];return [];}};
 class Observer{constructor(cb){this.cb=cb;this.live=true;observers.push(this);}observe(){}disconnect(){this.live=false;}}
 const scope={location:{hostname:'chat.deepseek.com'},document,HTMLTextAreaElement:Area,HTMLInputElement:Area,MutationObserver:Observer,Event:class{constructor(type){this.type=type;}},queueMicrotask,Date,Set,Map,Promise,
  setTimeout(fn,ms){const item={fn,ms,live:true};timers.push(item);return item;},clearTimeout(t){if(t)t.live=false;},setInterval(fn,ms){const item={fn,ms,live:true};intervals.push(item);return item;},clearInterval(t){if(t)t.live=false;},
  StudyImageUpload:{hasDraft:()=>false},chrome:{runtime:{onMessage:{addListener:f=>listener=f},sendMessage:async m=>{sent.push(m);return {received:true};}}}};
 vm.runInNewContext(readFileSync(base+'content-scripts/assistant.js','utf8'),scope);
 const flush=async()=>{await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));};
 const mutate=async()=>{for(const o of observers)if(o.live)o.cb();await flush();};
 const receive=async id=>{let reply;listener({type:'receiveQuestion',id,prompt:'Synthetic test'},{},r=>reply=r);await flush();assert.equal(reply?.received,true);};
 const node=text=>({textContent:text,querySelectorAll:()=>[]});
 await receive('test-one');assert(intervals.some(i=>i.ms===5000));
 messages.push(node('{"requestId":"other","answer":{"f0":"old"}}'));await mutate();assert.equal(sent.length,0);
 messages.at(-1).textContent='{"requestId":"test-one","answer":{"f0":"4';await mutate();assert.equal(sent.length,0);
 messages.at(-1).textContent='{"requestId":"test-one","answer":{"f0":"42"},"explanation":"A brace } in text"}';busy=true;await mutate();assert.equal(sent.length,0);
 busy=false;await mutate();assert.equal(sent.length,1);assert.equal(JSON.parse(sent[0].response).answer.f0,'42');assert(!intervals.some(i=>i.live));
 await mutate();assert.equal(sent.length,1);
 await receive('test-two');messages.at(-1).textContent='{"requestId":"test-two","answer":{"f0":"43"}}';await mutate();assert.equal(sent.length,2);
 await receive('cancel-me');listener({type:'cancelQuestion',id:'cancel-me'},{},()=>{});messages.push(node('{"requestId":"cancel-me","answer":{"f0":"wrong"}}'));await mutate();assert.equal(sent.length,2);
 assert(!observers.some(o=>o.live));assert(!timers.some(t=>t.live));assert(!intervals.some(t=>t.live));
 console.log('PASS event-driven response completion without timer ticks, streaming/stale-response rejection, busy guard, recycled message nodes and cancellation cleanup');
}
relayTests().catch(e=>{console.error(e);process.exitCode=1;});
