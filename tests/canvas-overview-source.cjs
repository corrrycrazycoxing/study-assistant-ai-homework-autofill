const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/canvas.js','utf8');
const code=source.slice(source.indexOf("  const launchKey='studyCanvasQuizLaunch'"),source.indexOf('  function mount(){'));
function fixture({failure=false,hold=false}={}){
  const nodes=[],calls=[],storage=new Map(),timers=[];
  const el=tag=>{const node={tag,style:{},hidden:false,disabled:false,children:[],attrs:{},append(...children){this.children.push(...children);},setAttribute(key,value){this.attrs[key]=value;}};nodes.push(node);return node;};
  const launch=el('a');launch.click=()=>calls.push('launch');
  let release;
  const scope={window:{},location:{pathname:'/courses/1/quizzes/2'},document:{title:'Civilize Them With a Stick',getElementById:()=>null,querySelector:selector=>selector==='#take_quiz_link'?launch:selector.includes('#quiz_title')?{textContent:'Civilize Them With a Stick'}:{textContent:'Read the assigned text.'},createElement:el,body:el('body')},usable:()=>true,clean:s=>s.trim(),ready:Promise.resolve(),generation:0,readingJob:null,readingConnection:null,ui:null,sessionStorage:{setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:fn=>timers.push(fn),chrome:{runtime:{sendMessage:async msg=>calls.push(msg.type)}}};
  scope.window.top=scope.window;
  scope.prepareReadings=async(title,description,options)=>{calls.push({title,description,options});if(hold)await new Promise(resolve=>release=resolve);if(failure)throw Error('Source import failed.');scope.readingConnection={sourceTitle:title,url:'https://notebook.google.com/notebook/test'};};
  vm.createContext(scope);vm.runInContext(code,scope);scope.mountOverview();
  return {scope,calls,storage,timers,button:text=>nodes.find(n=>n.textContent===text),status:nodes.find(n=>n.attrs.role==='status'),release:()=>release()};
}
(async()=>{
 const f=fixture();await f.button('Load source').onclick();
 assert.equal(f.calls[0].options.loadSource,true);assert.equal(f.calls.includes('launch'),false);assert.equal(f.storage.size,0);assert.equal(f.timers.length,0);assert.match(f.status.textContent,/Source ready.*quiz has not started/);
 const toggle=f.button('Minimize');toggle.onclick();assert.equal(toggle.textContent,'Expand');assert.equal(toggle.attrs['aria-expanded'],'false');toggle.onclick();assert.equal(toggle.attrs['aria-expanded'],'true');
 await f.button('Start Quiz Auto').onclick();assert.equal(f.calls.at(-2).options.loadSource,false);assert.equal(f.calls.at(-1),'launch');assert.equal(f.storage.size,1);assert.equal(f.button('Start Quiz Auto').disabled,true);
 const bad=fixture({failure:true});await bad.button('Load source').onclick();assert.match(bad.status.textContent,/Source import failed/);assert.equal(bad.calls.includes('launch'),false);assert.equal(bad.button('Load source').disabled,false);
 const stopped=fixture({hold:true});const task=stopped.button('Load source').onclick();await new Promise(resolve=>setImmediate(resolve));stopped.button('Stop').onclick();stopped.release();await task;assert.equal(stopped.calls.includes('launch'),false);assert.equal(stopped.storage.size,0);assert.equal(stopped.status.textContent,'Stopped.');
 console.log('PASS Canvas overview source-only preparation, no quiz launch/handoff, minimize/expand, explicit Auto, import errors and Stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
