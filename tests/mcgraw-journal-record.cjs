const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
async function scenario({toast=false,outer=false,graded=false,stale=false,neverClear=false,hidden=false,wrong=false,stop=false,change=false,changedValues=false,missing=false,advance=false,unexpected=false,swapAfter=false,stopAfter=false,delayed=false}={}){
 let shown=stale,clicked=0,polls=0,phase=false,tabGraded=false,selected='2';
 const doc={},top={},frame={contentDocument:doc},snap={doc,frame,transaction:'2',key:'q1',tabs:[{ref:'2'},{ref:'3'}]};
 const notice={textContent:wrong?'Journal entry could not be recorded.':'Journal entry recorded successfully',closest:()=>null};
 const tab={getAttribute:()=> '2',classList:{contains:()=>tabGraded}};
 const button={click(){clicked++;shown=toast;tabGraded=graded&&!delayed;if(advance)selected=unexpected?'4':'3';if(swapAfter)frame.contentDocument={};}};
 const ctx={document:top,run:{runId:'r'},count:0,completed:new Set(),S:{text:v=>String(v||'').trim()},
  active:()=>selected,current:()=>selected==='2'&&(!phase||!change),guard(){if(phase&&stop||clicked&&stopAfter)throw Error('Stopped');},verifyEntered(){if(phase&&changedValues)throw Error('An answer changed');},
  $:()=>missing?null:button,enabled:e=>!!e,visible:e=>e===notice?!hidden:true,
  all:(selector,scope)=>selector==='.control_buttons input[ref]'?[tab]:shown&&scope===(outer?top:doc)?[notice]:[],
  message:async()=>{phase=true;},until:async(fn,message)=>{for(let i=0;i<8;i++){polls++;if(clicked&&graded&&delayed&&polls>=3)tabGraded=true;if(!clicked&&stale&&!neverClear&&polls===2)shown=false;if(fn())return true;}throw Error(message);}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  function journalRecordNotice('),source.indexOf('  async function resume(')),ctx);
 let error;try{await ctx.recordJournal(snap,1);}catch(e){error=e;}
 return {error,clicked,polls};
}
(async()=>{
 for(const options of [{graded:true},{toast:true},{toast:true,outer:true},{toast:true,stale:true},{graded:true,advance:true},{graded:true,advance:true,delayed:true},{toast:true,advance:true}]){const r=await scenario(options);assert.ifError(r.error);assert.equal(r.clicked,1);}
 for(const options of [{},{toast:true,hidden:true},{toast:true,wrong:true}]){const r=await scenario(options);assert.match(r.error.message,/did not confirm/);assert.equal(r.clicked,1,'never retries Record without confirmation');}
 const stale=await scenario({toast:true,stale:true,neverClear:true});assert.match(stale.error.message,/previous Record/);assert.equal(stale.clicked,0,'an old success toast cannot confirm another transaction');
 for(const options of [{stop:true},{change:true},{changedValues:true},{missing:true}]){const r=await scenario(options);assert(r.error);assert.equal(r.clicked,0);}
 for(const options of [{advance:true},{graded:true,advance:true,unexpected:true},{graded:true,swapAfter:true},{graded:true,stopAfter:true}]){const r=await scenario(options);assert(r.error);assert.equal(r.clicked,1,'a failed automatic handoff never repeats Record');}
 console.log('PASS journal record confirms fresh native success or graded tab, rejects stale/hidden/unrelated notices and preserves Stop, identity, entered-value and single-click guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
