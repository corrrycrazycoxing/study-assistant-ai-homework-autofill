const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
function fixture({retain=true,unknown=false}={}){
 let selected=null,clicks=0,valid=true;
 const scope={contains:e=>e===scope||buttons.includes(e)},buttons=['True','False'].map(name=>({tagName:'BUTTON',type:'button',isConnected:true,parentElement:scope,disabled:false,
 get textContent(){return name+' , '+(selected===name?'selected':'unselected');},getAttribute:()=>null,click(){clicks++;if(retain)selected=name;}}));
 const ctx={settings:{replaceExisting:false},S:{text:v=>String(v||'').trim()},StudyMedia:{videos:()=>[]},StudyConfig:{assignLabels(){},answerLabel:()=>'True or False'},StudySecurity:{snapshot:()=>({})},window:{top:null},
 questionScope:()=>scope,root:()=>scope,problemText:()=> 'Knowledge Check 01',mediaControl:()=>false,inputVisible:()=>true,visible:()=>true,enabled:e=>e&&!e.disabled,
 all:(selector,owner)=>selector==='button,[role="button"]'?unknown?[{textContent:'Choose an answer',getAttribute:()=>null}]:buttons:[], $:()=>null,
 current:()=>valid,guard(){if(!valid)throw Error('Stopped');},label:e=>e.textContent,
 pacer:{beforeField:async()=>{}},until:async(fn,message)=>{for(let i=0;i<4;i++)if(fn())return;throw Error(message);}};
 ctx.window.top=ctx.window;vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('  function trueFalseState('),source.indexOf('  async function readyAccounting(')),ctx);
 vm.runInContext(source.slice(source.indexOf('  function validateNative('),source.indexOf('  async function fillWorksheet(')),ctx);
 return {ctx,buttons,get clicks(){return clicks;},set selected(value){selected=value;},stop(){valid=false;}};
}
(async()=>{
 const f=fixture(),snap=f.ctx.ordinarySnapshot({key:'q1',question:'Installment note statement.'});
 assert.equal(snap.fields.length,1);assert.equal(snap.fields[0].buttonChoice,true);assert.deepEqual(Array.from(snap.fields[0].options),['True','False']);
 await f.ctx.fillNative(snap,{f0:'True'},0);assert.equal(f.clicks,1);assert.equal(f.ctx.trueFalseState(f.buttons[0]).selected,true);
 await f.ctx.fillNative(snap,{f0:'True'},0);assert.equal(f.clicks,1,'same existing selection does not click again');
 f.selected='False';await assert.rejects(f.ctx.fillNative(snap,{f0:'True'},0),/Existing answers differ/);assert.equal(f.clicks,1);
 f.ctx.settings.replaceExisting=true;await f.ctx.fillNative(snap,{f0:'True'},0);assert.equal(f.clicks,2);
 await assert.rejects(f.ctx.fillNative(snap,{f0:'not an option'},0),/did not match/);
 f.stop();await assert.rejects(f.ctx.fillNative(snap,{f0:'False'},0),/Stopped/);assert.equal(f.clicks,2);
 const lost=fixture({retain:false}),lostSnap=lost.ctx.ordinarySnapshot({key:'q1',question:'Statement'});await assert.rejects(lost.ctx.fillNative(lostSnap,{f0:'True'},0),/did not retain/);assert.equal(lost.clicks,1);
 const unsupported=fixture({unknown:true});unsupported.ctx.problemText=()=> 'Video overview';unsupported.ctx.StudyMedia.videos=()=>[{}];assert.equal(unsupported.ctx.informationPage({}),false,'an unknown answer button is never skipped as a video');
 const video=fixture();video.ctx.all=()=>[];video.ctx.problemText=()=> 'Chapter framework video';video.ctx.StudyMedia.videos=()=>[{}];assert.equal(video.ctx.informationPage({}),true,'a genuine field-free video can advance');
 assert.equal(f.ctx.trueFalseState({textContent:'True , unselected',getAttribute:name=>name==='aria-label'?'True':null}).selected,false,'a short aria-label does not hide the native state text');
 assert.equal(f.ctx.trueFalseState({textContent:'False',getAttribute:name=>name==='aria-pressed'?'true':null}).selected,true);
 assert.equal(f.ctx.trueFalseState({textContent:'True',getAttribute:()=>null}),null,'plain text with no native state is not enough to fill');
 console.log('PASS native True/False button capture, selection verification, preserve/replace, invalid/Stop/retention guards and field-free video versus unsupported-button distinction');
})().catch(e=>{console.error(e);process.exitCode=1;});
