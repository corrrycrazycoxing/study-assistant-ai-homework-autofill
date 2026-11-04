const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

const shared={URL};vm.createContext(shared);vm.runInContext(fs.readFileSync('shared/prevent-zone.js','utf8'),shared);const P=shared.StudyPreventZone;
assert(P.url('https://csuchico.prevent.zone/courses/mod/feedback/complete.php?id=57'));
assert(P.url('https://csuchico.prevent.zone/courses/mod/quiz/attempt.php?attempt=1'));
assert.equal(P.url('https://evil.example/courses/mod/feedback/complete.php?id=57'),null);
assert.equal(P.url('https://csuchico.prevent.zone/admin/index.php'),null);
assert.equal(P.titleKey('Hazing Prevention 101: Student Edition 2026 - 2027'),P.titleKey('Hazing Prevention 101: Student Edition 2026-2027'));
const items=[{title:'Initial Survey',completed:true,locked:false,pledge:false},{title:'Personal Pledge',completed:false,locked:false,pledge:true},{title:'Final Survey',completed:false,locked:false,pledge:false}];
assert.equal(P.next(items).title,'Final Survey','pledge is never selected as an automatic activity');
const control={clicks:0,click(){this.clicks++;}},snap={fields:[{key:'f0',options:['Neutral','Agree'],controls:[control,{}]}]};
assert.equal(P.plan(snap,{f0:'Neutral'})[0].el,control);assert.throws(()=>P.plan(snap,{f0:'Strongly agree'}));assert.throws(()=>P.plan(snap,{f0:'Neutral',f1:'x'}));

const session={canvasMcGrawCourse:{tab:8,items:[{title:'Hazing Prevention 101',url:'https://canvas.csuchico.edu/courses/55/assignments/83'}],index:0,phase:'launching',issues:[],listUrl:'https://canvas.csuchico.edu/courses/55/assignments',updated:1}};const updates=[];
const background={
  URL,StudyPreventZone:P,StudyConfig:{detect:()=> 'canvas'},config:async()=>({canvasOrigins:['https://canvas.csuchico.edu']}),requireSetup:async()=>{},request:async()=>({received:true}),cancel:async()=>{},
  chrome:{runtime:{id:'ext'},tabs:{get:async()=>({id:8,url:'https://canvas.csuchico.edu/courses/55/assignments/83?module_item_id=1'}),sendMessage:async()=>({received:true,title:'Hazing Prevention 101'}),update:async(id,data)=>{updates.push([id,data]);return {id,...data};}},storage:{session:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,session[k]])),set:async values=>Object.assign(session,values),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete session[key];}}}}
};vm.createContext(background);vm.runInContext(fs.readFileSync('background/prevent-zone.js','utf8'),background);
const sender={id:'ext',tab:{id:8},frameId:3,url:'https://csuchico.prevent.zone/courses/course/view.php?id=8'};
(async()=>{
  let state=await background.preventZoneCommand({type:'preventZoneState',courseUrl:'https://csuchico.prevent.zone/courses/course/view.php?id=8',courseTitle:'Hazing Prevention 101'},sender);
  assert(state.course);assert.equal(session.canvasMcGrawCourse.phase,'training');assert.equal(session.canvasMcGrawCourse.preventFrame,3);
  state=await background.preventZoneCommand({type:'preventZoneStart',courseUrl:'https://csuchico.prevent.zone/courses/course/view.php?id=8',courseTitle:'Hazing Prevention 101'},sender);assert(state.active);assert(session.preventZoneRun.active);
  await background.preventZoneCommand({type:'preventZoneProgress',courseUrl:'https://csuchico.prevent.zone/courses/course/view.php?id=8',courseTitle:'Hazing Prevention 101',status:'The pledge is excluded.',issue:'The personal pledge is excluded from Auto and remains incomplete.'},sender);
  assert.equal(session.canvasMcGrawCourse.phase,'returning');assert.equal(updates[0][1].url,session.canvasMcGrawCourse.listUrl);assert.equal(session.preventZoneRun,undefined);
  const content=fs.readFileSync('content-scripts/prevent-zone.js','utf8');assert(content.includes('choose the exact Neutral option when available'));assert(content.includes('The pledge is always left for you.'));
  const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));assert(manifest.host_permissions.includes('https://csuchico.prevent.zone/*'));assert(manifest.content_scripts.some(entry=>entry.matches.includes('https://csuchico.prevent.zone/courses/*')&&entry.js.includes('content-scripts/prevent-zone.js')&&entry.all_frames===true));
  console.log('PASS Prevent Zone exact origin, pledge exclusion, structured choices, verified Canvas ownership, course return and manifest wiring');
})().catch(error=>{console.error(error);process.exitCode=1;});
