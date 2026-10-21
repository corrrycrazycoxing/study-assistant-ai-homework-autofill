const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const code=source.slice(source.indexOf('  async function startAuto('),source.indexOf('  function mount()'));
async function scenario({failures=2,similar=true,course=true,locked=false}={}){
  let variant=0,asks=0,checks=0,advances=0,skips=0,stopped='',blocked=0;
  const heading={textContent:'Question 1'},field={id:'INE01',isConnected:true};
  const snapshot=()=>({fields:locked&&checks?[]:[{el:field,key:'f0'}],text:'variant '+variant,problemKey:'variant '+variant,signature:'variant '+variant});
  const scope={preparePlayerStartup:async()=>{},settingsReady:Promise.resolve(),settings:{pacingMode:'normal'},running:false,guided:false,loopGeneration:0,courseRun:course,runId:null,runCount:0,correction:null,responseWaiter:null,startButton:{},stopButton:{},ask:{},
    document:{querySelector:()=>heading,querySelectorAll:()=>[]},clean:s=>String(s||'').trim(),snapshot,
    request:async()=>{asks++;scope.answer={f0:'new answer '+variant};scope.responseWaiter.resolve([{el:field,key:'f0'}]);},
    fill:async()=>[{el:field,key:'f0'}],playerState:async()=>({revision:checks,correctness:checks>failures?'correct':'incorrect',fields:[]}),
    pacer:{afterQuestion:async()=>{}},waitForCheck:async()=>[{click:()=>checks++}],
    waitUntil:async read=>{const value=await read();assert(value);return value;},domFeedback:()=>checks>failures?'correct':'incorrect',closeFeedback:()=>{},delay:async()=>{},
    retrySimilarQuestion:async()=>{if(!similar)return false;variant++;return true;},skipCourseQuestion:async()=>{skips++;return false;},
    stop:async message=>{scope.running=false;stopped=message;},say:()=>{},resultDialog:()=>null,advance:async()=>{advances++;scope.running=false;return false;},
    chrome:{runtime:{sendMessage:async m=>{if(m.type==='pearsonRunStart')return {running:true,runId:'synthetic',count:0};if(m.type==='pearsonCoursePlayerBlocked')blocked++;return {received:true};}}},
  };
  vm.createContext(scope);vm.runInContext(code,scope);await scope.startAuto();
  return {variant,asks,checks,advances,skips,stopped,blocked,count:scope.runCount};
}
(async()=>{
  const recovered=await scenario();assert.equal(recovered.variant,2);assert.equal(recovered.asks,3);assert.equal(recovered.advances,1);assert.equal(recovered.count,1,'only the correct variant earns a completed-question count');
  const failed=await scenario({failures:20});assert.equal(failed.variant,3,'fresh problem keys cannot reset the retry budget');assert.equal(failed.checks,4);assert.equal(failed.advances,0,'rejected questions never advance');assert.equal(failed.skips,1,'course mode banks the exhausted question for final review');assert.equal(failed.blocked,0);assert.equal(failed.count,0,'a banked failure never counts as correct');
  const regularFailure=await scenario({failures:20,course:false});assert.equal(regularFailure.skips,0);assert.match(regularFailure.stopped,/three retries/);
  const editable=await scenario({similar:false});assert.equal(editable.asks,3);assert.equal(editable.advances,1,'without Similar Question the editable current question can be corrected');
  const locked=await scenario({similar:false,locked:true});assert.equal(locked.advances,0);assert.equal(locked.skips,1,'locked course questions are banked instead of stopping the queue');
  const regularLocked=await scenario({similar:false,locked:true,course:false});assert.match(regularLocked.stopped,/locked/);
  // Exercise the production Similar Question helper separately, including guard
  // against reusing an old snapshot and against clicking unrelated Next controls.
  const helpers=source.slice(source.indexOf('  function similarQuestionButton('),source.indexOf('  async function pauseForReview('));
  let clicked=0,signature='old';
  const button=label=>({textContent:label,getAttribute:()=>null,click:()=>{clicked++;signature='fresh';}});
  const choices=[button('Next question'),button('Submit'),button('Similar Question')];
  const ctx={running:true,runId:'id',runCount:0,document:{querySelectorAll:()=>choices},usable:()=>true,clean:s=>s,say:()=>{},delay:async()=>{},closeFeedback:()=>{},snapshot:()=>({signature,fields:[{}]}),waitUntil:async read=>{assert.equal(read().signature,'fresh');},chrome:{runtime:{sendMessage:async()=>{}}}};
  vm.createContext(ctx);vm.runInContext(helpers,ctx);assert.equal(await ctx.retrySimilarQuestion({signature:'old'}),true);assert.equal(clicked,1);
  ctx.running=false;await assert.rejects(ctx.retrySimilarQuestion({signature:'old'}),/Stopped/);assert.equal(clicked,1);
  console.log('PASS Pearson wrong-answer Similar Question retry, fresh answers, bounded failure and no premature advance');
})().catch(error=>{console.error(error);process.exitCode=1;});
