/* First-use acknowledgement and preference walkthrough. All text is local;
   saving setup never starts a run or sends assignment data to an AI. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),views=['assistant-view','settings-view','help-view'];
 let needed=true,step=0,initialized=false,acknowledged=false,saving=false,finished=false,settings=null,draft=null;
 const models={gemini:{name:'Gemini',image:'gemini.png',url:'https://gemini.google.com/app'},chatgpt:{name:'ChatGPT',image:'chatgpt.png',url:'https://chatgpt.com/'},deepseek:{name:'DeepSeek',image:'deepseek.png',url:'https://chat.deepseek.com/'}};
 const modes={normal:{name:'Instant Auto',image:'mode-instant.png',description:'No added countdown. Continues automatically.'},slow:{name:'Timed Auto',image:'mode-timed.png',description:'Countdowns before entries. Continues automatically.'},human:{name:'Human pace',image:'mode-human.svg',description:'AI estimates realistic working time for each question.'},review:{name:'Guided Answers',image:'mode-review.png',description:'See the answer and explanation; enter it yourself.'}};
 function cover(on){needed=on;const layer=$('onboarding-layer');layer.hidden=!on;for(const id of views)$(id).inert=on;if(!on){$('settings').focus();} }
 function node(tag,text,className){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;}
 function choiceGroup(items,key,label){const group=node('div',null,'setup-choices');group.setAttribute('role','radiogroup');group.setAttribute('aria-label',label);
  for(const [value,item] of Object.entries(items)){const button=node('button',null,'setup-choice');button.type='button';button.setAttribute('role','radio');button.setAttribute('aria-checked',String(draft[key]===value));button.dataset.setupChoice=value;const image=node('img');image.src='../assets/'+item.image;image.alt='';const content=node('span');content.append(node('strong',item.name));if(item.description)content.append(node('small',item.description));button.append(image,content);if(draft[key]===value){const check=node('span','✓','setup-check');check.setAttribute('aria-hidden','true');button.append(check);}button.onclick=()=>{draft[key]=value;render();$('setup-content').querySelector('[data-setup-choice="'+value+'"]').focus();};group.append(button);}return group;
 }
 function toggle(key,title,description){const label=node('label',null,'setup-toggle'),input=node('input');input.type='checkbox';input.checked=draft[key];input.onchange=()=>{draft[key]=input.checked;};const text=node('span');text.append(node('strong',title),node('small',description));label.append(input,text);return label;}
 function render(){
  const content=$('setup-content');content.replaceChildren();$('setup-error').hidden=true;$('setup-progress').textContent='FIRST-USE SETUP · '+(step+1)+' OF 4';$('setup-back').hidden=step===0;$('setup-back').disabled=saving;$('setup-next').disabled=saving||(step===0&&!acknowledged);$('setup-next').textContent=step===0?'I understand — continue':step===3?'Finish setup':'Continue';
  $('welcome-title').textContent=['Before you start','Choose your AI','Choose your pace','Make it yours'][step];
  if(step===0){
   content.append(node('p','Study Assistant connects your assignment to an AI chatbot and can enter answers and move through supported questions. Please read this first.','intro'));
   const list=node('ul',null,'risk-list');for(const [title,text] of [
    ['Answers can be wrong','Review calculations, sources and explanations before relying on an answer.'],
    ['Your course has rules','Use AI and automation only when your instructor or course permits them. Unauthorized use may affect your grade or standing.'],
    ['Question content goes to your AI','Requests send question text and options to the connected chatbot. Notebook mode also uses the selected notebook; pictures are sent only when enabled. Those services handle the content under their own policies.'],
    ['Automation changes the assignment','It can fill or replace enabled entries, save, check work and navigate. Checks or grading may use attempts. New Connect, Pearson, Canvas and MindTap leave final submission manual; original McGraw flows keep their existing behavior.'],
    ['Activity may be recorded','Background operation and countdowns do not make automation undetectable. Websites may record clicks, inputs and tab activity.']
   ]){const li=node('li');li.append(node('strong',title),node('span',text));list.append(li);}content.append(list);
   const label=node('label',null,'acknowledge'),input=node('input');input.type='checkbox';input.id='setup-acknowledge';input.checked=acknowledged;input.onchange=()=>{acknowledged=input.checked;$('setup-next').disabled=!acknowledged;};label.append(input,node('span','I have read this notice and understand the risks. I will use this only where permitted.'));content.append(label);
  }else if(step===1){
   content.append(node('p','Choose the chatbot to try first. Keep it open and signed in. A ready chatbot can be used as a fallback.','intro'),choiceGroup(models,'aiModel','Setup AI assistant'));
   const link=node('a','Open '+models[draft.aiModel].name+' ↗','setup-link');link.href=models[draft.aiModel].url;link.target='_blank';link.rel='noopener';content.append(link);
   content.append(node('p','Opening the AI is optional now. Setup does not send it any questions.','hint'));
  }else if(step===2){
   content.append(node('p','Three Auto modes can enter answers. Guided Answers shows the answer and explanation, then you enter it yourself.','intro'),choiceGroup(modes,'pacingMode','Setup automation pace'),toggle('pauseBeforeSubmit','Pause after fill','Adds a review stop after an Auto mode enters a question. Guided Answers never enters answers.'));
  }else{
   content.append(node('p','Choose how tabs and readings work. You can change these later in Settings.','intro'));
   const label=node('label','Platform for these preferences');label.htmlFor='setup-platform';const select=node('select');select.id='setup-platform';for(const platform of StudyConfig.platforms){const option=node('option',StudyConfig.names[platform]);option.value=platform;option.selected=platform===draft.platform;select.append(option);}select.onchange=()=>{draft.platform=select.value;render();};content.append(label,select);
   content.append(toggle('watchAutomation','Watch automation','Off keeps your current tab visible. On switches between AI and assignment tabs so you can follow along.'),toggle('preferNotebook','Prefer NotebookLM readings','Useful when questions depend on assigned readings. Uses your selected notebook sources, then a chatbot formats the answer.'));
   const why=node('details',null,'setup-notebook-help');why.append(node('summary','Why use NotebookLM?'),node('p','Reading-based questions may expect a particular author’s definition, example or wording. NotebookLM can base its answer on the readings you select and provide citations to check. A general chatbot may give a plausible answer from broader knowledge that does not match your course.'),node('p','Add the assigned readings to a notebook, select the relevant sources and keep that notebook open. The extension asks NotebookLM for the source-based answer, then uses a regular chatbot to format it for entry. The chatbot is not given access to your whole notebook. Missing or irrelevant sources can still produce a bad answer; check the citations.'));const source=node('a','About source-based answers ↗','setup-link');source.href='https://support.google.com/notebooklm/answer/16179559?hl=en';source.target='_blank';source.rel='noopener';why.append(source);content.append(why);
   content.append(node('p',models[draft.aiModel].name+' · '+modes[draft.pacingMode].name+' · '+(draft.pauseBeforeSubmit?'Pause after fill on':'Pause after fill off')+'. Pace applies across supported platforms; pause and readings apply to '+StudyConfig.names[draft.platform]+'. AI choice and tab behavior apply to all platforms.','setup-summary'));
  }
  $('onboarding-layer').querySelector('.welcome-card').scrollTop=0;
 }
 $('setup-back').onclick=()=>{if(saving||step===0)return;step--;render();$('setup-next').focus();};
 $('setup-next').onclick=async()=>{
  if(!initialized){if(typeof refresh==='function')await refresh();return;}
  if(saving||step===0&&!acknowledged)return;
  if(step<3){step++;render();$('setup-next').focus();return;}
  saving=true;render();try{
   const result=await chrome.runtime.sendMessage({type:'studyCompleteSetup',version:StudyConfig.onboardingVersion,acknowledged,...draft});if(!result?.received)throw Error(result?.error||'Setup could not be saved. Try again.');finished=true;cover(false);if(typeof refresh==='function')await refresh();StudyTour.start();
  }catch(error){$('setup-error').textContent=error.message;$('setup-error').hidden=false;}finally{saving=false;$('setup-next').disabled=false;}
 };
 $('onboarding-layer').addEventListener('keydown',event=>{if(!needed||event.key!=='Tab')return;const focusable=[...$('onboarding-layer').querySelectorAll('button:not([disabled]):not([hidden]),input,select,a[href]')].filter(el=>el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
 globalThis.StudyOnboarding={required:()=>needed,connectionError(text){if(needed){$('setup-error').textContent=text;$('setup-error').hidden=false;if(!initialized){$('setup-next').textContent='Retry connection';$('setup-next').disabled=false;}}},update(snapshot){
  if(snapshot.onboardingRequired===false||finished){if(needed)cover(false);return;}
  cover(true);if(!initialized){settings=snapshot.setupDefaults||{};const platform=StudyConfig.platforms.includes(snapshot.page?.platform)?snapshot.page.platform:'mcgraw',p=settings.platformSettings?.[platform]||StudyConfig.defaults[platform];draft={platform,aiModel:Object.hasOwn(models,settings.aiModel)?settings.aiModel:'gemini',pacingMode:Object.hasOwn(modes,p.pacingMode)?p.pacingMode:'normal',pauseBeforeSubmit:p.pauseBeforeSubmit!==false,watchAutomation:settings.watchAutomation===true,preferNotebook:p.preferNotebook===true};initialized=true;render();$('setup-acknowledge').focus();}
 }};
 cover(true);$('setup-content').append(node('p','Connecting to the extension…','intro'));
})();
