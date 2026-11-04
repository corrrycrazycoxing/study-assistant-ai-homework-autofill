const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function exercise({cached=false,cancel=false,sourceName='Reading.pdf',kind='drive',atLimit=false,transientLimit=false,quotaRecovery=false}={}){
 let job={id:'job',phase:'opening',source:{id:'drive-file-id',kind,title:'Reading',url:'https://example.org/reading'},sourceName:cached?sourceName:'',notebookUrl:cached?'https://notebook.google.com/notebook/book':null},ui=cached?'loaded':'home',createCount=0,insertCount=0,insertedUrl='',renamed='',clock=0,cancelled=false;
 let quotaFreed=false,quotaCleanups=0;
 const location={hostname:'notebook.google.com',pathname:cached?'/notebook/book':'/'};
 const visible={isConnected:true,getClientRects:()=>[{}],getAttribute:()=>null};
 const makeButton=(text,click)=>({...visible,click,textContent:text,cloneNode:()=>({textContent:text,querySelectorAll:()=>[]})});
 class Input{constructor(value,tagName='INPUT',aria=null){Object.assign(this,visible);this._value=value;this.tagName=tagName;this.getAttribute=name=>name==='aria-label'?aria:null;}get value(){return this._value;}set value(v){this._value=v;}dispatchEvent(){}blur(){renamed=this.value;}}
 class Textarea extends Input{get value(){return this._value;}set value(v){this._value=v;}}
 const title=new Input('Untitled notebook'),urls=new Textarea('','TEXTAREA','Enter URLs');
 const source={...visible,getAttribute:name=>name==='aria-label'?'Select '+sourceName:null};
 const create=makeButton('New notebook',()=>{createCount++;location.pathname='/notebook/book';ui='empty';});
 const add=makeButton('Add source',()=>{ui='add';}),web=makeButton('Websites',()=>{ui='urls';}),insert=makeButton('Insert',()=>{insertCount++;insertedUrl=urls.value;ui='loaded';});
 const document={body:{get innerText(){return atLimit&&!quotaFreed||transientLimit&&clock<10000?'You have reached the maximum number of notebooks. Upgrade.':'';}},querySelector(selector){if(selector==='query-box .selected-num')return {textContent:(ui==='loaded'?'1':'0')+' source'};return null;},querySelectorAll(selector){
  if(selector==='button,[role="button"]')return ui==='home'?(atLimit&&!quotaFreed||transientLimit&&clock<10000?[]:[create]):ui==='add'?[web]:ui==='urls'?[insert]:[add];
  if(selector==='input')return ui==='home'?[]:[title];
  if(selector==='textarea')return ui==='urls'?[urls]:[];
  if(selector==='input[type="checkbox"],[role="checkbox"]')return ui==='loaded'?[source]:[];
  return [];
 }};
 const steps=[];
 const chrome={runtime:{async sendMessage(message){
  if(message.type==='readingsJob')return {received:true,job:cancelled?null:structuredClone(job)};
  if(message.type==='readingsStep'){
   if(cancelled)return {received:false,error:'Stopped'};
   steps.push(message.step);
   if(message.step==='created'){job.phase='importing';job.notebookUrl='https://notebook.google.com/notebook/book';if(cancel)cancelled=true;}
   else if(message.step==='creating')job.phase='creating';
   else if(message.step==='adding')job.phase='adding';
   else if(message.step==='ready'){job.phase='ready';job.sourceName=message.sourceName;}
   else if(message.step==='failed'){job.phase='failed';job.error=message.error;}
   return {received:true};
  }
  throw Error('Unexpected message');
 }}};
 const context={chrome,location,document,HTMLInputElement:Input,HTMLTextAreaElement:Textarea,Event:class{constructor(type){this.type=type;}},setInterval(){},setTimeout(resolve){clock+=10000;queueMicrotask(resolve);},Date:{now:()=>clock}};
 if(quotaRecovery)context.StudyNotebookCleanup={async freeSlot(){quotaCleanups++;quotaFreed=true;}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('shared/readings.js','utf8'),context);vm.runInContext(fs.readFileSync('content-scripts/notebook-setup.js','utf8'),context);
 for(let i=0;i<100&&!['ready','failed'].includes(job.phase)&&!cancelled;i++)await new Promise(setImmediate);
 if(cancelled)for(let i=0;i<5;i++)await new Promise(setImmediate);
 return {job,steps,createCount,insertCount,insertedUrl,renamed,quotaCleanups};
}
(async()=>{
 const first=await exercise();assert.equal(first.job.phase,'ready');assert.equal(first.createCount,1);assert.equal(first.insertCount,1);assert.equal(first.renamed,'Reading');
 assert.equal(first.insertedUrl,'https://drive.google.com/uc?export=download&id=drive-file-id','import the file rather than Drive viewer HTML');
 assert.deepEqual(first.steps,['creating','created','adding','ready']);
 const reused=await exercise({cached:true});assert.equal(reused.createCount,0);assert.equal(reused.insertCount,0);assert.equal(reused.job.phase,'ready','an existing verified notebook is not duplicated');
 const stopped=await exercise({cancel:true});assert.equal(stopped.insertCount,0);assert(!stopped.steps.includes('ready'),'Stop prevents a later source import or readiness receipt');
 const loading=await exercise({sourceName:'drive-file-id'});assert.equal(loading.job.phase,'failed','a temporary source placeholder cannot be treated as a processed PDF');
 const web=await exercise({kind:'web',sourceName:'Reading on the web'});assert.equal(web.job.phase,'ready');assert.equal(web.insertedUrl,'https://example.org/reading');
 const limit=await exercise({atLimit:true});assert.equal(limit.job.phase,'failed');assert.match(limit.job.error,/notebook limit/);assert.equal(limit.createCount,0);assert.equal(limit.insertCount,0);
 const recovered=await exercise({atLimit:true,quotaRecovery:true});assert.equal(recovered.job.phase,'ready');assert.equal(recovered.quotaCleanups,1);assert.equal(recovered.createCount,1);assert.equal(recovered.insertCount,1,'creation and source import resume after quota cleanup');
 const transient=await exercise({transientLimit:true});assert.equal(transient.job.phase,'ready','the transient pre-quota home banner is not a real notebook limit');assert.equal(transient.createCount,1);
 console.log('PASS production NotebookLM create/name/import/readiness flow, exact file links, reuse, Stop and placeholder rejection');
})().catch(error=>{console.error(error);process.exitCode=1;});
