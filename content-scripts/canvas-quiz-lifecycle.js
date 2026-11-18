/* Watch public Canvas overview/results pages; never submit the quiz. */
(() => {
  if(window!==window.top||!globalThis.StudyCanvasQuiz||!StudyCanvasQuiz.base(location.href))return;
  const base=StudyCanvasQuiz.base(location.href);
  const send=(type,values={})=>chrome.runtime.sendMessage({type,...values});
  let busy=false,submitted=false,courseAttempted=false,waitingSince=null,shownIssue='';
  if(location.pathname===new URL(base).pathname+'/take')send('canvasQuizTrackPrepared').catch(()=>{});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#submit_quiz_button,[data-action="submit-quiz"]'))send('canvasQuizSubmitIntent').catch(()=>{});
  },true);
  async function check(){
    if(busy)return;busy=true;
    try{
      const explicit=StudyCanvasQuiz.submitted(document,location.href,false),confirmed=explicit||StudyCanvasQuiz.submitted(document,location.href,true);
      if(confirmed&&!submitted){const result=await send('canvasQuizSubmitted',{confirmed:true,requiresIntent:!explicit});if(result?.received&&!result.waiting)submitted=true;}
      if(!StudyCanvasQuiz.overview(location.href))return;
      const {run}=await send('canvasCourseState'),item=run?.items?.[run.index];
      if(!run?.includeCanvasQuizzes||StudyCanvasQuiz.base(item?.quizUrl||item?.url)!==base)return;
      const controls=globalThis.StudyCanvasQuizControls;controls?.courseState(run);
      if(run.phase==='attention'){
        const reason=run.issues?.at(-1)?.reason||'Review the course run before continuing.';
        const sourceProblem=run.issues?.findLast(issue=>(issue.url===base||issue.url===item.url||!issue.url&&issue.title===item.title)&&/reading|notebook|source|import|processing|prepar/i.test(issue.reason||'')&&!/stopped by user|disabled/i.test(issue.reason||''));
        if(!run.quizLaunched&&sourceProblem&&!/stopped by user|disabled/i.test(reason)){
          const result=await send('canvasCourseQuizIssue',{error:sourceProblem.reason});
          if(result?.skipped)return;
        }
        if(reason!==shownIssue){controls?.notice('Course Auto paused: '+reason);shownIssue=reason;}
        return;
      }
      if(courseAttempted||run.phase!=='opening')return;
      waitingSince??=Date.now();
      const title=StudyCanvasQuiz.title(document),launch=document.querySelector('#take_quiz_link');
      if(!title||!controls&&!(run.retryIssueBank&&confirmed)){if(Date.now()-waitingSince<45000)return;const error='Canvas quiz controls did not finish loading. Reload this quiz and retry Course Auto.';await send('canvasCourseQuizIssue',{error});controls?.notice(error);return;}
      // Canvas displays unlock and lock dates next to the due date. Only
      // read the Due row; use assignment metadata when it has display text only.
      const dueRow=[...document.querySelectorAll('#quiz_student_details > li')].find(row=>
        /^due:?$/i.test(row.querySelector('.title')?.textContent.trim())
      );
      const dueNode=dueRow?.querySelector('time[datetime],[data-timestamp]');
      const raw=dueNode?.getAttribute('datetime')||dueNode?.getAttribute('data-timestamp');
      const dueAt=raw&&/^\d{10,13}$/.test(raw)?Number(raw)*(raw.length===10?1000:1):raw?Date.parse(raw):null;
      const result=await send('canvasCourseQuizOverview',{title,dueAt:Number.isFinite(dueAt)?dueAt:null,submitted:confirmed,started:/resume|continue/i.test(launch?.textContent||''),locked:!launch?.getClientRects().length||launch?.disabled===true||launch?.getAttribute('aria-disabled')==='true'});
      if(result?.skipped)return;
      if(result?.prepare&&controls){courseAttempted=true;await controls.prepareCourse();}
      else if(result?.error){controls?.notice('Course Auto paused: '+result.error);shownIssue=result.error;}
      else if(Date.now()-waitingSince>=45000){const error='Course Auto could not confirm this quiz matches its queued assignment. Review the course run.';await send('canvasCourseQuizIssue',{error});controls?.notice(error);}
    }catch(error){
      if(courseAttempted)await send('canvasCourseQuizIssue',{error:error.message}).catch(()=>{});
      globalThis.StudyCanvasQuizControls?.notice('Course Auto: '+error.message);
    }finally{busy=false;}
  }
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.notebookCleanupPreferences){submitted=false;check();}});
  new MutationObserver(()=>check()).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(check,1800);check();
})();
