'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// A small DOM harness exercises the production renderer's state and event paths.
// Pixel layout is covered separately by docs/unified-ui-demo.html.
class Element{
 constructor(){this.attrs={};this.children=[];this.hidden=false;this.disabled=false;this.dataset={};this.style={};this.isConnected=true;this.textContent='';}
 attachShadow(){return this.shadowRoot=new Element();}
 set innerHTML(value){this.html=value;this.ids=new Map([...value.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));this.steps=Array.from({length:5},()=>new Element());}
 getElementById(id){return this.ids.get(id);}
 querySelectorAll(selector){return selector==='li'?this.steps:[];}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}removeAttribute(k){delete this.attrs[k];}
 append(...items){this.children.push(...items);}click(){if(!this.disabled)return this.onclick?.();}
}
const scope={document:{createElement:()=>new Element(),body:new Element()},StudyBuild:{version:'2.7.4',id:'build-A'},StudyConfig:{names:{mcgraw:'McGraw-Hill',pearson:'Pearson',canvas:'Canvas',mindtap:'MindTap'}}};
vm.createContext(scope);vm.runInContext(fs.readFileSync('shared/review.js','utf8'),scope);vm.runInContext(fs.readFileSync('shared/assignment-ui.js','utf8'),scope);
const calls=[],ui=scope.StudyAssignmentUI.create({command:async a=>calls.push(a),openPanel:()=>calls.push('panel'),replace:value=>calls.push(value)}),el=id=>ui.root.getElementById(id);
for(const platform of ['mcgraw','pearson','canvas','mindtap']){
 const state={platform,buildId:'build-A',status:'Ready.',controls:{start:true,ask:true}};
 ui.render(state);assert(el('identity').textContent.includes(scope.StudyConfig.names[platform]));
 assert.equal(el('fill').hidden,true);assert.equal(el('stop').hidden,true);
 ui.render({...state,status:'Waiting for AI',controls:{stop:true}},{phase:'answer'});
 assert.equal(el('body').hidden,false);assert.equal(el('progress').value,2);assert.equal(el('start').hidden,true);
 el('toggle').click();ui.render({...state,status:'Waiting for AI',controls:{stop:true}},{phase:'answer'});assert.equal(el('body').hidden,true,'heartbeat respects user collapse');assert.equal(el('mini').hidden,false);
 el('mini-stop').click();assert.equal(calls.at(-1),'stop');
 ui.visibility(false);assert.equal(ui.host.hidden,true);ui.visibility(true);assert.equal(ui.host.hidden,false);
 ui.render({...state,status:'Unsupported field',controls:{start:true}});assert.equal(el('body').hidden,false);el('toggle').click();ui.render({...state,status:'Unsupported field',controls:{start:true}});assert.equal(el('body').hidden,true,'unchanged error does not force-open each heartbeat');
}
const course={platform:'pearson',buildId:'build-A',status:'Entering answers',course:{label:'Assignment 2 of 8',total:8,done:1},controls:{stop:true},timer:{label:'Review',note:'Pause or continue',progress:.5,pauseLabel:'Resume countdown'}};
ui.render(course);assert.equal(el('title').textContent,'Course Auto');assert.equal(el('stop').textContent,'Stop Course Auto');assert.equal(el('course-progress').value,1);assert.equal(el('timer-progress').value,.5);el('timerContinue').click();assert.equal(calls.at(-1),'timerContinue');
ui.render({...course,course:null,controls:{start:true},timer:null});assert.equal(el('title').textContent,'Study Assistant');assert.equal(el('course').hidden,true);assert.equal(el('timer').hidden,true);
ui.retire({...course,status:'Extension updated. Refresh this assignment.',controls:{}});assert.equal(el('body').hidden,false);assert.equal(el('stop').disabled,true);assert.equal(el('mini-stop').disabled,true);
console.log('PASS shared assignment presentation across four platforms, automatic opening, collapse, attention, course progress, timer, side-panel visibility and retirement');
