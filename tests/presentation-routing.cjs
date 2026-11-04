'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('background/panel.js','utf8'),storage={};let run=null;
const context={canvasMcGrawObserve:async()=>{},StudyBuild:{id:'build-A'},StudyConfig:{names:{pearson:'Pearson'}},sourcePlatform:async()=> 'pearson',activeRun:async()=>run,checkpointKey:async()=> 'hash',chrome:{tabs:{sendMessage:async()=>{}},storage:{session:{get:async keys=>typeof keys==='string'?{[keys]:storage[keys]}:Object.fromEntries(keys.map(k=>[k,storage[k]])),set:async value=>Object.assign(storage,value)}}}};
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('async function receivePageState'),source.indexOf('async function connections')),context);
const sender=frameId=>({tab:{id:7,title:'Assignment'},frameId,documentId:'doc-'+frameId,url:'https://mylab.pearson.com/Student/PlayerHomework.aspx'});
const state=(pageId,extra={})=>({pageId,buildId:'build-A',platform:'pearson',kind:'modern',status:'Ready.',controls:{start:true},...extra});
(async()=>{
 let r=await context.receivePageState({state:state('top')},sender(0));assert.equal(r.owner,true);
 r=await context.receivePageState({state:state('frame')},sender(3));assert.equal(r.owner,false,'one frame owns the visible UI');
 run={tab:7,frame:3,phase:'grade'};r=await context.receivePageState({state:state('frame',{controls:{stop:true}})},sender(3));assert.equal(r.owner,true);assert.equal(r.run.phase,'grade');
 r=await context.receivePageState({state:state('top')},sender(0));assert.equal(r.owner,false,'active player takes ownership over idle outer page');
 storage.pending={tab:7,frame:3,phase:'answer'};r=await context.receivePageState({state:state('frame')},sender(3));assert.equal(r.phase,'answer');
 storage.aiTabRecovery={tab:7,frame:3,time:Date.now()};r=await context.receivePageState({state:state('frame')},sender(3));assert.equal(r.phase,'reloading');
 const before=JSON.stringify(storage.pageStates);r=await context.receivePageState({state:state('old',{buildId:'build-old'})},sender(3));assert.equal(r.stale,true);assert.equal(JSON.stringify(storage.pageStates),before,'stale report cannot replace the current page');
 r=await context.receivePageState({state:state('frame',{course:{label:'Assignment 2',total:8,done:1}})},sender(3));assert.equal(storage.pageStates['7:3'].course.done,1);
 r=await context.receivePageState({state:state('frame',{course:{label:'Bad',total:1,done:99}})},sender(3));assert.equal(storage.pageStates['7:3'].course,undefined);
 // Probe production AI readiness, with current, old, missing and disconnected builds.
 const recovery=fs.readFileSync('background/ai-recovery.js','utf8');let response={ready:true,reason:'Ready',buildId:'build-A'};
 const ai={StudyBuild:{id:'build-A'},boundedAiRead:async op=>op,chrome:{tabs:{sendMessage:async()=>response}}};vm.createContext(ai);vm.runInContext(recovery.slice(recovery.indexOf('async function probeAiTab'),recovery.indexOf('// Runs read-only')),ai);
 assert.equal((await ai.probeAiTab({},'gemini')).ready,true);
 for(const buildId of ['build-old',undefined]){response={ready:true,buildId};assert.equal((await ai.probeAiTab({},'gemini')).stale,true);}
 response=null;assert.equal((await ai.probeAiTab({},'gemini')).reason,'Disconnected');
 console.log('PASS cross-frame presentation ownership, current-build reports, observed reload/AI/check phases, course sanitization and AI build mismatch');
})().catch(error=>{console.error(error);process.exitCode=1;});
