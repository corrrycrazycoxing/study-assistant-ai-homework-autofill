/* A session-owned queue; Canvas and McGraw pages must prove their role before actions. */
async function canvasMcGrawCourse(message,sender){
  const C=StudyCanvasMcGrawCourse;let u=new URL(sender.url||'https://invalid.invalid');
  if(!sender.tab||sender.id!==chrome.runtime.id)throw Error('Invalid course source.');
  const data=await chrome.storage.session.get('canvasMcGrawCourse');let run=data.canvasMcGrawCourse;
  const features=await config();
  const needsMcGraw=message.type==='canvasCourseStart'?false:!!run&&!run.scanOnly&&(run.coursePolicies?Object.values(run.coursePolicies).some(policy=>policy.types?.homework):run.assignmentTypes?.homework!==false);
  if(!StudyConfig.courseAllowed('canvas',features)||needsMcGraw&&!StudyConfig.allowed('mcgraw',features)){
    if(run&&run.phase!=='done'){
      run.phase='done';run.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:run});
      if(run.playerTab)await chrome.tabs.sendMessage(run.playerTab,{type:'studyStop'},{frameId:0}).catch(()=>{});
    }
    if(message.type==='canvasCourseStart')throw Error('Canvas Course Auto or McGraw is disabled in Settings → Platform options.');
    return {received:true,run:null,launch:false,start:false,disabled:true};
  }
  if(run)for(const issue of run.issues){if(!issue.url){const matches=run.items.filter(item=>item.title===issue.title);if(matches.length===1)issue.url=matches[0].url;}}
  const save=async()=>{run.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:run});};
  const scanNext=async()=>{
    run.scanIndex++;
    if(run.scanOnly&&run.scanIndex>=run.courses.length)run.phase='done';
    else if(run.scanIndex<run.courses.length)run.listUrl=run.courses[run.scanIndex].listUrl;
    else if(run.items.length){run.phase='list';run.listUrl=run.items[0].listUrl;}
    else run.phase='done';
    await save();const open=run.phase==='done'?run.returnUrl:run.listUrl;
    await chrome.tabs.update(run.tab,{url:open,active:true});return {received:true,run,open};
  };
  const list=C.listUrl(u.href),isOwner=run?.tab===sender.tab.id&&sender.frameId===0&&u.origin===run.origin;
  if(message.type==='canvasCourseStart'){
    const duePolicy=C.datePolicy(message);
    const scanOnly=message.scanOnly===true,assignmentTypes=C.workTypes(message.assignmentTypes,message.includeCanvasQuizzes);
    const {canvasCoursePolicies={},canvasCatalogs={}}=await (chrome.storage.local?.get(['canvasCoursePolicies','canvasCatalogs'])||{}),policies=canvasCoursePolicies[u.origin]||{};
    const typesFor=course=>policies[course]?.types?C.workTypes(policies[course].types):assignmentTypes;
    const metadataFor=course=>canvasCatalogs[u.origin]?.courses?.find(item=>
      item.url===course&&(item.scannedAt||item.items?.length)
    )?.items;
    let includeCanvasQuizzes=assignmentTypes.quiz;
    const retrySavedIssues=message.retrySavedIssues===true&&!scanOnly;
    const {canvasCourseIssueBank={}}=retrySavedIssues?await chrome.storage.local.get('canvasCourseIssueBank'):{};
    const retryIssueBank=retrySavedIssues?canvasCourseIssueBank[u.origin]||{}:null;
    const settings=await config();
    if(sender.frameId!==0||!C.entryUrl(u.href)||typeof StudyConfig.detect==='function'&&StudyConfig.detect(u.href,settings.canvasOrigins||[])!=='canvas'||!StudyConfig.allowed('canvas',settings))throw Error('Enable Canvas and McGraw in Automatic mode.');
    if(run&&run.phase!=='done'&&Date.now()-run.updated<14400000)throw Error('A Canvas Course Auto run is already active. Stop it first.');
    if(retryIssueBank&&!Object.keys(retryIssueBank).length)throw Error('There are no saved issues to retry. Use Scan and start to scan normally.');
    if(message.courses!==undefined){
      if(!C.hubUrl(u.href))throw Error('Select courses on the Canvas dashboard or Courses page.');
      const courses=C.courses(message.courses,u.href).filter(course=>scanOnly||policies[course.url]?.enabled!==false&&(typesFor(course.url).homework||typesFor(course.url).quiz));if(!courses.length)throw Error('Check at least one course to work through.');
      includeCanvasQuizzes=false;
      if(!scanOnly){for(const course of courses){const types=typesFor(course.url);if(types.homework&&!StudyConfig.allowed('mcgraw',settings))throw Error('McGraw homework is enabled for '+course.title+' but McGraw is disabled in settings.');if(types.quiz)includeCanvasQuizzes=true;}}
      if(!scanOnly&&includeCanvasQuizzes&&!StudyConfig.featureEnabled(features,'canvasQuizLauncher'))throw Error('Enable the Canvas quiz overview panel before running selected course quizzes.');
      const coursePolicies=Object.fromEntries(courses.map(course=>[course.listUrl,{types:typesFor(course.url),metadata:metadataFor(course.url)}]));
      run={coursePolicies,buildId:globalThis.StudyBuild?.id||null,tab:sender.tab.id,origin:u.origin,returnUrl:u.origin+u.pathname,courses,scanIndex:0,listUrl:courses[0].listUrl,items:[],index:0,phase:'scanning',includeStarted:message.includeStarted===true,includeCanvasQuizzes,assignmentTypes,scanOnly,catalog:[],...duePolicy,retryIssueBank,issues:[],updated:Date.now(),coverTab:null,playerTab:null,attempts:null};

      await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,run};
    }
    if(!list)throw Error('Open the Canvas assignments list or select courses first.');
    const currentCourse=list.origin+'/courses/'+list.pathname.split('/')[2];
    if(!scanOnly&&policies[currentCourse]?.enabled===false)throw Error('This course is disabled in the Canvas inventory. Enable it before starting Course Auto.');
    const selectedTypes=typesFor(currentCourse);if(!scanOnly&&!selectedTypes.homework&&!selectedTypes.quiz)throw Error('Select at least one assignment type to run.');if(!scanOnly&&selectedTypes.homework&&!StudyConfig.allowed('mcgraw',settings))throw Error('McGraw is disabled in settings.');
    includeCanvasQuizzes=selectedTypes.quiz;if(!scanOnly&&includeCanvasQuizzes&&!StudyConfig.featureEnabled(features,'canvasQuizLauncher'))throw Error('Enable the Canvas quiz overview panel before running this course’s quizzes.');
    const catalog=C.catalog(C.applyMetadata(message.items,list.href,metadataFor(currentCourse)),list.href),items=scanOnly?[]:C.assignments(catalog,list.href,selectedTypes).filter(item=>!item.scored&&C.dateAllowed(item.dueAt,duePolicy)&&(!retryIssueBank||C.savedIssue(item,retryIssueBank,list.href)));
    if(!scanOnly&&!items.length){
      const summary=retryIssueBank?'No assignments with saved issues match these filters.':'No eligible assignments match these filters.';
      throw Error(summary+' '+C.emptyQueueReason(catalog,list.href,selectedTypes,duePolicy,retryIssueBank));
    }
    run={buildId:globalThis.StudyBuild?.id||null,tab:sender.tab.id,origin:list.origin,listUrl:list.origin+list.pathname,items,index:0,phase:scanOnly?'done':'list',includeStarted:message.includeStarted===true,includeCanvasQuizzes,assignmentTypes:selectedTypes,scanOnly,catalog,...duePolicy,retryIssueBank,issues:[],updated:Date.now(),coverTab:null,playerTab:null,attempts:null};await save();return {received:true,run};
  }
  if(!run||Date.now()-run.updated>14400000)return {received:false};
  if(run.phase!=='done'&&globalThis.StudyBuild?.id&&run.buildId!==StudyBuild.id){
    const scanning=run.phase==='scanning';run.phase=scanning?'done':'attention';run.updated=Date.now();
    const reason=scanning?'Extension build changed during the course scan. Start a new course run.':'Extension build changed; review the current assignment before continuing.';
    if(!run.issues.some(item=>item.reason===reason))run.issues.push({title:run.items[run.index]?.title||run.courses?.[run.scanIndex]?.title||'',reason});run.buildId=StudyBuild.id;await save();
  }
  if(typeof canvasCourseQuiz==='function'){const quizResult=await canvasCourseQuiz(message,sender,run,save);if(quizResult)return quizResult;}
  if(message.type==='canvasCourseState'){
    if(!isOwner)return {received:false};if(typeof canvasCourseQuizLocation==='function'&&await canvasCourseQuizLocation(run,sender))await save();return {received:true,run};
  }
  if(message.type==='canvasCourseScan'){
    if(!isOwner||run.phase!=='scanning'||!list||list.origin+list.pathname.replace(/\/$/,'')!==run.listUrl)return {received:false};
    const course=run.courses[run.scanIndex];
    const coursePolicy=run.coursePolicies?.[run.listUrl];
    const {canvasCatalogs={}}=await (chrome.storage.local?.get('canvasCatalogs')||{});
    const current=canvasCatalogs[run.origin]?.courses?.find(item=>item.url===course.url&&item.scannedAt);
    const metadata=current?.items||coursePolicy?.metadata;
    const catalog=C.catalog(C.applyMetadata(message.items,run.listUrl,metadata),run.listUrl);run.catalog ||= [];run.catalog.push(...catalog.map(item=>({...item,courseTitle:course.title})));
    const items=run.scanOnly?[]:C.assignments(catalog,run.listUrl,coursePolicy?.types||run.assignmentTypes||C.workTypes(undefined,run.includeCanvasQuizzes)).filter(item=>!item.scored&&C.dateAllowed(item.dueAt,run)&&(!run.retryIssueBank||C.savedIssue(item,run.retryIssueBank,run.listUrl)));
    if(!run.scanOnly&&!items.length){
      const types=coursePolicy?.types||run.assignmentTypes||C.workTypes(undefined,run.includeCanvasQuizzes);
      run.issues.push({title:course.title,url:course.url,reason:C.emptyQueueReason(catalog,run.listUrl,types,run,run.retryIssueBank)});
    }
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
    if(run.phase==='done'&&run.quizBase)await chrome.tabs.sendMessage(run.tab,{type:'studyStop'},{frameId:0}).catch(()=>{});
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
    if(run.scanOnly||run.phase!=='list')return {received:true,run};
    const currentItemForIssue=run.items[run.index];
    const {canvasCourseIssueBank:bank={}}=await (chrome.storage.local?.get('canvasCourseIssueBank')||{});
    const savedIssue=run.retryIssueBank?null:C.savedIssue(currentItemForIssue,bank[run.origin],currentItemForIssue.listUrl||run.listUrl);
    if(savedIssue){
      run.issues.push({...savedIssue,title:currentItemForIssue.title,reason:'Skipped saved issue. '+savedIssue.reason});
      run.phase='returning';await save();return {received:true,run};
    }
    const currentItem=run.items[run.index],courseUrl=(currentItem.listUrl||run.listUrl).replace(/\/assignments\/?$/,''),{canvasCoursePolicies:livePolicies={}}=await (chrome.storage.local?.get('canvasCoursePolicies')||{}),livePolicy=livePolicies[run.origin]?.[courseUrl];
    if(livePolicy&&(livePolicy.enabled===false||livePolicy.types?.[currentItem.kind==='quiz'?'quiz':'homework']===false)){
      run.phase='returning';run.issues.push({title:currentItem.title,url:currentItem.url,reason:'Skipped: course or assignment type is disabled in the Canvas inventory.'});await save();return {received:true,run};
    }
    delete run.quizBase;delete run.quizNotebook;delete run.quizLaunched;delete run.quizDocument;
    run.phase='opening';run.windowId=sender.tab.windowId;run.launchTabs=(await chrome.tabs.query({})).map(tab=>tab.id);await save();return {received:true,run,open:run.items[run.index].url};
  }
  if(message.type==='canvasCourseDetail'){
    if(!isOwner||run.phase!=='opening'||C.assignmentUrl(u.href,run.listUrl)!==run.items[run.index].url)return {received:false};
    const dueAt=Number.isFinite(message.dueAt)?message.dueAt:null;
    if(!C.detailReady({title:message.title,status:message.canvasStatus,dueAt},run.items[run.index].title,run.skipPastDue||run.onlyPastDue))return {received:true,waiting:true,run};
    run.canvasStatus=message.canvasStatus;
    if(run.canvasStatus==='submitted'||run.canvasStatus==='started'&&!run.includeStarted||!C.dateAllowed(dueAt,run)){run.phase='returning';run.issues.push({title:run.items[run.index].title,url:run.items[run.index].url,reason:run.canvasStatus==='submitted'?'Skipped: already submitted or scored.':run.canvasStatus==='started'&&!run.includeStarted?'Skipped: Canvas marks this assignment In Progress and Include started assignments is off.':run.onlyPastDue?'Skipped: not past due.':'Skipped: past due.'});await save();await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,skipped:true,run};}
    if(run.items[run.index].kind==='quiz'){run.phase='attention';run.issues.push({title:run.items[run.index].title,url:run.items[run.index].url,reason:'No supported native Canvas quiz link was found on this assignment.'});await save();return {received:true,run};}
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
    if(!isOwner||run.phase!=='attention'||C.assignmentUrl(u.href,run.listUrl)!==run.items[run.index].url&&StudyCanvasQuiz.base(u.href)!==(run.items[run.index].quizUrl||C.quizUrl(run.items[run.index].url,run.listUrl)))throw Error('Open the current assignment to retry its launch.');
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
  const features=await config();if(!StudyConfig.courseAllowed('canvas',features)||!StudyConfig.allowed('mcgraw',features))return;

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
