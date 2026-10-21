/* Recover disconnected AI tabs before sending a question, never by replaying it. */
let aiPreparation=null;
function beginAiPreparation(sender,id){const state={tab:sender.tab.id,frame:sender.frameId,documentId:sender.documentId,id,cancelled:false};aiPreparation=state;return state;}
function guardAiPreparation(state){if(state?.cancelled)throw Error('AI connection recovery stopped.');}
function cancelAiPreparation(message,sender){
  if(!aiPreparation||!message||sender.id&&sender.id!==chrome.runtime.id)return;
  const panel=message.type==='studyStopAll'&&panelSender(sender);
  const source=sender.tab?.id===aiPreparation.tab&&sender.frameId===aiPreparation.frame&&(!aiPreparation.documentId||!sender.documentId||sender.documentId===aiPreparation.documentId);
  if(panel||source&&(/^(?:mcgrawMap|pearson|canvas|mindtap)(?:Cancel|RunStop)$/.test(message.type)||message.type==='mcgrawCancel'))aiPreparation.cancelled=true;
}
async function finishAiPreparation(state){if(aiPreparation===state)aiPreparation=null;const {aiTabRecovery}=await chrome.storage.session.get('aiTabRecovery');if(aiTabRecovery?.id===state.id)await chrome.storage.session.remove('aiTabRecovery');}
async function notifyAiRecovery(state,active){await chrome.tabs.sendMessage(state.tab,{type:'studyAiRecovery',id:state.id,active},{frameId:state.frame}).catch(()=>{});}
async function boundedAiRead(operation){let timer;try{return await Promise.race([operation,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),1500);})]);}catch{return null;}finally{clearTimeout(timer);}}
async function probeAiTab(tab,model){
  if(tab.frozen||tab.discarded)return {ready:false,reason:tab.discarded?'Disconnected':'Tab frozen'};
  return await boundedAiRead(chrome.tabs.sendMessage(tab.id,{type:model==='notebook'?'notebookReady':'assistantReady'},{frameId:0}))||{ready:false,reason:'Disconnected'};
}
// Runs read-only in the AI page. Return booleans/reasons, never draft contents.
function inspectAiReloadSafety(model){
  const providers={
    chatgpt:{input:'#prompt-textarea,[contenteditable="true"][data-composer-markdown][aria-label="Ask ChatGPT"]',stop:'button[data-testid="stop-button"]'},
    gemini:{input:'.ql-editor[contenteditable="true"]',stop:'.send-button.stop,button[aria-label="Stop response"]'},
    deepseek:{input:'#chat-input,textarea[data-testid="chat_input_input"],textarea',stop:'[data-testid="stop-button"],[aria-label="Stop generating"]'},
    notebook:{input:'textarea.query-box-input,textarea[aria-label="Query box"],textarea,[role="textbox"],[contenteditable="true"]',stop:'query-box button[aria-label="Stop generating"],button[aria-label="Stop generating"],button[aria-label="Stop response"]'},
  };
  const provider=providers[model];if(!provider)return {safe:false,reason:'Unknown AI service'};
  const visible=e=>e.getClientRects().length>0&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!e.closest('[hidden],[aria-hidden="true"]');
  if([...document.querySelectorAll(provider.stop)].some(visible))return {safe:false,reason:'Generating answer'};
  const editors=[...document.querySelectorAll(provider.input)].filter(visible);
  if(!editors.length)return {safe:false,reason:'Sign in or wait for the prompt box'};
  if(editors.some(e=>String('value'in e?e.value:e.textContent).trim()))return {safe:false,reason:'Unsent draft'};
  const attachments='file-preview,image-preview,file-upload-chip,.file-preview-container,.image-preview-container,[data-testid="file-thumbnail"],[data-testid^="attachment"],img[src^="blob:"]';
  if(editors.some(e=>[...(e.closest('input-area-v2,input-area,form,.input-area-container,.text-input-field,query-box')||e.parentElement).querySelectorAll(attachments)].some(visible)))return {safe:false,reason:'Unsent draft'};
  return {safe:true};
}
function sameAiService(tab,model){
  try{const url=new URL(tab.url);return url.protocol==='https:'&&(model==='notebook'?['notebooklm.google.com','notebook.google.com'].includes(url.hostname)&&/^\/notebook\/[^/]+\/?$/.test(url.pathname):url.origin===origins[model]);}catch{return false;}
}
async function recoverAiTab(tab,model,state){
  guardAiPreparation(state);if(tab.frozen||!sameAiService(tab,model))return {ready:false,reason:'Open tab to resume'};
  const {pending}=await chrome.storage.session.get('pending');
  if(pending&&[pending.ai,pending.formatter,pending.notebookTab].includes(tab.id))return {ready:false,reason:'Generating answer'};
  if(!tab.discarded){
    const inspection=await boundedAiRead(chrome.scripting.executeScript({target:{tabId:tab.id,frameIds:[0]},func:inspectAiReloadSafety,args:[model]}));
    guardAiPreparation(state);const result=inspection?.[0]?.result;
    if(!result?.safe)return {ready:false,reason:result?.reason||'Connection unavailable'};
  }
  const {aiTabReloads={}}=await chrome.storage.session.get('aiTabReloads');
  if(aiTabReloads[tab.id]&&Date.now()-aiTabReloads[tab.id]<60000)return {ready:false,reason:'Connection did not recover after automatic reload'};
  guardAiPreparation(state);
  await chrome.storage.session.set({aiTabReloads:Object.fromEntries([...Object.entries(aiTabReloads).filter(([,time])=>Date.now()-time<60000),[String(tab.id),Date.now()]]),aiTabRecovery:{id:state.id,tab:state.tab,frame:state.frame,documentId:state.documentId,ai:tab.id,model,time:Date.now()}});
  try{
    await notifyAiRecovery(state,true);
    guardAiPreparation(state);await chrome.tabs.reload(tab.id);let last={ready:false,reason:'Connection did not recover after automatic reload'};const deadline=Date.now()+15000;
    for(let attempt=0;attempt<60&&Date.now()<deadline;attempt++){
      guardAiPreparation(state);let current;try{current=await chrome.tabs.get(tab.id);}catch{return {ready:false,reason:'AI tab was closed'};}
      if(!sameAiService(current,model))return {ready:false,reason:'AI tab changed while reconnecting'};
      if(current.status!=='loading'){
        const response=await probeAiTab(current,model);guardAiPreparation(state);
        if(response.ready)return response;last=response;
        if(!['Disconnected','Sign in or reload','Notebook chat is loading'].includes(response.reason))return response;
      }
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    return last;
  }finally{const {aiTabRecovery}=await chrome.storage.session.get('aiTabRecovery');if(aiTabRecovery?.id===state.id)await chrome.storage.session.remove('aiTabRecovery');await notifyAiRecovery(state,false);}
}
