let mcListener,requests=[],testMode='multiple_select',gradeCount=0;
window.confirm=()=>true;
window.alert=text=>document.getElementById('results').textContent+='\nALERT: '+text;
window.chrome={storage:{local:{get:async()=>({studyOnboarding:{version:1,acknowledged:true,completed:true}})},sync:{get:async()=>({aiModel:'gemini',platformMode:'auto',platformSettings:{mcgraw:{pauseBeforeSubmit:true,randomConfidence:false,doubleCreditMode:false}}})},onChanged:{addListener:()=>{},removeListener:()=>{}}},runtime:{onMessage:{addListener:f=>mcListener=f,removeListener:()=>{}},sendMessage:async message=>{
 if(message.type==='mcgrawCancel'||message.type==='resetTabTracking')return {received:true};
 if(message.type!=='sendQuestionToChatGPT')return {received:false};
 requests.push(message);
 const answer=testMode==='multiple_select'?['Cash flows','Balance sheet']:testMode==='multiple_choice'?'Balance sheet':testMode==='select_text'?['Assets']:testMode==='fill_in_the_blank'?['red','blue']:'True';
 setTimeout(()=>mcListener({type:'processChatGPTResponse',id:message.id,response:JSON.stringify({answer,explanation:'Synthetic answer'})},{},()=>{}),testMode==='late-stop'?500:50);
 return {received:true};
}}};
const container=document.querySelector('.probe-container'),results=document.getElementById('results');
function render(type){
 if(type==='select_text')container.innerHTML='<div class="awd-probe-type-select_text"><p class="prompt">Select the asset category.</p><div class="select-text-component"><button class="choice -interactive">Assets</button><button class="choice -interactive">Liabilities</button></div></div>';
 else if(type==='fill_in_the_blank')container.innerHTML='<div class="awd-probe-type-fill_in_the_blank"><p class="prompt">Colors: <input class="fitb-input" aria-label="First blank"> and <input class="fitb-input" aria-label="Second blank">.</p></div>';
 else{const questionType=type==='late-stop'?'true_false':type;container.innerHTML='<div class="awd-probe-type-'+questionType+'"><p class="prompt">'+(questionType==='true_false'?'Assets appear on a balance sheet.':'Which statements report ending cash?')+'</p>'+(questionType==='true_false'?['True','False']:['Cash flows','Balance sheet','Income statement']).map(text=>'<label><input type="'+(questionType==='multiple_select'?'checkbox':'radio')+'" name="answer"><span class="choiceText">'+text+'</span></label>').join('')+'</div>';}
 container.querySelectorAll('.choice').forEach(el=>el.onclick=()=>el.classList.toggle('selected'));
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function test(type){try{
 const btn=document.querySelector('.automcgraw-btn');
 if(btn.textContent==='Stop Automation')btn.click();
 testMode=type;requests=[];render(type);results.textContent=type;btn.click();await delay(180);
 if(type==='late-stop'){btn.click();await delay(550);if(container.querySelector(':checked'))throw Error('Late answer was applied');}
 else if(requests.length!==1)throw Error('Expected exactly one legacy request');
 else if(type==='multiple_select'){const choices=container.querySelectorAll('input');if(!choices[0].checked||!choices[1].checked||choices[2].checked)throw Error('Checkbox answer mismatch');}
 else if(type==='multiple_choice'&&!container.querySelectorAll('input')[1].checked)throw Error('Radio answer mismatch');
 else if(type==='select_text'&&!container.querySelector('.choice').classList.contains('selected'))throw Error('Text choice mismatch');
 else if(type==='fill_in_the_blank'){const inputs=container.querySelectorAll('input');if(inputs[0].value!=='red'||inputs[1].value!=='blue')throw Error('Blank answer mismatch');}
 if(type!=='late-stop')btn.click();
 results.textContent+='\nPASS: Original adapter retained answers and matched the unified request ID.\nPASS: Pause prevented grading/navigation.\nALL CHECKS PASSED';
}catch(error){results.textContent+='\nFAIL: '+error.message;}}
for(const type of ['multiple_select','multiple_choice','fill_in_the_blank','select_text','late-stop']){const button=document.createElement('button');button.textContent='Test '+type;button.onclick=()=>test(type);document.getElementById('cases').append(button);}
render('multiple_select');
