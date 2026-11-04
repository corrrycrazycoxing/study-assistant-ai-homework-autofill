const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function exercise({sources=1,citation=false,stale=false,cancel=false}={}){
 let listener,clock=0,value='',reply;const sent=[],messages=[],observers=[];
 class Area{get value(){return value;}set value(v){value=v;}focus(){}dispatchEvent(){}getClientRects(){return [{}];}getAttribute(){return null;}}
 const editor=new Area();
 const response=JSON.stringify({requestId:stale?'old-request':'current-request',snapshotHash:'hash',answer:{f0:'Source-based answer'},explanation:'According to the selected reading.'+(citation?' [1]':'')});
 const node={textContent:response,querySelector:()=>null,cloneNode:()=>({textContent:response,querySelectorAll:()=>[]})};
 const button={getClientRects:()=>[{}],getAttribute:()=>null,click(){value='';messages.push(node);}};
 const document={documentElement:{},querySelector:selector=>selector==='query-box .selected-num'?{textContent:sources+' source'}:null,querySelectorAll(selector){
  if(selector.startsWith('textarea.query-box'))return [editor];
  if(selector.startsWith('query-box button[aria-label="Submit"]'))return [button];
  if(selector.startsWith('chat-panel '))return messages;
  return [];
 }};
 const scope={document,location:{hostname:'notebook.google.com',pathname:'/notebook/test'},HTMLTextAreaElement:Area,Event:class{},queueMicrotask,Date:{now:()=>clock},
  MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){}},
  setTimeout(fn,ms){if(ms<=600)queueMicrotask(()=>{clock+=ms;fn();});return {};},clearTimeout(){},setInterval(){return {};},clearInterval(){},
  StudySecurity:{notebookRequestSeen:(text,id)=>text.includes(id)},chrome:{runtime:{onMessage:{addListener:fn=>listener=fn},async sendMessage(message){sent.push(message);if(message.type==='studyDelay'){clock+=message.ms;return {waited:true};}return {received:true};}}}};
 vm.runInNewContext(fs.readFileSync('content-scripts/notebook.js','utf8'),scope);
 listener({type:'receiveSourceQuestion',id:'current-request',prompt:'Answer from the selected reading.'},{},r=>reply=r);
 if(cancel)listener({type:'cancelQuestion',id:'current-request'},{},()=>{});
 for(let i=0;i<20;i++)await new Promise(setImmediate);
 return {sent,reply};
}
(async()=>{
 for(const citation of [false,true]){const run=await exercise({citation});assert.equal(run.reply.received,true);const responses=run.sent.filter(m=>m.type==='notebookResponse');assert.equal(responses.length,1);assert.equal(JSON.parse(responses[0].response).answer.f0,'Source-based answer');assert(!run.sent.some(m=>m.type==='notebookError'));}
 const missing=await exercise({sources:0});assert.equal(missing.reply.received,false);assert.match(missing.reply.error,/Select notebook sources/);assert(!missing.sent.some(m=>m.type==='notebookResponse'));
 for(const options of [{stale:true},{cancel:true}])assert(!(await exercise(options)).sent.some(m=>m.type==='notebookResponse'));
 console.log('PASS selected-source NotebookLM responses with or without citations, empty-source rejection, stale replies and cancellation');
})().catch(error=>{console.error(error);process.exitCode=1;});
