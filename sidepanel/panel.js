'use strict';
const $=id=>document.getElementById(id);let selected=null,snapshot=null,polling=false,busy=false,lastTarget=null;
const send=m=>chrome.runtime.sendMessage(m);
let actionError='';function error(text){actionError=text||'';$('error').textContent=actionError?'Action needs attention. See the recovery options below.':'';$('error').hidden=!actionError;if(snapshot)renderAttention(snapshot);}
let previewText=null,panelWindow=null,lease=null,leaseTarget=null,seenSettingsIntent=null,savedScroll=0,helpReturn='assistant',draftState=null,events=[],eventTarget=null,eventSignature=null;
function connectLease(page){
 const target=page?JSON.stringify([page.tab,page.frame,page.documentId,page.pageId]):null;if(target===leaseTarget&&lease)return;
 if(lease){lease.disconnect();lease=null;}leaseTarget=null;if(!page||!chrome.tabs?.connect)return;
 try{const port=chrome.tabs.connect(page.tab,{name:'study-sidepanel-lease',...(page.documentId?{documentId:page.documentId}:{frameId:page.frame||0})});lease=port;leaseTarget=target;port.onDisconnect.addListener(()=>{void chrome.runtime.lastError;if(lease===port){lease=null;leaseTarget=null;}});}catch{}
}
function settingsView(open,platform=snapshot?.page?.platform){
 $('help-view').hidden=true;
 if(open){if(!$('assistant-view').hidden)savedScroll=window.scrollY;const frame=$('settings-frame'),src=(frame.dataset.fixtureSrc||'../popup/settings.html')+'?embedded=1&platform='+(platform||'mcgraw');if(frame.getAttribute('src')!==src)frame.setAttribute('src',src);}
 $('assistant-view').hidden=open;$('settings-view').hidden=!open;window.scrollTo(0,open?0:savedScroll);
}
function featureGuide(fromSettings=false){helpReturn=fromSettings?'settings':'assistant';if(!fromSettings)savedScroll=window.scrollY;$('assistant-view').hidden=true;$('settings-view').hidden=true;$('help-view').hidden=false;$('back-from-help').textContent=fromSettings?'← Back to settings':'← Back to assistant';window.scrollTo(0,0);}
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===$('settings-frame').contentWindow&&event.data?.type==='studyOpenFeatureGuide')featureGuide(true);});
window.addEventListener('pagehide',()=>{lease?.disconnect();lease=null;leaseTarget=null;});
function node(tag,text,className){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;}
function renderPreview(raw){
 if(raw===previewText)return;previewText=raw;const data=StudyPreview.parse(raw),container=$('preview');container.replaceChildren();
 $('raw-preview').textContent=raw||'No response yet.';
 if(data.kind==='journal'){
  const table=node('table',null,'journal-table');table.append(node('caption','Journal entry answers'));const head=node('thead'),heading=node('tr');
  for(const label of ['Account','Debit','Credit']){const th=node('th',label);th.scope='col';heading.append(th);}head.append(heading);table.append(head);const body=node('tbody');
  for(const row of data.rows){const tr=node('tr');for(const text of [row.account,row.debit||'—',row.credit||'—'])tr.append(node('td',text));body.append(tr);}table.append(body);container.append(table);
 }else if(data.kind==='table'){
  const table=node('table',null,'journal-table');table.append(node('caption','Answers by question part'));const head=node('tr');for(const label of data.columns){const th=node('th',label);th.scope='col';head.append(th);}table.append(head);for(const values of data.rows){const row=node('tr');for(const value of values)row.append(node('td',value));table.append(row);}container.append(table);
 }else if(data.kind==='answers'){
  for(const item of data.items){const block=node('div',null,'answer-item');block.append(node('strong',item.label));if(item.values.length>1){const list=node('ul');for(const value of item.values)list.append(node('li',value));block.append(list);}else block.append(node('p',item.values[0]||'No answer provided.'));container.append(block);}
  if(!data.items.length)container.append(node('p','No answer provided.','empty'));
 }else container.append(node('p',data.text,data.kind==='empty'?'empty':'answer-text'));
 if(data.explanation){const block=node('div',null,'explanation');block.append(node('h3','Explanation'),node('p',data.explanation));container.append(block);}
 $('sources').hidden=!data.sources;$('source-text').textContent=data.sources||'';
}
function nerdMode(){const enabled=$('nerd-mode').checked;$('preview').hidden=enabled;$('raw-preview').hidden=!enabled;}
function renderActivity(s){
 const current=StudyReview.activity(s),target=s.page?JSON.stringify([s.page.tab,s.page.pageId]):null;
 if(target!==eventTarget){events=[];eventSignature=null;eventTarget=target;}
 for(const [index,el] of [...$('activity').querySelectorAll('li')].entries()){el.classList.toggle('active',index===current.stage);if(index===current.stage)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}
 $('activity-progress').value=current.stage===null?0:current.stage+1;
 $('activity-progress').setAttribute('aria-valuetext',current.stage===null?current.label:'Stage '+(current.stage+1)+' of 5: '+current.label);
 $('activity-step').textContent=current.stage===null?'Not started':'Stage '+(current.stage+1)+' of 5';
 $('activity-label').textContent=current.label;
 const signature=JSON.stringify([current.stage,s.page?.status,s.phase,s.run?.phase]);
 if(s.page&&signature!==eventSignature){eventSignature=signature;events.unshift({time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}),text:current.label});events=events.slice(0,8);$('activity-events').replaceChildren(...events.map(e=>{const li=node('li');li.append(node('time',e.time),node('span',e.text));return li;}));$('activity-count').textContent=String(events.length);}
}
function renderAttention(s){
 const advice=StudyReview.recovery(s,actionError);$('attention').hidden=!advice;
 if(!advice)return;
 $('attention-title').textContent=advice.title;$('attention-message').textContent=advice.message;$('attention-details').textContent=[actionError,s.page?.status].filter(Boolean).join('\n');
 const buttons=[];
 for(const kind of advice.actions){
  if(kind==='ask'&&(!s.page?.controls?.ask||s.run||s.phase))continue;
  const labels={refresh:'Refresh connection',ai:'Open chatbot',notebook:'Open NotebookLM',manual:'Go to assignment',ask:'Ask AI again'},b=node('button',labels[kind],'secondary');b.disabled=busy||!!draftState;
  b.onclick=()=>kind==='refresh'?refresh():kind==='ai'||kind==='notebook'?action('studyOpenService',{service:kind==='notebook'?'notebook':s.preferences.aiModel||'gemini'}):kind==='manual'?action('studyFocusAssignment'):action('studyPanelCommand',{action:'ask'});buttons.push(b);
 }
 $('attention-actions').replaceChildren(...buttons);
 if(advice.kind!=='connection'||s.page)$('status').textContent='Needs attention — follow the steps below.';
}
function closeEditor(){draftState=null;$('answer-editor').hidden=true;$('edit-fields').replaceChildren();$('edit-error').hidden=true;if(snapshot)render(snapshot);}
async function openEditor(){
 if(busy||draftState||!selected||StudyOnboarding.required()||StudyTour.active())return;busy=true;error('');const target={...selected};
 try{const r=await send({type:'studyPanelDraft',...target,operation:'read'});if(!r?.received)throw Error(r?.error||'Prepared answer is not editable.');if(target.pageId!==selected?.pageId||target.tab!==selected?.tab)throw Error('Assignment changed. Open the editor again.');
  const model=StudyReview.draft(r.draft);draftState={target,model};$('edit-fields').replaceChildren();
  for(const [i,f] of model.fields.entries()){
   const wrap=node('div',null,'edit-field'),label=node('label',f.label||'Answer '+(i+1));const id='edit-value-'+i;
   if(f.type==='multiple'){
    const group=node('fieldset');group.append(node('legend',f.label||'Answer '+(i+1)));
    for(const [j,option] of f.options.entries()){const row=node('label'),input=node('input');input.type='checkbox';input.dataset.field=f.key;input.value=option;input.checked=f.value.includes(option);input.id=id+'-'+j;row.append(input,node('span',option));group.append(row);}wrap.append(group);
   }else {const input=f.type==='single'?node('select'):node('textarea');input.id=id;input.dataset.field=f.key;label.htmlFor=id;
    if(f.type==='single')for(const option of f.options){const el=node('option',option);el.value=option;input.append(el);}else {input.rows=2;input.maxLength=4000;}
    input.value=String(f.value);wrap.append(label,input);
   }
   const current=Array.isArray(f.current)?f.current.join('; '):typeof f.current==='string'?f.current:'';if(current)wrap.append(node('p','On assignment: '+current,'existing-value'));
   $('edit-fields').append(wrap);
  }
  $('answer-editor').hidden=false;$('edit-error').hidden=true;$('nerd-mode').checked=false;nerdMode();$('edit-fields').querySelector('input,textarea,select')?.focus();
 }catch(e){error(e.message);}finally{busy=false;if(snapshot)render(snapshot);}
}
$('edit-answer').onclick=openEditor;$('cancel-edit').onclick=closeEditor;
$('edit-form').onsubmit=async e=>{
 e.preventDefault();if(!draftState||busy)return;const {model,target}=draftState;
 const values=Object.fromEntries(model.fields.map(f=>[f.key,f.type==='multiple'?[...$('edit-fields').querySelectorAll('input[data-field]')].filter(input=>input.dataset.field===f.key&&input.checked).map(input=>input.value):[...$('edit-fields').querySelectorAll('textarea,select')].find(input=>input.dataset.field===f.key).value]));
 busy=true;$('save-edit').disabled=true;$('cancel-edit').disabled=true;
 try{const r=await send({type:'studyPanelDraft',...target,operation:'save',token:model.token,values});if(!r?.received)throw Error(r?.error||'Edited answer could not be saved.');draftState=null;$('answer-editor').hidden=true;$('edit-fields').replaceChildren();previewText=null;}
 catch(error){$('edit-error').textContent=error.message;$('edit-error').hidden=false;}
 finally{busy=false;$('save-edit').disabled=false;$('cancel-edit').disabled=false;await refresh();}
};
function render(s){
 if(draftState&&(!s.page||s.page.pageId!==draftState.target.pageId||s.page.tab!==draftState.target.tab||!s.page.controls?.edit||s.phase||s.run)){draftState=null;$('answer-editor').hidden=true;$('edit-fields').replaceChildren();error('The prepared answer is no longer editable. Reopen it after asking AI.');}
 snapshot=s;StudyOnboarding.update(s);const page=s.page;connectLease(page);selected=page?{tab:page.tab,pageId:page.pageId}:null;
 const options=s.pages.map(p=>({value:JSON.stringify({tab:p.tab,pageId:p.pageId}),text:StudyConfig.names[p.platform]+' · '+p.title}));
 const select=$('assignment'),value=selected?JSON.stringify(selected):'';
 if(JSON.stringify(options)!==select.dataset.options){select.replaceChildren(...(options.length?options.map(o=>Object.assign(document.createElement('option'),{value:o.value,textContent:o.text})):[Object.assign(document.createElement('option'),{value:'',textContent:'Waiting for an assignment…'})]));select.dataset.options=JSON.stringify(options);}
 select.value=value;select.disabled=!options.length||busy||!!draftState;
 $('platform').textContent=page?StudyConfig.names[page.platform]: 'No assignment connected';
 $('count').textContent=(s.run&&page&&s.run.tab===page.tab?s.run.count:s.checkpoint?.count||0)+' confirmed';
 const phases={vision:'Reading the picture',grounding:'Checking NotebookLM readings',formatting:'Formatting the source answer',answer:'Waiting for AI'};
 $('phase').textContent=s.phase?phases[s.phase]||s.phase:page?.timer?'Review countdown':s.run&&page&&s.run.tab===page.tab?'Auto in progress':page?'Assignment connected':'Open a supported assignment';
 $('status').textContent=page?.status||'Reload a supported assignment after loading this version. Its page controls remain available when this panel is closed.';
 const update=s.updateAvailable;
 $('update-banner').hidden=!update;
 $('update-message').textContent=update?`Version ${update.version} is ready.`:'';
 for(const b of document.querySelectorAll('[data-action]')){const a=b.dataset.action;b.disabled=busy||!!draftState||!page||(!a.startsWith('timer')&&a!=='recover'&&!page.controls?.[a]);if(a==='resume'||a==='stop')b.hidden=!page?.controls?.[a];}
 $('conflict').hidden=!page?.controls?.replaceStart;
 $('timer').hidden=!page?.timer;if(page?.timer){$('timer-label').textContent=page.timer.label;$('timer-note').textContent=page.timer.note;$('timer-progress').value=page.timer.progress;document.querySelector('[data-action="timerPause"]').textContent=page.timer.pauseLabel;}
 $('recovery').hidden=!s.checkpoint||!page?.recoverable;
 if(s.checkpoint){$('recovery-count').textContent=s.checkpoint.count+' confirmed';$('recovery-status').textContent=s.checkpoint.done+' saved markers · '+new Date(s.checkpoint.updated).toLocaleString();document.querySelector('[data-action="recover"]').disabled=busy||!!draftState||!!s.phase||!!s.run;$('forget').disabled=busy||!!draftState||!!s.run;}
 for(const service of s.connections.services){const el=document.querySelector('[data-service="'+service.model+'"]');el.textContent=service.status;el.title=service.status;document.querySelector('[data-dot="'+service.model+'"]').classList.toggle('ready',service.ready);}
 const book=s.connections.notebook;$('notebook-status').textContent=book.status+(book.sources?' · '+book.sources+' sources':'');$('notebook-dot').classList.toggle('ready',book.ready);
 const p=s.preferences;$('preferences').textContent=page?((StudyConfig.pacingNames[p.pacingMode]||StudyConfig.pacingNames.normal)+' · '+(p.preferNotebook?'Notebook readings':'Chatbot answers')):'';
 $('watch-automation').checked=p.watchAutomation===true;$('watch-automation').disabled=busy;
 $('watch-hint').textContent=p.watchAutomation?'Switches tabs at each step':'Stays on your tab';
 $('pause-after-fill').checked=!!p.pauseBeforeSubmit;$('pause-after-fill').disabled=busy||!page;
 $('continuation-hint').textContent=p.pauseBeforeSubmit?'Review, then resume':p.pacingMode==='review'?'Continue each countdown':p.pacingMode==='human'?'AI-estimated working time':'Automatic continuation';
 renderPreview(page?.preview||'');nerdMode();renderActivity(s);renderAttention(s);
 $('edit-answer').hidden=!page?.controls?.edit;$('edit-answer').disabled=busy||!!draftState||!!s.phase||!!s.run;
 $('edit-hint').textContent=draftState?'Editing · run controls are paused here':page?.controls?.edit?'Save edits before filling':page?.preview?'Ask AI with Auto Fill off to edit a supported prepared answer.':'';
 if(s.settingsIntent&&s.settingsIntent.id!==seenSettingsIntent){seenSettingsIntent=s.settingsIntent.id;settingsView(true,s.settingsIntent.platform);send({type:'studyConsumeSettingsIntent',windowId:panelWindow,id:seenSettingsIntent}).catch(()=>{});}
 lastTarget=selected;
}
async function refresh(){if(polling||busy)return;polling=true;try{const s=await send({type:'studyPanelSnapshot',windowId:panelWindow,...selected});if(!s?.received)throw Error(s?.error||'Panel connection failed. Reload the extension.');render(s);}catch(e){error(e.message);StudyOnboarding.connectionError(e.message);}finally{polling=false;}}
async function action(type,extra={}){if(busy||(draftState||StudyOnboarding.required()||StudyTour.active())&&!['studyStopAll'].includes(type))return;busy=true;error('');if(snapshot)render(snapshot);try{const r=await send({type,...selected,...extra});if(!r?.received)throw Error(r?.error||'Action was not accepted.');}catch(e){error(e.message);}finally{busy=false;await refresh();}}
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>action('studyPanelCommand',{action:b.dataset.action});
$('assignment').onchange=()=>{selected=$('assignment').value?JSON.parse($('assignment').value):null;refresh();};
$('help').onclick=()=>featureGuide();$('back-from-help').onclick=()=>{if(helpReturn==='settings'){ $('help-view').hidden=true;$('settings-view').hidden=false;window.scrollTo(0,0);}else settingsView(false);};$('settings').onclick=()=>settingsView(true);$('back-to-assistant').onclick=()=>{settingsView(false);refresh();};$('refresh').onclick=refresh;$('stop-all').onclick=()=>action('studyStopAll');$('forget').onclick=()=>action('studyForgetCheckpoint');
for(const link of document.querySelectorAll('[data-open-service]'))link.onclick=e=>{e.preventDefault();action('studyOpenService',{service:link.dataset.openService});};
$('pause-after-fill').onchange=async()=>{const value=$('pause-after-fill').checked,target=selected;await action('studyPanelPreference',{key:'pauseBeforeSubmit',value});if(!value&&target?.pageId===selected?.pageId&&snapshot?.preferences.pauseBeforeSubmit===false&&snapshot?.page.controls?.resume)await action('studyPanelCommand',{action:'resume'});};
$('watch-automation').onchange=()=>action('studyPanelPreference',{key:'watchAutomation',value:$('watch-automation').checked});
$('nerd-mode').onchange=()=>{nerdMode();chrome.storage.local.set({panelNerdMode:$('nerd-mode').checked}).catch(()=>{});};
chrome.storage.local.get('panelNerdMode').then(data=>{$('nerd-mode').checked=data.panelNerdMode===true;nerdMode();}).catch(()=>{});
(async()=>{try{panelWindow=(await chrome.windows?.getCurrent())?.id??null;}catch{}await refresh();})();setInterval(refresh,2000);

StudyTour.bind({openSettings:()=>settingsView(true),closeSettings:()=>settingsView(false),canStart:()=>!StudyOnboarding.required()&&!busy&&!draftState&&!snapshot?.run&&!snapshot?.phase});
$('start-walkthrough').onclick=()=>{if(!StudyTour.start())error('Stop the current run and finish any answer edit before opening the walkthrough.');};
