/* Local UI bridge for the unified side panel. It never invokes site grading
   directly; commands use the existing, guarded adapter controls. */
(() => {
  if(globalThis.StudyMonitor)return;
  const pageId=crypto.randomUUID();let platform=null,recover=null,replaceStart=null,editor=null,lastPresence=0,stoppedNotice='',bound=false,commandBusy=false,retired=false,heartbeat=null,messageListener=null,registration=null,presentation=null,observation={},course=null,courseStop=null,previewNotice='',reporting=false;
  const leases=new Set();let connectListener=null,acknowledged=false,welcomeHost=null,storageListener=null;
  const definitions=[
    ['study-connect-assistant','mcgraw',{start:'[data-start]',ask:'[data-ask]',fill:'[data-fill]',resume:'[data-resume]',stop:'[data-stop]'},'[data-status]','[data-preview]'],
    ['mylab-assistant-panel','pearson',{start:'#start',ask:'#ask',fill:'#apply',resume:'#resume',stop:'#assignment-controls:not([hidden]) #stop,#course-auto-view:not([hidden]) #stop-course-auto'},'#status','#preview'],
    ['canvas-assistant-panel','canvas',{start:'#start',ask:'#ask',fill:'#fill',resume:'#resume',stop:'#stop',cancel:'#cancel'},'#status','#preview'],
    ['mindtap-assistant-panel','mindtap',{start:'#run-assignment:not([hidden]),#start:not([hidden])',ask:'#ask',fill:'#fill',resume:'#resume',stop:'#stop',cancel:'#cancel'},'#status','#preview']
  ];
  const trim=(s,n=3000)=>String(s||'').trim().slice(0,n);
  const reloadNotice='Extension updated or reloaded. Refresh this assignment and your AI tabs to reconnect.';
  function contextAlive(){try{return !!chrome.runtime.id;}catch{return false;}}
  function invalidContext(error){return !contextAlive()||/extension context invalidated/i.test(error?.message||'');}
  function view(){
    if(registration)return {host:document.body,root:document,platform:registration.platform,buttons:{},modern:false,registered:true};
    for(const [id,p,buttons,status,preview] of definitions){const host=document.getElementById(id);if(host?.shadowRoot)return {host,root:host.shadowRoot,platform:p,buttons,status,preview,modern:true};}
    return null;
  }
  const available=button=>!!button&&!button.disabled&&!button.hidden&&!button.closest('[hidden]');
  function read(){
    const v=view();if(!v)return null;
    const timer=(v.root.querySelector('.study-pacing')||document.querySelector('body > .study-pacing'));
    const t=timer&&!timer.hidden?timer.shadowRoot:null;
    const controls=Object.fromEntries(Object.entries(v.buttons).map(([key,selector])=>[key,available(v.root.querySelector(selector))]));
    if(commandBusy){controls.start=false;controls.ask=false;controls.fill=false;}
    controls.replaceStart=!!replaceStart&&!commandBusy&&/Existing (?:worksheet )?answers differ/.test(v.root.querySelector(v.status)?.textContent||'');
    try{controls.edit=!!editor&&!commandBusy&&editor.canEdit()===true;}catch{controls.edit=false;}
    const registered=v.registered?registration.read():null;if(registered)Object.assign(controls,registered.controls);
    const replace=v.modern?v.root.querySelector('[data-replace],#replace'):null;
    const courseView=v.modern?v.root.getElementById('course-auto-view'):null;
    const nativeCourse=courseView&&!courseView.hidden?{label:trim(v.root.getElementById('course-current-assignment')?.textContent),total:Number(v.root.getElementById('course-total-progress')?.max||1),done:Number(v.root.getElementById('course-total-progress')?.value||0)}:null;
    if(course&&courseStop&&!retired)controls.stop=true;
    return {pageId,buildId:globalThis.StudyBuild?.id,course:nativeCourse||course||observation.course||null,replace:replace?{checked:replace.checked}:null,platform:v.platform,kind:v.modern?'modern':'legacy',status:stoppedNotice||trim(v.modern?v.root.querySelector(v.status)?.textContent:registered?.status),preview:v.modern?trim(v.root.querySelector(v.preview)?.textContent,12000):trim(registered?.preview||previewNotice,12000),controls,
      timer:t?{label:trim(t.getElementById('label')?.textContent,500),note:trim(t.getElementById('note')?.textContent,500),pauseLabel:trim(t.getElementById('pause')?.textContent,80),progress:Number(t.getElementById('progress')?.value||0)}:null,recoverable:!retired&&!!recover};
  }
  function welcome(){
    if(retired)return;
    if(acknowledged){welcomeHost?.remove();welcomeHost=null;return;}
    if(!view())return;
    if(!welcomeHost){
      welcomeHost=document.createElement('div');welcomeHost.id='study-first-use';welcomeHost.style.cssText='position:fixed;right:18px;bottom:20px;z-index:2147483647;max-width:calc(100vw - 36px)';
      const shadow=welcomeHost.attachShadow({mode:'open'});shadow.innerHTML='<style>:host{font:13px/1.5 system-ui;color:#edf2ff}section{padding:15px;background:#162038;border:1px solid #687baa;border-radius:12px;box-shadow:0 8px 30px #0004;width:275px;max-width:calc(100vw - 68px)}strong{font-size:15px}p{font-size:12px;color:#b7c8e7;margin:7px 0 12px}button{width:100%;border:1px solid #96a5ff;background:#596df2;border-radius:7px;padding:10px;color:white;font:inherit;cursor:pointer}button:disabled{opacity:.5}button:focus-visible{outline:2px solid white;outline-offset:3px}</style><section aria-label="Study Assistant setup"><strong>Attention required</strong><p id="welcome-status">Before Study Assistant can help, review how it works and choose your preferences. Nothing starts yet.</p><button id="welcome-open">Review and set up →</button></section>';
      shadow.getElementById('welcome-open').onclick=()=>{const button=shadow.getElementById('welcome-open');button.disabled=true;try{chrome.runtime.sendMessage({type:'studyOpenWelcome'}).then(result=>{if(!result?.received)shadow.getElementById('welcome-status').textContent='Click the extension icon to open setup.';},()=>{shadow.getElementById('welcome-status').textContent='Click the extension icon to open setup.';}).finally(()=>{button.disabled=false;});}catch{button.disabled=false;shadow.getElementById('welcome-status').textContent='Reload this assignment and click the extension icon.';}};
      document.body.append(welcomeHost);
    }
    welcomeHost.style.display=leases.size?'none':'';
  }
  function compactOverlay(){
    const v=view();if(!v)return;
    if(!globalThis.StudyAssignmentUI)return;
    if(v.modern)v.host.style.display='none';
    if(!presentation?.host?.isConnected)presentation=StudyAssignmentUI.create({command,openPanel:()=>chrome.runtime.sendMessage({type:'studyOpenPanel'}).catch(()=>{}),replace:value=>{const input=view()?.root.querySelector('[data-replace],#replace');if(input&&input.checked!==value)input.click();}});
    for(const timer of [v.root.querySelector('.study-pacing'),document.querySelector('body > .study-pacing')].filter(Boolean))timer.style.display='none';
    const state=read();if(state)presentation.render(state,observation);
    presentation.visibility(acknowledged&&leases.size===0&&!lastPresence&&observation.owner!==false);
    for(const toolbar of document.querySelectorAll('.study-pace-controls')){toolbar.hidden=retired||observation.owner===false;const start=toolbar.shadowRoot?.getElementById('quick-start');if(start)start.disabled=retired||!state?.controls.start;}
  }
  function presence(on){
    if(!retired&&!acknowledged)on=true;
    lastPresence=on?Date.now():0;
    presentation?.visibility(!on&&observation.owner!==false);
    const v=view();if(v?.modern)v.host.style.display='none';
    // Countdown lives in the shared panel while the old adapter DOM is inert.
    for(const timer of [v?.root.querySelector('.study-pacing'),document.querySelector('body > .study-pacing')].filter(Boolean))timer.style.display='none';
  }
  function retire(){
    if(retired)return;retired=true;stoppedNotice=reloadNotice;recover=null;
    clearInterval(heartbeat);heartbeat=null;
    try{if(messageListener)chrome.runtime.onMessage.removeListener(messageListener);}catch{}
    messageListener=null;welcomeHost?.remove();welcomeHost=null;try{if(storageListener)chrome.storage.onChanged?.removeListener(storageListener);}catch{}presence(false);
    try{if(connectListener)chrome.runtime.onConnect.removeListener(connectListener);for(const port of leases)port.disconnect();}catch{}leases.clear();
    // Old controls cannot reconnect to a new extension instance. Restore their
    // visibility only to explain the reload; do not offer obsolete actions.
    const v=view();if(!v)return;
    if(v.modern){const status=v.root.querySelector(v.status);if(status)status.textContent=reloadNotice;for(const selector of Object.values(v.buttons)){const button=v.root.querySelector(selector);if(button)button.disabled=true;}}
    for(const toolbar of document.querySelectorAll('.study-pace-controls'))toolbar.hidden=true;
    presentation?.retire({...read(),status:reloadNotice,controls:{}});
    for(const timer of [v.root.querySelector('.study-pacing'),document.querySelector('body > .study-pacing')].filter(Boolean))timer.hidden=true;
  }
  async function command(action){
    if(retired||!contextAlive()){retire();throw Error(reloadNotice);}
    if(!acknowledged&&!['stop','timerStop'].includes(action))throw Error(StudyConfig.onboardingMessage);
    if(commandBusy&&!['stop','timerStop'].includes(action))throw Error('Recovery is in progress. Use Stop all to cancel.');stoppedNotice='';if(['start','ask'].includes(action))previewNotice='';const v=view();if(!v)throw Error('The assignment controls are not loaded. Reload the assignment.');
    if(action==='recover'){if(!recover)throw Error('This adapter cannot restore saved progress. Start from the current question.');commandBusy=true;try{return await recover();}finally{commandBusy=false;}}
    if(action==='replaceStart'){if(!read().controls.replaceStart)throw Error('There is no answer conflict to replace.');commandBusy=true;try{return await replaceStart();}finally{commandBusy=false;}}
    if(action==='timerPause'||action==='timerContinue'||action==='timerStop'){
      const timer=v.root.querySelector('.study-pacing')||document.querySelector('body > .study-pacing');
      if(!timer||timer.hidden)throw Error('There is no active countdown.');
      timer.shadowRoot.getElementById({timerPause:'pause',timerContinue:'continue',timerStop:'stop'}[action]).click();return;
    }
    if(action==='stop'&&course&&courseStop)return courseStop();
    if(action==='stop'&&observation.course)await chrome.runtime.sendMessage({type:'canvasCoursePlayerStop'}).catch(()=>{});
    if(v.registered){if(!read().controls[action]||!registration.actions[action])throw Error('That action is unavailable in the current assignment state.');return registration.actions[action]();}
    const button=v.root.querySelector(v.buttons[action]||'__missing__');
    if(!read().controls[action]||!button)throw Error('That action is unavailable in the current assignment state.');
    button.click();
  }
  async function report(){
    if(retired||reporting)return;reporting=true;
    try{if(!contextAlive()){retire();return;}compactOverlay();welcome();if(!acknowledged)presence(true);const state=read();if(state){const result=await chrome.runtime.sendMessage({type:'studyPageReport',state});if(result?.stale){retire();return;}if(result?.received)observation=result;compactOverlay();}}
    catch(error){if(invalidContext(error))retire();}finally{reporting=false;}
  }
  function listen(){if(bound)return;messageListener=(m,sender,reply)=>{
    if(!['studyPageProbe','studyPageCommand','studyPageRelease','studyPageDraft'].includes(m.type))return;
    if(retired||!contextAlive()){retire();reply({received:false,error:reloadNotice});return;}
    if(sender.id&&sender.id!==chrome.runtime.id){reply({received:false});return;}
    if(m.type==='studyPageRelease'){presence(false);reply({received:true});return;}
    if(m.type==='studyPageProbe'){if(Object.hasOwn(m,'present'))presence(m.present===true||leases.size>0);reply({received:true,state:read()});return;}
    if(m.pageId!==pageId){reply({received:false,error:'The assignment reloaded. Refresh the panel before continuing.'});return;}
    if(m.type==='studyPageDraft'){
      (async()=>{
        if(!acknowledged)throw Error(StudyConfig.onboardingMessage);
        if(!editor||commandBusy||!editor.canEdit())throw Error('Ask AI before editing. A running or filled question cannot be edited here.');
        if(m.operation==='read')return {received:true,draft:await editor.read()};
        if(m.operation!=='save')throw Error('Unknown answer editor action.');
        const draft=await editor.read();
        if(m.token!==draft.token)throw Error('The answer changed while you were editing. Reopen the editor.');
        if(!m.values||typeof m.values!=='object'||Array.isArray(m.values)||JSON.stringify(m.values).length>128000)throw Error('Invalid edited answers.');
        const fields=draft.fields;
        if(Object.keys(m.values).length!==fields.length||fields.some(f=>!Object.hasOwn(m.values,f.key)))throw Error('Every answer field must be included exactly once.');
        for(const f of fields){const v=m.values[f.key];if(f.type==='multiple'){if(!Array.isArray(v)||v.length>300||v.some(x=>typeof x!=='string'||!f.options.includes(x))||new Set(v).size!==v.length)throw Error('Select only the displayed choices.');}else if(typeof v!=='string'||v.length>4000||f.type==='single'&&!f.options.includes(v))throw Error('Enter a supported answer value.');}
        commandBusy=true;
        try{await editor.apply(m.values);stoppedNotice='';await report();return {received:true};}finally{commandBusy=false;}
      })().then(reply,e=>reply({received:false,error:trim(e.message)}));return true;
    }
    command(m.action).then(()=>report(),e=>{stoppedNotice=trim(e.message);report();});reply({received:true});return;
  };chrome.runtime.onMessage.addListener(messageListener);bound=true;}
  function listenLeases(){
    if(!chrome.runtime.onConnect)return;
    connectListener=port=>{
      if(retired||port.name!=='study-sidepanel-lease'||port.sender?.id!==chrome.runtime.id||!port.sender?.url?.startsWith(chrome.runtime.getURL('sidepanel/')))return;
      leases.add(port);presence(true);welcome();
      port.onDisconnect.addListener(()=>{leases.delete(port);if(!leases.size)presence(false);welcome();});
    };
    chrome.runtime.onConnect.addListener(connectListener);
  }
  globalThis.StudyMonitor={showPreview(text){if(!retired){previewNotice=trim(text,12000);report();}},register(value){registration=value;report();},setCourse(value,onStop){course=value;courseStop=value&&typeof onStop==='function'?onStop:null;report();},setEditor(value){if(!retired)editor=value;},setRecovery(fn){if(!retired)recover=fn;},setReplacement(fn){if(!retired)replaceStart=fn;},notice(text){if(!retired){stoppedNotice=trim(text);report();}},clearNotice(){if(!retired)stoppedNotice='';},report};
  (async()=>{
    try{
      if(!contextAlive()){retire();return;}
      const data=await chrome.storage.sync.get(['platformMode','featureSettings','canvasOrigins']);
      if(!contextAlive()){retire();return;}
      platform=StudyConfig.detect(location.href,data.canvasOrigins||[]);if(!StudyConfig.allowed(platform,data))return;
      const local=await chrome.storage.local.get('studyOnboarding');if(!contextAlive()){retire();return;}const valid=value=>value?.version===StudyConfig.onboardingVersion&&value.acknowledged===true&&value.completed===true;acknowledged=valid(local.studyOnboarding);
      storageListener=(changes,area)=>{if(area==='local'&&Object.hasOwn(changes,'studyOnboarding')){acknowledged=valid(changes.studyOnboarding.newValue);welcome();presence(leases.size>0);report();}};chrome.storage.onChanged?.addListener(storageListener);
      listen();listenLeases();heartbeat=setInterval(()=>{if(leases.size)presence(true);else if(lastPresence&&Date.now()-lastPresence>6500)presence(false);report();},1800);await report();
    }catch(error){if(invalidContext(error))retire();}
  })();
})();
