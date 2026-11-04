const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const helpers=source.slice(source.indexOf('  function handleUncheckedWarning('),source.indexOf('  async function skipCourseQuestion('));
const incompleteText="Important You have not completed this question; you will receive credit only for the work you’ve done. Are you sure you want to leave this question?";
const warningText='Warning You will not receive any credit for this attempt until you have checked your answer. Are you sure you want to continue without checking your answer?';
async function scenario({allow=false,course=true,warning=warningText,stop=false,timeout=false,nested=false,ambiguous=false}={}){
  let open=false,moved=false,yes=0,no=0,save=0;
  const button=label=>({textContent:label,getAttribute:()=>null,value:'',click:()=>{if(label==='Yes'){yes++;moved=true;}else no++;open=false;}});
  const dialog={textContent:warning,contains:()=>false,querySelectorAll:()=>[button('Yes'),button('No')]};
  const outer={...dialog,contains:el=>el===dialog};const other={...dialog};
  const ctx={running:true,courseRun:course,runId:'run',runCount:0,loopGeneration:1,clean:value=>String(value||'').trim(),usable:()=>true,say:()=>{},document:{body:{},querySelector:()=>({textContent:'Question '+(moved?2:1)}),querySelectorAll:selector=>{assert(selector.includes('[role=\"alertdialog\"]'));return open?(ambiguous?[dialog,other]:nested?[outer,dialog]:[dialog]):[];}},snapshot:()=>({signature:moved?'new':'old',problemKey:moved?'q2':'q1',text:'Question',fields:[{}]}),nextButton:()=>({click:()=>{open=true;}}),resultDialog:()=>null,chrome:{runtime:{sendMessage:async message=>{if(message.type==='pearsonCoursePlayerDone')save++;return {received:true};}}},waitUntil:async read=>{if(stop){ctx.running=false;throw Error('Stopped.');}for(let attempt=0;attempt<3;attempt++){const value=read();if(value)return value;}throw Error(timeout?'Timeout.':'Warning was not handled.');}};
  vm.createContext(ctx);vm.runInContext(helpers,ctx);
  let error;try{await ctx.advance({signature:'old',problemKey:'q1',fields:[{}]},{skipUnchecked:allow});}catch(e){error=e;}
  return {yes,no,save,moved,error};
}
(async()=>{
  const skip=await scenario({allow:true});assert.equal(skip.yes,1,'a banked course skip can confirm this exact warning');assert.equal(skip.moved,true);assert.equal(skip.error,undefined);
  for(const warning of [incompleteText,incompleteText.replace('you want','want').replace('you’ve',"you've")]){
    const skipped=await scenario({allow:true,warning,nested:true});assert.equal(skipped.yes,1,'banked skips handle Pearson’s incomplete-question variant once');assert.equal(skipped.moved,true);assert.equal(skipped.error,undefined);
    const protectedAnswer=await scenario({warning});assert.equal(protectedAnswer.no,1);assert.equal(protectedAnswer.yes,0);assert.match(protectedAnswer.error.message,/kept the question open/);
  }
  const ambiguous=await scenario({allow:true,warning:incompleteText,ambiguous:true});assert.equal(ambiguous.yes,0);assert.match(ambiguous.error.message,/ambiguous/);
  const incompleteStop=await scenario({allow:true,warning:incompleteText,stop:true});assert.equal(incompleteStop.yes,0);
  const normal=await scenario();assert.equal(normal.no,1);assert.equal(normal.yes,0);assert.match(normal.error.message,/not been checked/,'normal navigation keeps unchecked answers open');
  const regular=await scenario({allow:true,course:false});assert.equal(regular.yes,0,'single-assignment navigation never inherits Course Auto skip permission');
  const unrelated=await scenario({allow:true,warning:'Are you sure you want to submit this assignment?'});assert.equal(unrelated.yes,0);assert.equal(unrelated.no,0);assert.equal(unrelated.save,0,'an unrelated modal/timeout must not trigger Save');
  const cancelled=await scenario({allow:true,stop:true});assert.equal(cancelled.yes,0);assert.equal(cancelled.save,0,'Stop cannot continue navigation or fall through to saving');
  const skipSource=source.slice(source.indexOf('  async function skipCourseQuestion('),source.indexOf('  async function startAuto('));
  let permit=null;const ctx={courseRun:true,running:true,pending:null,answer:null,responseWaiter:null,timer:null,apply:{},cancel:{},courseRecovery:false,correction:null,clearTimeout,clean:value=>value,document:{querySelectorAll:()=>[{textContent:'Question 1'}]},say:()=>{},advance:async(before,options)=>{permit=options;return true;},chrome:{runtime:{sendMessage:async()=>({received:false})}}};vm.createContext(ctx);vm.runInContext(skipSource,ctx);
  await assert.rejects(ctx.skipCourseQuestion('Missing source',{}),/Could not record/);assert.equal(permit,null,'failed issue banking cannot grant permission to leave unchecked');
  ctx.chrome.runtime.sendMessage=async()=>({received:true});await ctx.skipCourseQuestion('Missing source',{});assert.equal(permit.skipUnchecked,true);
  console.log('PASS Pearson banked skip warning, normal unchecked-answer protection, unrelated dialog rejection and Stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
