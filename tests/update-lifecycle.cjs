'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../background/background.js'),'utf8');
const state={autoRun:{tab:17,phase:'answer'},pending:{id:'in-flight'}};
const writes=[];
function startWorker(){
  const listeners={};
  const event=name=>({addListener(fn){listeners[name]=fn;}});
  const scope={importScripts(){},chrome:{runtime:{onUpdateAvailable:event('update'),onInstalled:event('installed'),onMessage:event('message')},tabs:{onRemoved:event('removed')},storage:{session:{
    async set(values){Object.assign(state,values);writes.push(values);},
    async remove(key){delete state[key];}
  }}}};
  vm.runInNewContext(source,scope);
  return listeners;
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  let worker=startWorker();
  worker.update({version:'2.5.2'});await flush();
  assert.equal(state.updateAvailable.version,'2.5.2');
  assert(Number.isFinite(state.updateAvailable.detectedAt));
  assert.deepEqual(state.autoRun,{tab:17,phase:'answer'});
  assert.deepEqual(state.pending,{id:'in-flight'});
  worker=startWorker();
  assert.equal(state.updateAvailable.version,'2.5.2','worker restart preserves notice');
  worker.update({});await flush();assert.equal(writes.length,1);
  worker.installed({reason:'install'});await flush();assert(state.updateAvailable);
  worker.installed({reason:'update'});await flush();assert.equal(state.updateAvailable,undefined);
  assert.deepEqual(state.autoRun,{tab:17,phase:'answer'});
  console.log('PASS update notice persistence, invalid-detail guard, installation cleanup and preservation of active workflow');
})().catch(error=>{console.error(error);process.exitCode=1;});
