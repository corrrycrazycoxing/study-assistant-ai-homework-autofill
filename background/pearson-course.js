// Course runs keep navigation state only. Questions, answers and media are never stored here.
async function pearsonCourseMessage(message,sender){
  const url=new URL(sender.url||'');
  if(!sender.tab||url.origin!=='https://mylab.pearson.com'&&url.origin!=='https://tdx.acs.pearson.com')return {received:false};
  const listPaths=['/Student/DoAssignments.aspx'],overview='/Student/OverviewHomework.aspx';
  const isListPath=pathname=>listPaths.some(path=>pathname.toLowerCase()===path.toLowerCase())||/^\/courses\/\d+\/assignments\/?$/i.test(pathname);
  const read=async()=>((await chrome.storage.session.get('pearsonCourse')).pearsonCourse||null);
  const save=async run=>chrome.storage.session.set({pearsonCourse:run});
  if(message.type==='pearsonCourseStart'){
    if(!isListPath(url.pathname)||!Array.isArray(message.assignments)||!message.assignments.length||message.assignments.length>100||message.assignments.some(a=>typeof a?.title!=='string'||a.title.length>180||!/^(?:Lesson Section|HW Section|Homework)(?=\b|\d)/i.test(a.title)||/\b(?:exam|test|quiz)\b/i.test(a.title)||typeof a.key!=='string'||!/^javascript:doHomework\(\d+,/i.test(a.key)||a.key.length>600))throw Error('Choose available homework or lesson assignments from the Pearson list.');
    const skippedAssignments=Array.isArray(message.skippedAssignments)?message.skippedAssignments.filter(item=>typeof item?.title==='string'&&item.title.length<=180&&typeof item.reason==='string'&&item.reason.length<=180).slice(0,100).map(item=>({...item,assignmentId:/^\d{1,12}$/.test(String(item.assignmentId||''))?String(item.assignmentId):''})):[];
    await save({tab:sender.tab.id,frame:sender.frameId,listUrl:url.href,assignments:message.assignments,index:0,phase:'list',assignmentId:'',skipped:skippedAssignments.length,skippedAssignments,skippedQuestions:[],pendingMediaAssignments:[],skipReviewPause:message.skipReviewPause===true,time:Date.now()});
    return {received:true,title:message.assignments[0].title};
  }
  const run=await read();
  if(message.type==='pearsonCourseStop'){
    if(run?.tab!==sender.tab.id)return {received:false};
    if(run.playerTab){const {autoRun}=await chrome.storage.session.get('autoRun');if(autoRun?.tab===run.playerTab)await chrome.tabs.sendMessage(run.playerTab,{type:'studyStop'},{frameId:autoRun.frame}).catch(()=>{});}
    await chrome.storage.session.remove('pearsonCourse');return {received:true};
  }
  if(!run||Date.now()-run.time>4*60*60*1000)return {received:false};
  const recordPendingMedia=(id)=>{run.pendingMediaAssignments??=[];if(!run.pendingMediaAssignments.some(item=>item.assignmentId===id))run.pendingMediaAssignments.push({title:run.assignments[run.index]?.title||'Assignment',assignmentId:id,reason:'Pearson may update credit after the media route returns, even if its tab is blank. Verify its status.'});};
  const advance=async()=>{run.index++;run.assignmentId='';run.phase=run.index<run.assignments.length?'list':'done';await save(run);return {received:true,action:run.phase==='done'?'done':'list',listUrl:run.listUrl,index:run.index,total:run.assignments.length,skipped:run.skipped,skippedAssignments:run.skippedAssignments||[],skippedQuestions:run.skippedQuestions||[],pendingMediaAssignments:run.pendingMediaAssignments||[]};};
  if(message.type==='pearsonCourseList'){
    if(sender.tab.id!==run.tab||sender.frameId!==run.frame||!isListPath(url.pathname))return {received:false};
    return {received:true,phase:run.phase,title:run.assignments[run.index]?.title||'',key:run.assignments[run.index]?.key||'',index:run.index,total:run.assignments.length,skipped:run.skipped,skippedAssignments:run.skippedAssignments||[],skippedQuestions:run.skippedQuestions||[],pendingMediaAssignments:run.pendingMediaAssignments||[]};
  }
  if(message.type==='pearsonCourseGate'){
    if(sender.tab.id!==run.tab||sender.frameId!==run.frame||url.pathname!=='/Student/DoHomework.aspx'||run.phase!=='list')return {received:false};
    const id=url.searchParams.get('homeworkId'),expected=run.assignments[run.index]?.key.match(/^javascript:doHomework\((\d+),/i)?.[1];
    if(id!==expected)return {received:false};
    if(message.canStart===true){run.assignmentId=id;await save(run);return {received:true,action:'start'};}
    run.skipped++;run.skippedAssignments??=[];run.skippedAssignments.push({title:run.assignments[run.index]?.title||'Assignment',reason:'Already started or unavailable'});return advance();
  }
  if(message.type==='pearsonCourseQuestionSkipped'){
    if(sender.tab.id!==run.playerTab||run.phase!=='player'||url.searchParams.get('homeworkId')!==run.assignmentId)return {received:false};
    const questionId=String(message.questionId||'');
    if(!/^\d+$/.test(questionId)||url.searchParams.get('questionId')!==questionId||typeof message.label!=='string'||!message.label.trim()||message.label.length>240||typeof message.reason!=='string'||!message.reason.trim()||message.reason.length>300)return {received:false};
    run.skippedQuestions??=[];
    if(!run.skippedQuestions.some(item=>item.assignmentId===run.assignmentId&&item.questionId===questionId))run.skippedQuestions.push({assignmentId:run.assignmentId,title:run.assignments[run.index]?.title||'Assignment',questionId,label:message.label.trim(),reason:message.reason.trim()});
    await save(run);return {received:true};
  }
  if(message.type==='pearsonCourseOverview'){
    const courseFrame=sender.tab.id===run.tab&&sender.frameId===run.frame;
    const savedPlayer=sender.tab.id===run.playerTab&&url.pathname===overview&&run.phase==='verify';
    if((!courseFrame&&!savedPlayer)||url.pathname!==overview)return {received:false};
    const id=url.searchParams.get('homeworkId');if(!id||!/^[0-9]+$/.test(id))return {received:false};
    const expected=run.assignments[run.index]?.key.match(/^javascript:doHomework\((\d+),/i)?.[1];
    if(id!==expected)return {received:false};
    if(run.phase==='verify'){
      const pendingIds=Array.isArray(message.pendingQuestionIds)?message.pendingQuestionIds.filter(id=>typeof id==='string'&&/^\d+$/.test(id)):[];
      const skippedIds=new Set((run.skippedQuestions||[]).filter(item=>item.assignmentId===id).map(item=>item.questionId));
      const unaccounted=pendingIds.some(questionId=>!skippedIds.has(questionId));
      if(message.mediaPending)recordPendingMedia(id);
      if(unaccounted||(message.questionsPending&&!pendingIds.length)){run.phase='attention';await save(run);if(savedPlayer)await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention'},{frameId:run.frame}).catch(()=>{});return {received:true,action:'attention'};}
      const next=await advance();
      if(savedPlayer&&['list','done'].includes(next.action)){
        await chrome.tabs.update(run.tab,{url:run.listUrl});
        return {...next,action:'saved-list'};
      }
      return next;
    }
    if(run.phase!=='list'&&run.phase!=='overview'&&run.phase!=='media'&&run.phase!=='attention')return {received:true,action:'attention'};
    if(run.phase==='list'&&message.notStarted!==true){run.skipped++;run.skippedAssignments??=[];run.skippedAssignments.push({title:run.assignments[run.index]?.title||'Assignment',reason:'Already started or unavailable'});return advance();}
    if(message.mediaPending)recordPendingMedia(id);
    run.assignmentId=id;
    run.phase='overview';await save(run);
    return {received:true,action:message.questionsPending?'question':'complete',index:run.index,total:run.assignments.length};
  }
  if(message.type==='pearsonCourseComplete'){
    if(sender.tab.id!==run.tab||sender.frameId!==run.frame||url.pathname!==overview||run.phase!=='overview')return {received:false};
    run.phase='verify';await save(run);return {received:true};
  }
  if(message.type==='pearsonCoursePlayerReady'){
    const id=url.searchParams.get('homeworkId')||new URL(sender.tab.url||url.href).searchParams.get('homeworkId');
    if(!id||id!==run.assignmentId||run.phase!=='overview')return {received:false};
    if(sender.tab.id!==run.tab&&sender.tab.openerTabId!==run.tab)return {received:false};
    run.phase='player';run.playerTab=sender.tab.id;await save(run);return {received:true,start:true,skipReviewPause:run.skipReviewPause};
  }
  if(message.type==='pearsonCoursePlayerDone'){
    if(run.phase!=='player'||sender.tab.id!==run.playerTab)return {received:false};
    run.phase='verify';await save(run);
    const saved=await chrome.tabs.sendMessage(run.playerTab,{type:'pearsonCourseSave'},{frameId:0}).catch(error=>({received:false,error:error.message}));
    if(!saved?.received){run.phase='attention';await save(run);await chrome.tabs.sendMessage(run.tab,{type:'pearsonCourseAttention',reason:saved?.error||'Pearson did not confirm Save.'},{frameId:run.frame}).catch(()=>{});return {received:true,attention:true,error:saved?.error||'Pearson did not confirm Save.'};}
    return {received:true};
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
