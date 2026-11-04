const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const background=fs.readFileSync('background/background.js','utf8'),panel=fs.readFileSync('background/panel.js','utf8');
const context={};vm.createContext(context);vm.runInContext(background.slice(background.indexOf('function mindtapRetryState('),background.indexOf('let queue=')),context);
const value={count:2,correction:{question:'Visible question',previousAnswer:{f0:'12'},result:'incorrect',feedback:'Points: 0 / 1'}};
const saved=context.mindtapRetryState(value);assert.deepEqual(JSON.parse(JSON.stringify(saved)),value);value.correction.previousAnswer.f0='13';assert.equal(saved.correction.previousAnswer.f0,'12','stored session state is a plain independent object');
assert.throws(()=>context.mindtapRetryState({count:11,correction:null}),/Invalid/);
assert.throws(()=>context.mindtapRetryState({count:1,correction:{result:'correct',feedback:'ok'}}),/Invalid/);
assert.throws(()=>context.mindtapRetryState({count:1,correction:{result:'incorrect',feedback:'wrong',url:'untrusted'}}),/Invalid/);
assert.throws(()=>context.mindtapRetryState({count:1,correction:{result:'incorrect',feedback:'wrong',question:'x'.repeat(65000)}}),/too large/);
assert.match(background,/platform==='mindtap'&&\['grade','retry'\]\.includes\(message.phase\)&&Object.hasOwn\(message,'retryState'\)/,'only the verified MindTap run-update branch accepts retry context');
(async()=>{
 let local;Object.assign(context,{Date,checkpointAge:7*86400000,chrome:{storage:{local:{get:async()=>({checkpoints:{}}),set:async data=>local=data}}}});
 vm.runInContext(panel.slice(panel.indexOf('async function saveCheckpoint('),panel.indexOf('async function receivePageState(')),context);
 await context.saveCheckpoint({checkpointKey:'test',platform:'mindtap',phase:'retry',count:0,lastKey:'abcd1234',done:[],retryState:saved});
 const encoded=JSON.stringify(local);assert(!encoded.includes('Visible question'));assert(!encoded.includes('previousAnswer'));assert(!encoded.includes('Points:'));
 console.log('PASS bounded MindTap retry feedback survives session transitions without entering durable course checkpoints');
})().catch(error=>{console.error(error);process.exitCode=1;});
