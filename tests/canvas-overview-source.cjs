const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/canvas.js','utf8');
const configContext={URL};vm.createContext(configContext);vm.runInContext(fs.readFileSync('shared/config.js','utf8'),configContext);
const code=source.slice(source.indexOf("  const launchKey='studyCanvasQuizLaunch'"),source.indexOf('  function mount(){'));
function fixture({failure=false,hold=false,pace='normal',profile='typical'}={}){
  const nodes=[],calls=[],storage=new Map(),timers=[];
  const el=tag=>{const node={tag,style:{},hidden:false,disabled:false,children:[],attrs:{},append(...children){this.children.push(...children);},setAttribute(key,value){this.attrs[key]=value;}};nodes.push(node);return node;};
  const launch=el('a');launch.click=()=>calls.push('launch');
  let release,settingListener;
  const scope={StudyConfig:configContext.StudyConfig,settings:{pacingMode:pace,humanSpeed:profile},window:{},location:{pathname:'/courses/1/quizzes/2'},document:{title:'Civilize Them With a Stick',getElementById:()=>null,querySelector:selector=>selector==='#take_quiz_link'?launch:selector.includes('#quiz_title')?{textContent:'Civilize Them With a Stick'}:{textContent:'Read the assigned text.'},createElement:el,body:el('body')},usable:()=>true,clean:s=>s.trim(),ready:Promise.resolve(),generation:0,readingJob:null,readingConnection:null,ui:null,sessionStorage:{setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:fn=>timers.push(fn),chrome:{storage:{onChanged:{addListener:listener=>settingListener=listener}},runtime:{sendMessage:async msg=>{calls.push(msg.type);return {received:true};}}}};
  scope.window.top=scope.window;
  scope.prepareReadings=async(title,description,options)=>{calls.push({title,description,options});if(hold)await new Promise(resolve=>release=resolve);if(failure)throw Error('Source import failed.');scope.readingConnection={sourceTitle:title,url:'https://notebook.google.com/notebook/test'};};
  vm.createContext(scope);vm.runInContext(code,scope);scope.mountOverview();
  return {scope,calls,storage,timers,speed:nodes.find(n=>n.id==='study-canvas-quiz-speed'),changePace:(mode,profile='typical')=>{scope.settings.pacingMode=mode;scope.settings.humanSpeed=profile;settingListener({pacingMode:{newValue:mode},humanSpeed:{newValue:profile}},'sync');},button:text=>nodes.find(n=>n.textContent===text),status:nodes.find(n=>n.attrs.role==='status'),release:()=>release()};
}
async function savedCatalogRefresh({cancel=false,entries=[],legacy=false}={}){
 const calls=[],nodes={},scope={generation:0,readingConnection:null,preparingReadings:false,readingJob:null,running:false,location:{protocol:'https:'},ui:{getElementById:id=>nodes[id]||=( {} )},say:()=>{},Date,Error,StudyReadings:{catalog:()=>[{key:'reading',title:'Assigned reading'}]},DOMParser:class{parseFromString(){return {};}}};
 scope.chrome={storage:{local:{get:async()=>({canvasReadings:{docUrl:'https://docs.google.com/document/d/saved/edit',entries,parserVersion:legacy?undefined:2,updatedAt:Date.now()}})}},runtime:{sendMessage:async msg=>{calls.push(msg);if(msg.type==='readingsFetchCatalog'){if(cancel)scope.generation++;return {received:true,url:'https://docs.google.com/document/d/saved/edit',html:'<a>reading</a>'};}if(msg.type==='canvasPrepareReadings')return {received:true,id:'job'};if(msg.type==='readingsStatus')return {received:true,phase:'ready',url:'https://notebook.google.com/notebook/prepared'};return {received:true};}}};
 scope.URL=URL;scope.DOMParser=class{parseFromString(){return {querySelectorAll:()=>[{tagName:'P',textContent:'Assigned reading',querySelector:()=>null,querySelectorAll:()=>[{textContent:'Assigned reading',getAttribute:()=> 'https://example.org/assigned'}]}]};}};
 vm.createContext(scope);vm.runInContext(fs.readFileSync('shared/readings.js','utf8'),scope);vm.runInContext(source.slice(source.indexOf('  async function prepareReadings('),source.indexOf('  // Reserve space')),scope);
 if(cancel){await assert.rejects(scope.prepareReadings('Assigned reading','',{loadSource:true}),/Stopped/);assert.deepEqual(calls.map(c=>c.type),['readingsFetchCatalog']);}
 else{await scope.prepareReadings('Assigned reading','',{loadSource:true});assert.deepEqual(calls.map(c=>c.type),entries.length&&!legacy?['canvasPrepareReadings','readingsStatus']:['readingsFetchCatalog','readingsSaveCatalog','canvasPrepareReadings','readingsStatus']);assert.equal(scope.readingConnection.url,'https://notebook.google.com/notebook/prepared');}
}
(async()=>{
 await savedCatalogRefresh();await savedCatalogRefresh({cancel:true});await savedCatalogRefresh({entries:[{key:'existing'}]});await savedCatalogRefresh({entries:[{key:'old'}],legacy:true});
 const f=fixture();assert.equal(f.speed.textContent,'Speed: loading settings…');await f.scope.ready;assert.equal(f.speed.textContent,'Speed: Instant Auto');f.changePace('human','deliberate');assert.equal(f.speed.textContent,'Speed: Human pace · Deliberate');f.changePace('slow');assert.equal(f.speed.textContent,'Speed: Timed Auto');f.changePace('review');assert.equal(f.speed.textContent,'Speed: Guided Answers · manual entry');
 await f.button('Load source').onclick();
 await f.button('Open reading settings').onclick();assert(f.calls.includes('readingsOpenSettings'));f.calls.length=0;await f.button('Load source').onclick();
 assert.equal(f.calls[0].options.loadSource,true);assert.equal(f.calls.includes('launch'),false);assert.equal(f.storage.size,0);assert.equal(f.timers.length,0);assert.match(f.status.textContent,/Source ready.*quiz has not started/);
 const toggle=f.button('Minimize');toggle.onclick();assert.equal(toggle.textContent,'Expand');assert.equal(toggle.attrs['aria-expanded'],'false');assert.equal(f.speed.hidden,false,'speed stays visible when minimized');toggle.onclick();assert.equal(toggle.attrs['aria-expanded'],'true');
 await f.button('Start Quiz Auto').onclick();assert.equal(f.calls.at(-2).options.loadSource,false);assert.equal(f.calls.at(-1),'launch');assert.equal(f.storage.size,1);assert.equal(f.button('Start Quiz Auto').disabled,true);
 const bad=fixture({failure:true});await bad.button('Load source').onclick();assert.match(bad.status.textContent,/Source import failed/);assert.equal(bad.calls.includes('launch'),false);assert.equal(bad.button('Load source').disabled,false);
 const stopped=fixture({hold:true});const task=stopped.button('Load source').onclick();await new Promise(resolve=>setImmediate(resolve));stopped.button('Stop').onclick();stopped.release();await task;assert.equal(stopped.calls.includes('launch'),false);assert.equal(stopped.storage.size,0);assert.equal(stopped.status.textContent,'Stopped.');
 console.log('PASS Canvas overview source-only preparation, no quiz launch/handoff, minimize/expand, explicit Auto, import errors and Stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
