// Navigation for homework/lesson assignments. Pending media is reported separately.
(() => {
  const path=location.pathname.toLowerCase();
  const list=path==='/student/doassignments.aspx'||/^\/courses\/\d+\/assignments\/?$/i.test(path),overview=path==='/student/overviewhomework.aspx',gate=path==='/student/dohomework.aspx';
  if(!list&&!overview&&!gate)return;
  const embeddedList=list&&window.top!==window;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const visible=e=>e?.getClientRects().length>0;
  const send=(type,more={})=>chrome.runtime.sendMessage({type,...more});
  const openAssignment=async id=>new Promise((resolve,reject)=>{
    const token=crypto.randomUUID();
    const timeout=setTimeout(()=>{document.removeEventListener('mylab-assistant-course-open-result',receive);reject(Error('Pearson did not open this assignment. Open it manually.'));},2500);
    function receive(event){let data;try{data=JSON.parse(event.detail);}catch{return;}if(data.token!==token)return;clearTimeout(timeout);document.removeEventListener('mylab-assistant-course-open-result',receive);data.ok?resolve():reject(Error(data.error||'Pearson could not open this assignment.'));}
    document.addEventListener('mylab-assistant-course-open-result',receive);
    document.dispatchEvent(new CustomEvent('mylab-assistant-course-open-request',{detail:JSON.stringify({token,id})}));
  });
  const eligible=text=>/^(?:Lesson Section|HW Section|Homework)(?=\b|\d)/i.test(text)&&!/(?:practice\s+exam|\bexam\b|\btest\b|\bquiz\b)/i.test(text);
  const rows=()=>[...document.querySelectorAll('tr')].flatMap(row=>[...row.querySelectorAll('a[href],a[onclick]')].filter(visible).map(link=>({link,title:clean(link.textContent),key:String(link.getAttribute('href')||link.getAttribute('onclick')||'').slice(0,600),row}))).filter(x=>eligible(x.title)&&/^javascript:doHomework\(\d+,/i.test(x.key));
  const items=()=>rows();
  function parseScore(text){const matches=[...String(text||'').matchAll(/(\d+(?:\.\d+)?)\s*%/g)];return matches.length?Number(matches.at(-1)[1]):null;}
  async function readScore(entry){
    const id=entry.key.match(/^javascript:doHomework\((\d+),/i)?.[1];if(!id)return null;
    const cell=document.getElementById('H_'+id+'_IVF_2_False');
    const read=()=>parseScore(cell?.innerText);
    const existing=read();if(existing!==null)return existing;
    const scoreLink=[...entry.row.querySelectorAll('a[href*="scoreCallBack"]')].find(visible);if(!scoreLink)return null;
    scoreLink.click();
    for(let i=0;i<30;i++){const score=read();if(score!==null)return score;await new Promise(resolve=>setTimeout(resolve,100));}
    return null;
  }
  const scored=(link)=>{const row=link.closest('li')||link.closest('p')||link.closest('tr');const text=clean(row?.textContent||'');const m=text.match(/\((\d+)\s*\/\s*(\d+)\)/);return m?{earned:Number(m[1]),possible:Number(m[2])}:null;};
  const questionLinks=()=>[...document.querySelectorAll('a[href*="doExercise"],a[onclick*="doExercise"]')].filter(visible);
  const mediaLinks=()=>[...document.querySelectorAll('a[href*="doMedia"],a[onclick*="doMedia"]')].filter(visible);
  let host,view,busy=false;
  function panel(){
    if(host)return view;
    host=document.createElement('div');host.id='study-pearson-course';
    host.style.cssText='position:fixed;right:18px;bottom:20px;z-index:2147483600;width:300px;max-width:calc(100vw - 36px)';
    if(embeddedList)host.style.display='none';
    view=host.attachShadow({mode:'open'});
    view.innerHTML='<style>:host{font:13px/1.45 system-ui;color:#e8edff}section{background:#10151f;border:1px solid #6b7bac;border-radius:12px;box-shadow:0 8px 30px #0005;padding:14px}h2{font-size:16px;margin:0 0 4px}p{margin:6px 0 10px;color:#b9c7e4}button{font:inherit;background:#5264ff;color:white;border:0;border-radius:7px;padding:8px 12px;cursor:pointer;margin:5px 6px 0 0}button.secondary{background:#30394d}button:disabled{opacity:.45}label{display:block;margin:8px 0}small{display:block;color:#9faeca;margin-top:8px}.attention{position:fixed;inset:0;background:#050811d9;z-index:2147483647;display:grid;place-items:center;padding:20px}.attention[hidden]{display:none}.dialog{width:min(680px,100%);max-height:85vh;overflow:auto;background:#171f33;border:2px solid #8496ff;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0009}.dialog h2{font-size:24px}.items{padding-left:22px}.items li{margin:10px 0}.reason{display:block;color:#bdc9e2}</style><section><h2>Full Course Mode</h2><p id="state">Checking available homework…</p><label id="pace"><input id="skip-pause" type="checkbox"> Continue without review pauses</label><button id="go">Go through homework &amp; lessons</button><button id="stop" class="secondary" hidden>Stop course run</button><small>Only confirmed zero-score homework or lessons are opened, using Start or the first question when Pearson offers that route. Scored, resumed or unclear items stay untouched. Assignments with incomplete required media stay pending for review while other eligible work continues. Uses Pearson Save between assignments; final submission stays yours.</small></section><div class="attention" id="course-attention" hidden><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="course-attention-title"><h2 id="course-attention-title">Manual review needed</h2><p id="course-attention-summary"></p><div id="course-attention-items"></div><button id="course-attention-close" class="secondary">Close</button></section></div>';
    view.getElementById('go').onclick=async()=>{const button=view.getElementById('go');if(busy)return;busy=true;button.disabled=true;try{if(list){const available=items();if(!available.length)throw Error('No available homework or lesson links are visible.');const assignments=[],skippedAssignments=[];for(const [index,entry] of available.entries()){status('Checking score '+(index+1)+' of '+available.length+': '+entry.title);const score=await readScore(entry),assignmentId=entry.key.match(/^javascript:doHomework\((\d+),/i)?.[1]||'';if(score===0)assignments.push({title:entry.title,key:entry.key});else skippedAssignments.push({title:entry.title,assignmentId,reason:score===null?'Score could not be confirmed; not opened':'Already has a score'});}if(!assignments.length){status('No confirmed 0% homework or lesson was found. Nothing was opened.');showReview([],skippedAssignments);return;}const result=await send('pearsonCourseStart',{assignments,skippedAssignments,skipReviewPause:view.getElementById('skip-pause').checked});if(!result?.received)throw Error(result?.error||'Could not start.');await listReady();}else await overviewReady();}catch(error){status(error.message);}finally{busy=false;button.disabled=false;}};
    view.getElementById('stop').onclick=async()=>{await send('pearsonCourseStop').catch(()=>{});status('Stopped.');view.getElementById('go').hidden=false;view.getElementById('stop').hidden=true;view.getElementById('pace').hidden=!list;};
    document.body.append(host);return view;
  }
  const status=text=>{panel().getElementById('state').textContent=text;if(embeddedList)window.top.postMessage({source:'study-assistant-pearson-course',type:'status',text,count:items().length},'*');};
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
    if(!state?.received){status(items().length+' clickable homework/lesson assignments. Go checks each one and runs only those Pearson shows as not started.');return;}
    view.getElementById('pace').hidden=true;
    if(state.phase==='done'){
      status('Course run finished. Review the course scores.');view.getElementById('go').hidden=true;view.getElementById('stop').hidden=true;
      const questions=state.skippedQuestions||[],assignments=state.skippedAssignments||[],media=state.pendingMediaAssignments||[];
      showReview(questions,assignments,media);
      return;
    }
    view.getElementById('stop').hidden=false;view.getElementById('go').hidden=true;
    if(state.phase!=='list'){status('Working on assignment '+(state.index+1)+' of '+state.total+'.');return;}
      const entry=rows().find(x=>x.title===state.title&&x.key===state.key);
    if(!entry){status('Cannot find “'+state.title+'” on this page. Stop and review the assignment list.');return;}
    const assignmentId=entry.key.match(/^javascript:doHomework\((\d+),/i)?.[1];
    if(!assignmentId){status('Pearson did not provide an assignment ID for “'+entry.title+'”.');return;}
    status('Opening '+(state.index+1)+' of '+state.total+': '+entry.title);
    try{await openAssignment(assignmentId);}catch(error){status(error.message);view.getElementById('go').hidden=false;view.getElementById('stop').hidden=true;}
  }
  async function overviewReady(){
    const score=clean(document.getElementById('CurrentScore')?.textContent||'');
    const media=mediaLinks(),questions=questionLinks();
    const counts=[...document.querySelectorAll('li')].map(li=>clean(li.textContent));
    const noScoredWork=['Scored','Correct','Partial Credit','Incorrect'].every(label=>counts.includes(label+': 0'));
    const notStarted=/^0%\s*\(0\s+points\s+out\s+of\s+\d+\)/i.test(score)&&noScoredWork&&questions.length>0&&questions.every(link=>scored(link)?.earned===0);
    const mediaPending=media.some(link=>{const score=scored(link);return !score||score.earned<score.possible;});
    const pending=questions.filter(link=>{const score=scored(link);return !score||score.earned<score.possible;});
    const pendingQuestionIds=pending.map(link=>String(link.getAttribute('href')||link.getAttribute('onclick')||'').match(/doExercise\((\d+)\)/i)?.[1]).filter(Boolean);
    const state=await send('pearsonCourseOverview',{mediaPending,questionsPending:pending.length>0,pendingQuestionIds,notStarted});
    if(!state?.received)return;
    panel();
    view.getElementById('stop').hidden=false;view.getElementById('go').hidden=state.action!=='media'&&state.action!=='attention';
    if(state.action==='attention'){status('An assignment question still needs attention. Review it, then choose Go.');return;}
    if(state.action==='saved-list'){status('Pearson saved this assignment. Returning to the course assignment list…');view.getElementById('go').hidden=true;return;}
    if(state.action==='list'){status('Opening the next not-started assignment…');location.assign(state.listUrl);return;}
    if(state.action==='done'){status('Course run finished. Returning to the assignment list for your review summary…');view.getElementById('stop').hidden=true;location.assign(state.listUrl);return;}
    if(state.action==='complete'){await send('pearsonCourseComplete');await overviewReady();return;}
    if(state.action==='question'){
      if(!pending.length){status('No unanswered question was found.');return;}
      const questionId=String(pending[0].getAttribute('href')||pending[0].getAttribute('onclick')||'').match(/doExercise\((\d+)\)/i)?.[1];
      const homeworkId=new URLSearchParams(location.search).get('homeworkId');
      if(!questionId||!/^\d+$/.test(homeworkId||'')){status('Pearson did not provide a question route. Review this assignment.');return;}
      status('Opening the next unanswered question…');
      const destination=new URL('/Student/PlayerHomework.aspx',location.href);
      destination.searchParams.set('homeworkId',homeworkId);
      destination.searchParams.set('questionId',questionId);
      destination.searchParams.set('flushed','false');
      location.assign(destination.href);
    }
  }
  async function gateReady(){
    // A visit can set Last Worked without earning any credit. The overview checks
    // the actual score and per-question results before deciding eligibility.
    const controls=[...document.querySelectorAll('a,button')].filter(visible);
    const start=controls.find(e=>/^Start$/i.test(clean(e.textContent)));
    const resume=controls.some(e=>/^Resume$/i.test(clean(e.textContent)));
    const firstQuestion=questionLinks()[0];
    const canStart=!!start||(!resume&&!!firstQuestion);
    const state=await send('pearsonCourseGate',{canStart});
    if(!state?.received)return;
    panel();
    if(state.action==='list'){status('Skipping started or unavailable work. Opening the next assignment…');location.assign(state.listUrl);}
    else if(state.action==='done'){status('Course run finished. Returning to the assignment list for your review summary…');location.assign(state.listUrl);}
    else if(state.action==='start'){
      if(start){status('Opening this not-started assignment…');start.click();}
      else if(!resume&&firstQuestion){status('Opening the first question in this not-started assignment…');firstQuestion.click();}
      else status('Pearson did not show Start or an unanswered question link. Review this assignment.');
    }
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(!overview)return;
    if(message?.type==='pearsonCourseVerify'){reply({received:true});location.reload();}
    if(message?.type==='pearsonCourseAttention'){reply({received:true});status(message.reason||'The question runner stopped. Review this assignment before continuing.');view.getElementById('go').hidden=false;}
  });
  if(embeddedList)window.addEventListener('message',event=>{
    if(event.source!==window.parent||!/^https:\/\/mylabmastering\.pearson\.com$/.test(event.origin)||event.data?.source!=='study-assistant-pearson-course-shell')return;
    if(event.data.type==='go'){view?.getElementById('skip-pause')&&(view.getElementById('skip-pause').checked=!!event.data.skipReviewPause);view?.getElementById('go')?.click();}
    if(event.data.type==='stop')view?.getElementById('stop')?.click();
    if(event.data.type==='reviewAssignment'&&/^\d{1,12}$/.test(String(event.data.id||''))){status('Opening assignment for media review…');openAssignment(String(event.data.id)).catch(error=>status(error.message));}
  });
  document.addEventListener('click',event=>{if(event.composedPath().includes(view?.getElementById('course-attention-close'))){view.getElementById('course-attention').hidden=true;}});
  let attempts=0;
  const ready=async()=>{
    if(!document.body)return;
    if(list&&!document.querySelector('tr')||overview&&!document.querySelector('a[href*="doExercise"],a[onclick*="doExercise"],a[href*="doMedia"],a[onclick*="doMedia"]')||gate&&!document.querySelector('#content')){if(attempts++<40)setTimeout(ready,250);return;}
    try{if(list){panel();if(embeddedList)window.top.postMessage({source:'study-assistant-pearson-course',type:'ready',count:items().length},'*');await listReady();}else if(overview)await overviewReady();else await gateReady();}catch(error){status(error.message);}
  };
  ready();
})();
