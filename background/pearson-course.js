// Keep only navigation/review metadata, never answers or source material.
function pearsonCourseReportKey(url){const parsed=new URL(url);return parsed.origin+parsed.pathname.toLowerCase().replace(/\/$/,'')+'|'+(parsed.searchParams.get('courseId')||parsed.searchParams.get('courseID')||'');}
async function savePearsonCourseReport(run,stopped=false){
  const {pearsonCourseReports={}}=await chrome.storage.local.get('pearsonCourseReports');
  const key=pearsonCourseReportKey(run.listUrl),existing=pearsonCourseReports[key];
  const report={id:run.reportId,time:Date.now(),dismissed:stopped||existing?.id===run.reportId&&existing.dismissed===true,stopped,questions:run.skippedQuestions||[],assignments:run.skippedAssignments||[],media:run.pendingMediaAssignments||[]};
  const entries=Object.entries({...pearsonCourseReports,[key]:report}).sort((a,b)=>b[1].time-a[1].time).slice(0,8);
  await chrome.storage.local.set({pearsonCourseReports:Object.fromEntries(entries)});
}
async function returnPearsonCourseToList(run){
  // Reopening the outer SPA URL can restore its old assignment iframe. Navigate
  // that iframe to the exact list captured when this queue was created.
  const sent=await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseReturnToList',url:run.listUrl},{frameId:run.frame}).catch(()=>null);
  const tab=await chrome.tabs.update(run.tab,{...(!sent?.received?{url:run.listUrl}:{}),active:true});
  if(tab?.windowId!==undefined)await chrome.windows.update(tab.windowId,{focused:true});
}
async function pearsonCoursePlayerClosed(tabId){
  const {pearsonCourse:run}=await chrome.storage.session.get('pearsonCourse');
  if(!run||run.playerTab!==tabId||!['player','verify'].includes(run.phase)||Date.now()-run.time>4*60*60*1000)return;
  run.playerClosed=true;
  if(run.saveClicked!==true){
    run.phase='attention';await chrome.storage.session.set({pearsonCourse:run});
    await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention',reason:'The player closed without a confirmed Pearson Save click. Course Auto has not moved to another assignment. Reopen this assignment and check its saved work.'},{frameId:run.frame}).catch(()=>{});return;
  }
  run.phase='verify';run.returnAfterSave=true;await chrome.storage.session.set({pearsonCourse:run});
  const result=await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseVerify',assignmentId:run.assignmentId},{frameId:run.frame}).catch(()=>null);
  if(!result?.received){run.phase='attention';await chrome.storage.session.set({pearsonCourse:run});await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention',reason:'Pearson closed the player, but the saved assignment overview could not be refreshed. Review its saved score.'},{frameId:run.frame}).catch(()=>{});}
}
async function pearsonCourseMessage(message,sender){
  const url=new URL(sender.url||'');
  if(!sender.tab||url.origin!=='https://mylab.pearson.com'&&url.origin!=='https://tdx.acs.pearson.com')return {received:false};
  const listPaths=['/Student/DoAssignments.aspx'],overview='/Student/OverviewHomework.aspx';
  const isListPath=pathname=>listPaths.some(path=>pathname.toLowerCase()===path.toLowerCase())||/^\/courses\/\d+\/assignments\/?$/i.test(pathname);
  const read=async()=>((await chrome.storage.session.get('pearsonCourse')).pearsonCourse||null);
  const save=async run=>chrome.storage.session.set({pearsonCourse:run});
  if(message.type==='pearsonCourseReport'||message.type==='pearsonCourseReportDismiss'){
    if(!isListPath(url.pathname))return {received:false};
    const run=await read(),key=pearsonCourseReportKey(url.href);
    if(run&&run.phase!=='done'&&Date.now()-run.time<4*60*60*1000&&pearsonCourseReportKey(run.listUrl)===key)return {received:true,report:null};
    const {pearsonCourseReports={}}=await chrome.storage.local.get('pearsonCourseReports'),report=pearsonCourseReports[key];
    if(message.type==='pearsonCourseReportDismiss'){
      if(!report||message.id!==report.id)return {received:false};
      report.dismissed=true;await chrome.storage.local.set({pearsonCourseReports});return {received:true};
    }
    return {received:true,report:report||null};
  }
  if(message.type==='pearsonCourseStart'){
    if(!isListPath(url.pathname)||!Array.isArray(message.assignments)||message.assignments.length>100||message.assignments.some(a=>typeof a?.title!=='string'||a.title.length>180||!/^(?:Lesson Section|HW Section|Homework)(?=\b|\d)/i.test(a.title)||/\b(?:exam|test|quiz)\b/i.test(a.title)||typeof a.key!=='string'||!/^javascript:doHomework\(\d+,/i.test(a.key)||a.key.length>600))throw Error('Choose available homework or lesson assignments from the Pearson list.');
    let pace=null;
    if(message.pace!==undefined){if(!['normal','slow','human'].includes(message.pace?.pacingMode)||!['faster','typical','deliberate'].includes(message.pace?.humanSpeed))throw Error('Choose a valid Course Auto speed.');pace={pacingMode:message.pace.pacingMode,humanSpeed:message.pace.humanSpeed};}
    const skippedAssignments=Array.isArray(message.skippedAssignments)?message.skippedAssignments.filter(item=>typeof item?.title==='string'&&item.title.length<=180&&typeof item.reason==='string'&&item.reason.length<=180).slice(0,100).map(item=>({title:item.title,reason:item.reason,assignmentId:/^\d{1,12}$/.test(String(item.assignmentId||''))?String(item.assignmentId):''})):[];
    if(!message.assignments.length&&!skippedAssignments.length)throw Error('No available homework or lesson assignments were found.');
    // Keep the outer course shell when the assignments list lives in its iframe.
    // Returning directly to the iframe URL loses the shell and changes frame IDs.
    let returnUrl=url.href;
    try{const outer=new URL(sender.tab.url);if(outer.origin==='https://mylabmastering.pearson.com'&&/^\/courses\/\d+\/menu\//i.test(outer.pathname))returnUrl=outer.href;}catch{}
    const run={tab:sender.tab.id,frame:sender.frameId,listUrl:url.href,returnUrl,pace,includeStarted:message.includeStarted===true,assignments:message.assignments.map(a=>({title:a.title,key:a.key})),index:0,phase:message.assignments.length?'list':'done',assignmentId:'',skipped:skippedAssignments.length,skippedAssignments,skippedQuestions:[],pendingMediaAssignments:[],skipReviewPause:message.skipReviewPause===true,time:Date.now(),reportId:crypto.randomUUID()};
    await save(run);if(run.phase==='done')await savePearsonCourseReport(run);
    return {received:true,title:message.assignments[0]?.title||''};
  }
  const run=await read();
  if(run&&!run.reportId){run.reportId=crypto.randomUUID();await save(run);}
  if(message.type==='pearsonCourseStop'){
    if(!run)return {received:true};
    const playerOwner=run?.playerTab===sender.tab.id&&run.playerFrame===sender.frameId&&(!run.playerDocumentId||run.playerDocumentId===sender.documentId);
    if(run.tab!==sender.tab.id&&!playerOwner)return {received:false};
    if(run.playerTab){const {autoRun}=await chrome.storage.session.get('autoRun');if(autoRun?.tab===run.playerTab)await chrome.tabs.sendMessage(run.playerTab,{type:'studyStop'},{frameId:autoRun.frame}).catch(()=>{});}
    await savePearsonCourseReport(run,run.phase!=='done');await chrome.storage.session.remove('pearsonCourse');
    await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseStopped'},{frameId:run.frame}).catch(()=>{});
    if(run.playerTab!==undefined&&run.playerFrame!==undefined)await chrome.tabs.sendMessage(run.playerTab,{type:'pearsonCourseStopped'},{frameId:run.playerFrame}).catch(()=>{});
    return {received:true};
  }
  if(!run||Date.now()-run.time>4*60*60*1000)return {received:false};
  const recordPendingMedia=(id)=>{run.pendingMediaAssignments??=[];if(!run.pendingMediaAssignments.some(item=>item.assignmentId===id))run.pendingMediaAssignments.push({title:run.assignments[run.index]?.title||'Assignment',assignmentId:id,reason:'Pearson may update credit after the media route returns, even if its tab is blank. Verify its status.'});};
  const advance=async()=>{const fromAssignmentId=run.assignmentId||run.assignments[run.index]?.key.match(/^javascript:doHomework\((\d+),/i)?.[1]||'';run.index++;run.listReturn={fromAssignmentId,index:run.index,sourceFrame:sender.tab.id===run.tab?sender.frameId:run.frame};run.assignmentId='';for(const key of ['playerTab','playerFrame','playerDocumentId','openedQuestionId','launchQuestionIds','questionRoutes','saveClicked','playerClosed'])delete run[key];run.phase=run.index<run.assignments.length?'list':'done';await save(run);if(run.phase==='done')await savePearsonCourseReport(run);return {received:true,action:run.phase==='done'?'done':'list',listUrl:run.listUrl,index:run.index,total:run.assignments.length,skipped:run.skipped,skippedAssignments:run.skippedAssignments||[],skippedQuestions:run.skippedQuestions||[],pendingMediaAssignments:run.pendingMediaAssignments||[]};};
  if(message.type==='pearsonCourseList'){
    if(sender.tab.id!==run.tab||!isListPath(url.pathname)||pearsonCourseReportKey(url.href)!==pearsonCourseReportKey(run.listUrl))return {received:false};
    if(sender.frameId!==run.frame){if(!['list','done'].includes(run.phase))return {received:false};run.frame=sender.frameId;await save(run);}
    if(run.listReturn){delete run.listReturn;await save(run);}
    return {received:true,phase:run.phase,title:run.assignments[run.index]?.title||'',key:run.assignments[run.index]?.key||'',index:run.index,total:run.assignments.length,skipped:run.skipped,skippedAssignments:run.skippedAssignments||[],skippedQuestions:run.skippedQuestions||[],pendingMediaAssignments:run.pendingMediaAssignments||[]};
  }
  if(message.type==='pearsonCourseGate'){
    if(sender.tab.id!==run.tab||sender.frameId!==run.frame||url.pathname!=='/Student/DoHomework.aspx'||run.phase!=='list')return {received:false};
    const id=url.searchParams.get('homeworkId'),expected=run.assignments[run.index]?.key.match(/^javascript:doHomework\((\d+),/i)?.[1];
    if(id!==expected)return {received:false};
    // Start can launch the player directly without ever visiting Overview.
    if(message.canStart===true&&message.requireQuestionRoutes!==true){run.assignmentId=id;run.phase='launching';await save(run);return {received:true,action:'start'};}
    if(run.includeStarted||message.canStart===true){run.assignmentId=id;run.phase='resume-overview';await save(run);return {received:true,action:'overview',url:url.origin+overview+'?homeworkId='+id};}
    run.skipped++;run.skippedAssignments??=[];run.skippedAssignments.push({title:run.assignments[run.index]?.title||'Assignment',assignmentId:id,reason:'Already started or unavailable'});return advance();
  }
  if(message.type==='pearsonCourseQuestionSkipped'){
    if(sender.tab.id!==run.playerTab||sender.frameId!==run.playerFrame||run.playerDocumentId&&sender.documentId!==run.playerDocumentId||run.phase!=='player')return {received:false};
    // The actual question lives in a nested Player frame whose own URL contains
    // no assignment/question IDs. The outer URL can stay on the launch question
    // after Next, so resolve the displayed number through the verified overview.
    const route=new URL(sender.tab.url||sender.url),questionId=message.questionNumber!==undefined?run.questionRoutes?.find(item=>item.number===String(message.questionNumber))?.id:route.searchParams.get('questionId');
    if(route.origin!=='https://mylab.pearson.com'||route.pathname.toLowerCase()!=='/student/playerhomework.aspx'||route.searchParams.get('homeworkId')!==run.assignmentId||!/^\d{1,12}$/.test(questionId||'')||message.questionId!==undefined&&String(message.questionId)!==questionId||typeof message.label!=='string'||!message.label.trim()||message.label.length>240||typeof message.reason!=='string'||!message.reason.trim()||message.reason.length>300)return {received:false};
    run.skippedQuestions??=[];
    if(!run.skippedQuestions.some(item=>item.assignmentId===run.assignmentId&&item.questionId===questionId))run.skippedQuestions.push({assignmentId:run.assignmentId,title:run.assignments[run.index]?.title||'Assignment',questionId,label:message.label.trim(),reason:message.reason.trim()});
    await save(run);await savePearsonCourseReport(run);return {received:true};
  }
  if(message.type==='pearsonCourseReturnState'){
    const id=url.searchParams.get('homeworkId');
    if(sender.tab.id!==run.tab||![run.frame,run.listReturn?.sourceFrame].includes(sender.frameId)||url.pathname!==overview||!['list','done'].includes(run.phase)||run.listReturn?.fromAssignmentId!==id||run.listReturn.index!==run.index)return {received:false};
    return {received:true,action:run.phase==='done'?'done':'list',listUrl:run.listUrl,index:run.index,total:run.assignments.length};
  }
  if(message.type==='pearsonCourseOverview'){
    const courseFrame=sender.tab.id===run.tab&&sender.frameId===run.frame;
    const savedPlayer=sender.tab.id===run.playerTab&&url.pathname===overview&&['player','verify'].includes(run.phase);
    const returnFrame=sender.tab.id===run.tab&&sender.frameId===run.listReturn?.sourceFrame&&['list','done'].includes(run.phase);
    if((!courseFrame&&!savedPlayer&&!returnFrame)||url.pathname!==overview)return {received:false};
    const id=url.searchParams.get('homeworkId');if(!id||!/^[0-9]+$/.test(id))return {received:false};
    if((courseFrame||returnFrame)&&['list','done'].includes(run.phase)&&run.listReturn?.fromAssignmentId===id&&run.listReturn.index===run.index)return {received:true,action:run.phase==='done'?'done':'list',listUrl:run.listUrl,index:run.index,total:run.assignments.length};
    const expected=run.assignments[run.index]?.key.match(/^javascript:doHomework\((\d+),/i)?.[1];
    if(id!==expected)return {received:false};
    // Save can unload the player before its final RunStop reaches us, including
    // a manual Save. Retire only that player's run, then verify remaining IDs.
    if(savedPlayer&&!run.saveClicked){
      run.phase='attention';await save(run);
      await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention',reason:'The player returned without a confirmed Pearson Save click. Check this assignment before continuing.'},{frameId:run.frame}).catch(()=>{});
      return {received:true,action:'attention'};
    }
    if(savedPlayer){
      run.phase='verify';await save(run);
      const {autoRun,pending}=await chrome.storage.session.get(['autoRun','pending']);
      if(autoRun?.platform==='pearson'&&autoRun.tab===run.playerTab){await saveCheckpoint(autoRun);await chrome.storage.session.remove('autoRun');}
      if(pending?.platform==='pearson'&&pending.tab===run.playerTab)await cancel(pending);
    }
    if(run.phase==='verify'){
      const pendingIds=Array.isArray(message.pendingQuestionIds)?message.pendingQuestionIds.filter(id=>typeof id==='string'&&/^\d+$/.test(id)):[];
      const skippedIds=new Set((run.skippedQuestions||[]).filter(item=>item.assignmentId===id).map(item=>item.questionId));
      const unaccounted=pendingIds.some(questionId=>!skippedIds.has(questionId));
      if(message.mediaPending)recordPendingMedia(id);
      if(unaccounted||(message.questionsPending&&!pendingIds.length)){run.phase='attention';await save(run);if(savedPlayer)await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention'},{frameId:run.frame}).catch(()=>{});return {received:true,action:'attention'};}
      const returnToList=savedPlayer||run.returnAfterSave;delete run.returnAfterSave;
      const next=await advance();
      if(returnToList&&sender.tab.id!==run.tab&&['list','done'].includes(next.action)){
        await returnPearsonCourseToList(run);
        return {...next,action:'saved-list'};
      }
      return next;
    }
    if(!['list','launching','resume-overview','overview','media','attention'].includes(run.phase))return {received:true,action:'attention'};
    if(['list','launching','resume-overview'].includes(run.phase)&&message.notStarted!==true&&!(run.includeStarted&&message.canResume===true)){run.skipped++;run.skippedAssignments??=[];run.skippedAssignments.push({title:run.assignments[run.index]?.title||'Assignment',assignmentId:id,reason:'Already completed, started without permission, or unavailable'});return advance();}
    if(message.mediaPending)recordPendingMedia(id);
    run.assignmentId=id;
    const routes=Array.isArray(message.questionRoutes)?message.questionRoutes:[];
    run.questionRoutes=routes.length<=1000&&routes.every(item=>/^\d{1,12}$/.test(String(item?.number||''))&&/^\d{1,12}$/.test(String(item?.id||'')))&&new Set(routes.map(item=>String(item.number))).size===routes.length&&new Set(routes.map(item=>String(item.id))).size===routes.length?routes.map(item=>({number:String(item.number),id:String(item.id)})):[];
    run.launchQuestionIds=Array.isArray(message.pendingQuestionIds)?[...new Set(message.pendingQuestionIds.filter(id=>typeof id==='string'&&/^\d{1,12}$/.test(id)))].slice(0,1000):[];
    run.phase='overview';await save(run);
    return {received:true,action:message.questionsPending?'question':'complete',index:run.index,total:run.assignments.length};
  }
  if(message.type==='pearsonCourseOpenQuestion'){
    const id=url.searchParams.get('homeworkId'),questionId=String(message.questionId||'');
    if(sender.tab.id!==run.tab||sender.frameId!==run.frame||url.pathname!==overview||id!==run.assignmentId||run.phase!=='overview'||!/^\d{1,12}$/.test(questionId)||!run.launchQuestionIds?.includes(questionId))return {received:false,error:'The question is not part of the verified unfinished assignment.'};
    if(run.openedQuestionId===questionId&&run.playerTab){try{await chrome.tabs.get(run.playerTab);return {received:true,tab:run.playerTab};}catch{}}
    const destination=new URL('/Student/PlayerHomework.aspx',url.origin);
    destination.searchParams.set('homeworkId',id);destination.searchParams.set('questionId',questionId);destination.searchParams.set('flushed','false');
    // Course navigation follows the assignment. Watch automation controls AI-tab
    // focus only; disabling it must not leave the homework in a background tab.
    const player=await chrome.tabs.create({url:destination.href,openerTabId:run.tab,active:true});
    run.playerTab=player.id;run.openedQuestionId=questionId;await save(run);
    if(player.windowId!==undefined)await chrome.windows.update(player.windowId,{focused:true});
    return {received:true,tab:player.id};
  }
  if(message.type==='pearsonCourseComplete'){
    if(sender.tab.id!==run.tab||sender.frameId!==run.frame||url.pathname!==overview||run.phase!=='overview')return {received:false};
    run.phase='verify';await save(run);return {received:true};
  }
  if(message.type==='pearsonCoursePlayerReady'){
    // Nested Player documents omit homeworkId. Chrome can also omit the outer
    // URL during navigation, so the exact tab we created keeps its verified ID.
    const id=url.searchParams.get('homeworkId')||new URL(sender.tab.url||url.href).searchParams.get('homeworkId')||(sender.tab.id===run.playerTab&&run.openedQuestionId?run.assignmentId:null);
    const playerUrl=url.origin==='https://tdx.acs.pearson.com'&&/^\/Player\//i.test(url.pathname)||url.origin==='https://mylab.pearson.com'&&/^\/Student\/PlayerHomework\.aspx$/i.test(url.pathname);
    if(!playerUrl||sender.tab.id!==run.tab&&sender.tab.id!==run.playerTab&&sender.tab.openerTabId!==run.tab)return {received:false};
    if(!id)return {received:false,retry:true,error:'Waiting for Pearson to identify this assignment.'};
    if(id!==run.assignmentId)return {received:false,error:'This player does not match the assignment authorized by Course Mode.'};
    if(!['overview','launching'].includes(run.phase))return {received:false,error:run.phase==='player'?'Course Mode already handed this assignment to a player. Stop the course run and resume from its overview.':'Course Mode is '+run.phase+'. Resume it from the assignment overview.'};
    run.phase='player';run.playerTab=sender.tab.id;run.playerFrame=sender.frameId;run.playerDocumentId=sender.documentId;await save(run);
    const course={index:run.index,total:run.assignments.length,title:run.assignments[run.index]?.title||'Assignment'};
    await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseProgress',text:'Course Auto is working on assignment '+(run.index+1)+' of '+run.assignments.length+'.',progress:{value:run.index,max:run.assignments.length,label:'Going through assignments'}},{frameId:run.frame}).catch(()=>{});
    return {received:true,start:true,skipReviewPause:run.skipReviewPause,pace:run.pace,course};
  }
  if(message.type==='pearsonCourseSaveObserved'||message.type==='pearsonCourseSaveFailed'){
    if(!['player','verify','attention'].includes(run.phase)||sender.tab.id!==run.playerTab||sender.frameId!==run.playerFrame||run.playerDocumentId&&sender.documentId!==run.playerDocumentId)return {received:false};
    if(message.type==='pearsonCourseSaveObserved'){
      run.saveClicked=true;run.phase='verify';run.returnAfterSave=true;await save(run);if(run.playerClosed)await pearsonCoursePlayerClosed(run.playerTab);return {received:true};
    }
    run.phase='attention';await save(run);
    await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention',reason:String(message.error||'Pearson Save could not finish.').slice(0,300)},{frameId:run.frame}).catch(()=>{});return {received:true};
  }
  if(message.type==='pearsonCoursePlayerDone'){
    if(run.phase!=='player'||sender.tab.id!==run.playerTab||sender.frameId!==run.playerFrame||run.playerDocumentId&&sender.documentId!==run.playerDocumentId)return {received:false};
    run.phase='verify';run.returnAfterSave=true;run.saveClicked=false;await save(run);
    const saved=await chrome.tabs.sendMessage(run.playerTab,{type:'pearsonCourseSave',skipUnchecked:message.skipUnchecked===true},{frameId:run.playerFrame}).catch(error=>({received:false,error:error.message}));
    if(saved?.received&&saved.saveClicked===true){run.saveClicked=true;await save(run);return {received:true};}
    // A disappearing player or an open message channel is not a Save receipt.
    // The capture listener can still record a real click after this job ends.
    run.phase='attention';await save(run);
    const error=saved?.error||'Pearson did not confirm its Save button was clicked. Review this assignment before continuing.';
    await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention',reason:error},{frameId:run.frame}).catch(()=>{});
    return {received:true,attention:true,error};
  }
  if(message.type==='pearsonCoursePlayerBlocked'){
    if(run.phase!=='player'||sender.tab.id!==run.playerTab)return {received:false};
    run.phase='attention';await save(run);
    await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention'},{frameId:run.frame}).catch(()=>{});
    return {received:true};
  }
  return {received:false};
}
async function pearsonCourseRunStopped(sender){
  const {pearsonCourse:run}=await chrome.storage.session.get('pearsonCourse');
  if(run?.phase!=='player'||run.playerTab!==sender.tab?.id)return;
  run.phase='attention';await chrome.storage.session.set({pearsonCourse:run});
  await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention'},{frameId:run.frame}).catch(()=>{});
}
