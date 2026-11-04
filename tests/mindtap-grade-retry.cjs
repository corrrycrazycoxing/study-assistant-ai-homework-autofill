const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mindtap.js','utf8');
const text=value=>({textContent:value,getAttribute:()=>null});
function resultRoot(points,{message='',tasks=1}={}){
 const scores=points.map(text),markers=message?[text(message)]:[],task={querySelectorAll:()=>[{closest:()=>null}]};
 return {title:'5. Native problem',key:'old',text:'Native prompt',unansweredFields:[],
  querySelector:()=>({textContent:'5. Native problem'}),querySelectorAll:selector=>selector==='.q4-task-scoring'?scores:selector==='.q4-task'?Array.from({length:tasks},()=>task):markers};
}
function environment({points=['1 / 1'],message='',retry=true,stopAt='',alreadyGraded=false}={}){
 const clicks=[],updates=[],states=[],old=resultRoot(points,{message}),fresh=resultRoot([]);fresh.key='fresh';fresh.unansweredFields=[{}];
 let root=old,graded=alreadyGraded;
 const next={click:()=>{clicks.push('next');root={...fresh,title:'6. Next problem'};}},save={click:()=>clicks.push('save')};
 const grade={click:()=>{clicks.push('grade');graded=true;}},another={click:()=>{clicks.push('retry');root=fresh;graded=false;}};
 const context={clean:value=>String(value??'').replace(/\s+/g,' ').trim(),visible:()=>true,running:true,generation:1,correction:null,retryCount:0,pending:{id:'original'},answer:{f0:'wrong'},done:new Set(),count:0,assignmentRun:false,courseRun:false,
  settings:{gradeBeforeAdvance:false},questionRoots:()=>[root],snapshot:r=>r,editable:()=>!graded,action:id=>id==='gradeItNowButtonDiv'?!graded?grade:null:id==='nextQuestionButtonDiv'?graded?next:null:id==='saveAndContinueButtonDiv'?save:id==='retryQuestionButtonDiv'?graded&&retry?another:null:null,
  update:async(phase,key,title)=>{updates.push({phase,key,title});if(phase===stopAt)context.running=false;},say:value=>states.push(value),waitFor:async read=>{if(!context.running)throw Error('Stopped.');const value=await read();if(!value)throw Error('timeout');return value;},waitForNextQuestion:async()=> 'question'};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('  function gradingResult('),source.indexOf('  async function waitForResumeTarget(')),context);
 return {context,clicks,updates,states,old,fresh};
}
(async()=>{
 let test=environment();assert.equal(await test.context.advance(test.old,1),true);
 assert.deepEqual(test.clicks,['grade','next'],'Grade It Now takes priority over Save & Continue, regardless of the legacy opt-in');assert.equal(test.context.count,1);
 test=environment({points:['0.5 out of 1'],message:'Partially correct'});assert.equal(await test.context.advance(test.old,1),true);
 assert.deepEqual(test.clicks,['grade','retry'],'a rejected attempt never follows Next');assert.equal(test.context.count,0);assert.equal(test.context.done.size,0);
 assert.equal(test.context.correction.previousAnswer.f0,'wrong');assert.equal(test.context.pending,null);assert.equal(test.updates[1].phase,'retry');
 test=environment({points:['0 / 1'],retry:false});await assert.rejects(test.context.advance(test.old,1),/no available retry/);assert.deepEqual(test.clicks,['grade']);
 test=environment({points:[],message:'One part is correct'});await assert.rejects(test.context.advance(test.old,1),/correctness could not be confirmed/);assert.deepEqual(test.clicks,['grade'],'a Next button alone is not proof of correctness');
 test=environment({points:['1 / 1'],message:'Incorrect'});await test.context.advance(test.old,1);assert.deepEqual(test.clicks,['grade','retry'],'negative feedback wins over a full score elsewhere');
 test=environment({stopAt:'grade'});await assert.rejects(test.context.advance(test.old,1),/Stopped/);assert.deepEqual(test.clicks,[],'Stop while persisting the grade phase prevents grading');
 test=environment({points:['0 / 1'],stopAt:'retry'});await assert.rejects(test.context.advance(test.old,1),/Stopped/);assert.deepEqual(test.clicks,['grade'],'Stop before retry prevents another attempt');
 test=environment({points:['0 / 1'],alreadyGraded:true});await test.context.advance(test.old,1,{alreadyGraded:true});assert.deepEqual(test.clicks,['retry'],'resuming a grading transition checks the result instead of blindly clicking Next');
 test=environment({points:['0 / 1']});test.context.retryCount=10;await assert.rejects(test.context.advance(test.old,1),/retry limit/);assert.deepEqual(test.clicks,['grade']);
 test=environment();assert.equal(test.context.gradingResult(resultRoot(['1 / 1'],{tasks:2})).kind,'','one scored task cannot certify another unanswered task');
 assert.equal(test.context.gradingResult(resultRoot(['0 / 1'],{message:'All answers are correct'})).kind,'incorrect');
 const mixed=resultRoot(['1 / 1','1 / 1']);const query=mixed.querySelectorAll;
 mixed.querySelectorAll=selector=>selector==='.q4-task'?[{querySelectorAll:()=>[{closest:()=>null}]},{querySelectorAll:selector=>selector.includes('svg')?[{tagName:'svg',closest:()=>null}]:[]}]:query(selector);
 assert.equal(test.context.gradingResult(mixed).kind,'correct','graph-only answer tasks participate in the full-score task count');
 mixed.querySelectorAll=selector=>selector==='.q4-task-scoring'?[text('1 / 1'),text('0 / 1')]:selector==='.q4-task'?[{querySelectorAll:()=>[{closest:()=>null}]},{querySelectorAll:()=>[{tagName:'svg',closest:()=>null}]}]:[];
 assert.equal(test.context.gradingResult(mixed).kind,'incorrect','numeric correctness cannot hide a wrong graph');
 console.log('PASS MindTap grade-first, scoped correctness, incorrect/native retry, exhausted/unclear Stop, interrupted transitions and no blind Next');
})().catch(error=>{console.error(error);process.exitCode=1;});
