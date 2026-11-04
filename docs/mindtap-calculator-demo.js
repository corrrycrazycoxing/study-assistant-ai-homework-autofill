let listener,run=null,scenario='calculator',attempt=0,requests=[],captures=0,grades=0,nexts=0,saves=0,submits=0,curveOffset=0;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),host=document.getElementById('quiz'),results=document.getElementById('results');
const checkboxOptions=['If the minimum wage is set at $12.50, the market will not reach equilibrium.','In the absence of price controls, a surplus puts downward pressure on wages until they fall to the equilibrium.','Binding minimum wages cause structural unemployment.','In this labor market, a minimum wage of $9.50 would be binding.'];
const settings={pacingMode:'normal',pauseBeforeSubmit:false,showExplanation:true,includePictures:false,gradeBeforeAdvance:false,smoothScroll:false};
window.StudyMonitor={setEditor(){},setRecovery(){},notice(){}};
window.chrome={storage:{sync:{get:async()=>({platformMode:'auto',platformSettings:{mindtap:settings}})},onChanged:{addListener(){}}},runtime:{onMessage:{addListener:fn=>listener=fn},sendMessage:async message=>{
 if(message.type==='studyCapture'){captures++;throw Error('Unexpected image capture');}
 if(message.type==='mindtapRunStart'){run={running:true,runId:'mock-run',count:0,done:[],phase:'answer'};return run;}
 if(message.type==='mindtapRunState')return run||{running:false};
 if(message.type==='mindtapRunUpdate'){Object.assign(run||{},message);return {received:true};}
 if(message.type==='mindtapRunStop'){run=null;return {received:true};}
 if(message.type==='mindtapCancel')return {received:true};
 if(message.type!=='mindtapQuestion')return {received:false};
 requests.push(message);const answer={f0:'375',f1:'625',f2:scenario==='grade'&&attempt===0?'Shortage':'Surplus',f3:checkboxOptions.slice(0,3),...(scenario==='curves'?{graph:[{scenario:1,label:'Supply',direction:'right'}]}:{})};
 setTimeout(()=>listener({type:'mindtapAnswer',id:message.id,response:JSON.stringify({requestId:message.id,snapshotHash:message.snapshotHash,answer,explanation:'Local test reply based on the rendered linear labor-market graph.'})},{},()=>{}),30);
 return {received:true};
}}};
function graph(){
 const ticks=Array.from({length:9},(_,i)=>`<text x="${50+i*50}" y="475">${i*125}</text>`).join('')+Array.from({length:9},(_,i)=>`<text x="20" y="${450-i*50}">${i*2.5}</text>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="510" height="510" aria-hidden="true"><g font-size="12">${ticks}<text x="350" y="90">Supply</text><text x="350" y="405">Demand</text><text x="90" y="500">LABOR (Thousands of workers)</text><text x="15" y="22">WAGE (Dollars per hour)</text></g><path d="M50,450L450,50" stroke="#ff9900" stroke-width="4" fill="none"/><path d="M50,50L450,450" stroke="#83acd3" stroke-width="4" fill="none"/><path d="M50,400L100,400M110,400L450,400" stroke="#88cf65" stroke-width="3" fill="none"/></svg>`;
}
function shiftGraph(){
 return `<div style="margin-top:1000px" class="q4-task"><p>Workers move east, increasing the supply of labor. Adjust the graph to show what happens to employment and wages in the eastern state.</p><svg id="shift-graph" xmlns="http://www.w3.org/2000/svg" width="520" height="440" aria-hidden="true"><path data-curve="Supply" d="M50,300L350,150" stroke="#ff9900" stroke-width="4" fill="none"/><path data-curve="Demand" d="M50,150L350,300" stroke="#83acd3" stroke-width="4" fill="none"/><text id="supply-label" x="270" y="160">Supply</text><text x="265" y="270">Demand</text><text x="30" y="420">LABOR</text><text x="10" y="30">WAGE</text></svg></div>`;
}
function wireShiftGraph(){
 const svg=document.getElementById('shift-graph');if(!svg)return;
 const local=event=>{const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};let active=null;
 svg.onmousedown=event=>{if(event.target.dataset.curve==='Supply'){active={y:local(event).y,offset:curveOffset};event.preventDefault();}};
 svg.onmousemove=event=>{if(!active)return;curveOffset=active.offset+(local(event).y-active.y)*2;const dy=curveOffset/2;svg.querySelector('[data-curve="Supply"]').setAttribute('d',`M50,${300+dy}L350,${150+dy}`);document.getElementById('supply-label').setAttribute('y',160+dy);};
 svg.onmouseup=()=>{if(active){svg.append(svg.querySelector('[data-curve="Supply"]'),document.getElementById('supply-label'));}active=null;};
}
function render(){
 curveOffset=0;
 host.innerHTML=`<section id="quiz-cip" class="q4-problem"><h2 class="q4-problem-title">5. Minimum-wage laws and unemployment</h2><div class="q4-container-root"><div class="q4-setup">Consider the following graph. You will not be graded on any changes you make to the calculator.</div><div class="q4-exhibit q4-idmtable-exhibit">${graph()}<table class="q4-idmtable" role="status"><tr><th colspan="4">Market for Labor</th></tr><tr><td>Wage (Dollars per hour)</td><td><input class="q4-numericEntry" id="wage" value="2.50"></td></tr><tr><td>Labor Demanded (Thousands of workers)</td><td><input id="demand" value="875" readonly></td><td>Labor Supplied (Thousands of workers)</td><td><input id="supply" value="125" readonly></td></tr></table></div><div class="q4-task"><p>Complete the table for a wage of $12.50. Indicate a shortage or surplus.</p><table><thead><tr><th>Wage</th><th>Labor Demanded</th><th>Labor Supplied</th><th>Shortage or surplus?</th></tr></thead><tr><td>$12.50</td><td><span class="q4-numericEntry-control"><input id="answer-demand" aria-label="Labor demanded"></span></td><td><span class="q4-numericEntry-control"><input id="answer-supply" aria-label="Labor supplied"></span></td><td><select id="answer-market" aria-label="Shortage or surplus"><option value="">Choose</option><option>Surplus</option><option>Shortage</option></select></td></tr></table></div><div class="q4-task"><p class="q4-prompt">Which statements are true? Check all that apply.</p><div class="q4-choice" role="group">${checkboxOptions.map((option,index)=>`<label><input type="checkbox" name="statements" aria-label="${option}">${option}</label><br>`).join('')}</div></div>${scenario==='curves'?shiftGraph():''}</div><button id="grade">Grade It Now</button><button id="save">Save &amp; Continue</button><button id="retry" hidden>Try Another Version</button><button id="next" hidden>Next Question</button><button id="submit">I'm Done, Submit Assignment Now</button></section>`;
 wireShiftGraph();
 document.getElementById('wage').onchange=event=>{const wage=Number(event.target.value);document.getElementById('demand').value=1000-wage*50;document.getElementById('supply').value=wage*50;};
 document.getElementById('save').onclick=()=>saves++;document.getElementById('submit').onclick=()=>submits++;
 document.getElementById('grade').onclick=()=>{
  grades++;const wrong=scenario==='grade'&&attempt===0||scenario==='curves'&&curveOffset<5;
  host.querySelectorAll('.q4-task').forEach((task,index)=>{const score=document.createElement('div');score.className='q4-task-scoring';score.textContent=index===0&&wrong?'Points: 0 / 1':'Points: 1 / 1';task.append(score);});
  host.querySelectorAll('.q4-container-root input,.q4-container-root select').forEach(input=>input.disabled=true);
  document.getElementById('grade').hidden=true;document.getElementById('retry').hidden=!wrong;document.getElementById('next').hidden=false;
 };
 document.getElementById('retry').onclick=()=>{attempt++;render();};
 document.getElementById('next').onclick=()=>{nexts++;listener({type:'studyStop'},{},()=>{});};
}
const panel=()=>document.getElementById('mindtap-assistant-panel')?.shadowRoot;
async function until(read,timeout=15000){const started=Date.now();while(!read()){if(Date.now()-started>timeout)throw Error('Timed out: '+panel()?.getElementById('status')?.textContent);await delay(30);}}
function check(value,message){if(!value)throw Error(message);const li=document.createElement('li');li.textContent='PASS '+message;results.append(li);}
async function test(mode){
 try{
  listener?.({type:'studyStop'},{},()=>{});await delay(30);scenario=mode;attempt=0;requests=[];captures=grades=nexts=saves=submits=0;render();results.replaceChildren();
  await until(()=>panel());panel().querySelector('details').open=true;
  panel().getElementById(mode==='calculator'?'ask':'start').click();
  if(mode==='calculator'){
   await until(()=>panel().getElementById('status').textContent==='Answer ready.');
   check(requests.length===1&&captures===0,'Rendered graph sent without screenshot capture');
   check(requests[0].prompt.includes('875')&&requests[0].prompt.includes('125'),'Ungraded calculator values and units reach the request');
   check(!requests[0].prompt.includes('"field":"f4"'),'Calculator input is excluded from the four graded answer fields');
   check(!document.getElementById('answer-demand').value&&!document.getElementById('answer-supply').value&&grades===0,'Ask AI leaves graded fields and attempts untouched');
  }else if(mode==='curves'){
   await until(()=>nexts===1);
   check(requests.length===1&&captures===0,'Two separated graphs read directly without a viewport-sized capture');
   check(requests[0].prompt.includes('"field":"graph"')&&requests[0].prompt.includes('answer curve stays shifted'),'Separate graph is included as a required answer');
   check(curveOffset>5&&grades===1,'Curve stays shifted before the actual adapter grades once');
   check(saves===0&&submits===0,'No Save shortcut or final submission');
  }else{
   await until(()=>nexts===1);
   check(grades===2&&attempt===1&&requests.length===2,'Incorrect attempt is graded, retried and graded again');
   check(requests[1].prompt.includes('PREVIOUS MINDTAP RESULT'),'Rejected answer and feedback reach the retry request');
   check(saves===0&&submits===0,'No Save & Continue shortcut or final submission');
   check(document.getElementById('wage').value==='2.50','Auto never fills the reference calculator as an answer');
  }
  check(captures===0,'No image permission required');const done=document.createElement('li');done.textContent='ALL CHECKS PASSED';results.append(done);
 }catch(error){listener?.({type:'studyStop'},{},()=>{});const li=document.createElement('li');li.textContent='FAIL '+error.message;results.append(li);}
}
document.getElementById('test-calculator').onclick=()=>test('calculator');document.getElementById('test-grade').onclick=()=>test('grade');document.getElementById('test-curves').onclick=()=>test('curves');render();
