const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
  constructor(id=''){this.id=id;this.hidden=false;this.value='';this.textContent='';this.attributes={};this.listeners={};this.elements=new Map();this.items=[];this.disabled=false;}
  set innerHTML(html){this.html=html;for(const match of html.matchAll(/id="([^"]+)"/g))this.elements.set(match[1],new Element(match[1]));this.items=Array.from({length:5},()=>new Element());}
  get innerHTML(){return this.html;}
  getElementById(id){return this.elements.get(id);}
  querySelectorAll(selector){return selector==='li'?this.items:[];}
  querySelector(selector){return selector==='details'?this.details:null;}
  setAttribute(key,value){this.attributes[key]=value;}
  removeAttribute(key){delete this.attributes[key];}
  addEventListener(name,fn){this.listeners[name]=fn;}
}
const intervals=new Map();let interval=0;
const scope={document:{createElement:()=>new Element()},setInterval:fn=>{intervals.set(++interval,fn);return interval;},clearInterval:id=>intervals.delete(id)};
vm.createContext(scope);vm.runInContext(fs.readFileSync('shared/review.js','utf8')+fs.readFileSync('shared/pearson-course-ui.js','utf8'),scope);
const ui=scope.StudyPearsonCourseUI,root=new Element();root.details=new Element();
for(const id of ['assignment-controls','assistant-title','status'])root.elements.set(id,new Element(id));
root.getElementById('status').before=box=>{root.elements.set(box.id,box);for(const [id,element]of box.elements)root.elements.set(id,element);};
let state={status:'Waiting for AI…',running:true,pace:{pacingMode:'human',humanSpeed:'typical'},question:'Question 2'},stopped=0;
const controller=ui.player(root,{read:()=>state,onStop:async()=>{stopped++;controller.hide();}});
controller.show({index:2,total:8,title:'HW Section 6.2'});
assert.equal(root.details.open,true);assert.equal(root.getElementById('assignment-controls').hidden,true);assert.equal(root.getElementById('assistant-title').textContent,'✦ Course Auto');
assert.equal(root.getElementById('course-total-progress').value,2);assert.equal(root.getElementById('course-stage-progress').value,2);assert.match(root.getElementById('course-current-stage').textContent,/Waiting for the chatbot/);
state={...state,reloading:true};controller.update();assert.equal(root.getElementById('course-current-stage').textContent,'Tab reloading…');
state={...state,reloading:false,status:'Checking the answer in Pearson…'};controller.update();assert.equal(root.getElementById('course-stage-progress').value,5);
state={...state,running:false};controller.update();assert.match(root.getElementById('course-current-stage').textContent,/Paused/);
(async()=>{
  await root.getElementById('stop-course-auto').onclick();assert.equal(stopped,1);assert.equal(root.getElementById('assignment-controls').hidden,false);assert.equal(root.getElementById('assistant-title').textContent,'✦ MyLab Assistant');assert.equal(intervals.size,0);
  const setup=new Element();setup.innerHTML=ui.paceMarkup()+ui.queueMarkup();setup.getElementById('course-human-speed').value='typical';
  assert.equal(ui.hasPace(setup),false);assert.throws(()=>ui.readPace(setup),/Choose/);
  let changed=0;ui.bindPace(setup,()=>changed++);assert.equal(setup.getElementById('course-human-wrap').hidden,true);
  setup.getElementById('course-pace').value='human';setup.getElementById('course-pace').listeners.change();assert.equal(setup.getElementById('course-human-wrap').hidden,false);assert.equal(ui.readPace(setup).pacingMode,'human');assert(changed>=2);
  ui.queueProgress(setup,{value:3,max:8,label:'Checking assignment scores'});assert.equal(setup.getElementById('course-queue-bar').value,3);assert.match(setup.getElementById('course-queue-label').textContent,/Checking assignment scores · 3 of 8/);
  ui.queueProgress(setup,null);assert.equal(setup.getElementById('course-queue-progress').hidden,true);
  const shell=fs.readFileSync('content-scripts/pearson-course-shell.js','utf8');assert.match(shell,/if\(el\('ack-warning'\)\.checked\)el\('review-notice'\)\.open=false/);assert.match(shell,/Course Auto is working[\s\S]*el\('body'\)\.hidden=true/,'the setup card collapses once the player starts');
  console.log('PASS Course Auto expanded player progress, reload stage, normal-control restoration, required pace and course-list progress');
})().catch(error=>{console.error(error);process.exitCode=1;});
