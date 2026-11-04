const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('background/background.js','utf8');
const extract=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
async function scenario(responseKind='structured'){
 const values={},sent=[],delivered=[];let formatterCalls=0;
 const sender={id:'extension',tab:{id:1},frameId:0,documentId:'canvas-doc',url:'https://canvas.example.edu/quizzes/1/take'};
 const book={id:2,url:'https://notebook.google.com/notebook/manual-reading'};
 const storage={get:async key=>({[key]:values[key]}),set:async data=>Object.assign(values,data),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete values[key];}};
 const context={URL,Date,Promise,setTimeout,clearTimeout,expiry:600000,notebookHosts:[],origins:{gemini:'https://gemini.google.com'},
  chrome:{storage:{session:storage},tabs:{get:async()=>book,query:async()=>[book,{id:3,url:'https://notebook.google.com/notebook/empty'}],sendMessage:async(id,message)=>{sent.push({tabId:id,...message});return {received:true};},update:async()=>{}}},
  config:async()=>({}),activeRun:async()=>null,setupComplete:async()=>true,StudyPacing:{options:()=>({mode:'normal'})},StudyConfig:{preferences:()=>({preferNotebook:true,aiModel:'gemini'})},
  probeAiTab:async tab=>tab.id===2?{ready:true,sources:1}:{ready:false,reason:'Select notebook sources'},
  beginAiPreparation:()=>({}),guardAiPreparation:()=>{},finishAiPreparation:async()=>{},focusTab:async()=>{},
  regularTab:async()=>{formatterCalls++;return null;},
  cancel:async()=>delete values.pending,releaseTabs:async()=>{},deliver:async(pending,message)=>{delivered.push({...message,grounded:pending.grounded,notebookUrl:pending.notebookUrl});return {received:true};}
 };
 vm.createContext(context);vm.runInContext(fs.readFileSync('shared/security.js','utf8')+fs.readFileSync('background/notebooks.js','utf8')+extract('function fromAssistant(','// Re-read at each transition')+extract('async function request(','chrome.runtime.onMessage.addListener'),context);
 const prompt='Return only JSON with exactly requestId, snapshotHash, answer and explanation.\nQuestion:\nTwo mock questions.\n\nFields:\n'+JSON.stringify([{field:'q1_f0',type:'radio',options:['First','Second']},{field:'q2_f0',type:'checkbox',options:['A','B','C']}]);
 await context.request({type:'canvasQuestion',id:'live-test',snapshotHash:'1234abcd',prompt},sender,'canvas');
 assert.equal(formatterCalls,0,'ready NotebookLM dispatch does not wait for or reload a chatbot');
 assert.equal(sent[0].tabId,book.id);assert.equal(sent[0].type,'receiveSourceQuestion');assert.match(sent[0].prompt,/ONLY the currently selected notebook sources/);
 const envelope={requestId:'live-test',snapshotHash:'1234abcd',answer:{q1_f0:'Second',q2_f0:['A','C']},explanation:'The selected reading supports these choices [1].'};
 const response=responseKind==='structured'?JSON.stringify(envelope):responseKind==='missing'?'SOURCE_NOT_FOUND':'The selected reading supports Second and A plus C. [1]';
 await context.handle({type:'notebookResponse',id:'wrong-request',response},{tab:book,frameId:0,url:book.url});assert.equal(delivered.length,0,'stale source replies cannot enter answers');
 await context.handle({type:'notebookResponse',id:'live-test',response},{tab:book,frameId:0,url:'https://notebook.google.com/'});
 assert.equal(values.pending,undefined,'the request is cleared at the terminal transition');
 return {delivered,formatterCalls,envelope};
}
(async()=>{
 const direct=await scenario();assert.deepEqual(JSON.parse(direct.delivered[0].response),direct.envelope);assert.equal(direct.formatterCalls,0);assert.match(direct.delivered[0].grounded,/\[1\]/);assert.match(direct.delivered[0].notebookUrl,/manual-reading/);
 const missing=await scenario('missing');assert.match(missing.delivered[0].error,/did not support/);assert.equal(missing.formatterCalls,0,'missing evidence never falls back to general knowledge');
 const formatting=await scenario('prose');assert.equal(formatting.formatterCalls,1);assert.match(formatting.delivered[0].error,/needs formatting/);assert.equal(formatting.delivered[0].response,undefined);
 console.log('PASS actual Canvas background request → NotebookLM → batch envelope routing, lazy formatter, stale reply and missing-source rejection');
})().catch(error=>{console.error(error);process.exitCode=1;});
