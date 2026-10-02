(() => {
  const $=id=>document.getElementById(id);
  const hosts={chatgpt:'https://chatgpt.com/*',gemini:'https://gemini.google.com/*',deepseek:'https://chat.deepseek.com/*'};
  const urls={chatgpt:'https://chatgpt.com/',gemini:'https://gemini.google.com/app',deepseek:'https://chat.deepseek.com/'};
  const names={chatgpt:'ChatGPT',gemini:'Gemini',deepseek:'DeepSeek'};
  const notes={mcgraw:'SmartBook, older Connect and the newer Connect MAP player. Journal worksheets and native choice/text fields are supported. Confidence and duplicate options apply only to SmartBook.',pearson:'Pearson MyLab numeric editor, choices and automatic checking/navigation.',canvas:'Canvas Classic quizzes; New Quizzes support is experimental. NotebookLM is preferred by default.',mindtap:'MindTap Aplia only. Save & Continue; optional grading before advancing.'};
  const keys=['preferNotebook','autoFill','pauseBeforeSubmit','showExplanation','gradeBeforeAdvance','checkMapWork','randomConfidence','doubleCreditMode','replaceExisting','useSuggestedTime','smoothScroll','includePictures'];
  let state={watchAutomation:false,platformMode:'auto',aiModel:'gemini',platformSettings:{},canvasOrigins:[]},editing='mcgraw',saveQueue=Promise.resolve(),revision=0,bookRevision=0;
  const prefs=()=>StudyConfig.preferences(state,editing);
  async function save(values){
    Object.assign(state,values);$('saved').textContent='Saving…';
    const copy=structuredClone(values);
    saveQueue=saveQueue.catch(()=>{}).then(()=>chrome.storage.sync.set(copy));
    try{await saveQueue;$('saved').textContent='Saved';}catch{$('saved').textContent='Settings could not be saved';}
  }
  async function platformSave(values){
    const platform=editing;
    await save({platformSettings:{...state.platformSettings,[platform]:{...StudyConfig.defaults[platform],...state.platformSettings[platform],...values}}});
  }
  function render(){
    $('platform-mode').value=state.platformMode;$('watchAutomation').checked=state.watchAutomation===true;
    for(const button of document.querySelectorAll('[data-model]')){const selected=button.dataset.model===state.aiModel;button.classList.toggle('selected',selected);button.setAttribute('aria-checked',String(selected));}
    for(const button of document.querySelectorAll('[data-platform]'))button.setAttribute('aria-selected',String(button.dataset.platform===editing));
    for(const key of keys)$(key).checked=Boolean(prefs()[key]);
    $('platform-description').textContent=notes[editing];
    $('pacingMode').value=prefs().pacingMode;
    for(const button of document.querySelectorAll('[data-pacing-mode]')){const selected=button.dataset.pacingMode===prefs().pacingMode;button.classList.toggle('selected',selected);button.setAttribute('aria-checked',String(selected));}
    for(const key of ['reviewSeconds','reviewMinSeconds','reviewMaxSeconds','advanceSeconds'])$(key).value=prefs()[key];
    $('pacing-options').hidden=['normal','human'].includes(prefs().pacingMode);
    $('human-options').hidden=prefs().pacingMode!=='human';$('humanSpeed').value=prefs().humanSpeed;for(const key of ['humanMinSeconds','humanMaxSeconds'])$(key).value=prefs()[key];
    $('pacing-description').textContent=prefs().pacingMode==='normal'?'Instant Auto still waits for the AI answer and the website to save. It adds no review countdown.':prefs().pacingMode==='slow'?'Timed Auto is fully automatic: review during the countdown, then it enters the answer and continues on its own.':prefs().pacingMode==='human'?'Human pace asks AI for the time a person would need to read, work, enter and check this question. Each field gets its own share; calculation questions usually take minutes.':'Review each step waits for Continue now for every entry and before continuing, even when the countdown reaches zero.';
    $('platform-extra-note').hidden=editing!=='pearson';$('check-map-feature').hidden=editing!=='mcgraw';$('grade-feature').hidden=editing!=='mindtap';$('confidence-feature').hidden=editing!=='mcgraw';$('double-feature').hidden=editing!=='mcgraw';$('canvas-site').hidden=editing!=='canvas';
    $('autoFill-feature').hidden=false;$('showExplanation-feature').hidden=false;$('replace-feature').hidden=editing!=='mcgraw';
    $('pause-label').textContent=editing==='mcgraw'?'Pause Before Submit':'Pause After Fill';
    $('pause-description').textContent=editing==='mcgraw'?'SmartBook: choose confidence manually. New Connect: review filled entries, then Resume Auto records and continues. Older Connect: Continue now resumes after filling.':'Pause before checking, saving or advancing. Resume Auto continues.';
  }
  async function availability(){
    const rev=++revision;let found='',open=false;
    $('connection-text').textContent='Checking open AI tabs…';
    for(const candidate of [state.aiModel,...Object.keys(hosts).filter(v=>v!==state.aiModel)]){
      const tabs=await chrome.tabs.query({url:hosts[candidate]});open ||=tabs.length>0;
      for(const tab of tabs){try{if((await chrome.tabs.sendMessage(tab.id,{type:'assistantReady'}))?.ready){found=candidate;break;}}catch{}}
      if(found)break;
    }
    if(rev!==revision)return;
    $('connection').className='connection '+(found?'ready':'warn');
    $('connection-text').textContent=found?names[found]+(found===state.aiModel?' is open and ready.':' is ready as the fallback AI.'):open?'AI tab is busy, has a draft or needs a reload.':'Open a regular chatbot in Chrome to connect.';
  }
  async function notebooks(){
    const rev=++bookRevision,settings=prefs();
    const tabs=(await chrome.tabs.query({url:['https://notebook.google.com/*','https://notebooklm.google.com/*']})).filter(t=>{try{return /^\/notebook\/[^/]+\/?$/.test(new URL(t.url).pathname);}catch{return false;}});
    if(rev!==bookRevision)return;
    $('notebook-choice').replaceChildren(new Option('Auto: use the only open notebook',''));
    for(const tab of tabs)$('notebook-choice').append(new Option(tab.title||'Notebook',tab.url.split('?')[0]));
    if(settings.notebookUrl&&!tabs.some(t=>t.url.split('?')[0]===settings.notebookUrl))$('notebook-choice').append(new Option('Selected notebook (not open)',settings.notebookUrl));
    $('notebook-choice').value=settings.notebookUrl;
    const selected=settings.notebookUrl?tabs.filter(t=>t.url.split('?')[0]===settings.notebookUrl):tabs;
    let ready=0;for(const tab of selected){try{if((await chrome.tabs.sendMessage(tab.id,{type:'notebookReady'}))?.ready)ready++;}catch{}}
    if(rev!==bookRevision)return;
    $('notebook-status').textContent=!settings.preferNotebook?'Notebook preference is off for this platform.':selected.length>1&&!settings.notebookUrl?'Choose a single readings notebook above.':ready?'NotebookLM is ready with selected sources.':selected.length?'Reload the notebook, select sources and clear its prompt.':settings.notebookUrl&&tabs.length?'The selected notebook is not open. Choose or open it.':'No notebook is open; uses a regular chatbot.';
  }
  for(const button of document.querySelectorAll('[data-model]'))button.onclick=async()=>{await save({aiModel:button.dataset.model});render();availability();};
  for(const button of document.querySelectorAll('[data-platform]'))button.onclick=()=>{editing=button.dataset.platform;render();notebooks();};
  for(const key of keys)$(key).onchange=async event=>{await platformSave({[key]:event.target.checked});if(key==='preferNotebook')notebooks();};
  $('watchAutomation').onchange=async event=>{await save({watchAutomation:event.target.checked});render();};
  for(const button of document.querySelectorAll('[data-pacing-mode]'))button.onclick=async()=>{await platformSave({pacingMode:button.dataset.pacingMode});render();};
  $('humanSpeed').onchange=async event=>{await platformSave({humanSpeed:event.target.value});render();};
  for(const key of ['humanMinSeconds','humanMaxSeconds'])$(key).onchange=async event=>{const value=event.target.valueAsNumber,next={...prefs(),[key]:value};if(!Number.isFinite(value)||value<10||value>7200||next.humanMaxSeconds<next.humanMinSeconds){$('saved').textContent='Use 10–7200 seconds, with maximum at least minimum.';return;}await platformSave({[key]:value});render();};
  $('pacingMode').onchange=async event=>{await platformSave({pacingMode:event.target.value});render();};
  for(const key of ['reviewSeconds','reviewMinSeconds','reviewMaxSeconds','advanceSeconds'])$(key).onchange=async event=>{
    const value=event.target.valueAsNumber,max=key==='advanceSeconds'?30:300,min=key==='advanceSeconds'?0:1;
    if(!Number.isFinite(value)||value<min||value>max){$('saved').textContent='Enter a number between '+min+' and '+max;return;}
    const next={...prefs(),[key]:value};
    if(next.reviewMaxSeconds<next.reviewMinSeconds){$('saved').textContent='Maximum review must be at least the minimum.';return;}
    next.reviewSeconds=Math.max(next.reviewMinSeconds,Math.min(next.reviewMaxSeconds,next.reviewSeconds));
    await platformSave({[key]:value,reviewSeconds:next.reviewSeconds});render();
  };
  $('platform-mode').onchange=async event=>{
    await chrome.runtime.sendMessage({type:'studyStopAll'});await save({platformMode:event.target.value});render();
    $('saved').textContent='Saved — reload the assignment page';
  };
  $('stop-all').onclick=async()=>{const result=await chrome.runtime.sendMessage({type:'studyStopAll'});$('saved').textContent=result?.received?'Automation stopped; entered answers remain.':'Could not stop. Reload the extension.';};
  $('notebook-choice').onchange=async event=>{await platformSave({notebookUrl:event.target.value});notebooks();};
  async function open(url,patterns){const tabs=await chrome.tabs.query({url:patterns});const selected=tabs.find(t=>t.url.split('?')[0]===url.split('?')[0])||tabs[0];if(selected){await chrome.tabs.update(selected.id,{active:true});await chrome.windows.update(selected.windowId,{focused:true});}else await chrome.tabs.create({url});}
  $('open-ai').onclick=()=>open(urls[state.aiModel],hosts[state.aiModel]);
  $('open-notebook').onclick=()=>open(prefs().notebookUrl||'https://notebook.google.com/',['https://notebook.google.com/*','https://notebooklm.google.com/*']);
  // In-page settings navigation keeps one scroll area and every existing preference.
  const categoryButtons=[...document.querySelectorAll('[data-category]')];
  const categoryScroll=new Map();let category='automation';
  function showCategory(next){
    if(!categoryButtons.some(button=>button.dataset.category===next))return;
    const scroller=document.querySelector('.content-scroll');
    categoryScroll.set(category,scroller.scrollTop);category=next;
    for(const button of categoryButtons){if(button.dataset.category===next)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
    for(const view of document.querySelectorAll('.category-view'))view.hidden=view.id!=='category-'+next;
    scroller.scrollTop=categoryScroll.get(next)||0;
  }
  for(const button of categoryButtons)button.onclick=()=>showCategory(button.dataset.category);
  $('open-expanded').hidden=new URLSearchParams(location.search).get('embedded')!=='1';
  $('open-expanded').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('popup/settings.html')+'?expanded=1&platform='+editing});
  $('open-guide').onclick=()=>{if(new URLSearchParams(location.search).get('embedded')==='1'&&window.parent!==window)window.parent.postMessage({type:'studyOpenFeatureGuide'},location.origin);else chrome.tabs.create({url:chrome.runtime.getURL('popup/help.html')});};
  $('enable-domain').onclick=async()=>{
    try{
      const u=new URL($('canvas-domain').value.trim());
      if(u.protocol!=='https:'||u.username||u.password||u.port||StudyConfig.detect(u.origin)&&StudyConfig.detect(u.origin)!=='canvas'||[...Object.values(urls),'https://notebook.google.com/','https://notebooklm.google.com/'].some(v=>new URL(v).origin===u.origin))throw Error('Enter your school’s HTTPS Canvas address.');
      const pattern=u.origin+'/*';
      const builtIn=u.hostname==='instructure.com'||u.hostname.endsWith('.instructure.com')||u.hostname==='canvas.csuchico.edu';
      if(!builtIn){
        const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
        if(!tab?.id||new URL(tab.url).origin!==u.origin)throw Error('Open the HTTPS Canvas page in the active tab, then enable it again.');
        await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},files:['shared/config.js','shared/security.js','shared/platform.js','shared/monitor.js','shared/pacing.js','shared/media.js','shared/capture-frame.js','content-scripts/canvas.js']});
      }
      await save({canvasOrigins:[...new Set([...state.canvasOrigins,u.origin])]});
      $('domain-status').textContent='Enabled for this active tab: '+u.hostname+'. Enable again after a reload or origin change.';
    }catch(error){$('domain-status').textContent=error.message;}
  };
  (async()=>{
    state={...state,...await chrome.storage.sync.get(['platformMode','aiModel','platformSettings','canvasOrigins','watchAutomation'])};
    if(!Object.hasOwn(names,state.aiModel))state.aiModel='gemini';
    state.platformSettings ||= {};state.canvasOrigins ||= [];
    const tab=(await chrome.tabs.query({active:true,currentWindow:true}))[0];
    const platform=StudyConfig.detect(tab?.url,state.canvasOrigins);
    if(platform)editing=platform;const requested=new URLSearchParams(location.search).get('platform');if(StudyConfig.platforms.includes(requested))editing=requested;
    $('detected').textContent=platform?'Current website: '+StudyConfig.names[platform]+'.':'No supported assignment website detected in this tab.';
    if(tab?.url){try{const u=new URL(tab.url);if(u.protocol==='https:'&&(platform==='canvas'||/\/courses\/\d+\/quizzes\//.test(u.pathname))){$('canvas-domain').value=u.origin;if(!platform)editing='canvas';}}catch{}}
    render();availability();notebooks();
  })().catch(error=>{$('saved').textContent=error.message;});
})();
