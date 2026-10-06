const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const base=require('node:path').join(__dirname,'../');
const scope={};vm.runInNewContext(readFileSync(base+'shared/config.js','utf8'),scope);
const config=scope.StudyConfig;
const data={platformSettings:{mcgraw:{pacingMode:'human',humanSpeed:'deliberate',pauseBeforeSubmit:true},mindtap:{pacingMode:'slow',reviewSeconds:45}},pacingSettings:{pacingMode:'review',humanSpeed:'faster',reviewSeconds:60}};
for(const platform of config.platforms){
  const prefs=config.preferences(data,platform);
  assert.equal(prefs.pacingMode,'review',platform+' receives the shared mode');
  assert.equal(prefs.humanSpeed,'faster',platform+' receives the shared human speed');
  assert.equal(prefs.reviewSeconds,60,platform+' receives shared countdown settings');
}
assert.equal(config.preferences(data,'mcgraw').pauseBeforeSubmit,true,'pause-after-fill stays platform-specific');
assert.equal(config.preferences(data,'mindtap').pauseBeforeSubmit,false,'unrelated platform pause does not leak');
const legacy=config.preferences({platformSettings:{mindtap:{pacingMode:'human',humanSpeed:'deliberate',reviewSeconds:45}}},'mindtap');
assert.equal(legacy.pacingMode,'human','existing installs retain their pace before first shared save');
assert.equal(legacy.reviewSeconds,45,'existing installs retain their countdown before first shared save');
const afterMigration=config.preferences({platformSettings:{mindtap:{pacingMode:'human',reviewSeconds:45}},pacingSettings:{pacingMode:'normal'}},'mindtap');
assert.equal(afterMigration.pacingMode,'normal','once shared preferences exist, missing shared keys use shared defaults rather than leaking platform values');
assert.equal(afterMigration.reviewSeconds,30);

let listener,started;
const chrome={storage:{sync:{get:async()=>({platformSettings:{},pacingSettings:{pacingMode:'slow',humanSpeed:'typical'}})},onChanged:{addListener:fn=>listener=fn,removeListener:()=>{}}}};
const api={chrome,StudyConfig:config,Set,Promise,Object,JSON,URL};
vm.runInNewContext(readFileSync(base+'shared/platform.js','utf8'),api);
config.boot('mindtap',shim=>{started=shim;});
setImmediate(async()=>{
  const prefs=await started.storage.sync.get(['pacingMode','humanSpeed','pauseBeforeSubmit']);
  assert.equal(prefs.pacingMode,'slow');assert.equal(prefs.humanSpeed,'typical');
  assert.equal(prefs.pauseBeforeSubmit,false);
  let mapped;
  started.storage.onChanged.addListener(changes=>mapped=changes);
  listener({pacingSettings:{oldValue:{pacingMode:'slow'},newValue:{pacingMode:'human',humanSpeed:'deliberate'}}},'sync');
  assert.equal(mapped.pacingMode.newValue,'human');
  assert.equal(mapped.humanSpeed.newValue,'deliberate');
  console.log('PASS universal pace preferences, legacy migration, platform-specific pause and cross-platform live updates');
});
