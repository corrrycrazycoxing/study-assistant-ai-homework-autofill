const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('background/background.js','utf8');
function slice(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start);return source.slice(start,end);}
const recovery=fs.readFileSync('background/ai-recovery.js','utf8');
async function scenario({reason='Disconnected',safe=true,pending,discarded=false,cancel=false,neverReady=false,notebook=false,fallback=false}={}){
  const values={...(pending?{pending}:{} )},events=[],sender={tab:{id:1},frameId:0,documentId:'assignment-doc',id:'extension'};
  let reloads=0,sends=0;
  const ai={id:2,url:'https://gemini.google.com/app/example',status:'complete',discarded};
  const book={id:3,url:'https://notebooklm.google.com/notebook/example',status:'complete'};
  const storage={get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,values[k]])),set:async data=>{Object.assign(values,data);if(data.aiTabRecovery)events.push({...data.aiTabRecovery});},remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete values[key];}};
  const context={URL,Date,Error,setTimeout,clearTimeout,Promise,
    origins:{gemini:'https://gemini.google.com',chatgpt:'https://chatgpt.com',deepseek:'https://chat.deepseek.com'},hosts:{gemini:'gemini',chatgpt:'chatgpt',deepseek:'deepseek'},notebookHosts:['notebook'],expiry:600000,
    config:async()=>({}),activeRun:async()=>null,StudyConfig:{preferences:()=>({aiModel:'gemini',preferNotebook:notebook})},StudyPacing:{options:()=>({mode:'normal'})},
    focusTab:async()=>{},panelSender:s=>!s.tab,cancel:async()=>{delete values.pending;},
    chrome:{runtime:{id:'extension'},storage:{session:storage},scripting:{executeScript:async()=>[{result:{safe,reason:reason==='Disconnected'?'Unsent draft':reason}}]},tabs:{
      query:async({url})=>url==='gemini'?[ai]:url==='chatgpt'&&fallback?[{id:4,url:'https://chatgpt.com/',status:'complete'}]:Array.isArray(url)&&notebook?[book]:[],
      get:async id=>id===3?book:ai,
      reload:async id=>{reloads++;ai.discarded=false;assert(values.aiTabRecovery,'progress is set before reload');assert(!values.pending,'questions are not dispatched before reconnection');if(cancel)context.cancelAiPreparation({type:'mcgrawMapCancel'},sender);},
      sendMessage:async(id,m)=>{
        if(m.type==='assistantReady'||m.type==='notebookReady'){
          if(id===4||id===2&&notebook||reloads&&!neverReady)return {ready:true,reason:'Ready'};
          if(reason==='Disconnected')throw Error('Receiving end does not exist');return {ready:false,reason};
        }
        if(m.type==='receiveQuestion'||m.type==='receiveSourceQuestion'){sends++;events.push({send:m.type});return {received:true};}
      },
    }},
  };
  vm.createContext(context);vm.runInContext(recovery+slice('async function regularTab(','async function deliver(')+slice('async function request(','async function handle('),context);
  if(neverReady)vm.runInContext("probeAiTab=async()=>({ready:false,reason:'Unsent draft'})",context);
  let result,error;
  try{result=await context.request({id:'req-1',type:'mcgrawMapQuestion',prompt:'Synthetic question',snapshotHash:'1234abcd'},sender,'mcgraw');}catch(e){error=e;}
  return {context,values,events,reloads,sends,result,error,sender,ai};
}
(async()=>{
  const ok=await scenario();assert.equal(ok.result.received,true);assert.equal(ok.reloads,1);assert.equal(ok.sends,1,'the question is sent exactly once after recovery');assert.equal(ok.values.aiTabRecovery,undefined);assert.equal(ok.values.pending.id,'req-1');assert.equal(ok.events[0].tab,1,'reload progress belongs to the assignment');
  const book=await scenario({notebook:true});assert.equal(book.reloads,1);assert.equal(book.sends,1);assert.equal(book.events[0].model,'notebook');assert.equal(book.events[1].send,'receiveSourceQuestion');
  const alternate=await scenario({fallback:true});assert.equal(alternate.reloads,0,'a ready alternate avoids a needless reload');assert.equal(alternate.sends,1);
  for(const reason of ['Generating answer','Unsent draft','Sending prompt','Uploading picture','Sign in or reload']){const blocked=await scenario({reason});assert.equal(blocked.reloads,0,reason+' is never automatically reloaded');assert.equal(blocked.sends,0);}
  const draft=await scenario({safe:false});assert.equal(draft.reloads,0,'a disconnected tab with a draft is left untouched');
  const cancelled=await scenario({cancel:true});assert.equal(cancelled.sends,0);assert.match(cancelled.error.message,/stopped/);assert.equal(cancelled.values.aiTabRecovery,undefined);
  const discarded=await scenario({discarded:true});assert.equal(discarded.reloads,1);assert.equal(discarded.sends,1);
  delete ok.values.pending;
  const again=await ok.context.recoverAiTab(ok.ai,'gemini',ok.context.beginAiPreparation(ok.sender,'req-2'));assert.equal(again.ready,false);assert.match(again.reason,/automatic reload/);assert.equal(ok.reloads,1,'repeated retries do not create reload loops');
  const pending=await scenario({pending:{id:'other-request',time:Date.now(),ai:2}});assert.equal(pending.reloads,0);assert.equal(pending.sends,0);
  // Safety inspection never returns or copies draft contents.
  let draftText='',generating=false,attachment=false;
  const button={disabled:false,getClientRects:()=>[{}],getAttribute:()=>null,closest:()=>null};
  const editor={...button,textContent:'',get value(){return draftText;},closest:selector=>selector.includes('form')?{querySelectorAll:()=>attachment?[button]:[]}:null};
  ok.context.document={querySelectorAll:selector=>selector.includes('Stop response')?(generating?[button]:[]):[editor]};
  assert.equal(ok.context.inspectAiReloadSafety('gemini').safe,true);
  draftText='private unsent text';assert.equal(ok.context.inspectAiReloadSafety('gemini').reason,'Unsent draft');
  draftText='';generating=true;assert.equal(ok.context.inspectAiReloadSafety('gemini').reason,'Generating answer');
  generating=false;attachment=true;assert.equal(ok.context.inspectAiReloadSafety('gemini').reason,'Unsent draft');
  const review={};vm.runInNewContext(fs.readFileSync('shared/review.js','utf8'),review);
  const state={page:{tab:1,status:'Waiting for AI…'},phase:'reloading'};
  assert.equal(review.StudyReview.activity(state).stage,1);assert.equal(review.StudyReview.activity(state).label,'Tab reloading…');assert.equal(review.StudyReview.recovery(state),null);
  state.phase='answer';assert.equal(review.StudyReview.activity(state).label,'Waiting for the chatbot');
  console.log('PASS automatic AI/Notebook reload before one send, draft/busy protection, cancellation, cooldown and progress');
})().catch(error=>{console.error(error);process.exitCode=1;});
