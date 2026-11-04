const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
async function scenario({stop=false,change=false,swap=false,ambiguous=false}={}){
 let selected='tab-1',time=0,clicks=0,identity='q5',token=1;
 const panel={textContent:'Compute employee withholding',getAttribute:()=>selected},tabs=['1','2'].map(n=>({id:'tab-'+n,textContent:'Required '+n,getAttribute:name=>name==='aria-selected'?String(selected==='tab-'+n||ambiguous):null,click(){clicks++;selected=this.id;if(stop)token++;if(change)identity='q6';if(swap)frame.contentDocument={};}}));
 const doc={getElementById:id=>tabs.find(e=>e.id===id)},frame={contentDocument:doc};
 const ctx={epoch:1,Date:{now:()=>time},requirementsDone:new Map(),S:{text:v=>String(v||'').trim()},visible:()=>true,enabled:e=>!!e,
  all:()=>tabs,$:()=>panel,current:()=>true,verifyEntered(){},questionIdentity:()=>identity,root:()=>({}),status(){},
  numericCells:()=>{if(selected==='tab-2'&&time<240)throw Error('No editable numeric worksheet cells are visible.');return [{id:'cell',textContent:selected==='tab-1'?'10453.20':''}];},
  until:async(fn,message)=>{for(let i=0;i<12;i++){time+=80;ctx.epoch=token;if(fn())return;}throw Error(message);}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  function requiredState('),source.indexOf('  function questionIdentity(')),ctx);
 vm.runInContext(source.slice(source.indexOf('  async function nextRequirement('),source.indexOf('  async function resume(')),ctx);
 const requirement=ctx.requiredState(doc),snap={type:'worksheet',doc,frame,requirement};
 const moved=await ctx.nextRequirement(snap,1);assert.equal(moved,true);assert.equal(selected,'tab-2');assert(time>=480,'a temporary empty worksheet must settle before its next snapshot');
 const second={...snap,requirement:ctx.requiredState(doc)};assert.equal(await ctx.nextRequirement(second,1),false);assert.equal(clicks,1);
 assert.equal(ctx.requirementsDone.get('q5').size,2,'both Required tabs processed before check');
}
async function journal({change=false,stop=false,swap=false}={}){
 let active='1',key='before',identity='q1';const doc={},frame={contentDocument:doc},snap={doc,frame,key:'before'};
 const tab={getAttribute:()=> '2',click(){active='2';key='next transaction text';if(change)identity='q2';if(stop)ctx.epoch++;if(swap)frame.contentDocument={};}};
 const ctx={epoch:1,guard(s){assert.equal(s.key,key);},questionIdentity:()=>identity,root:()=>({}),all:()=>[tab],enabled:()=>true,active:()=>active,
  readyJournal:async(d,ref,valid)=>{valid();assert.equal(ref,'2');}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  async function moveJournalTransaction('),source.indexOf('  async function nextRequirement(')),ctx);
 await ctx.moveJournalTransaction(snap,'2',1);assert.equal(active,'2');assert.equal(snap.key,'before','old snapshot is never rewritten or reused');
}
(async()=>{
 await scenario();for(const options of [{stop:true},{change:true},{swap:true}])await assert.rejects(scenario(options),/question changed/);
 await assert.rejects(scenario({ambiguous:true}),/ambiguous/);
 await journal();for(const options of [{stop:true},{change:true},{swap:true}])await assert.rejects(journal(options),/question changed/);
 console.log('PASS Required-tab traversal and completion, fresh transaction handoff, stable rendering, Stop, question/frame change and ambiguous-tab guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
