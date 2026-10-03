let fixtureEditor;window.StudyMonitor={setEditor:e=>fixtureEditor=e,setRecovery:()=>{},setReplacement:()=>{},notice:()=>{}};
const boot=JSON.parse(sessionStorage.getItem('mindtap-reload-test')||'null');
let listener,storageListener,index=boot?.index||0,scenario=boot?'reload':'save',run=boot?.run||null,prompts=boot?.prompts||[],saved=boot?.saved||[],graded=0,submitted=0;
const config={autoFill:false,pauseBeforeSubmit:false,showExplanation:true,gradeBeforeAdvance:false,pacingMode:'normal'};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const dropdown='<span class="q4-select-container"><span class="q4-select-label">Select an answer, dropdown menu 1</span><span class="q4-select-hitarea" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false"><span class="q4-select-content">&nbsp;</span></span><span class="q4-select-box-container" style="display:none"><ul class="q4-select-box" role="listbox"><li class="q4-select-box-option" role="option" aria-selected="false">households</li><li class="q4-select-box-option" role="option" aria-selected="false">firms</li></ul></span></span>';
const native=(type,name,options)=>'<div class="q4-choice" role="'+(type==='radio'?'radiogroup':'group')+'">'+options.map((v,i)=>'<div><input class="q4-choice-option-input" type="'+type+'" name="'+name+'" id="'+name+i+'"><label for="'+name+i+'">'+v+'</label></div>').join('')+'</div>';
const row=(n,text)=>'<tr class="q4-categorizationTable-choose"><td class="q4-categorizationTable-choice-prompt">'+text+'</td>'+['Factors','Goods'].map(v=>'<td><input class="q4-categorizationTable-choice-option-input" type="radio" name="row'+n+'" aria-label="'+v+'"></td>').join('')+'</tr>';
const problems=[
'<div class="q4-part"><div class="q4-task"><div class="q4-task-content"><div class="q4-prompt">Firms buy labor from '+dropdown+'.</div><table class="q4-categorizationTable"><thead><tr><th>Event</th><th>Factors</th><th>Goods</th></tr></thead><tbody>'+row(1,'Worker earns wages')+row(2,'Customer buys shampoo')+'</tbody></table></div></div></div><div class="q4-part"><div class="q4-task"><div class="q4-prompt">Select all outputs.</div>'+native('checkbox','checks',['Shampoo','Labor','Sleep test'])+'</div></div><div class="q4-part"><div class="q4-task"><div class="q4-prompt">GDP measures total final expenditures.</div>'+native('radio','truth',['True','False'])+'</div></div>',
'<div class="q4-part"><div class="q4-task"><div class="q4-prompt">Complete this numeric, text, and native select fixture.</div><table><tr><td>Numeric result</td><td><span class="q4-numericEntry-control-span"><span class="q4-numericEntry-control"><input type="text" aria-label="Numeric result"></span></span></td></tr><tr><td>Short answer</td><td><input type="text" aria-label="Short answer"></td></tr><tr><td>Category</td><td><select aria-label="Category"><option value="">Choose</option><option value="91">Assets</option><option value="92">Liabilities</option></select></td></tr></table></div></div>'
];
const answers=[{f0:'households',f1:'Factors',f2:'Goods',f3:['Shampoo','Sleep test'],f4:'True'},{f0:'3.5',f1:'example',f2:'Assets'}];
window.chrome={storage:{local:{get:async()=>({studyOnboarding:{version:1,acknowledged:true,completed:true}})},sync:{get:async()=>({platformMode:'auto',platformSettings:{mindtap:{...config}}})},onChanged:{addListener:f=>storageListener=f}},runtime:{onMessage:{addListener:f=>listener=f},sendMessage:async m=>{
 if(m.type==='mindtapRunState')return run?{...run}:{running:false};
 if(m.type==='mindtapRunStart'){run={running:true,runId:'test-run',count:0,done:[],phase:'answer',lastKey:''};return run;}
 if(m.type==='mindtapRunStop'){run=null;return {received:true};}
 if(m.type==='mindtapRunUpdate'){if(run)Object.assign(run,m);if((scenario==='nav-stop'&&m.phase==='advance')||(scenario==='grade-stop'&&m.phase==='grade')){document.body.dataset.actionPending='true';await delay(400);}return {received:true};}
 if(m.type==='mindtapCancel')return {received:true};
 if(m.type!=='mindtapQuestion')return {received:false};prompts.push(m.prompt);
 const a=scenario==='invalid'?{...answers[index],f1:'Unlisted answer'}:answers[index];
 const response=JSON.stringify({requestId:m.id,snapshotHash:m.snapshotHash,answer:a,explanation:'Simulated AI reply for MindTap control verification.'});
 setTimeout(()=>listener({type:'mindtapAnswer',id:m.id,response},{},()=>{}),['stop','stale'].includes(scenario)?700:50);return {received:true};
}}};
const host=document.getElementById('quiz'),results=document.getElementById('results');
function values(){return {dropdown:host.querySelector('.q4-select-content')?.textContent.trim(),inputs:[...host.querySelectorAll('input')].map(e=>({name:e.name,label:e.getAttribute('aria-label'),value:e.type==='radio'||e.type==='checkbox'?e.checked:e.value})),select:host.querySelector('select')?.value};}
function render(){
 if(index===2){host.innerHTML='<h2>Assignment list — simulated completion</h2><button id="final">I’m Done, Submit Assignment Now</button>';document.getElementById('final').onclick=()=>submitted++;return;}
 let body=problems[index];if(scenario==='diagram')body+='<canvas width="200" height="100"></canvas>';
 if(scenario==='existing')body=body.replace('type="checkbox" name="checks"','type="checkbox" checked name="checks"');
 const review=scenario==='review';
 host.innerHTML='<section id="quiz-cip" class="q4-problem"><h2 class="q4-problem-title">'+(index+1)+'. Simulated '+(index?'numeric and text':'multipart choices')+' problem</h2><div class="q4-container-root">'+body+(review?'<div class="q4-explanation">REVIEW ANSWER MUST NOT BE SENT</div>':'')+'<div class="q4-numericEntry-answer" hidden>HIDDEN ANSWER MUST NOT BE SENT</div></div><div id="saveAndContinueButtonDiv" style="display:'+(!review&&!['grade','grade-off','grade-stop'].includes(scenario)?'block':'none')+'"><button>Save &amp; Continue</button></div><div id="gradeItNowButtonDiv" style="display:'+(!review&&['grade','grade-off','grade-stop'].includes(scenario)?'block':'none')+'"><button>Grade It Now</button></div><div id="nextQuestionButtonDiv" style="display:'+(review?'block':'none')+'"><button>Continue</button></div><button id="final">I’m Done, Submit Assignment Now</button></section>';
 host.querySelectorAll('.q4-select-container').forEach(container=>{const hit=container.querySelector('.q4-select-hitarea'),box=container.querySelector('.q4-select-box-container');hit.onclick=()=>{box.style.display='block';hit.setAttribute('aria-expanded','true');};container.querySelectorAll('[role="option"]').forEach(option=>option.onclick=()=>{container.querySelectorAll('[role="option"]').forEach(o=>o.setAttribute('aria-selected',String(o===option)));container.querySelector('.q4-select-content').textContent=option.textContent;box.style.display='none';hit.setAttribute('aria-expanded','false');});});
 document.getElementById('final').onclick=()=>submitted++;
 const next=()=>{saved.push(values());index++;if(scenario==='reload'&&index===1){sessionStorage.setItem('mindtap-reload-test',JSON.stringify({index,run,saved,prompts}));location.reload();}else render();};
 host.querySelector('#saveAndContinueButtonDiv button').onclick=next;
 host.querySelector('#gradeItNowButtonDiv button').onclick=()=>{graded++;host.querySelector('#gradeItNowButtonDiv').style.display='none';host.querySelector('#nextQuestionButtonDiv').style.display='block';};
 host.querySelector('#nextQuestionButtonDiv button').onclick=next;
}
const panel=()=>document.getElementById('mindtap-assistant-panel').shadowRoot;
function assert(ok,text){if(!ok)throw Error(text);results.textContent+='\nPASS: '+text;}
async function until(fn,timeout=16000){const begin=Date.now();while(!fn()){if(Date.now()-begin>timeout)throw Error('Timeout: '+panel().getElementById('status').textContent);await delay(40);}}
async function test(name){try{
 sessionStorage.removeItem('mindtap-reload-test');scenario=name;index=0;run=null;prompts=[];saved=[];graded=submitted=0;config.pauseBeforeSubmit=name==='pause';config.pacingMode=name==='guided'?'review':'normal';config.gradeBeforeAdvance=['grade','grade-stop'].includes(name);delete document.body.dataset.actionPending;notifySettings({pauseBeforeSubmit:{newValue:config.pauseBeforeSubmit},gradeBeforeAdvance:{newValue:config.gradeBeforeAdvance},pacingMode:{newValue:config.pacingMode}},'sync');render();results.textContent=name;panel().querySelector('details').open=true;panel().getElementById('start').click();await until(()=>prompts.length>0||/review|manual entry|No completely/i.test(panel().getElementById('status').textContent));
 if(['nav-stop','grade-stop'].includes(name)){await until(()=>document.body.dataset.actionPending==='true');panel().getElementById('stop').click();await delay(550);assert(saved.length===0&&graded===0,'Stop during pending storage acknowledgment prevents save/grade');}
 else if(name==='guided'){await until(()=>panel().getElementById('status').textContent.includes('Guided answer ready'));assert(prompts.length===1&&!values().dropdown&&saved.length===0,'Guided answer leaves site fields untouched');assert(panel().getElementById('fill').disabled&&graded===0&&submitted===0,'Guided answer cannot fill or submit');}
 else if(name==='stop'){await until(()=>prompts.length===1);panel().getElementById('stop').click();await delay(900);assert(!values().dropdown&&saved.length===0,'Stop rejects late answers');}
 else if(name==='stale'){await until(()=>prompts.length===1);host.querySelector('.q4-prompt').append(' Changed prompt');await until(()=>!run);assert(!values().dropdown&&saved.length===0,'Changed question rejects stale answer');}
 else if(['review','diagram','existing','invalid','grade-off'].includes(name)){
  await until(()=>!run);assert(saved.length===0&&graded===0&&submitted===0,'No save, grade or final submit');
  if(['review','diagram','existing'].includes(name))assert(prompts.length===0,'Review, media, and existing answers preserved');
  if(name==='invalid')assert(!values().dropdown,'Invalid option stops before any fill');
  if(name==='grade-off')assert(values().dropdown==='households','Answers filled but no grading attempt used');
 }else{
  if(name==='pause'){for(let n=0;n<2;n++){await until(()=>!panel().getElementById('resume').hidden);assert(saved.length===n,'Paused before saving problem '+(n+1));panel().getElementById('resume').click();await until(()=>panel().getElementById('resume').hidden);}}
  await until(()=>!run);assert(saved.length===2&&prompts.length===2,'Two AI round trips and two save/advance actions');assert(submitted===0,'Final assignment submission remains manual');
  const first=saved[0];assert(first.dropdown==='households','Custom Aplia dropdown retained');assert(first.inputs[0].value&&!first.inputs[1].value&&!first.inputs[2].value&&first.inputs[3].value,'Table-row labels route radio choices separately');assert(first.inputs[4].value&&!first.inputs[5].value&&first.inputs[6].value&&first.inputs[7].value,'Checkbox and true/false choices retained');assert(saved[1].inputs[0].value==='3.5'&&saved[1].inputs[1].value==='example'&&saved[1].select==='91','Numeric, short text, and option IDs retained');assert(graded===(name==='grade'?2:0),'Grading only when enabled');
 }
 assert(prompts.every(p=>!p.includes('HIDDEN ANSWER')&&!p.includes('REVIEW ANSWER')),'Hidden answers and explanations excluded');results.textContent+='\nALL CHECKS PASSED';
}catch(e){results.textContent+='\nFAIL: '+e.message;panel().getElementById('stop').click();}}
for(const name of ['save','reload','grade','pause','guided','nav-stop','grade-stop','grade-off','stop','stale','invalid','review','diagram','existing']){const b=document.createElement('button');b.textContent='Test '+name;b.onclick=()=>test(name);document.getElementById('cases').append(b);}
render();

if(boot){results.textContent='reload';(async()=>{try{await until(()=>document.getElementById('mindtap-assistant-panel')&&!run);assert(saved.length===1&&prompts.length===1,'Reload stops instead of silently resuming');assert(saved[0].dropdown==='households','Confirmed pre-reload answer retained');assert(submitted===0,'No final submission');sessionStorage.removeItem('mindtap-reload-test');results.textContent+='\nALL CHECKS PASSED';}catch(e){results.textContent+='\nFAIL: '+e.message;}})();}

function notifySettings(changes,area){const old={...config};for(const [key,c] of Object.entries(changes))old[key]=!c.newValue;storageListener?.({platformSettings:{oldValue:{mindtap:old},newValue:{mindtap:{...config}}}},area);}

const editTest=document.createElement('button');editTest.textContent='Test answer editing';document.getElementById('cases').append(editTest);
editTest.onclick=async()=>{try{
 scenario='save';index=0;render();results.textContent='Answer editor';panel().querySelector('details').open=true;panel().getElementById('ask').click();await until(()=>fixtureEditor?.canEdit());
 const draft=fixtureEditor.read(),valuesToSave=Object.fromEntries(draft.fields.map(f=>[f.key,f.value]));assert(draft.fields[0].type==='single'&&draft.fields[3].type==='multiple','Custom dropdown and checkbox groups are editable');
 valuesToSave.f0='firms';valuesToSave.f3=['Labor'];fixtureEditor.apply(valuesToSave);assert(!values().dropdown&&saved.length===0,'Saving edits neither fills nor saves the problem');
 panel().getElementById('fill').click();await until(()=>values().dropdown==='firms');assert(values().inputs[5].value&&!values().inputs[4].value,'Edited checkbox group is used by Fill');assert(!fixtureEditor.canEdit()&&submitted===0&&saved.length===0,'Draft locks after fill; no final submission or automatic save');results.textContent+='\nALL CHECKS PASSED';
 }catch(e){results.textContent+='\nFAIL '+e.message;}};
