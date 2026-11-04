// Notebook preparation is independent of the serialized AI-answer queue so
// Stop and page navigation can cancel it while NotebookLM processes a source.
(() => {
  'use strict';
  const types=new Set(['readingsFetchCatalog','readingsSaveCatalog','canvasPrepareReadings','canvasReadingPreflight','readingsPrepareSelected','readingsStatus','readingsCurrent','readingsCancel','readingsJob','readingsStep','canvasCleanupAfterUse','readingsCleanupFinished']);
  const terminal=job=>!job||['ready','failed','cancelled'].includes(job.phase);
  const notebookUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['notebook.google.com','notebooklm.google.com'].includes(u.hostname)&&/^\/notebook\/[\w-]+$/.test(u.pathname)&&!u.pathname.endsWith('/creating')?u.origin+u.pathname:null;}catch{return null;}};
  const settingsSender=sender=>{try{const u=new URL(sender.url);return sender.id===chrome.runtime.id&&u.origin===new URL(chrome.runtime.getURL('/')).origin&&u.pathname==='/popup/settings.html';}catch{return false;}};
  const owner=(job,sender)=>settingsSender(sender)&&job.owner.settings||sender.tab?.id===job.owner.tab&&sender.frameId===job.owner.frame&&sender.url===job.owner.url&&(!job.owner.documentId||!sender.documentId||sender.documentId===job.owner.documentId);
  const book=(job,sender)=>{try{const u=new URL(sender.url);return sender.tab?.id===job.bookTab&&sender.frameId===0&&u.origin===job.bookOrigin&&(job.notebookUrl?notebookUrl(sender.url)===job.notebookUrl||job.phase==='opening'&&u.pathname==='/':u.pathname==='/'||u.pathname==='/notebook/creating'||Boolean(notebookUrl(sender.url)));}catch{return false;}};
  let mutations=Promise.resolve();
  const mutate=action=>{const next=mutations.then(action);mutations=next.catch(()=>{});return next;};
  function closeCleanupTabs(job){
    // Let the removal acknowledgement reach the content script before closing
    // its task-owned tab. Never close a reused personal notebook or a tab that
    // has since navigated elsewhere.
    setTimeout(async()=>{
      if(job.sourceTab&&job.sourceTab!==job.tab&&job.sourceTab!==job.returnTab){
        try{const tab=await chrome.tabs.get(job.sourceTab);if(notebookUrl(tab.url)===job.candidate.url)await chrome.tabs.remove(tab.id);}catch{}
      }
      try{const tab=await chrome.tabs.get(job.returnTab);if(tab.url===job.returnUrl)await focusTab(tab.id);}catch{}
      try{const tab=await chrome.tabs.get(job.tab),url=new URL(tab.url);if(url.origin==='https://notebook.google.com'&&url.pathname==='/'&&url.searchParams.get('studyCleanup')===job.candidate.url)await chrome.tabs.remove(tab.id);}catch{}
    },400);
  }
  async function ownerAlive(job){
    if(job.owner.settings)return true;
    try{const target=job.owner.documentId?{documentId:job.owner.documentId}:{frameId:job.owner.frame};return (await chrome.tabs.sendMessage(job.owner.tab,{type:'canvasReadingOwner',id:job.id},target))?.current===true;}catch{return false;}
  }
  async function jobState(){
    const {readingsJob:job}=await chrome.storage.session.get('readingsJob');
    if(job&&!terminal(job)&&Date.now()-job.started>240000){job.phase='failed';job.error='Reading preparation timed out. Check the notebook before retrying.';await chrome.storage.session.set({readingsJob:job});}
    return job;
  }
  async function start(message,sender){
    const settings=settingsSender(sender);
    if(!settings&&await sourcePlatform(sender)!=='canvas')throw Error('Open a Canvas quiz to prepare its readings.');
    if(message.notebookUrl&&!settings)throw Error('Choose an empty notebook from reading preparation settings.');
    const {canvasReadings:catalog}=await chrome.storage.local.get('canvasReadings');
    if(!settings){
      const preferences=StudyConfig.preferences(await config(),'canvas');
      if(!preferences.preferNotebook&&message.loadSource!==true)return {received:true,skipped:true};
      // The user's ready notebook is sufficient. A syllabus mismatch, failed
      // preload or disabled finder must never veto that explicit source choice.
      if(message.loadSource!==true&&(await openReadingNotebook(preferences)).tab)return {received:true,skipped:true};
    }
    if(!catalog?.enabled&&!settings&&message.loadSource!==true)return {received:true,skipped:true};
    if(!catalog?.entries?.length)throw Error('Load your Google Doc reading list in Settings → Canvas → AI & readings.');
    const entry=settings&&message.key?catalog.entries.find(item=>item.key===message.key):StudyReadings.matchQuiz(message.title,typeof message.description==='string'?message.description.slice(0,12000):'',catalog.entries);
    if(!entry)throw Error('Choose a reading from the loaded list.');
    const current=await jobState();
    if(!terminal(current)){
      if(owner(current,sender)&&current.source.key===entry.key&&current.catalogUrl===catalog.docUrl)return {received:true,id:current.id,sourceTitle:entry.title};
      throw Error('Another reading notebook is being prepared. Finish or stop it first.');
    }
    const {readingNotebooks:books={}}=await chrome.storage.local.get('readingNotebooks');
    const requested=settings&&message.notebookUrl?notebookUrl(message.notebookUrl):null;
    if(message.notebookUrl&&!requested)throw Error('Enter a valid NotebookLM notebook URL.');
    const mappingKey=catalog.docUrl+'|'+entry.key,saved=books[mappingKey],url=requested||notebookUrl(saved?.url);
    // A source receipt belongs to its saved notebook, never to a new empty
    // notebook created by a repeat test (or an invalid saved URL).
    const sourceName=!requested&&url?saved?.sourceName||'':'';
    // Always use a task-owned tab. Existing chats/drafts and user notebooks
    // are not navigated or modified by the preparation runner.
    const tab=await chrome.tabs.create({url:'about:blank',active:settings||(await config()).watchAutomation===true});
    const job={id:crypto.randomUUID(),started:Date.now(),phase:'opening',status:url?'Opening the reading notebook…':'Creating the reading notebook…',source:entry,catalogUrl:catalog.docUrl,mappingKey,notebookUrl:url,createdByAutomation:!url||!requested&&saved?.createdByAutomation===true,sourceName,bookTab:tab.id,bookOrigin:url?new URL(url).origin:'https://notebook.google.com',owner:settings?{settings:true}:{tab:sender.tab.id,frame:sender.frameId,url:sender.url,documentId:sender.documentId},requestId:message.id};
    await chrome.storage.session.set({readingsJob:job});
    try{await chrome.tabs.update(tab.id,{url:url||'https://notebook.google.com/'});}catch(error){job.phase='failed';job.error=error.message;await chrome.storage.session.set({readingsJob:job});throw error;}
    return {received:true,id:job.id,sourceTitle:entry.title};
  }
  async function handle(message,sender){
    if(message.type==='readingsCleanupFinished')return mutate(async()=>{
      const {afterUseCleanup:job}=await chrome.storage.session.get('afterUseCleanup');
      if(!job||job.id!==message.id||job.tab!==sender.tab?.id||sender.frameId!==0||Date.now()-job.created>1800000)throw Error('Notebook cleanup completion is no longer valid.');
      const url=new URL(sender.url);
      if(url.origin!=='https://notebook.google.com'||url.pathname!=='/'||url.searchParams.get('studyCleanup')!==job.candidate.url||url.searchParams.get('studyCleanupRun')!==job.id)throw Error('Notebook cleanup completion came from a different page.');
      await chrome.storage.session.remove('afterUseCleanup');closeCleanupTabs(job);return {received:true};
    });
    if(message.type==='canvasCleanupAfterUse'){
      if(await sourcePlatform(sender)!=='canvas')throw Error('Notebook cleanup must come from a supported Canvas quiz.');
      const {notebookCleanupPreferences:prefs={},readingNotebooks:books={}}=await chrome.storage.local.get(['notebookCleanupPreferences','readingNotebooks']);
      const url=notebookUrl(message.url);
      if(!prefs.afterUse||!url)return {received:true,skipped:true};
      if(!Object.values(books).some(book=>book.createdByAutomation===true&&notebookUrl(book.url)===url))return {received:true,skipped:true};
      const preparation=await jobState();
      const lifecycle={returnTab:sender.tab.id,returnUrl:sender.url,sourceTab:preparation?.phase==='ready'&&owner(preparation,sender)&&preparation.notebookUrl===url?preparation.bookTab:null};
      const id=crypto.randomUUID(),tab=await chrome.tabs.create({url:'about:blank',active:true});
      await chrome.storage.session.set({afterUseCleanup:{id,tab:tab.id,created:Date.now(),candidate:{url},...lifecycle}});
      await chrome.tabs.update(tab.id,{url:'https://notebook.google.com/?studyCleanup='+encodeURIComponent(url)+'&studyCleanupAuto=1&studyCleanupRun='+encodeURIComponent(id)});
      return {received:true,tabId:tab.id};
    }
    // NotebookLM changes routes without replacing its content-script document.
    // Chrome can retain that document's original URL in MessageSender. Resolve
    // the top-level task tab's current URL through Chrome, never a page claim.
    if(['readingsJob','readingsStep'].includes(message.type)&&sender.tab&&sender.frameId===0){
      try{
        const original=new URL(sender.url),tab=await chrome.tabs.get(sender.tab.id),current=new URL(tab.url);
        if(['notebook.google.com','notebooklm.google.com'].includes(original.hostname)&&current.origin===original.origin&&!tab.pendingUrl)sender={...sender,url:current.href};
      }catch{}
    }
    if(message.type==='canvasReadingPreflight'){
      if(await sourcePlatform(sender)!=='canvas')throw Error('Open a Canvas quiz or the armed bundled test page.');
      const preferences=StudyConfig.preferences(await config(),'canvas'),{canvasReadings:catalog}=await chrome.storage.local.get('canvasReadings');
      const selection=preferences.preferNotebook?await openReadingNotebook(preferences):{tab:null};
      let matched='',matchError='';try{matched=StudyReadings.match(message.title,catalog?.entries||[]).title;}catch(error){matchError=error.message;}
      return {received:true,preferNotebook:preferences.preferNotebook,notebookUrl:selection.tab?.url||'',sourceCount:selection.state?.sources||0,automatic:catalog?.enabled===true,matched,matchError};
    }
    if(message.type==='readingsFetchCatalog'){
      if(!settingsSender(sender))throw Error('Load a reading list from Study Assistant settings.');
      const url=StudyReadings.documentUrl(message.url);
      if(!await chrome.permissions.contains({origins:['https://docs.google.com/*']}))throw Error('Allow Google Docs access using Load reading list.');
      const response=await fetch(url.replace(/\/edit$/,'/export?format=html'),{credentials:'omit',signal:AbortSignal.timeout(20000)});
      if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('The reading document could not be exported. It must be accessible through its shared link.');
      const html=await response.text();if(html.length>2000000)throw Error('The reading list is too large. Use a document containing only the reading list.');
      return {received:true,url,html};
    }
    if(message.type==='readingsSaveCatalog')return mutate(async()=>{
      if(!settingsSender(sender))throw Error('Save the reading list from Study Assistant settings.');
      const docUrl=StudyReadings.documentUrl(message.url);
      if(!Array.isArray(message.entries)||!message.entries.length||message.entries.length>500)throw Error('No linked readings were found in this document.');
      const entries=message.entries.map(item=>{
        const ref=StudyReadings.source(item.url),title=StudyReadings.title(item.title);
        if(!ref||!title||title.length>500||ref.key!==item.key)throw Error('The reading list contains an invalid source.');
        return {...ref,title,label:StudyReadings.clean(item.label).slice(0,1000)};
      });
      if(new Set(entries.map(item=>item.key)).size!==entries.length)throw Error('The reading list contains duplicate sources.');
      await chrome.storage.local.set({canvasReadings:{docUrl,entries,enabled:message.enabled===true,updatedAt:Date.now()}});
      return {received:true,count:entries.length};
    });
    if(['canvasPrepareReadings','readingsPrepareSelected'].includes(message.type))return mutate(()=>start(message,sender));
    if(message.type==='readingsCancel')return mutate(async()=>{
      const job=await jobState();if(job&&owner(job,sender)&&(!message.id||job.id===message.id)&&!terminal(job)){job.phase='cancelled';job.status='Reading preparation stopped.';await chrome.storage.session.set({readingsJob:job});}
      return {received:true};
    });
    if(message.type==='readingsStatus'){
      const job=await jobState();if(!job||job.id!==message.id||!owner(job,sender))throw Error('This reading preparation is no longer active.');
      return {received:true,id:job.id,phase:job.phase,status:job.status,error:job.error,url:job.notebookUrl};
    }
    if(message.type==='readingsCurrent'){
      if(!settingsSender(sender))throw Error('Open readings settings to inspect preparation.');
      const job=await jobState();return {received:true,id:job?.owner.settings?job.id:null};
    }
    if(message.type==='readingsJob'){
      const job=await jobState();
      if(!job||terminal(job)||!book(job,sender))return {received:true,job:null};
      if(!await ownerAlive(job)){
        await mutate(async()=>{const latest=await jobState();if(latest?.id===job.id&&!terminal(latest)){latest.phase='cancelled';latest.status='The Canvas quiz stopped or changed.';await chrome.storage.session.set({readingsJob:latest});}});
        return {received:true,job:null};
      }
      return {received:true,job};
    }
    if(message.type==='readingsStep')return mutate(async()=>{
      const job=await jobState();if(!job||terminal(job)||message.id!==job.id||!book(job,sender))throw Error('Reading preparation stopped or the notebook changed.');
      if(!await ownerAlive(job)){job.phase='cancelled';job.status='The Canvas quiz stopped or changed.';await chrome.storage.session.set({readingsJob:job});throw Error(job.status);}
      if(['quota','quotaConfirm','quotaRemoved'].includes(message.step)){
        const {notebookCleanupPreferences:prefs={},readingNotebooks:books={}}=await chrome.storage.local.get(['notebookCleanupPreferences','readingNotebooks']);
        if(!prefs.atLimit||job.phase!=='opening'||job.notebookUrl||new URL(sender.url).pathname!=='/')throw Error('Automatic quota cleanup is not enabled for this preparation.');
        const open=await chrome.tabs.query({url:['https://notebook.google.com/*','https://notebooklm.google.com/*']});
        const paths=new Set(open.map(tab=>notebookUrl(tab.url)).filter(Boolean).map(url=>new URL(url).pathname));
        if(message.step==='quota'){
          if(job.quotaAttempted)throw Error('Automatic quota cleanup already ran once. Review NotebookLM before retrying.');
          const candidates=Object.entries(books).filter(([,b])=>b.createdByAutomation===true&&notebookUrl(b.url)&&!paths.has(new URL(b.url).pathname));
          candidates.sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0)||a[0].localeCompare(b[0]));
          if(!candidates.length)throw Error('No unused automation-created notebook is eligible for automatic cleanup.');
          const [key,candidate]=candidates[0];job.quotaAttempted=true;job.quotaCandidate={key,url:notebookUrl(candidate.url),title:candidate.title};
          await chrome.storage.session.set({readingsJob:job});return {received:true,candidate:job.quotaCandidate};
        }
        const candidate=job.quotaCandidate;
        if(!candidate||books[candidate.key]?.createdByAutomation!==true||notebookUrl(books[candidate.key]?.url)!==candidate.url||paths.has(new URL(candidate.url).pathname))throw Error('The cleanup candidate changed or is in use.');
        if(message.step==='quotaRemoved'){
          for(const [key,b] of Object.entries(books))if(b.createdByAutomation===true&&notebookUrl(b.url)===candidate.url)delete books[key];
          delete job.quotaCandidate;job.status='Notebook slot freed. Creating the reading notebook…';
          await chrome.storage.local.set({readingNotebooks:books});await chrome.storage.session.set({readingsJob:job});
        }
        return {received:true};
      }
      if(message.step==='missing'&&job.phase==='opening'&&job.notebookUrl&&new URL(sender.url).pathname==='/'&&!job.missingRetried){
        const {readingNotebooks:books={}}=await chrome.storage.local.get('readingNotebooks');
        if(notebookUrl(books[job.mappingKey]?.url)===job.notebookUrl){delete books[job.mappingKey];await chrome.storage.local.set({readingNotebooks:books});}
        job.missingRetried=true;job.notebookUrl=null;job.sourceName='';job.createdByAutomation=true;job.status='Saved notebook was not found. Creating a replacement…';
      }else if(message.step==='creating'&&job.phase==='opening'&&!job.notebookUrl){job.phase='creating';job.status='Creating the reading notebook…';}
      else if(message.step==='created'){
        const url=notebookUrl(sender.url);if(!url||job.notebookUrl&&url!==job.notebookUrl)throw Error('The notebook changed during preparation.');
        job.notebookUrl=url;job.phase='importing';job.status='Importing '+job.source.title+'…';
        const {readingNotebooks:books={}}=await chrome.storage.local.get('readingNotebooks');
        await chrome.storage.local.set({readingNotebooks:{...books,[job.mappingKey]:{url,sourceName:job.sourceName,title:job.source.title,createdByAutomation:job.createdByAutomation===true}}});
      }else if(message.step==='adding'&&job.phase==='importing'){job.phase='adding';job.status='Processing '+job.source.title+'…';}
      else if(message.step==='ready'&&['importing','adding'].includes(job.phase)){
        if(typeof message.sourceName!=='string'||!message.sourceName.trim()||message.sourceName.length>500||!job.notebookUrl)throw Error('Notebook source readiness was not confirmed.');
        job.phase='ready';job.status='Readings ready · '+job.source.title;job.sourceName=message.sourceName;
        const {readingNotebooks:books={}}=await chrome.storage.local.get('readingNotebooks');
        await chrome.storage.local.set({readingNotebooks:{...books,[job.mappingKey]:{url:job.notebookUrl,sourceName:job.sourceName,title:job.source.title,createdByAutomation:job.createdByAutomation===true}}});
        // Automatic associations are per reading, not a replacement for the
        // notebook the user explicitly selected in platform settings.
        if(!job.owner.settings)await focusTab(job.owner.tab);
      }else if(message.step==='failed'){job.phase='failed';job.error=StudyReadings.clean(message.error||'Notebook preparation failed.').slice(0,700);}
      else throw Error('Invalid reading preparation transition.');
      await chrome.storage.session.set({readingsJob:job});return {received:true};
    });
  }
  async function cancelOwner(sender){const job=await jobState();if(job&&!terminal(job)&&owner(job,sender))await handle({type:'readingsCancel',id:job.id},sender);}
  async function cancelAll(){return mutate(async()=>{const job=await jobState();if(job&&!terminal(job)){job.phase='cancelled';job.status='Reading preparation stopped.';await chrome.storage.session.set({readingsJob:job});}});}
  async function connection(message,sender){
    if(!message.readingNotebookUrl)return null;
    if(await sourcePlatform(sender)!=='canvas')throw Error('Invalid readings notebook destination.');
    const {canvasReadings:catalog,readingNotebooks:books={}}=await chrome.storage.local.get(['canvasReadings','readingNotebooks']);
    if(!catalog?.enabled)throw Error('Automatic readings preparation was disabled. Ask AI again.');
    const source=StudyReadings.match(message.quizTitle,catalog.entries),key=catalog.docUrl+'|'+source.key;
    const saved=books[key];
    if(!saved?.sourceName||notebookUrl(saved.url)!==notebookUrl(message.readingNotebookUrl))throw Error('The prepared notebook does not match this quiz reading. Prepare its readings again.');
    return notebookUrl(saved.url);
  }
  globalThis.StudyReadingTasks={handles:type=>types.has(type),handle,cancelOwner,cancelAll,connection};
})();
