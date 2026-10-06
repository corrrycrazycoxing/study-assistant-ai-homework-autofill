/* Stored checkpoints contain hashes/progress, never question text, answers,
   prompts, pictures or authentication parameters. */
const checkpointAge=7*24*60*60*1000;
function panelSender(sender){return !sender.tab&&sender.url?.startsWith(chrome.runtime.getURL('sidepanel/'))||!sender.tab&&sender.url?.startsWith(chrome.runtime.getURL('popup/'));}
async function checkpointKey(sender,platform){
  let value=scope(sender,platform);if(platform==='mcgraw')value+='|'+new URL(sender.url).hash+'|'+new URL(sender.url).search;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(platform+'|'+value));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function readCheckpoint(key){const {checkpoints={}}=await chrome.storage.local.get('checkpoints');const item=checkpoints[key];return item&&Date.now()-item.updated<checkpointAge?item:null;}
async function saveCheckpoint(run){
  if(!run?.checkpointKey)return;
  const {checkpoints={}}=await chrome.storage.local.get('checkpoints');
  checkpoints[run.checkpointKey]={platform:run.platform,count:run.count||0,done:(run.done||[]).filter(v=>/^[a-f0-9]{8,64}$/.test(v)),phase:run.phase||'answer',lastKey:/^[a-f0-9]{8,64}$/.test(run.lastKey||'')?run.lastKey:'',updated:Date.now()};
  const retained=Object.fromEntries(Object.entries(checkpoints).filter(([,v])=>Date.now()-v.updated<checkpointAge).sort((a,b)=>b[1].updated-a[1].updated).slice(0,20));
  await chrome.storage.local.set({checkpoints:retained});
}
async function receivePageState(m,sender){
  const platform=await sourcePlatform(sender),s=m.state;if(!platform||!s||s.platform!==platform||typeof s.pageId!=='string'||s.pageId.length>80)return {received:false};
  const clean={pageId:s.pageId,platform,kind:s.kind==='legacy'?'legacy':'modern',status:String(s.status||'').slice(0,3000),preview:String(s.preview||'').slice(0,12000),recoverable:s.recoverable===true,controls:{},timer:null};
  for(const action of ['start','ask','fill','resume','stop','replaceStart','edit'])clean.controls[action]=s.controls?.[action]===true;
  if(s.timer)clean.timer={label:String(s.timer.label||'').slice(0,500),note:String(s.timer.note||'').slice(0,500),pauseLabel:String(s.timer.pauseLabel||'Pause').slice(0,80),progress:Math.max(0,Math.min(1,Number(s.timer.progress)||0))};
  const {pageStates={}}=await chrome.storage.session.get('pageStates');const key=sender.tab.id+':'+sender.frameId;
  pageStates[key]={...clean,tab:sender.tab.id,frame:sender.frameId,documentId:sender.documentId,sourceUrl:sender.url,title:sender.tab.title||StudyConfig.names[platform],updated:Date.now(),checkpointKey:await checkpointKey(sender,platform)};
  const fresh=Object.fromEntries(Object.entries(pageStates).filter(([,v])=>Date.now()-v.updated<20000).slice(-30));await chrome.storage.session.set({pageStates:fresh});return {received:true};
}
async function connections(settings){
  const services=[];for(const [model,pattern] of Object.entries(hosts)){
    const tabs=await chrome.tabs.query({url:pattern});let status='Not open',ready=false;
    for(const tab of tabs){if(tab.frozen||tab.discarded){status='Open tab to resume';continue;}try{const r=await chrome.tabs.sendMessage(tab.id,{type:'assistantReady'});status=r?.reason||'Needs reload';if(r?.ready){status='Ready';ready=true;break;}}catch{status='Reload this tab';}}
    services.push({model,ready,status});
  }
  const books=(await chrome.tabs.query({url:notebookHosts})).filter(t=>{try{return /^\/notebook\/[^/]+\/?$/.test(new URL(t.url).pathname);}catch{return false;}});
  const selected=settings?.notebookUrl?books.filter(t=>t.url.split('?')[0]===settings.notebookUrl.split('?')[0]):books;
  let notebook={ready:false,status:!selected.length?(books.length?'Selected notebook is not open':'Not open'):selected.length>1?'Choose one readings notebook':'Needs reload'};
  if(selected.length===1){if(selected[0].frozen||selected[0].discarded)notebook.status='Open tab to resume';else try{const r=await chrome.tabs.sendMessage(selected[0].id,{type:'notebookReady'});notebook={ready:!!r?.ready,status:r?.reason||(!r?.ready?'Needs reload':'Ready'),sources:r?.sources||0};}catch{notebook.status='Reload this notebook';}}
  return {services,notebook};
}
async function setupComplete(){const {studyOnboarding}=await chrome.storage.local.get('studyOnboarding');return studyOnboarding?.version===StudyConfig.onboardingVersion&&studyOnboarding.acknowledged===true&&studyOnboarding.completed===true;}
async function requireSetup(){if(!await setupComplete())throw Error(StudyConfig.onboardingMessage);}
async function completeSetup(m){
 if(m.version!==StudyConfig.onboardingVersion||m.acknowledged!==true||!StudyConfig.platforms.includes(m.platform)||!['chatgpt','gemini','deepseek'].includes(m.aiModel)||!['normal','slow','human','review'].includes(m.pacingMode)||['pauseBeforeSubmit','watchAutomation','preferNotebook'].some(k=>typeof m[k]!=='boolean'))throw Error('Choose the setup options and acknowledge the notice before continuing.');
 const data=await config(),platformSettings={...data.platformSettings};
 platformSettings[m.platform]={...StudyConfig.defaults[m.platform],...platformSettings[m.platform],pauseBeforeSubmit:m.pauseBeforeSubmit,preferNotebook:m.preferNotebook};
 await chrome.storage.sync.set({aiModel:m.aiModel,watchAutomation:m.watchAutomation,platformSettings,pacingSettings:{...StudyConfig.pacingDefaults,...data.pacingSettings,pacingMode:m.pacingMode}});
 await chrome.storage.local.set({studyOnboarding:{version:StudyConfig.onboardingVersion,acknowledged:true,completed:true,completedAt:Date.now()}});
 return {received:true};
}
async function panelSnapshot(m){
  const {pageStates={}}=await chrome.storage.session.get('pageStates');let pages=Object.values(pageStates).filter(s=>Date.now()-s.updated<12000);
  const [tabs,front]=await Promise.all([chrome.tabs.query({}),chrome.tabs.query({currentWindow:true})]);const live=new Map(tabs.map(t=>[t.id,t]));pages=pages.filter(p=>live.has(p.tab));
  const run=await activeRun();
  const {panelSettingsIntents={}}=await chrome.storage.session.get('panelSettingsIntents'),intent=panelSettingsIntents[m.windowId];
  const settingsIntent=intent&&Date.now()-intent.time<30000?intent:null;
  let page=(settingsIntent&&pages.find(p=>p.tab===settingsIntent.tab))||pages.find(p=>p.tab===m.tab&&(!m.pageId||p.pageId===m.pageId))||pages.find(p=>p.tab===run?.tab&&p.frame===run.frame)||pages.find(p=>front.some(t=>t.id===p.tab&&t.active))||pages.sort((a,b)=>b.updated-a.updated)[0];
  if(page){
    try{const r=await chrome.tabs.sendMessage(page.tab,{type:'studyPageProbe'},page.documentId?{documentId:page.documentId}:{frameId:page.frame});if(!r?.state||r.state.pageId!==page.pageId)page=null;else page={...page,...r.state};}catch{page=null;}
  }
  const data=await config(),preferences=page?StudyConfig.preferences(data,page.platform):{};
  const {pending,updateAvailable}=await chrome.storage.session.get(['pending','updateAvailable']);const checkpoint=page?await readCheckpoint(page.checkpointKey):null;
  return {received:true,onboardingRequired:!await setupComplete(),setupDefaults:{aiModel:data.aiModel||'gemini',watchAutomation:data.watchAutomation===true,platformSettings:Object.fromEntries(StudyConfig.platforms.map(p=>[p,StudyConfig.preferences(data,p)]))},settingsIntent,pages:pages.map(p=>({tab:p.tab,pageId:p.pageId,platform:p.platform,title:p.title})),page:page?{pageId:page.pageId,tab:page.tab,frame:page.frame,documentId:page.documentId,platform:page.platform,kind:page.kind,status:page.status,preview:page.preview,controls:page.controls,timer:page.timer,recoverable:page.recoverable}:null,
    run:run?{platform:run.platform,tab:run.tab,count:run.count||0,phase:run.phase||'answer'}:null,phase:pending&&page&&pending.tab===page.tab?pending.phase:null,
    checkpoint:checkpoint?{count:checkpoint.count,done:checkpoint.done.length,phase:checkpoint.phase,updated:checkpoint.updated}:null,updateAvailable:updateAvailable||null,connections:await connections(preferences),preferences:{pacingMode:preferences.pacingMode,pauseBeforeSubmit:preferences.pauseBeforeSubmit,preferNotebook:preferences.preferNotebook,aiModel:preferences.aiModel,watchAutomation:data.watchAutomation===true}};
}
async function panelCommand(m){
  if(!['stop','timerStop'].includes(m.action))await requireSetup();
  if(!['start','ask','fill','resume','stop','recover','replaceStart','timerPause','timerContinue','timerStop'].includes(m.action))throw Error('Unknown panel action.');
  const {pageStates={}}=await chrome.storage.session.get('pageStates');const p=Object.values(pageStates).find(p=>p.tab===m.tab&&p.pageId===m.pageId&&Date.now()-p.updated<12000);if(!p)throw Error('Assignment state is stale. Reload the assignment and refresh the panel.');
  if(!StudyConfig.allowed(p.platform,(await config()).platformMode))throw Error('This platform is disabled in settings.');
  return chrome.tabs.sendMessage(p.tab,{type:'studyPageCommand',pageId:p.pageId,action:m.action},p.documentId?{documentId:p.documentId}:{frameId:p.frame});
}
async function panelDraft(m){
  await requireSetup();
  if(!['read','save'].includes(m.operation))throw Error('Unknown answer editor action.');
  const {pageStates={}}=await chrome.storage.session.get('pageStates');
  const p=Object.values(pageStates).find(p=>p.tab===m.tab&&p.pageId===m.pageId&&Date.now()-p.updated<12000);
  if(!p||!StudyConfig.allowed(p.platform,(await config()).platformMode))throw Error('Assignment changed or is disabled. Refresh the panel.');
  const run=await activeRun(),{pending}=await chrome.storage.session.get('pending');
  if(run?.tab===p.tab||pending?.tab===p.tab)throw Error('Wait until the AI request or run finishes before editing.');
  return chrome.tabs.sendMessage(p.tab,{type:'studyPageDraft',pageId:p.pageId,operation:m.operation,token:m.token,values:m.values},p.documentId?{documentId:p.documentId}:{frameId:p.frame});
}
async function focusAssignment(m){
  const {pageStates={}}=await chrome.storage.session.get('pageStates');
  const p=Object.values(pageStates).find(p=>p.tab===m.tab&&p.pageId===m.pageId&&Date.now()-p.updated<12000);
  if(!p)throw Error('Assignment changed. Refresh the panel.');
  const tab=await chrome.tabs.update(p.tab,{active:true});if(tab.windowId!==undefined)await chrome.windows.update(tab.windowId,{focused:true});return {received:true};
}
async function forgetCheckpoint(m){const {pageStates={}}=await chrome.storage.session.get('pageStates');const p=Object.values(pageStates).find(p=>p.tab===m.tab&&p.pageId===m.pageId);if(!p)return {received:false};const {checkpoints={}}=await chrome.storage.local.get('checkpoints');delete checkpoints[p.checkpointKey];await chrome.storage.local.set({checkpoints});return {received:true};}
async function panelPreference(m){
  if(m.key==='watchAutomation'){if(typeof m.value!=='boolean')throw Error('Watch automation must be on or off.');await chrome.storage.sync.set({watchAutomation:m.value});return {received:true};}
  if(m.key!=='pauseBeforeSubmit'||typeof m.value!=='boolean')throw Error('Unknown run preference.');
  const {pageStates={}}=await chrome.storage.session.get('pageStates');const page=Object.values(pageStates).find(p=>p.tab===m.tab&&p.pageId===m.pageId&&Date.now()-p.updated<12000);
  if(!page)throw Error('Refresh the panel before changing run options.');
  const {platformSettings={}}=await config();await chrome.storage.sync.set({platformSettings:{...platformSettings,[page.platform]:{...platformSettings[page.platform],pauseBeforeSubmit:m.value}}});return {received:true};
}
async function openService(m){
  const urls={chatgpt:'https://chatgpt.com/',gemini:'https://gemini.google.com/app',deepseek:'https://chat.deepseek.com/',notebook:'https://notebooklm.google.com/'};
  if(!Object.hasOwn(urls,m.service))throw Error('Unknown AI service.');
  let url=urls[m.service];const tabs=await chrome.tabs.query({url:m.service==='notebook'?notebookHosts:hosts[m.service]});
  if(m.service==='notebook'){
    const {pageStates={}}=await chrome.storage.session.get('pageStates'),page=Object.values(pageStates).find(p=>p.tab===m.tab&&p.pageId===m.pageId),data=await config();
    const wanted=page?StudyConfig.preferences(data,page.platform).notebookUrl:'';
    if(wanted){try{const u=new URL(wanted);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['notebook.google.com','notebooklm.google.com'].includes(u.hostname)&&/^\/notebook\/[^/]+\/?$/.test(u.pathname))url=u.origin+u.pathname;}catch{}}
  }
  const exact=tabs.find(t=>t.url?.split('?')[0]===url),reading=tabs.find(t=>{try{return /^\/notebook\/[^/]+\/?$/.test(new URL(t.url).pathname);}catch{return false;}});
  const target=exact||(m.service==='notebook'&&url!==urls.notebook?null:m.service==='notebook'?reading:tabs.find(t=>t.active))||(m.service==='notebook'&&url!==urls.notebook?null:tabs[0]);
  if(target){const tab=await chrome.tabs.update(target.id,{active:true});if(tab.windowId!==undefined)await chrome.windows.update(tab.windowId,{focused:true});}
  else await chrome.tabs.create({url});
  return {received:true};
}
async function reloadService(m){
  if(!['chatgpt','gemini','deepseek','notebook'].includes(m.service))throw Error('Unknown AI service.');
  const tabs=await chrome.tabs.query({url:m.service==='notebook'?notebookHosts:hosts[m.service]});
  let target=tabs.find(t=>t.active)||tabs[0];
  if(m.service==='notebook'){
    const {pageStates={}}=await chrome.storage.session.get('pageStates'),page=Object.values(pageStates).find(p=>p.tab===m.tab&&p.pageId===m.pageId),data=await config();
    const wanted=page?StudyConfig.preferences(data,page.platform).notebookUrl:'';
    const books=tabs.filter(t=>{try{return /^\/notebook\/[^/]+\/?$/.test(new URL(t.url).pathname);}catch{return false;}});
    target=wanted?books.find(t=>t.url.split('?')[0]===wanted.split('?')[0]):books.length===1?books[0]:null;
  }
  if(!target)throw Error('The AI tab to reload is not available. Open it from the AI tabs section.');
  const sourceWindow=await chrome.windows.getLastFocused(),source=(await chrome.tabs.query({active:true,windowId:sourceWindow.id}))[0];
  await chrome.tabs.update(target.id,{active:true});
  if(target.windowId!==sourceWindow.id)await chrome.windows.update(target.windowId,{focused:true});
  const loaded=new Promise(resolve=>{const timeout=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(onUpdate);resolve(false);},15000);function onUpdate(id,change){if(id===target.id&&change.status==='complete'){clearTimeout(timeout);chrome.tabs.onUpdated.removeListener(onUpdate);resolve(true);}}chrome.tabs.onUpdated.addListener(onUpdate);});
  try{await chrome.tabs.reload(target.id);await loaded;}
  finally{
    if(source&&source.id!==target.id){
      const active=(await chrome.tabs.query({active:true,windowId:target.windowId}))[0];
      if(active?.id===target.id){await chrome.tabs.update(source.id,{active:true}).catch(()=>{});if(target.windowId!==sourceWindow.id)await chrome.windows.update(sourceWindow.id,{focused:true}).catch(()=>{});}
    }
  }
  return {received:true};
}
function initializeSidePanel(){chrome.sidePanel?.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>{});}
initializeSidePanel();chrome.runtime.onInstalled?.addListener(async()=>{initializeSidePanel();try{const scripts=await chrome.scripting.getRegisteredContentScripts();const stale=scripts.filter(s=>s.id.startsWith('study-canvas-')).map(s=>s.id);if(stale.length)await chrome.scripting.unregisterContentScripts({ids:stale});}catch{}});
