/* Retain the notebook used by a quiz across Canvas's full-page submission navigation. */
(() => {
  const types=new Set(['canvasQuizTrackPrepared','canvasQuizSubmitIntent','canvasQuizSubmitted','readingsCleanupSubmit']);
  const bookUrl=value=>{try{const u=new URL(value);return ['https://notebook.google.com','https://notebooklm.google.com'].includes(u.origin)&&/^\/notebook\/[\w-]+$/.test(u.pathname)?u.origin+u.pathname:null;}catch{return null;}};
  let queue=Promise.resolve();
  const serial=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;};
  async function recordUse(sender,url,sourceTab){
    const base=StudyCanvasQuiz.base(sender.url);if(!base||new URL(sender.url).pathname!==new URL(base).pathname+'/take')return;
    const {readingNotebooks:books={}}=await chrome.storage.local.get('readingNotebooks');
    if(!bookUrl(url))return;
    const managed=Object.values(books).some(b=>b.createdByAutomation===true&&bookUrl(b.url)===bookUrl(url));
    const {quizNotebookUses:uses={}}=await chrome.storage.session.get('quizNotebookUses'),key=sender.tab.id+'|'+base,old=uses[key];
    const sameAttempt=old?.url===bookUrl(url)&&old?.documentId===sender.documentId;
    const sourceTabs=[...new Set([...(sameAttempt?(old.sourceTabs||[old.sourceTab]):[]),sourceTab].filter(Number.isInteger))];
    uses[key]={base,tab:sender.tab.id,url:bookUrl(url),sourceTab,sourceTabs,managed,documentId:sender.documentId,usedAt:Date.now(),intent:sameAttempt&&old.intent===true};
    await chrome.storage.session.set({quizNotebookUses:uses});
  }
  async function handle(message,sender){return serial(async()=>{
    if(message.type==='readingsCleanupSubmit'){
      const {afterUseCleanup:job}=await chrome.storage.session.get('afterUseCleanup'),{notebookCleanupPreferences:prefs={},readingNotebooks:books={}}=await chrome.storage.local.get(['notebookCleanupPreferences','readingNotebooks']);
      const actual=await chrome.tabs.get(sender.tab?.id).catch(()=>null);
      if(sender.id!==chrome.runtime.id||!job?.automatic||job.id!==message.id||sender.frameId!==0||sender.tab?.id!==job.tab||Date.now()-job.created>300000||!prefs.afterSubmit||!actual||new URL(actual.url).origin!=='https://notebook.google.com'||new URL(actual.url).searchParams.get('studyCleanupRun')!==job.id)throw Error('Automatic submitted-quiz cleanup is no longer authorized.');
      const url=job.candidate.url,open=await chrome.tabs.query({url:['https://notebook.google.com/*','https://notebooklm.google.com/*']});
      if(open.some(tab=>tab.id!==job.tab&&bookUrl(tab.url)===url))throw Error('This notebook is open in another tab. Close it before cleanup.');
      if(!Object.values(books).some(b=>b.createdByAutomation===true&&bookUrl(b.url)===url))throw Error('This notebook no longer has verified automation ownership.');
      if(message.step==='quota'&&!job.started){job.started=true;await chrome.storage.session.set({afterUseCleanup:job});return {received:true,candidate:{url}};}
      if(message.step==='quotaConfirm'&&job.started&&!job.confirmed){job.confirmed=true;await chrome.storage.session.set({afterUseCleanup:job});return {received:true};}
      if(message.step==='quotaRemoved'&&job.confirmed){for(const [key,b] of Object.entries(books))if(b.createdByAutomation===true&&bookUrl(b.url)===url)delete books[key];await chrome.storage.local.set({readingNotebooks:books});await chrome.storage.session.remove('afterUseCleanup');setTimeout(async()=>{const tab=await chrome.tabs.get(job.tab).catch(()=>null);if(tab&&new URL(tab.url).searchParams.get('studyCleanupRun')===job.id)await chrome.tabs.remove(job.tab);},400);return {received:true};}
      throw Error('Submitted-quiz cleanup step is out of order.');
    }
    if(sender.id!==chrome.runtime.id||sender.frameId!==0||await sourcePlatform(sender)!=='canvas')return {received:false};
    const base=StudyCanvasQuiz.base(sender.url);
    if(message.type==='canvasQuizTrackPrepared'){
      const {readingsJob:job}=await chrome.storage.session.get('readingsJob');
      if(!base||new URL(sender.url).pathname!==new URL(base).pathname+'/take'||job?.phase!=='ready'||!job.sourceName||job.owner?.tab!==sender.tab.id||StudyCanvasQuiz.base(job.owner.url)!==base)return {received:true,skipped:true};
      await recordUse(sender,job.notebookUrl,job.bookTab);return {received:true};
    }
    const key=sender.tab.id+'|'+base,{quizNotebookUses:uses={}}=await chrome.storage.session.get('quizNotebookUses'),use=uses[key];
    async function finishCourse(){
      const {canvasMcGrawCourse:run}=await chrome.storage.session.get('canvasMcGrawCourse');
      if(run?.includeCanvasQuizzes&&run.tab===sender.tab.id&&run.quizBase===base&&['quiz-running','review'].includes(run.phase)){
        run.phase='returning';run.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:run});await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});
      }
    }
    if(!base)return {received:false};
    const {quizSubmitIntents:intents={}}=await chrome.storage.session.get('quizSubmitIntents');
    if(message.type==='canvasQuizSubmitIntent'){
      if(new URL(sender.url).pathname!==new URL(base).pathname+'/take')return {received:false};
      intents[key]={created:Date.now(),documentId:sender.documentId};
      if(use&&Date.now()-use.usedAt<=14400000)use.intent=true;
      await chrome.storage.session.set({quizSubmitIntents:intents,quizNotebookUses:uses});return {received:true};
    }
    if(message.type!=='canvasQuizSubmitted'||new URL(sender.url).pathname!==new URL(base).pathname||message.confirmed!==true)return {received:false};
    const hasIntent=intents[key]&&Date.now()-intents[key].created<=14400000;
    if(message.requiresIntent===true&&!hasIntent&&!(use?.intent&&Date.now()-use.usedAt<=14400000))return {received:false};
    const {autoRun}=await chrome.storage.session.get('autoRun');
    if(autoRun?.platform==='canvas'&&autoRun.tab===sender.tab.id&&StudyCanvasQuiz.base(autoRun.url)===base)await chrome.storage.session.remove('autoRun');
    // A regular chatbot run has no notebook receipt, but a confirmed result
    // must still release its course queue. Cleanup continues to require a book.
    if(!use||Date.now()-use.usedAt>14400000){await finishCourse();return {received:true,skipped:true};}
    const openTabs=await chrome.tabs.query({});
    if(Object.values(uses).some(other=>other!==use&&other.url===use.url&&openTabs.some(tab=>tab.id===other.tab&&StudyCanvasQuiz.base(tab.url)===other.base&&new URL(tab.url).pathname.endsWith('/take'))))return {received:true,waiting:true,inUse:true};
    const {pending,readingsJob:preparation}=await chrome.storage.session.get(['pending','readingsJob']);
    for(const id of use.sourceTabs||[use.sourceTab]){
      if(!Number.isInteger(id)||id===sender.tab.id)continue;
      const source=await chrome.tabs.get(id).catch(()=>null);
      if(!source||source.pendingUrl||bookUrl(source.url)!==use.url)continue;
      if([pending?.ai,pending?.notebookTab,pending?.formatter].includes(id)||preparation?.bookTab===id&&!['ready','failed','cancelled'].includes(preparation.phase))return {received:true,waiting:true,inUse:true};
      // Close the tabs actually used by this submitted quiz even if a later
      // preparation replaced readingsJob. Never close a new draft or response.
      const state=await probeAiTab(source,'notebook');
      if(!state.ready)return {received:true,waiting:true,reason:state.reason};
      const current=await chrome.tabs.get(id).catch(()=>null);
      if(current&&!current.pendingUrl&&bookUrl(current.url)===use.url)await chrome.tabs.remove(id);
    }
    if(!use.managed){delete uses[key];await chrome.storage.session.set({quizNotebookUses:uses});await finishCourse();return {received:true,skipped:true};}
    const {notebookCleanupPreferences:prefs={}}=await chrome.storage.local.get('notebookCleanupPreferences');
    // Preserve a receipt when cleanup is off so enabling it on the results
    // page can still trigger the expected operation without answering again.
    if(!prefs.afterUse&&!prefs.afterSubmit){await finishCourse();return {received:true,skipped:true};}
    const {afterUseCleanup:active}=await chrome.storage.session.get('afterUseCleanup');
    if(active&&Date.now()-active.created<1800000&&(await chrome.tabs.get(active.tab).catch(()=>null)))return {received:true,waiting:true};
    const result=prefs.afterSubmit?{skipped:true}:await StudyReadingTasks.handle({type:'canvasCleanupAfterUse',url:use.url},sender);
    if(prefs.afterSubmit){
      // Save automatic authorization before navigation so the home script
      // cannot race the confirmation-only route while its document loads.
      const tab=await chrome.tabs.create({url:'about:blank',active:true});
      const task={id:crypto.randomUUID(),tab:tab.id,created:Date.now(),candidate:{url:use.url},returnTab:sender.tab.id,returnUrl:sender.url,automatic:true};await chrome.storage.session.set({afterUseCleanup:task});await chrome.tabs.update(task.tab,{url:'https://notebook.google.com/?studyCleanup='+encodeURIComponent(use.url)+'&studyCleanupRun='+encodeURIComponent(task.id)+'&studyCleanupSubmit=1'});
    }
    delete uses[key];await chrome.storage.session.set({quizNotebookUses:uses});await finishCourse();return {received:true,opened:!result.skipped||prefs.afterSubmit===true};
  });}
  globalThis.StudyQuizLifecycle={handles:type=>types.has(type),handle,recordUse:(...args)=>serial(()=>recordUse(...args))};
})();
