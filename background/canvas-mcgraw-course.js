/* A session-owned queue; Canvas and McGraw pages must prove their role before actions. */
async function canvasMcGrawCourse(message,sender){
  const C=StudyCanvasMcGrawCourse;let u=new URL(sender.url||'https://invalid.invalid');
  if(!sender.tab||sender.id!==chrome.runtime.id)throw Error('Invalid course source.');
  const data=await chrome.storage.session.get('canvasMcGrawCourse');let run=data.canvasMcGrawCourse;
  if(run)for(const issue of run.issues){if(!issue.url){const matches=run.items.filter(item=>item.title===issue.title);if(matches.length===1)issue.url=matches[0].url;}}
  const save=async()=>{run.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:run});};
  const scanNext=async()=>{
    run.scanIndex++;
    if(run.scanIndex<run.courses.length)run.listUrl=run.courses[run.scanIndex].listUrl;
    else if(run.items.length){run.phase='list';run.listUrl=run.items[0].listUrl;}
    else run.phase='done';
    await save();const open=run.phase==='done'?run.returnUrl:run.listUrl;
    await chrome.tabs.update(run.tab,{url:open,active:true});return {received:true,run,open};
  };
  const list=C.listUrl(u.href),isOwner=run?.tab===sender.tab.id&&sender.frameId===0&&u.origin===run.origin;
  if(message.type==='canvasCourseStart'){
    const settings=await config();
    if(sender.frameId!==0||!C.entryUrl(u.href)||typeof StudyConfig.detect==='function'&&StudyConfig.detect(u.href,settings.canvasOrigins||[])!=='canvas'||!StudyConfig.allowed('canvas',settings.platformMode)||!StudyConfig.allowed('mcgraw',settings.platformMode))throw Error('Enable Canvas and McGraw in Automatic mode.');
    if(run&&run.phase!=='done'&&Date.now()-run.updated<14400000)throw Error('A Canvas Course Auto run is already active. Stop it first.');
    if(message.courses!==undefined){
      if(!C.hubUrl(u.href))throw Error('Select courses on the Canvas dashboard or Courses page.');
      const courses=C.courses(message.courses,u.href);if(!courses.length)throw Error('Check at least one course to work through.');
      run={buildId:globalThis.StudyBuild?.id||null,tab:sender.tab.id,origin:u.origin,returnUrl:u.origin+u.pathname,courses,scanIndex:0,listUrl:courses[0].listUrl,items:[],index:0,phase:'scanning',includeStarted:message.includeStarted===true,skipPastDue:message.skipPastDue===true,issues:[],updated:Date.now(),coverTab:null,playerTab:null,attempts:null};
      await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,run};
    }
    if(!list)throw Error('Open the Canvas assignments list or select courses first.');
    const items=C.assignments(message.items,list.href).filter(item=>!item.scored&&!(message.skipPastDue===true&&C.isPastDue(item.dueAt)));if(!items.length)throw Error('No eligible assignments found.');
    run={buildId:globalThis.StudyBuild?.id||null,tab:sender.tab.id,origin:list.origin,listUrl:list.origin+list.pathname,items,index:0,phase:'list',includeStarted:message.includeStarted===true,skipPastDue:message.skipPastDue===true,issues:[],updated:Date.now(),coverTab:null,playerTab:null,attempts:null};await save();return {received:true,run};
  }
  if(!run||Date.now()-run.updated>14400000)return {received:false};
  if(run.phase!=='done'&&globalThis.StudyBuild?.id&&run.buildId!==StudyBuild.id){
    const scanning=run.phase==='scanning';run.phase=scanning?'done':'attention';run.updated=Date.now();
    const reason=scanning?'Extension build changed during the course scan. Start a new course run.':'Extension build changed; review the current assignment before continuing.';
    if(!run.issues.some(item=>item.reason===reason))run.issues.push({title:run.items[run.index]?.title||run.courses?.[run.scanIndex]?.title||'',reason});run.buildId=StudyBuild.id;await save();
  }
  if(message.type==='canvasCourseState'){
    if(!isOwner)return {received:false};return {received:true,run};
  }
  if(message.type==='canvasCourseScan'){
    if(!isOwner||run.phase!=='scanning'||!list||list.origin+list.pathname.replace(/\/$/,'')!==run.listUrl)return {received:false};
    const course=run.courses[run.scanIndex];
    const items=C.assignments(message.items,run.listUrl).filter(item=>!item.scored&&!(run.skipPastDue&&C.isPastDue(item.dueAt)));
    if(!items.length)run.issues.push({title:course.title,url:course.url,reason:'No eligible homework found in this course. Scored work, quizzes and exams are skipped.'});
    run.items.push(...items.map(item=>({...item,listUrl:course.listUrl,courseTitle:course.title})));
    return scanNext();
  }
  if(message.type==='canvasCoursePlayerStop'){
    if(sender.tab.id!==run.playerTab||sender.frameId!==0||!['starting','running','attention','review'].includes(run.phase))throw Error('This player does not own the course run.');
    run.phase='done';run.issues.push({title:run.items[run.index]?.title||'',reason:'Stopped by user.'});await save();return {received:true};
  }
  if(message.type==='canvasCourseStop'){
    if(!isOwner)throw Error('Open the course page to stop the queue.');
    const player=run.playerTab;run.phase='done';run.issues.push({title:run.items[run.index]?.title||'',reason:'Stopped by user.'});await save();
    if(player)await chrome.tabs.sendMessage(player,{type:'studyStop'},{frameId:0}).catch(()=>{});
    if(run.preventFrame!==undefined)await chrome.tabs.sendMessage(run.tab,{type:'preventZoneExternalStop'},{frameId:run.preventFrame}).catch(()=>{});
    if(chrome.storage.session.remove)await chrome.storage.session.remove('preventZoneRun');
    else await chrome.storage.session.set({preventZoneRun:null});
    return {received:true};
  }
  if(message.type==='canvasCourseListReady'){
    if(!isOwner||!list||list.origin+list.pathname.replace(/\/$/,'')!==run.listUrl.replace(/\/$/,''))return {received:false};
    if(run.phase==='returning'){
      run.index++;run.coverTab=null;run.playerTab=null;run.attempts=null;run.phase=run.index>=run.items.length?'done':'list';
      if(run.courses&&run.phase==='list')run.listUrl=run.items[run.index].listUrl;
      await save();
      if(run.courses&&(run.phase==='done'||list.origin+list.pathname.replace(/\/$/,'')!==run.listUrl)){const open=run.phase==='done'?run.returnUrl:run.listUrl;await chrome.tabs.update(run.tab,{url:open,active:true});return {received:true,run,open,navigating:true};}
    }
    if(run.phase!=='list')return {received:true,run};
    run.phase='opening';run.windowId=sender.tab.windowId;run.launchTabs=(await chrome.tabs.query({})).map(tab=>tab.id);await save();return {received:true,run,open:run.items[run.index].url};
  }
  if(message.type==='canvasCourseDetail'){
    if(!isOwner||run.phase!=='opening'||C.assignmentUrl(u.href,run.listUrl)!==run.items[run.index].url)return {received:false};
    const dueAt=Number.isFinite(message.dueAt)?message.dueAt:null;
    if(!C.detailReady({title:message.title,status:message.canvasStatus,dueAt},run.items[run.index].title,run.skipPastDue))return {received:true,waiting:true,run};
    run.canvasStatus=message.canvasStatus;
    if(run.canvasStatus==='submitted'||run.canvasStatus==='started'&&!run.includeStarted||run.skipPastDue&&C.isPastDue(dueAt)){run.phase='returning';run.issues.push({title:run.items[run.index].title,url:run.items[run.index].url,reason:run.canvasStatus==='submitted'?'Skipped: already submitted or scored.':run.canvasStatus==='started'&&!run.includeStarted?'Skipped: Canvas marks this assignment In Progress and Include started assignments is off.':'Skipped: past due.'});await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,skipped:true,run};}
    run.phase='launching';await save();return {received:true,run};
  }
  if(message.type==='canvasCourseVerifyCanvas'){
    if(!isOwner||run.phase!=='review'||C.assignmentUrl(u.href,run.listUrl)!==run.items[run.index].url)return {received:false};
    if(['unfinished','started'].includes(run.canvasStatus)&&message.canvasStatus==='submitted'){run.phase='returning';await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,verified:true};}
    return {received:true,verified:false};
  }
  if(message.type==='canvasCourseLaunch'){
    if(sender.tab.id!==run.tab||u.origin!=='https://connect.router.integration.prod.mheducation.com'||!u.pathname.startsWith('/v1/lms/')||run.phase!=='launching')return {received:false};
    const tabs=await chrome.tabs.query({});const existing=tabs.filter(tab=>tab.id!==run.tab&&tab.windowId===run.windowId&&typeof tab.url==='string'&&tab.url.startsWith('https://connect.router.integration.prod.mheducation.com/app/')&&C.titleMatches(String(tab.title||'').replace(/^McGraw Hill\s*\|\s*/i,'').replace(/\s*\|\s*$/,''),run.items[run.index]?.title));
    if(!run.coverTab&&existing.length===1){
      // LTI can reuse its named cover window. Reconnect the current content script
      // before letting that cover's Begin/Resume guards decide whether to start.
      run.coverTab=existing[0].id;await save();
      await chrome.tabs.reload(run.coverTab);
      await chrome.tabs.update(run.coverTab,{active:true});
      return {received:true,launch:false};
    }
    return {received:true,launch:run.phase==='launching'&&!run.coverTab&&existing.length===0};
  }
  if(['canvasCourseSmartbookWelcome','canvasCourseSmartbookReady'].includes(message.type)){
    if(sender.frameId!==0||u.origin!=='https://learning.mheducation.com'||!u.pathname.startsWith('/static/awd/')||run.phase!=='player'||!run.smartbook||sender.tab.id!==run.coverTab&&sender.tab.openerTabId!==run.coverTab)return {received:false};
    if(!C.titleMatches(message.title,run.items[run.index]?.title)||message.type==='canvasCourseSmartbookWelcome'&&!['start','continue'].includes(message.action))return {received:false};
    if(message.type==='canvasCourseSmartbookWelcome'&&message.action==='continue'&&!run.includeStarted){
      run.issues.push({title:run.items[run.index].title,url:run.items[run.index].url,reason:'Skipped: SmartBook offers Continue Questions and Include started assignments is off.'});
      run.phase='returning';await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,start:false,skip:true};
    }
    run.playerTab=sender.tab.id;if(message.type==='canvasCourseSmartbookReady')run.smartbookReady=true;await save();return {received:true,start:true};
  }
  if(message.type==='canvasCoursePlayerGate'){
    if(sender.frameId!==0||u.origin!=='https://ezto.mheducation.com'||u.pathname!=='/ext/map/index.html'||run.phase!=='player'||sender.tab.id!==run.coverTab&&sender.tab.openerTabId!==run.coverTab||!C.titleMatches(message.title,run.items[run.index]?.title))return {received:false};
    if(!Number.isSafeInteger(message.answered)||message.answered<0||!Number.isSafeInteger(message.total)||message.total<=0||message.answered>message.total)return {received:false};
    if(message.answered>0&&!run.includeStarted){run.phase='returning';run.issues.push({title:run.items[run.index].title,url:run.items[run.index].url,reason:'Skipped: this assignment contains answered questions and Include started assignments is off.'});await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,start:false,skip:true};}
    run.playerTab=sender.tab.id;await save();return {received:true,start:true};
  }
  if(message.type==='canvasCourseCover'){
    if(sender.frameId===0&&u.origin==='https://connect.router.integration.prod.mheducation.com'&&u.pathname==='/v1/ltiv1p3/jwt/heclrReturn'){
      const tab=await chrome.tabs.get(sender.tab.id).catch(()=>null);if(!tab)return {received:false};const current=new URL(tab.url);
      if(current.origin!==u.origin||current.pathname!=='/app/')return {received:false};u=current;
    }
    if(sender.frameId!==0||u.origin!=='https://connect.router.integration.prod.mheducation.com'||u.pathname!=='/app/'||!C.titleMatches(message.title,run.items[run.index]?.title))return {received:false};
    // McGraw's LTI opens a tab with noopener: Chrome omits openerTabId.
    // Only a new tab in the recorded course window may use that fallback.
    const newLaunch=run.phase==='launching'&&sender.tab.openerTabId===undefined&&Number.isInteger(run.windowId)&&sender.tab.windowId===run.windowId&&Array.isArray(run.launchTabs)&&!run.launchTabs.includes(sender.tab.id);
    if(sender.tab.id!==run.coverTab&&sender.tab.openerTabId!==run.tab&&sender.tab.id!==run.tab&&!newLaunch)return {received:false};
    if(['player','starting','running'].includes(run.phase)&&sender.tab.id===run.coverTab&&run.playerTab===run.coverTab){run.phase='review';await save();}
    if(run.phase==='review'&&sender.tab.id===run.coverTab){const now=C.attempts(message.attempts);if(run.attempts!==null&&now!==null&&now>run.attempts){run.phase='returning';await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,verified:true};}return {received:true,run};}
    if(run.phase!=='launching')return {received:false};
    run.coverTab=sender.tab.id;run.attempts=C.attempts(message.attempts);run.smartbook=message.smartbook===true&&/\bsmartbook 2\.0\b/i.test(message.attempts)&&/\bsmartbook\b/i.test(run.items[run.index].title);run.smartbookReady=false;
    if((run.attempts===null&&!run.smartbook)||!C.begin(message.action,run.includeStarted)||run.attempts>0){
      run.issues.push({title:run.items[run.index].title,url:run.items[run.index].url,reason:run.attempts>0?'Skipped: this assignment already has completed attempts.':!run.includeStarted&&/^(?:resume|continue)(?: assignment)?$/i.test(String(message.action||'').trim())?'Skipped: Include started assignments is off.':'Skipped: start status could not be confirmed; manual review needed.'});run.phase='returning';await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,skip:true};
    }
    run.phase='player';await save();if(sender.tab.windowId!==undefined){await chrome.tabs.update(sender.tab.id,{active:true}).catch(()=>{});await chrome.windows.update(sender.tab.windowId,{focused:true}).catch(()=>{});}return {received:true,start:true,run};
  }
  if(message.type==='canvasCourseRetry'){
    if(!isOwner||run.phase!=='attention'||C.assignmentUrl(u.href,run.listUrl)!==run.items[run.index].url)throw Error('Open the current assignment to retry its launch.');
    run.phase='opening';run.coverTab=null;run.playerTab=null;run.windowId=sender.tab.windowId;run.launchTabs=(await chrome.tabs.query({})).map(tab=>tab.id);await save();return {received:true,reload:true};
  }
  if(message.type==='canvasCourseTimeout'){
    if(!isOwner||!['scanning','opening','launching','player','starting'].includes(run.phase)||Date.now()-run.updated<45000)return {received:false};
    if(run.phase==='scanning'){const course=run.courses[run.scanIndex];run.issues.push({title:course.title,url:course.url,reason:'Assignments list did not become ready; course skipped for review.'});return scanNext();}
    run.phase='attention';run.issues.push({title:run.items[run.index]?.title||'',reason:'The McGraw launch or player did not become ready.'});await save();return {received:true};
  }
  if(message.type==='canvasCourseReviewed'){
    if(!isOwner||!['review','attention'].includes(run.phase))throw Error('Review and save the current assignment before continuing.');
    run.issues.push({title:run.items[run.index].title,reason:'User reviewed the assignment; completion was not independently verified.'});run.phase='returning';await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true};
  }
  return {received:false};
}
async function canvasMcGrawObserve(page,sender){
  const {canvasMcGrawCourse:run}=await chrome.storage.session.get('canvasMcGrawCourse');if(!run||(globalThis.StudyBuild?.id&&run.buildId!==StudyBuild.id)||!['player','starting','running'].includes(run.phase)||Date.now()-run.updated>14400000)return;
  if(page.platform!=='mcgraw'||sender.frameId!==0||sender.tab.id!==run.coverTab&&sender.tab.openerTabId!==run.coverTab)return;
  if(run.playerTab&&run.playerTab!==sender.tab.id)return;
  if(run.phase==='player'&&run.smartbook&&!run.smartbookReady)return;
  if(run.phase==='player'&&page.controls.start){run.playerTab=sender.tab.id;run.phase='starting';run.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:run});
    const result=await chrome.tabs.sendMessage(sender.tab.id,{type:'studyPageCommand',pageId:page.pageId,action:'start'},sender.documentId?{documentId:sender.documentId}:{frameId:sender.frameId}).catch(()=>null);
    if(!result?.received){run.phase='attention';run.issues.push({title:run.items[run.index].title,reason:'Could not start McGraw Auto.'});await chrome.storage.session.set({canvasMcGrawCourse:run});}return;}
  if(run.phase==='starting'&&page.controls.stop){run.phase='running';run.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:run});return;}
  if(run.phase==='running'&&!page.controls.stop){run.phase=StudyCanvasMcGrawCourse.completed(page.status)?'review':'attention';if(run.phase==='attention')run.issues.push({title:run.items[run.index].title,reason:page.status||'McGraw Auto stopped.'});run.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:run});}
}
