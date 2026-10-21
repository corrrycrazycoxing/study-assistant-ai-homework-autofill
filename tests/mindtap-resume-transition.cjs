const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('content-scripts/mindtap.js','utf8');
const start=source.indexOf('  async function waitForResumeTarget(');
const end=source.indexOf('  async function start(resumed=null)',start);
assert(start>=0&&end>start,'resume transition wait helper should exist');

async function exercise(resumed,initial,next,timeout=100){
  let root=initial;
  const context={
    Date,
    running:true,
    generation:1,
    questionRoots:()=>root?[root]:[],
    snapshot:node=>node,
    action:()=>true,
    delay:ms=>new Promise(resolve=>setTimeout(resolve,Math.min(ms,2))),
    waitFor:async(read,mine,timeout)=>{
      const started=Date.now();
      while(context.running&&mine===context.generation){if(await read())return true;if(Date.now()-started>timeout)throw Error('transition timed out');await context.delay(2);}
      throw Error('stopped');
    }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start,end)+';this.waitForResumeTarget=waitForResumeTarget;',context);
  if(next)setTimeout(()=>{root=next;},8);
  return context.waitForResumeTarget(resumed,timeout);
}

(async()=>{
  const previous={key:'old',title:'Question 1',unansweredFields:[{}]},next={key:'new',title:'Question 2',unansweredFields:[{}]};
  assert.equal(await exercise({phase:'advance',lastKey:'old'},null,next),true,'resume should wait for a newly rendered next question');
  assert.equal(await exercise({phase:'advance',lastKey:'old'},previous,next),true,'a still-visible previous question should not block a later transition');
  assert.equal(await exercise({phase:'advance',lastKey:'old'},previous,null,20),false,'resume should stop safely if navigation never leaves the prior question');
  assert.equal(await exercise({phase:'grade',lastTitle:'Question 1'},null,previous),true,'grade recovery should wait for the same question to return');
  assert.equal(await exercise({phase:'grade',lastTitle:'Question 1'},null,next,20),false,'grade recovery must not mistake a different problem for the graded one');
  let root=previous;
  const context={Date,running:true,generation:1,assignmentRun:false,assignmentOverview:()=>false,questionRoots:()=>root?[root]:[],snapshot:node=>node,action:()=>true,delay:ms=>new Promise(resolve=>setTimeout(resolve,Math.min(ms,2))),waitFor:async(read,mine,timeout)=>{const started=Date.now();while(context.running&&mine===context.generation){const value=await read();if(value)return value;if(Date.now()-started>timeout)throw Error('transition timed out');await context.delay(2);}throw Error('stopped');}};
  vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.waitForNextQuestion=waitForNextQuestion;',context);
  setTimeout(()=>{root=null;},4);setTimeout(()=>{root=next;},14);
  assert.equal(await context.waitForNextQuestion('old',1,100),'question','in-page navigation should wait through a temporary empty render');
  context.assignmentRun=true;context.assignmentOverview=()=>true;
  assert.equal(await context.waitForNextQuestion('old',1,100),'overview','full assignment runs should detect the return to the Aplia question list');
  console.log('MindTap transition-resume regression checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
