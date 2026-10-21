const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const code=source.slice(source.indexOf('  async function startAuto('),source.indexOf('\n  function mount()',source.indexOf('  async function startAuto(')));
async function scenario({failure='answer',cancel=false}={}){
  let question=1;const skipped=[],filled=[],calls=[];
  const context={running:false,preparePlayerStartup:async()=>{},settingsReady:Promise.resolve(),settings:{pacingMode:'normal',pauseBeforeSubmit:false},guided:false,loopGeneration:0,courseRun:true,runId:null,runCount:0,correction:null,responseWaiter:null,
    startButton:{},stopButton:{},ask:{},clean:value=>value.trim(),document:{querySelector:()=>({textContent:'Question '+question})},
    snapshot:()=>{if(question===1&&failure==='unreadable')throw Error('Pearson choices cannot be identified uniquely.');return ({text:'Question '+question,problemKey:'q'+question,signature:'q'+question,fields:question===1&&failure==='no-fields'?[]:[{el:{isConnected:true}}],incomplete:question===1&&failure==='incomplete',missingSource:question===1&&failure==='source',hasDiagram:question===1&&failure==='image'});},
    chrome:{runtime:{sendMessage:async message=>{calls.push(message);return {running:true,runId:'run'};}}},
    request:async()=>{if(question===1){if(cancel){context.running=false;context.loopGeneration++;}if(failure==='request')throw Error('Required linked source did not open.');context.responseWaiter.reject(Error('AI could not determine the requested value.'));context.responseWaiter=null;}else{context.responseWaiter.resolve([]);context.responseWaiter=null;}},
    fill:async()=>{filled.push(question);return [{}];},playerState:async()=>({mode:'test'}),pacer:{afterQuestion:async()=>{}},say:()=>{},
    skipCourseQuestion:async reason=>{skipped.push({question,reason});question++;return true;},advance:async()=>{context.running=false;return false;},
    stop:async message=>{calls.push({type:'stop',message});context.running=false;}
  };
  vm.createContext(context);vm.runInContext(code,context);await context.startAuto();return {skipped,filled,calls};
}
(async()=>{
  for(const failure of ['answer','request','no-fields','incomplete','source','image','unreadable']){
    const result=await scenario({failure});assert.equal(result.skipped.length,1,failure+' must be banked');assert.equal(result.skipped[0].question,1);assert.deepEqual(result.filled,[2],failure+' must continue to the next question without filling the failed one');assert(!result.calls.some(item=>item.type==='pearsonCoursePlayerBlocked'),failure+' must not block the course queue');
  }
  const cancelled=await scenario({cancel:true});assert.equal(cancelled.skipped.length,0,'user Stop must not skip or advance');assert.equal(cancelled.filled.length,0);
  // Use production advance: a new question without recognized fields must reach
  // the loop's bank-and-skip path rather than timing out and ending the assignment.
  let moved=false;const ctx={document:{querySelector:()=>({textContent:'Question '+(moved?2:1)})},clean:value=>value.trim(),running:true,courseRun:true,runId:'run',runCount:0,handleUncheckedWarning:()=>false,nextButton:()=>({click:()=>{moved=true;}}),resultDialog:()=>false,say:()=>{},chrome:{runtime:{sendMessage:async()=>({})}},snapshot:()=>({text:'Question 2 unsupported controls',problemKey:'q2',signature:'q2',fields:[]}),waitUntil:async read=>{assert.equal(moved,true);const value=await read();assert(value,'a readable changed question must be accepted even without recognized fields');return value;}};
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  async function advance('),source.indexOf('  async function skipCourseQuestion(')),ctx);assert.equal(await ctx.advance({problemKey:'q1',signature:'q1',fields:[]}),true);
  console.log('PASS Pearson Course Auto banks missing/failed answers, continues unsupported pages, and respects Stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
