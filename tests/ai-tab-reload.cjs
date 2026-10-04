const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('background/panel.js','utf8');const code=source.slice(source.indexOf('async function reloadService('),source.indexOf('function initializeSidePanel()'));
async function scenario(intervene){
 let active=1,listener,focused=1;const updates=[];
 const tabs=[{id:1,windowId:1,url:'https://mylab.pearson.com/'},{id:2,windowId:1,url:'https://chatgpt.com/'}];
 const chrome={tabs:{query:async opts=>opts.url?[tabs[1]]:[tabs.find(t=>t.id===active)],update:async(id,change)=>{if(change.active)active=id;updates.push(id);return tabs.find(t=>t.id===id);},reload:async id=>{assert.equal(id,2);if(intervene)active=3;listener(id,{status:'complete'});},onUpdated:{addListener:f=>listener=f,removeListener:f=>{if(listener===f)listener=null;}}},windows:{getLastFocused:async()=>({id:1}),update:async(id,change)=>{focused=id;}}};
 const context=vm.createContext({chrome,hosts:{chatgpt:['https://chatgpt.com/*']},notebookHosts:[],setTimeout,clearTimeout,Error});vm.runInContext(code,context);const result=await vm.runInContext('reloadService({service:"chatgpt"})',context);assert.equal(result.received,true);assert.deepEqual(updates,intervene?[2]:[2,1]);assert.equal(active,intervene?3:1);assert.equal(focused,1);
}
(async()=>{await scenario(false);await scenario(true);console.log('PASS AI tab reload returns to assignment unless user switches tabs');})().catch(e=>{console.error(e);process.exitCode=1;});
