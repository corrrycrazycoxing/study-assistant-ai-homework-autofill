let fixtureEditor;window.StudyMonitor={setEditor:e=>fixtureEditor=e,setRecovery:()=>{},setReplacement:()=>{},notice:()=>{}};
let listener,storageListener,index=0,scenario='all',prompts=[],run=null,nexts=0,submits=0,backup=false,lastBackup=0,lastAnswer=null,persisted={},backups=0;
const config={autoFill:false,pauseBeforeSubmit:false,showExplanation:true};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const choice=(q,text,i,type)=>'<div class="answer"><label class="answer_row"><span class="answer_input">'+(type==='checkbox'?'<input type="hidden" value="0">':'')+'<input class="question_input" type="'+type+'" name="question_'+q+'" id="q'+q+'a'+i+'" aria-labelledby="q'+q+'label'+i+'"></span><div id="q'+q+'label'+i+'">'+text+'</div></label></div>';
const questions=[
'<div class="question multiple_choice_question" id="question_1"><h3>Question 1</h3><div class="question_text">Which statement reports assets on a specific date?</div><fieldset><legend>Group of answer choices</legend>'+['Income statement','Balance sheet','Cash flows'].map((t,i)=>choice(1,t,i,'radio')).join('')+'</fieldset></div>',
'<div class="question multiple_answers_question" id="question_2"><h3>Question 2</h3><div class="question_text">Where can ending cash be found? Select all.</div><fieldset><legend>Group of answer choices</legend>'+['Cash flows','Balance sheet','Income statement'].map((t,i)=>choice(2,t,i,'checkbox')).join('')+'</fieldset></div>',
'<div class="question numerical_question" id="question_3"><h3>Question 3</h3><div class="question_text">Compute the binomial probability for 5 trials, p=0.2, exactly 2 successes.</div><input class="question_input numerical_question_input" name="question_3" aria-label="Numeric answer"></div>',
'<div class="question fill_in_multiple_blanks_question" id="question_4"><h3>Question 4</h3><div class="question_text">Fill in colors: primary warm color <input class="question_input" name="question_4_red" aria-label="Warm color"> and primary cool color <input class="question_input" name="question_4_blue" aria-label="Cool color">.</div></div>',
'<div class="question matching_question" id="question_5"><h3>Question 5</h3><div class="question_text">Match assets and cash to their categories.</div><label>Asset category<select class="question_input" name="question_5_a"><option value="">[ Choose ]</option><option value="91">Assets</option><option value="92">Liabilities</option></select></label><label>Liquid asset<select class="question_input" name="question_5_b"><option value="">[ Choose ]</option><option value="54">Cash</option><option value="55">Equipment</option></select></label></div>',
'<div class="question short_answer_question" id="question_6"><h3>Question 6</h3><div class="question_text">Existing student answer must be preserved.</div><input class="question_input" name="question_6" value="my own answer"></div>'
];
const expected=[{f0:'Balance sheet'},{f0:['Cash flows','Balance sheet']},{f0:'0.2048'},{f0:'red',f1:'blue'},{f0:'Assets',f1:'Cash'}];
window.chrome={storage:{local:{get:async()=>({studyOnboarding:{version:1,acknowledged:true,completed:true}})},sync:{get:async()=>({platformMode:'auto',platformSettings:{canvas:{...config}}})},onChanged:{addListener:f=>storageListener=f}},runtime:{onMessage:{addListener:f=>listener=f},sendMessage:async m=>{
 if(m.type==='canvasRunState')return {running:false};
 if(m.type==='canvasRunStart'){run={running:true,runId:'test-run',count:0,done:[]};return run;}
 if(m.type==='canvasRunStop'){run=null;return {received:true};}
 if(m.type==='canvasRunUpdate'){if(run)Object.assign(run,{count:m.count,done:m.done});return {received:true};}
 if(m.type==='canvasCancel')return {received:true};
 if(m.type!=='canvasQuestion')return {received:false};
 prompts.push(m.prompt);const number=m.prompt.includes('Which statement')?0:m.prompt.includes('ending cash')?1:m.prompt.includes('binomial probability')?2:m.prompt.includes('Fill in colors')?3:4;
 const a=scenario==='invalid'?{f0:'Not an option'}:expected[number];
 const reply=JSON.stringify({requestId:m.id,snapshotHash:m.snapshotHash,answer:a,explanation:'Simulated answer for adapter verification.'});
 setTimeout(()=>listener({type:'canvasAnswer',id:m.id,response:reply,...(scenario==='notebook'?{grounded:'The balance sheet reports assets on a specific date. [1: Demo accounting reading]'}:{})},{},()=>{}),scenario==='stop'||scenario==='stale'?800:60);
 return {received:true};
}}};
const quiz=document.getElementById('quiz'),results=document.getElementById('results');
function values(){return Object.fromEntries([...quiz.querySelectorAll('.question_input')].map(e=>[e.id||e.name,e.type==='checkbox'||e.type==='radio'?e.checked:e.value]));}
function save(){
 if(backup||Date.now()-lastBackup<1000)return;
 backup=true;lastBackup=Date.now();backups++;const captured=values();const indicator=document.getElementById('last_saved_indicator');indicator.textContent='Saving...';
 setTimeout(()=>{persisted=captured;backup=false;indicator.textContent='Quiz saved at '+Date.now();},100);
}
function render(){
 if(scenario==='new'){
  quiz.innerHTML='<div class="lrn lrn_widget lrn_mcq" id="new_1"><div class="lrn_stimulus">Which statement reports assets on a specific date?</div><div class="lrn_response"><fieldset class="lrn_mcqgroup"><legend>Choose one</legend>'+['Income statement','Balance sheet','Cash flows'].map((t,i)=>'<label><input type="radio" name="new_1" aria-label="'+t+'">'+t+'</label>').join('')+'</fieldset></div></div><button id="submit-new">Submit</button>';
  document.getElementById('submit-new').onclick=()=>submits++;return;
 }
 let content=scenario==='paged'?questions[index]:scenario==='all'||scenario==='pause'?questions.join(''):questions[0];
 if(scenario==='unsupported')content=questions[0].replace('</div><fieldset>','<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22/%3E"></div><fieldset>');
 if(scenario==='review')content=questions[0].replaceAll('class="question_input"','disabled class="question_input"');
 quiz.innerHTML='<form id="submit_quiz_form"><div id="questions" class="assessing">'+content+'</div><span id="last_saved_indicator">Quiz saved at initial</span>'+(scenario==='paged'&&index<4?'<button class="next-question" type="submit" aria-label="Next Question">Next</button>':'')+'<button class="quiz_submit" type="submit" id="submit_quiz_button">Submit Quiz</button></form>';
 quiz.querySelector('form').onsubmit=e=>e.preventDefault();
 quiz.querySelector('#questions').addEventListener('mousedown',e=>lastAnswer=e.target.closest('.answer'));
 quiz.querySelector('#questions').addEventListener('mouseup',()=>lastAnswer=null);
 quiz.querySelector('#questions').addEventListener('change',e=>{if(e.target.type==='checkbox'||e.target.type==='radio'){if(lastAnswer===e.target.closest('.answer'))save();}else save();});
 quiz.querySelector('.quiz_submit').onclick=()=>submits++;
 const next=quiz.querySelector('.next-question');if(next)next.onclick=()=>{if(!Object.values(values()).some(v=>v===true||typeof v==='string'&&v))throw Error('Empty advance');nexts++;index++;lastBackup=0;render();};
}
const panel=()=>document.getElementById('canvas-assistant-panel').shadowRoot;
function assert(ok,label){if(!ok)throw Error(label);results.textContent+='\nPASS: '+label;}
async function until(fn,timeout=22000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Timeout: '+panel().getElementById('status').textContent);await delay(40);}}
async function test(name){try{
 scenario=name;index=0;prompts=[];nexts=submits=backups=0;lastBackup=0;persisted={};backup=false;run=null;config.pauseBeforeSubmit=name==='pause';notifySettings({pauseBeforeSubmit:{newValue:config.pauseBeforeSubmit}},'sync');render();results.textContent=name;panel().querySelector('details').open=true;panel().getElementById('start').click();
 await until(()=>prompts.length>0||panel().getElementById('status').textContent.includes('manual entry'));
 if(name==='pause'){for(let q=0;q<5;q++){await until(()=>!panel().getElementById('resume').hidden);assert(prompts.length===q+1,'paused after question '+(q+1));panel().getElementById('resume').click();await until(()=>panel().getElementById('resume').hidden);}}
 if(name==='stop'){await until(()=>prompts.length===1);panel().getElementById('stop').click();await delay(1000);assert(!values().q1a1&&!run&&submits===0,'Stop rejects late response');}
 else if(name==='stale'){await until(()=>prompts.length===1);quiz.querySelector('.question_text').textContent='Changed question';await until(()=>!run);assert(!values().q1a1,'Changed question rejects old answer');}
 else if(name==='invalid'){await until(()=>panel().getElementById('status').textContent.includes('match'));assert(!values().q1a1&&submits===0,'Invalid option rejected before filling');}
 else if(name==='unsupported'||name==='review'){await until(()=>panel().getElementById('status').textContent.includes('manual entry'));assert(prompts.length===0&&submits===0,'Unsupported or read-only question does not send or fill');}
 else{
  await until(()=>panel().getElementById('status').textContent.includes('Finished visible'));
  assert(prompts.length===(name==='new'||name==='notebook'?1:5),'one AI request per unanswered question');assert(submits===0,'final Submit never clicked');assert(!run,'run metadata cleared on completion');
  if(name==='all'||name==='pause'){const v=values();assert(v.q1a1&&v.q2a0&&v.q2a1&&!v.q2a2,'radio and checkbox groups retained');assert(v.question_3==='0.2048'&&v.question_4_red==='red'&&v.question_4_blue==='blue','numeric and multiple blanks retained');assert(v.question_5_a==='91'&&v.question_5_b==='54','dropdown answers use option IDs');assert(v.question_6==='my own answer','existing answer preserved');assert(persisted.question_5_a==='91'&&persisted.q2a1,'fresh autosave captured complete answers');}
  if(name==='paged')assert(nexts===4&&index===4,'one-at-a-time flow advances four times');
  if(name==='notebook')assert(values().q1a1&&panel().getElementById('preview').textContent.includes('Demo accounting reading'),'notebook answer and citation preview retained');
  if(name==='new')assert(quiz.querySelector('input[aria-label="Balance sheet"]').checked,'experimental Learnosity radio selection retained');
 }
 results.textContent+='\nALL CHECKS PASSED';
}catch(e){results.textContent+='\nFAIL: '+e.message;panel().getElementById('stop').click();}}
for(const name of ['all','paged','pause','new','notebook','stop','stale','invalid','unsupported','review']){const b=document.createElement('button');b.textContent='Test '+name;b.onclick=()=>test(name);document.getElementById('cases').append(b);}
render();

function notifySettings(changes,area){const old={...config};for(const [key,c] of Object.entries(changes))old[key]=!c.newValue;storageListener?.({platformSettings:{oldValue:{canvas:old},newValue:{canvas:{...config}}}},area);}

const editTest=document.createElement('button');editTest.textContent='Test answer editing';document.getElementById('cases').append(editTest);
editTest.onclick=async()=>{try{
 scenario='all';render();config.autoFill=false;config.pauseBeforeSubmit=false;results.textContent='Answer editor';panel().querySelector('details').open=true;panel().getElementById('ask').click();await until(()=>fixtureEditor?.canEdit());
 const before=fixtureEditor.read();assert(before.fields[0].type==='single'&&before.fields[0].value==='Balance sheet','Current prepared choice is editable');
 let rejected=false;try{fixtureEditor.apply({f0:'Not an option'});}catch{rejected=true;}assert(rejected&&fixtureEditor.read().fields[0].value==='Balance sheet','Invalid choice leaves prepared answer intact');
 fixtureEditor.apply({f0:'Income statement'});assert(!values().q1a0&&!values().q1a1,'Saving edits never fills the quiz');assert(fixtureEditor.read().token!==before.token,'Edited answer receives a new revision');
 panel().getElementById('fill').click();await until(()=>values().q1a0);assert(!fixtureEditor.canEdit(),'Filled answer cannot be edited as a draft');assert(submits===0,'No final submission');results.textContent+='\nALL CHECKS PASSED';
 }catch(e){results.textContent+='\nFAIL '+e.message;}};
