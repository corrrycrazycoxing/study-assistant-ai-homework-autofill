// Navigation for homework/lesson assignments. Pending media is reported separately.
(() => {
  const path=location.pathname.toLowerCase();
  const list=path==='/student/doassignments.aspx'||/^\/courses\/\d+\/assignments\/?$/i.test(path),overview=path==='/student/overviewhomework.aspx',gate=path==='/student/dohomework.aspx';
  if(!list&&!overview&&!gate)return;
  const embeddedCourse=window.top!==window;
  const embeddedList=list&&embeddedCourse;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const visible=e=>e?.getClientRects().length>0;
  const send=async(type,more={})=>{
    try{return await chrome.runtime.sendMessage({type,...more});}
    catch(error){
      // A committed overview transition can outlive its response channel. Ask
      // only for its saved destination; never replay the queue mutation.
      if(type==='pearsonCourseOverview'&&/message channel closed|asynchronous response/i.test(String(error.message))){
        const state=await chrome.runtime.sendMessage({type:'pearsonCourseReturnState'}).catch(()=>null);
        if(state?.received)return state;
        throw Error('Course Auto lost its connection while checking the return to the list. The queue was not restarted.');
      }
      throw error;
    }
  };
  const openAssignment=async id=>new Promise((resolve,reject)=>{
    const token=crypto.randomUUID();
    const timeout=setTimeout(()=>{document.removeEventListener('mylab-assistant-course-open-result',receive);reject(Error('Pearson did not open this assignment. Open it manually.'));},2500);
    function receive(event){let data;try{data=JSON.parse(event.detail);}catch{return;}if(data.token!==token)return;clearTimeout(timeout);document.removeEventListener('mylab-assistant-course-open-result',receive);data.ok?resolve():reject(Error(data.error||'Pearson could not open this assignment.'));}
    document.addEventListener('mylab-assistant-course-open-result',receive);
    document.dispatchEvent(new CustomEvent('mylab-assistant-course-open-request',{detail:JSON.stringify({token,id})}));
  });
  const openQuestion=async id=>{
    const result=await send('pearsonCourseOpenQuestion',{questionId:id});
    if(!result?.received)throw Error(result?.error||'Pearson could not open this question.');
  };
  const eligible=text=>/^(?:Lesson Section|HW Section|Homework)(?=\b|\d)/i.test(text)&&!/(?:practice\s+exam|\bexam\b|\btest\b|\bquiz\b)/i.test(text);
  const rows=()=>[...document.querySelectorAll('tr')].flatMap(row=>[...row.querySelectorAll('a[href],a[onclick]')].filter(visible).map(link=>({link,title:clean(link.textContent),key:String(link.getAttribute('href')||link.getAttribute('onclick')||'').slice(0,600),row}))).filter(x=>eligible(x.title)&&/^javascript:doHomework\(\d+,/i.test(x.key));
  const items=()=>rows();
  function parseScore(text){const matches=[...String(text||'').matchAll(/(\d+(?:\.\d+)?)\s*%/g)];return matches.length?Number(matches.at(-1)[1]):null;}
  async function readScore(entry){
    const id=entry.key.match(/^javascript:doHomework\((\d+),/i)?.[1];if(!id)return null;
    const cell=document.getElementById('H_'+id+'_IVF_2_False');
    const read=()=>parseScore(document.getElementById('H_'+id+'_IVF_2_False')?.innerText||cell?.innerText);
    const existing=read();if(existing!==null)return existing;
    const scoreLink=[...entry.row.querySelectorAll('a[href*="scoreCallBack"]')].find(visible);if(!scoreLink)return null;
    scoreLink.click();
    for(let i=0;i<8;i++){const score=read();if(score!==null)return score;await new Promise(resolve=>setTimeout(resolve,100));}
    return null;
  }
  const scored=(link)=>{
    const row=link.closest('li')||link.closest('p')||link.closest('tr');
    const m=clean(row?.textContent||'').match(/\(\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*\)/);
    // Pearson can put the accessible status in hidden link text rather than an
    // image alt/ARIA attribute. Late penalties reduce points on Correct work.
    const labels=[link.textContent,link.getAttribute('aria-label'),link.getAttribute('title'),...[...link.querySelectorAll('img[alt],[aria-label],[title]')].flatMap(el=>['alt','aria-label','title'].map(name=>el.getAttribute(name)))].map(clean);
    const correct=labels.some(label=>/(?:^|[\s,])correct(?:$|[\s,])/i.test(label))&&!labels.some(label=>/\b(?:incorrect|not correct|partial|partially)\b/i.test(label));
    return m?{earned:Number(m[1]),possible:Number(m[2]),correct}:null;
  };
  const questionLinks=()=>[...document.querySelectorAll('a[href*="doExercise"],a[onclick*="doExercise"]')].filter(visible);
  const mediaLinks=()=>[...document.querySelectorAll('a[href*="doMedia"],a[onclick*="doMedia"]')].filter(visible);
  function unstartedWork(score,counts,questions){
    // Media assignments label this “Scored Media”, not “Scored”. Question
    // correctness counters and every question score must still confirm zero.
    const zeroResults=['Correct','Partial Credit','Incorrect'].every(label=>counts.includes(label+': 0'));
    const scoredCount=counts.find(text=>/^Scored:\s*\d+$/.test(text));
    return /^0%\s*\(0\s+points\s+out\s+of\s+\d+\)/i.test(score)&&zeroResults&&(!scoredCount||scoredCount==='Scored: 0')&&questions.length>0&&questions.every(link=>scored(link)?.earned===0);
  }
  let host,view,busy=false,reportId=null,launchGeneration=0;
  function panel(){
    if(host)return view;
    host=document.createElement('div');host.id='study-pearson-course';
    host.style.cssText='position:fixed;right:18px;bottom:20px;z-index:2147483600;width:300px;max-width:calc(100vw - 36px)';
    if(embeddedCourse)host.style.display='none';
    view=host.attachShadow({mode:'open'});
    view.innerHTML='<style>:host{font:13px/1.45 system-ui;color:#e8edff}section{background:#10151f;border:1px solid #6b7bac;border-radius:12px;box-shadow:0 8px 30px #0005;padding:14px}h2{font-size:16px;margin:0 0 4px}p{margin:6px 0 10px;color:#b9c7e4}button{font:inherit;background:#5264ff;color:white;border:0;border-radius:7px;padding:8px 12px;cursor:pointer;margin:5px 6px 0 0}button.secondary{background:#30394d}button:disabled{opacity:.45}label{display:block;margin:8px 0}small{display:block;color:#9faeca;margin-top:8px}.warning{padding:9px 10px;border:1px solid #c18a2d;border-radius:8px;background:#302a1f;color:#f3dca9;margin:10px 0}select{width:100%;font:inherit;padding:7px;background:#20283c;color:#eef1ff;border:1px solid #647397;border-radius:6px}progress{width:100%;accent-color:#929bff}details summary{cursor:pointer;color:#b9c7e4;margin-top:9px}[hidden]{display:none!important}.attention{position:fixed;inset:0;background:#050811d9;z-index:2147483647;display:grid;place-items:center;padding:20px}.attention[hidden]{display:none}.dialog{width:min(680px,100%);max-height:85vh;overflow:auto;background:#171f33;border:2px solid #8496ff;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0009}.dialog h2{font-size:24px}.items{padding-left:22px}.items li{margin:10px 0}.reason{display:block;color:#bdc9e2}</style><section><h2>Full Course Mode</h2><p id="state">Checking available homework…</p><details id="review-notice" open><summary>Review notice</summary><div class="warning"><strong>Review required.</strong> Course Mode may enter answers only after Pearson confirms a homework or lesson is not started, or you opt into verified unfinished started work. It can miss work. Questions needing attention are saved in the final review list while Course Auto continues. Review every result in Pearson; you submit assignments yourself.</div><label id="ack"><input id="ack-warning" type="checkbox"> I understand and will review the results before submitting.</label></details><label id="pace"><input id="skip-pause" type="checkbox"> Continue without review pauses</label><label id="include-started-wrap"><input id="include-started" type="checkbox"> Include started homework &amp; lessons</label><button id="go" disabled>Go through homework &amp; lessons</button><button id="stop" class="secondary" hidden>Stop course run</button><button id="review-report" class="secondary" hidden>Review last run</button><small>List entries with hidden scores are checked at the start page. Completed or unclear work is not answered. Started work requires the option above. Assignments with incomplete required media remain pending for review. Course Mode uses Pearson Save between assignments; final submission stays yours.</small></section><div class="attention" id="course-attention" hidden><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="course-attention-title"><h2 id="course-attention-title">Manual review needed</h2><p id="course-attention-summary"></p><div id="course-attention-items"></div><button id="course-attention-close" class="secondary">Close</button></section></div>';
    view.getElementById('state').insertAdjacentHTML('afterend',StudyPearsonCourseUI.queueMarkup()+StudyPearsonCourseUI.paceMarkup());
    const canStart=()=>view.getElementById('ack-warning').checked&&(!list||StudyPearsonCourseUI.hasPace(view));
    view.getElementById('ack-warning').onchange=()=>{if(view.getElementById('ack-warning').checked)view.getElementById('review-notice').open=false;view.getElementById('go').disabled=!canStart();};
    StudyPearsonCourseUI.bindPace(view,()=>{view.getElementById('go').disabled=!canStart();});
    view.getElementById('go').onclick=async()=>{const button=view.getElementById('go');if(busy)return;try{if(!view.getElementById('ack-warning').checked){status('Acknowledge the review warning before starting Course Mode.');return;}busy=true;const generation=++launchGeneration;button.disabled=true;if(list){const pace=StudyPearsonCourseUI.readPace(view);view.getElementById('review-notice').open=false;const available=items();if(!available.length)throw Error('No available homework or lesson links are visible.');const assignments=[],skippedAssignments=[];for(const [index,entry] of available.entries()){status('Checking score '+(index+1)+' of '+available.length+': '+entry.title,{value:index,max:available.length,label:'Checking assignment scores'});const score=await readScore(entry),assignmentId=entry.key.match(/^javascript:doHomework\((\d+),/i)?.[1]||'';if(generation!==launchGeneration)throw Error('Stopped.');if(score===0||score===null||view.getElementById('include-started').checked&&score<100)assignments.push({title:entry.title,key:entry.key});else skippedAssignments.push({title:entry.title,assignmentId,reason:'Already has a score'});}const result=await send('pearsonCourseStart',{assignments,skippedAssignments,pace,includeStarted:view.getElementById('include-started').checked,skipReviewPause:view.getElementById('skip-pause').checked});if(!result?.received)throw Error(result?.error||'Could not start.');await listReady();}else await overviewReady();}catch(error){status(error.message);}finally{busy=false;button.disabled=!canStart();}};
    view.getElementById('review-report').onclick=()=>restoreReview(true);
    view.getElementById('stop').onclick=async()=>{launchGeneration++;await send('pearsonCourseStop').catch(()=>{});await restoreReview();status('Stopped.');view.getElementById('go').hidden=false;view.getElementById('stop').hidden=true;view.getElementById('pace').hidden=!list;view.getElementById('course-speed-setup').hidden=false;StudyPearsonCourseUI.queueProgress(view,null);};
    document.body.append(host);return view;
  }
  const status=(text,progress=null)=>{panel().getElementById('state').textContent=text;if(progress)StudyPearsonCourseUI.queueProgress(view,progress);if(embeddedCourse)window.top.postMessage({source:'study-assistant-pearson-course',type:'status',text,progress,count:items().length},'*');};
  async function restoreReview(open=false){
    const {report}=await send('pearsonCourseReport')||{};
    reportId=report?.id||null;
    const available=!!report&&(report.questions.length+report.assignments.length+report.media.length)>0;
    panel().getElementById('review-report').hidden=!available;
    if(embeddedList)window.top.postMessage({source:'study-assistant-pearson-course',type:'reviewAvailable',available},'*');
    if(available&&(open||!report.dismissed))showReview(report.questions,report.assignments,report.media);
  }
  function showReview(questions,assignments,media=[]){
    if(!questions.length&&!assignments.length&&!media.length)return;
    if(embeddedList){window.top.postMessage({source:'study-assistant-pearson-course',type:'review',questions,assignments,media},'*');return;}
    const modal=panel().getElementById('course-attention'),summary=view.getElementById('course-attention-summary'),items=view.getElementById('course-attention-items');
    summary.textContent=(questions.length?questions.length+' question'+(questions.length===1?' was':'s were')+' skipped for manual review. ':'')+(assignments.length?assignments.length+' assignment'+(assignments.length===1?' was':'s were')+' left unopened because its score or start status needed review. ':'')+(media.length?media.length+' required media item'+(media.length===1?' still needs':'s still need')+' attention.':'');items.replaceChildren();
    if(questions.length){const heading=document.createElement('h3');heading.textContent='Questions to review';items.append(heading);const list=document.createElement('ol');for(const item of questions){const li=document.createElement('li');li.append(document.createTextNode(item.title+' · '+item.label));const reason=document.createElement('span');reason.className='reason';reason.textContent=item.reason;li.append(reason);list.append(li);}items.append(list);}
    const addAssignments=(headingText,values)=>{if(!values.length)return;const heading=document.createElement('h3');heading.textContent=headingText;items.append(heading);const list=document.createElement('ul');for(const item of values){const li=document.createElement('li');li.append(document.createTextNode(item.title+' · '+item.reason));if(/^\d{1,12}$/.test(String(item.assignmentId||''))){const button=document.createElement('button');button.className='secondary';button.textContent='Open assignment';button.addEventListener('click',async()=>{button.disabled=true;status('Opening '+item.title+' for review…');try{await openAssignment(String(item.assignmentId));}catch(error){status(error.message);button.disabled=false;}});li.append(button);}list.append(li);}items.append(list);};
    addAssignments('Assignments needing review',assignments);addAssignments('Media still to review',media);
    modal.hidden=false;view.getElementById('course-attention-close').focus();
  }
  async function listReady(){
    const state=await send('pearsonCourseList');
    if(!state?.received){status(items().length+' clickable homework/lesson assignments. Go checks each one and runs only those Pearson shows as not started.');await restoreReview();return;}
    view.getElementById('pace').hidden=true;view.getElementById('course-speed-setup').hidden=true;view.getElementById('include-started-wrap').hidden=true;view.getElementById('review-notice').open=false;
    if(state.phase==='done'){
      status('Course run finished. Review the course scores.',{value:state.total,max:state.total,label:'Assignments processed'});view.getElementById('go').hidden=true;view.getElementById('stop').hidden=true;
      await restoreReview();
      return;
    }
    view.getElementById('review-report').hidden=true;
    if(embeddedList)window.top.postMessage({source:'study-assistant-pearson-course',type:'reviewAvailable',available:false},'*');
    view.getElementById('stop').hidden=false;view.getElementById('go').hidden=true;
    if(state.phase!=='list'){status('Working on assignment '+(state.index+1)+' of '+state.total+'.',{value:state.index,max:state.total,label:'Going through assignments'});return;}
      const entry=rows().find(x=>x.title===state.title&&x.key===state.key);
    if(!entry){status('Cannot find “'+state.title+'” on this page. Stop and review the assignment list.');return;}
    const assignmentId=entry.key.match(/^javascript:doHomework\((\d+),/i)?.[1];
    if(!assignmentId){status('Pearson did not provide an assignment ID for “'+entry.title+'”.');return;}
    status('Opening '+(state.index+1)+' of '+state.total+': '+entry.title,{value:state.index,max:state.total,label:'Opening assignment '+(state.index+1)});
    try{await openAssignment(assignmentId);}catch(error){status(error.message);view.getElementById('go').hidden=false;view.getElementById('stop').hidden=true;}
  }
  let overviewReadAttempts=0;
  async function overviewReady(){
    const score=clean(document.getElementById('CurrentScore')?.textContent||'');
    const media=mediaLinks(),questions=questionLinks();
    const counts=[...document.querySelectorAll('li')].map(li=>clean(li.textContent));
    if((!score||questions.some(link=>scored(link)===null))&&overviewReadAttempts++<20){status('Waiting for Pearson assignment scores…');setTimeout(()=>overviewReady().catch(error=>status(error.message)),250);return;}
    const notStarted=unstartedWork(score,counts,questions);
    const mediaPending=media.some(link=>{const score=scored(link);return !score||score.earned<score.possible;});
    const questionCount=Number(counts.find(text=>/^Questions:\s*\d+$/.test(text))?.match(/\d+$/)?.[0]);
    const correctCount=Number(counts.find(text=>/^Correct:\s*\d+$/.test(text))?.match(/\d+$/)?.[0]);
    const allQuestionsCorrect=questions.length>0&&questionCount===questions.length&&correctCount===questionCount&&['Partial Credit: 0','Incorrect: 0'].every(text=>counts.includes(text));
    const pending=allQuestionsCorrect?[]:questions.filter(link=>{const score=scored(link);return !score||!score.correct&&score.earned<score.possible;});
    const parsedPercent=parseScore(score),percent=parsedPercent===null?NaN:parsedPercent;
    const canResume=Number.isFinite(percent)&&percent>=0&&percent<100&&questions.length>0&&pending.length>0&&questions.every(link=>scored(link)!==null);
    const pendingQuestionIds=pending.map(link=>String(link.getAttribute('href')||link.getAttribute('onclick')||'').match(/doExercise\((\d+)\)/i)?.[1]).filter(Boolean);
    const questionRoutes=questions.map(link=>({number:clean(link.textContent).match(/^Question\s+(\d+)\b/i)?.[1],id:String(link.getAttribute('href')||link.getAttribute('onclick')||'').match(/doExercise\((\d+)\)/i)?.[1]})).filter(route=>route.number&&route.id);
    const state=await send('pearsonCourseOverview',{mediaPending,questionsPending:pending.length>0,pendingQuestionIds,questionRoutes,notStarted,canResume});
    if(!state?.received)return;
    panel();view.getElementById('course-speed-setup').hidden=true;view.getElementById('include-started-wrap').hidden=true;view.getElementById('review-notice').open=false;
    view.getElementById('stop').hidden=false;view.getElementById('go').hidden=state.action!=='media'&&state.action!=='attention';
    if(state.action==='attention'){status('An assignment question still needs attention. Review it, then choose Go.');return;}
    if(state.action==='saved-list'){status('Pearson saved this assignment. Returning to the course assignment list…');view.getElementById('go').hidden=true;return;}
    if(state.action==='list'){status('Returning to the assignment list for the next assignment…');location.assign(state.listUrl);return;}
    if(state.action==='done'){status('Course run finished. Returning to the assignment list for your review summary…');view.getElementById('stop').hidden=true;location.assign(state.listUrl);return;}
    if(state.action==='complete'){await send('pearsonCourseComplete');await overviewReady();return;}
    if(state.action==='question'){
      if(!pending.length){status('No unanswered question was found.');return;}
      const questionId=String(pending[0].getAttribute('href')||pending[0].getAttribute('onclick')||'').match(/doExercise\((\d+)\)/i)?.[1];
      const homeworkId=new URLSearchParams(location.search).get('homeworkId');
      if(!questionId||!/^\d+$/.test(homeworkId||'')){status('Pearson did not provide a question route. Review this assignment.');return;}
      status('Opening the next unanswered question…');
      // The background opens a validated player tab: Pearson's embedded
      // doExercise only posts to the shell, which can leave navigation stalled.
      await openQuestion(questionId);
    }
  }
  async function gateReady(){
    // A visit can set Last Worked without earning any credit. The overview checks
    // the actual score and per-question results before deciding eligibility.
    const controls=[...document.querySelectorAll('a,button')].filter(visible);
    const start=controls.find(e=>/^Start$/i.test(clean(e.textContent)));
    const resume=controls.some(e=>/^Resume$/i.test(clean(e.textContent)));
    const firstQuestion=questionLinks()[0];
    const verifiedZero=unstartedWork(clean(document.getElementById('CurrentScore')?.textContent),[...document.querySelectorAll('li')].map(li=>clean(li.textContent)),questionLinks());
    const canStart=!resume&&(!!start||!!firstQuestion&&verifiedZero);
    const state=await send('pearsonCourseGate',{canStart,canResume:resume,requireQuestionRoutes:true});
    if(!state?.received)return;
    panel();
    if(state.action==='list'){status('Skipping started or unavailable work. Opening the next assignment…');location.assign(state.listUrl);}
    else if(state.action==='done'){status('Course run finished. Returning to the assignment list for your review summary…');location.assign(state.listUrl);}
    else if(state.action==='overview'){status('Checking this assignment and its question routes before starting…');location.assign(state.url);}
    else if(state.action==='start'){
      if(start){status('Opening this not-started assignment…');start.click();}
      else if(!resume&&firstQuestion){status('Opening the first question in this not-started assignment…');firstQuestion.click();}
      else status('Pearson did not show Start or an unanswered question link. Review this assignment.');
    }
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message?.type==='pearsonCourseProgress'){reply({received:true});status(message.text,message.progress);return;}
    if(message?.type==='pearsonCourseStopped'){reply({received:true});status('Course Auto stopped.');view.getElementById('stop').hidden=true;view.getElementById('go').hidden=false;return;}
    if(message?.type==='pearsonCourseReturnToList'&&(overview||gate||list)){
      let target;try{target=new URL(message.url);}catch{reply({received:false});return;}
      if(target.origin!==location.origin||!(target.pathname.toLowerCase()==='/student/doassignments.aspx'||/^\/courses\/\d+\/assignments\/?$/i.test(target.pathname))){reply({received:false});return;}
      reply({received:true});setTimeout(()=>location.assign(target.href),0);return;
    }
    if(!overview)return;
    if(message?.type==='pearsonCourseVerify'){if(String(message.assignmentId)!==new URLSearchParams(location.search).get('homeworkId')){reply({received:false});return;}reply({received:true});status('Checking Pearson’s saved assignment score…');setTimeout(()=>location.reload(),0);}
    if(message?.type==='pearsonCourseAttention'){reply({received:true});status(message.reason||'The question runner stopped. Review this assignment before continuing.');view.getElementById('go').hidden=false;}
  });
  if(embeddedCourse)window.addEventListener('message',event=>{
    if(event.source!==window.parent||!/^https:\/\/mylabmastering\.pearson\.com$/.test(event.origin)||event.data?.source!=='study-assistant-pearson-course-shell')return;
    if(event.data.type==='go'){if(view)view.getElementById('include-started').checked=event.data.includeStarted===true;if(event.data.pace&&view){view.getElementById('course-pace').value=event.data.pace.pacingMode;view.getElementById('course-human-speed').value=event.data.pace.humanSpeed;}if(view?.getElementById('ack-warning'))view.getElementById('ack-warning').checked=true;view?.getElementById('skip-pause')&&(view.getElementById('skip-pause').checked=!!event.data.skipReviewPause);const go=view?.getElementById('go');if(go)go.disabled=false;go?.click();}
    if(event.data.type==='stop')view?.getElementById('stop')?.click();
    if(event.data.type==='review')restoreReview(true).catch(error=>status(error.message));
    if(event.data.type==='dismissReview'&&reportId)send('pearsonCourseReportDismiss',{id:reportId}).catch(()=>{});
    if(event.data.type==='reviewAssignment'&&/^\d{1,12}$/.test(String(event.data.id||''))){status('Opening assignment for media review…');openAssignment(String(event.data.id)).catch(error=>status(error.message));}
  });
  document.addEventListener('click',event=>{if(event.composedPath().includes(view?.getElementById('course-attention-close'))){view.getElementById('course-attention').hidden=true;if(reportId)send('pearsonCourseReportDismiss',{id:reportId}).catch(()=>{});}});
  let attempts=0;
  const ready=async()=>{
    if(!document.body)return;
    if(list&&!document.querySelector('tr')||overview&&!document.querySelector('a[href*="doExercise"],a[onclick*="doExercise"],a[href*="doMedia"],a[onclick*="doMedia"]')||gate&&!document.querySelector('#content')){if(attempts++<40)setTimeout(ready,250);return;}
    try{if(list){panel();if(embeddedList)window.top.postMessage({source:'study-assistant-pearson-course',type:'ready',count:items().length},'*');await listReady();}else if(overview)await overviewReady();else await gateReady();}catch(error){status(error.message);}
  };
  ready();
})();
