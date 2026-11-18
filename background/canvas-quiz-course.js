/* Native reading-quiz branch of the existing user-started Canvas course queue. */
async function canvasCourseQuiz(message,sender,run,save){
  if(!message.type.startsWith('canvasCourseQuiz'))return null;
  const C=StudyCanvasMcGrawCourse,item=run?.items[run.index],u=new URL(sender.url),quiz=StudyCanvasQuiz.base(u.href);
  if(!run||run.tester||!run.includeCanvasQuizzes||sender.frameId!==0||sender.tab?.id!==run.tab||u.origin!==run.origin||!item)return {received:false};
  const features=await config();if(!StudyConfig.allowed('canvas',features)||!StudyConfig.featureEnabled(features,'canvasQuizLauncher'))throw Error('Enable Canvas quizzes and the quiz overview panel in settings.');
  if(message.type!=='canvasCourseQuizRedirect'&&quiz!==(item.quizUrl||C.quizUrl(item.url,run.listUrl)))return {received:false};
  if(['canvasCourseQuizRedirect','canvasCourseQuizOverview','canvasCourseQuizReady','canvasCourseQuizPlayer','canvasCourseQuizRetrySource'].includes(message.type)){
    const {canvasCoursePolicies:policies={}}=await (chrome.storage.local?.get('canvasCoursePolicies')||{}),courseUrl=run.listUrl.replace(/\/assignments\/?$/,''),policy=policies[run.origin]?.[courseUrl];
    if(policy&&(policy.enabled===false||policy.types?.quiz===false)){
      const error='This course or quiz type is disabled in the Canvas inventory. Enable it before retrying.';
      run.phase='attention';if(run.issues.at(-1)?.reason!==error)run.issues.push({title:item.title,url:item.url,reason:error});await save();return {received:false,error};
    }
  }
  async function saveSourceIssue(error){
    const recovery=await StudyReadingTasks.recoverImport(sender);
    const previous=run.issues.findLast(issue=>issue.url===quiz||issue.url===item.url);
    const reason=error||((recovery.owned&&recovery.reason)||previous?.reason);
    const issue={
      title:item.title,url:quiz,assignmentUrl:item.url,readingUrl:recovery.sourceUrl||'',notebookUrl:recovery.notebookUrl||'',
      reason:reason?('Skipped source preparation. '+reason).slice(0,700):'Skipped source preparation.',savedAt:Date.now()
    };
    const {canvasCourseIssueBank:bank={}}=await chrome.storage.local.get('canvasCourseIssueBank');
    bank[run.origin] ||= {};bank[run.origin][quiz]=issue;
    await chrome.storage.local.set({canvasCourseIssueBank:bank});
    run.issues.push(issue);run.phase='returning';await save();
    await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});
    return {received:true,saved:true,skipped:true};
  }
  if(message.type==='canvasCourseQuizRedirect'){
    const target=C.quizUrl(message.url,run.listUrl);
    if(run.phase!=='opening'||C.assignmentUrl(u.href,run.listUrl)!==item.url||!C.titleMatches(message.title,item.title)||!target)return {received:false};
    item.quizUrl=target;item.kind='quiz';await save();await chrome.tabs.update(run.tab,{url:target,active:true});return {received:true};
  }
  if(['canvasCourseQuizRetrySource','canvasCourseQuizSkipSource'].includes(message.type)){
    if(!['opening','quiz-preparing','attention'].includes(run.phase)||run.quizLaunched||!StudyCanvasQuiz.overview(u.href))return {received:false};
    if(message.type==='canvasCourseQuizRetrySource'){
      await StudyReadingTasks.recoverImport(sender);
      const {canvasCourseIssueBank:bank={}}=await chrome.storage.local.get('canvasCourseIssueBank');
      const issue=C.savedIssue({...item,quizUrl:quiz},bank[run.origin],run.listUrl);
      for(const [key,value] of Object.entries(bank[run.origin]||{}))if(value===issue)delete bank[run.origin][key];
      await chrome.storage.local.set({canvasCourseIssueBank:bank});
      run.phase='opening';delete run.quizDocument;delete run.quizLaunched;delete run.quizNotebook;await save();return {received:true,reload:true};
    }
    return saveSourceIssue();
  }
  if(message.type==='canvasCourseQuizOverview'){
    if(run.phase!=='opening'||!StudyCanvasQuiz.overview(u.href)||!C.titleMatches(message.title,item.title))return {received:false};
    const {canvasCourseIssueBank:bank={}}=await (chrome.storage.local?.get('canvasCourseIssueBank')||{});
    const issue=C.savedIssue({...item,quizUrl:quiz},bank[run.origin],run.listUrl);
    if(issue&&!run.retryIssueBank){
      run.issues.push({...issue,reason:'Skipped saved issue. '+issue.reason});run.phase='returning';await save();
      await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,skipped:true};
    }
    const {canvasCatalogs={}}=await (chrome.storage.local?.get('canvasCatalogs')||{});
    const matches=entry=>(entry.url===quiz||entry.url===item.url||entry.assignmentUrl===item.url)&&C.titleMatches(entry.title,item.title);
    const latest=canvasCatalogs[run.origin]?.courses?.find(course=>course.url+'/assignments'===run.listUrl)?.items?.find(matches),saved=run.coursePolicies?.[run.listUrl]?.metadata?.find(matches);
    const dueAt=Number.isFinite(message.dueAt)?message.dueAt:latest?latest.dueAt:Number.isFinite(item.dueAt)?item.dueAt:saved?.dueAt;
    if(run.onlyPastDue&&!C.isPastDue(dueAt)){
      run.phase='returning';run.issues.push({title:item.title,url:quiz,reason:'Skipped: not past due or due date unavailable.'});await save();
      await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});return {received:true,skipped:true};
    }
    if(run.retryIssueBank&&message.submitted===true){
      run.phase='returning';
      await save();
      await chrome.tabs.update(run.tab,{url:run.listUrl,active:true});
      return {received:true,skipped:true};
    }
    if(message.submitted===true||message.started===true&&!run.includeStarted||message.locked===true||run.skipPastDue&&(!Number.isFinite(dueAt)||C.isPastDue(dueAt))){
      run.phase='attention';run.issues.push({title:item.title,url:quiz,reason:message.submitted?'Quiz already submitted.':message.started&&!run.includeStarted?'Quiz already started; Include started work is off.':message.locked?'Quiz is locked or its start control is unavailable.':'Quiz due date is missing or past due.'});await save();return {received:false,error:run.issues.at(-1).reason};
    }
    run.phase='quiz-preparing';run.quizBase=quiz;run.quizDocument=sender.documentId;await save();return {received:true,prepare:true};
  }
  if(message.type==='canvasCourseQuizReady'){
    if(run.phase!=='quiz-preparing'||!StudyCanvasQuiz.overview(u.href)||run.quizDocument&&run.quizDocument!==sender.documentId)return {received:false};
    const {readingsJob:job}=await chrome.storage.session.get('readingsJob');
    if(!job||job.phase!=='ready'||!job.sourceName||job.owner?.tab!==run.tab||StudyCanvasQuiz.base(job.owner.url)!==quiz||!StudyCanvasQuiz.overview(job.owner.url)||job.owner.documentId&&job.owner.documentId!==sender.documentId||job.notebookUrl!==message.url)throw Error('The quiz notebook has not finished loading its verified reading.');
    if(run.retryIssueBank){
      // A verified import resolves the source failure. Later launch or
      // submission problems still go through Course Auto's usual review flow.
      const {canvasCourseIssueBank:bank={}}=await chrome.storage.local.get('canvasCourseIssueBank');
      const issues=bank[run.origin]||{};
      const original=C.savedIssue({...item,quizUrl:quiz},run.retryIssueBank,run.listUrl);
      const resolvedKey=Object.keys(issues).find(key=>original&&JSON.stringify(issues[key])===JSON.stringify(original));
      if(resolvedKey){
        delete issues[resolvedKey];
        await chrome.storage.local.set({canvasCourseIssueBank:bank});
      }
    }
    run.phase='quiz-launching';run.quizLaunched=Date.now();run.quizNotebook=job.notebookUrl;await save();return {received:true,launch:true};
  }
  if(message.type==='canvasCourseQuizPlayer'){
    if(run.phase!=='quiz-launching'||u.pathname!==new URL(quiz).pathname+'/take'||Date.now()-run.quizLaunched>120000)return {received:false};
    run.phase='quiz-running';run.playerTab=run.tab;await save();const {readingsJob:job}=await chrome.storage.session.get('readingsJob');await StudyQuizLifecycle.recordUse(sender,run.quizNotebook,job?.bookTab);return {received:true,start:true,url:run.quizNotebook,sourceTitle:message.title};
  }
  if(message.type==='canvasCourseQuizIssue'&&['opening','quiz-preparing','quiz-launching','quiz-running','attention'].includes(run.phase)){
    if(message.stopped===true){
      await StudyReadingTasks.recoverImport(sender);
      run.phase='done';await save();return {received:true,stopped:true};
    }
    if(!run.quizLaunched&&StudyCanvasQuiz.overview(u.href)&&(!run.quizDocument||run.quizDocument===sender.documentId)){
      return saveSourceIssue(String(message.error||'Quiz source preparation failed.').slice(0,500));
    }
    run.phase='attention';run.issues.push({title:item.title,url:quiz,reason:String(message.error||'Quiz handoff needs review.').slice(0,500)});await save();return {received:true};
  }
  return {received:false};
}

// Canvas can redirect /assignments/:id directly to /quizzes/:id before its
// assignment-detail controller runs. Only inventory metadata may bind that alias.
async function canvasCourseQuizLocation(run,sender){
  const C=StudyCanvasMcGrawCourse,item=run.items[run.index],quiz=StudyCanvasQuiz.base(sender.url);
  if(!run.includeCanvasQuizzes||!['opening','attention'].includes(run.phase)||item?.kind!=='quiz'||sender.tab?.id!==run.tab||sender.frameId!==0||!StudyCanvasQuiz.overview(sender.url)||!C.assignmentUrl(item.url,run.listUrl)||item.quizUrl===quiz)return false;
  const {canvasCatalogs={}}=await (chrome.storage.local?.get('canvasCatalogs')||{}),current=canvasCatalogs[run.origin]?.courses?.find(course=>course.url+'/assignments'===run.listUrl),saved=run.coursePolicies?.[run.listUrl]?.metadata||[];
  const known=(current?current.items||[]:saved).find(entry=>entry.assignmentUrl===item.url);
  if(!known||known.url!==quiz||known.type!=='quiz'||!C.titleMatches(known.title,item.title))return false;item.quizUrl=quiz;if(!Number.isFinite(item.dueAt)&&Number.isFinite(known.dueAt))item.dueAt=known.dueAt;return true;
}
