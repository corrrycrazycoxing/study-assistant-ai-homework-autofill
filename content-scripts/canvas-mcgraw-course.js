/* Canvas list/detail UI for a user-started McGraw course queue. */
(() => {
  if(window!==window.top||(!StudyCanvasMcGrawCourse.entryUrl(location.href)&&!/^\/courses\/\d+\/assignments\/\d+\/?$/.test(location.pathname))||document.getElementById('study-canvas-mcgraw-course'))return;
  const C=StudyCanvasMcGrawCourse,send=(type,values={})=>chrome.runtime.sendMessage({type,...values});let run=null,busy=false,lastDetail='',stableDetail=0,lastScan='',stableScan=0,discovered=[],selected=new Set(),selectionLoaded=false,pickerKey='',catalog=null,catalogError='';const leases=new Set();
  const host=document.createElement('div');host.id='study-canvas-mcgraw-course';host.style.cssText='position:fixed;right:16px;bottom:18px;z-index:2147483600;width:315px;max-width:calc(100vw - 32px)';const root=host.attachShadow({mode:'open'});
  root.innerHTML='<style>:host{font:13px/1.45 system-ui;color:#edf1ff}[hidden]{display:none!important}section{background:#141925;border:1px solid #6d7da5;border-radius:12px;padding:12px;box-shadow:0 7px 28px #0004;max-height:60vh;overflow:auto}h2{font-size:15px;margin:0}p{overflow-wrap:anywhere}button{font:inherit;border:1px solid #627298;border-radius:7px;background:#5365ee;color:white;padding:7px 9px;margin:3px;cursor:pointer}button:disabled{opacity:.45}#stop{background:#693c4d}progress{width:100%;accent-color:#949fff}label.course-choice{display:block;margin:6px 0}#course-list{max-height:180px;overflow:auto}select{font:inherit}small{color:#b9c7e4}</style><section><h2>Canvas Course Auto</h2><p id="status" role="status">Choose courses or scan the assignments on this page.</p><progress id="progress" max="1" value="0" hidden></progress><div id="setup"><fieldset id="course-picker" hidden><legend>Courses to work through</legend><label class="course-choice"><input type="checkbox" id="all-courses"> Select all listed courses</label><div id="course-list"></div><p id="course-note"></p><button id="load-courses" type="button" hidden>View all courses</button></fieldset><label for="pace">Shared Auto speed</label> <select id="pace"><option value="normal">Instant Auto</option><option value="slow">Timed Auto</option><option value="human">Human pace</option></select> <select id="speed" aria-label="Human working speed" hidden><option value="faster">Faster</option><option value="typical" selected>Typical</option><option value="deliberate">Deliberate</option></select><label><input type="checkbox" id="started"> Include previously started Canvas and McGraw work</label><label><input type="checkbox" id="skip-past-due" checked> Skip past-due assignments</label><p><button id="start">Scan and start</button></p><small>Speed is shared with the other adapters. Uses the existing Canvas → McGraw homework workflow in each selected course. Quizzes and exams are skipped.</small></div><button id="stop" hidden>Stop course auto</button><button id="retry" hidden>Retry this assignment</button><button id="reviewed" hidden>I reviewed and saved this assignment · Continue</button><details id="issues" hidden><summary>Assignments needing review</summary><ul id="issue-list"></ul></details></section>';
  document.body.append(host);const el=id=>root.getElementById(id),clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  function renderCourses(){
    const hub=!!C.hubUrl(location.href);el('course-picker').hidden=!hub;
    if(!hub)return;
    const key=JSON.stringify(discovered);
    if(key!==pickerKey){
      pickerKey=key;
      el('course-list').replaceChildren(...discovered.map(course=>{
        const row=document.createElement('label');row.className='course-choice';const box=document.createElement('input');box.type='checkbox';box.value=course.url;box.checked=selected.has(course.url);
        box.onchange=()=>{if(box.checked)selected.add(course.url);else selected.delete(course.url);saveSelection();renderCourses();};row.append(box,document.createTextNode(' '+course.title));return row;
      }));
    }
    const count=discovered.filter(course=>selected.has(course.url)).length;
    el('all-courses').checked=discovered.length>0&&count===discovered.length;el('all-courses').indeterminate=count>0&&count<discovered.length;
    el('all-courses').disabled=!discovered.length;
    el('course-note').textContent=(discovered.length?count+' of '+discovered.length+' courses selected.':'No current courses found yet.')+(catalogError?' '+catalogError:'');
    el('start').textContent='Start selected courses';el('start').disabled=!count;
    el('load-courses').hidden=/^\/courses\/?$/.test(location.pathname);
  }
  async function saveSelection(){
    const {canvasCourseSelections={}}=await chrome.storage.local.get('canvasCourseSelections');
    await chrome.storage.local.set({canvasCourseSelections:{...canvasCourseSelections,[location.origin]:[...selected]}});
  }
  async function discover(){
    if(!C.hubUrl(location.href))return;
    if(!selectionLoaded){const {canvasCourseSelections={}}=await chrome.storage.local.get('canvasCourseSelections');selected=new Set((canvasCourseSelections[location.origin]||[]).filter(url=>C.courseUrl(url,location.href)));selectionLoaded=true;}
    if(catalog===null){
      catalog=[];
      try{
        const response=await fetch(location.origin+'/courses',{credentials:'same-origin',signal:AbortSignal.timeout(12000)});
        const url=new URL(response.url);if(!response.ok||url.origin!==location.origin||!/^\/courses\/?$/.test(url.pathname)||!response.headers.get('content-type')?.includes('text/html'))throw Error();
        const html=await response.text();if(html.length>3000000)throw Error();
        catalog=C.discoverCourses(new DOMParser().parseFromString(html,'text/html'),location.origin+'/courses',false);
      }catch{catalogError='Open All Courses if this list is incomplete.';}
    }
    discovered=C.courses([...catalog,...C.discoverCourses(document,location.href)].slice(0,500),location.href);renderCourses();
  }
  function assignmentItems(){
    return C.assignments([...document.querySelectorAll('a[href]')].filter(a=>a.getClientRects().length).map(a=>{
      const row=a.closest('li,tr,[data-assignment-id],.assignment')||a.parentElement,time=row?.querySelector('time[datetime]')?.getAttribute('datetime'),dueAt=time?Date.parse(time):null;
      const scored=/\b(?:submitted|graded)\b/i.test(row?.innerText||'')||/\b\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\s*(?:pts|points)\b/i.test(row?.innerText||'');
      return {title:clean(a.textContent),url:a.href,dueAt:Number.isFinite(dueAt)?dueAt:null,scored};
    }),location.href);
  }
  function render(){
    const active=run&&run.phase!=='done';el('setup').hidden=!!active||!C.entryUrl(location.href);el('stop').hidden=!active;el('reviewed').hidden=!['review','attention'].includes(run?.phase);el('retry').hidden=run?.phase!=='attention';
    el('reviewed').textContent=run?.phase==='attention'?'Skip this assignment · Continue':'I reviewed and saved this assignment · Continue';el('progress').hidden=!run;
    if(!run){el('status').textContent=C.hubUrl(location.href)?'Choose the courses you want Course Auto to work through.':'Ready to scan the assignments on this page.';renderCourses();return;}
    el('progress').max=run.phase==='scanning'?run.courses.length:run.items.length||1;el('progress').value=run.phase==='scanning'?run.scanIndex:run.index;
    const item=run.items[run.index],course=run.courses?.[run.scanIndex];
    const labels={scanning:'Scanning '+course?.title,list:'Checking the assignments list…',opening:'Opening '+item?.title,launching:'Waiting for the assignment provider to launch '+item?.title,training:run.trainingStatus||'Working through '+item?.title,player:'Opening the McGraw player…',starting:'Starting Auto in McGraw…',running:'Working on '+item?.title,review:'Review and save or submit the current assignment in McGraw before continuing.',attention:'Course Auto needs attention. Review the current assignment.',returning:'Returning to Canvas assignments…',done:'Course run finished.'};
    el('status').textContent=(labels[run.phase]||run.phase)+(run.phase==='scanning'?' · '+run.scanIndex+' of '+run.courses.length+' courses scanned':' · '+run.index+' of '+run.items.length+' assignments processed'+(item?.courseTitle?' · '+item.courseTitle:''));
    el('issues').hidden=!run.issues.length;el('issue-list').replaceChildren(...run.issues.map(issue=>{const li=document.createElement('li');li.textContent=issue.title+' · '+issue.reason;return li;}));renderCourses();
    if(globalThis.StudyCourseUI)el('issue-list').replaceChildren(...run.issues.map(issue=>{const li=document.createElement('li'),item=run.items.find(item=>item.title===issue.title);li.append(StudyCourseUI.titleLink({...issue,url:issue.url||item?.url}),document.createTextNode(' · '+issue.reason));return li;}));
  }
  async function refresh(){if(busy)return;busy=true;try{const state=await send('canvasCourseState');run=state?.run||null;await discover();render();if(!run)return;if(['scanning','opening','launching','player','starting'].includes(run.phase)&&Date.now()-run.updated>45000){await send('canvasCourseTimeout');return;}if(C.listUrl(location.href)&&run.phase==='scanning'){
      const items=assignmentItems(),text=document.body.innerText;
      const ready=items.length||document.querySelector('#assignments .ig-list,#assignment-list,.assignment-list,.ig-list')||/no assignments|no assignments in this group/i.test(text);
      if(!ready||[...document.querySelectorAll('[role="progressbar"],.loading')].some(e=>e.getClientRects().length)){lastScan='';stableScan=0;return;}
      const key=JSON.stringify(items);stableScan=key===lastScan?stableScan+1:1;lastScan=key;
      if(stableScan>=2)await send('canvasCourseScan',{items});
    }else if(C.listUrl(location.href)&&['list','returning'].includes(run.phase)){const next=await send('canvasCourseListReady');if(next?.open&&!next.navigating)location.assign(next.open);}else if(run.phase==='opening'&&C.assignmentUrl(location.href,run.listUrl)===run.items[run.index]?.url){
      const title=clean(document.querySelector('h1')?.textContent),text=document.body.innerText,canvasStatus=C.canvasStatus(text),dueAt=C.dueTime(text),detail={title,status:canvasStatus,dueAt};
      if(!C.detailReady(detail,run.items[run.index].title,run.skipPastDue)){lastDetail='';stableDetail=0;el('status').textContent='Waiting for Canvas to load the assignment score and due date…';return;}
      const key=JSON.stringify(detail);stableDetail=key===lastDetail?stableDetail+1:1;lastDetail=key;
      if(stableDetail>=2)await send('canvasCourseDetail',{title,canvasStatus,dueAt});
    }else if(run.phase==='review'&&C.assignmentUrl(location.href,run.listUrl)===run.items[run.index]?.url)await send('canvasCourseVerifyCanvas',{canvasStatus:C.canvasStatus(document.body.innerText)});}catch(error){el('status').textContent=error.message||'Course Auto lost its connection.';}finally{busy=false;}}
  el('pace').onchange=()=>{el('speed').hidden=el('pace').value!=='human';};
  chrome.storage.sync.get('pacingSettings').then(({pacingSettings={}})=>{if(['normal','slow','human'].includes(pacingSettings.pacingMode))el('pace').value=pacingSettings.pacingMode;if(['faster','typical','deliberate'].includes(pacingSettings.humanSpeed))el('speed').value=pacingSettings.humanSpeed;el('pace').onchange();}).catch(()=>{});
  async function startCourse(){
    el('start').disabled=true;
    try{
      const {platformMode='auto',pacingSettings={}}=await chrome.storage.sync.get(['platformMode','pacingSettings']);if(platformMode!=='auto')throw Error('Choose Automatic platform mode to use Canvas with McGraw.');
      const options={includeStarted:el('started').checked,skipPastDue:el('skip-past-due').checked};
      if(C.hubUrl(location.href)){await discover();options.courses=discovered.filter(course=>selected.has(course.url));if(!options.courses.length)throw Error('Check at least one course to work through.');await saveSelection();}
      else if(C.listUrl(location.href))options.items=assignmentItems();
      else throw Error('Open the Canvas dashboard, Courses page or assignments list first.');
      await chrome.storage.sync.set({pacingSettings:{...pacingSettings,pacingMode:el('pace').value,humanSpeed:el('speed').value}});
      const result=await send('canvasCourseStart',options);if(!result?.received)throw Error(result?.error||'Could not start Course Auto.');run=result.run;render();await refresh();return {received:true};
    }catch(error){el('status').textContent=error.message;return {received:false,error:error.message};}finally{el('start').disabled=false;renderCourses();}
  }
  el('all-courses').onchange=()=>{for(const course of discovered){if(el('all-courses').checked)selected.add(course.url);else selected.delete(course.url);}pickerKey='';saveSelection();renderCourses();};
  el('load-courses').onclick=()=>{
    const links=[...document.querySelectorAll('a[href]')].filter(a=>{try{const u=new URL(a.href);return u.origin===location.origin&&/^\/courses\/?$/.test(u.pathname);}catch{return false;}});
    location.assign(links[0]?.href||location.origin+'/courses');
  };
  el('start').onclick=startCourse;
  el('stop').onclick=async()=>{const result=await send('canvasCourseStop');if(result?.received)await refresh();else el('status').textContent=result?.error||'Could not stop Course Auto.';};
  el('retry').onclick=async()=>{const result=await send('canvasCourseRetry');if(result?.reload)location.reload();else el('status').textContent=result?.error||'Could not retry.';};
  el('reviewed').onclick=async()=>{const result=await send('canvasCourseReviewed');if(!result?.received)el('status').textContent=result?.error||'Could not continue.';};
  chrome.runtime.onConnect.addListener(port=>{if(port.name!=='study-canvas-course-lease'||port.sender?.id!==chrome.runtime.id||port.sender?.url&&!port.sender.url.startsWith(chrome.runtime.getURL('sidepanel/')))return;leases.add(port);host.style.display='none';port.onDisconnect.addListener(()=>{leases.delete(port);if(!leases.size)host.style.display='';});});
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message.type==='canvasCoursePreventVerify'&&sender.id===chrome.runtime.id){
      const frame=document.querySelector('iframe[title="Tool content"]'),title=clean(document.querySelector('h1')?.textContent);
      let valid=false;try{const src=new URL(frame?.src||'',location.href);valid=src.origin===location.origin&&/^\/courses\/\d+\/assignments\/\d+\/tool_launch\/?$/.test(src.pathname)&&frame.getClientRects().length>0;}catch{}
      reply(valid&&title?{received:true,title}:{received:false});return;
    }
    if(message.type==='canvasCoursePanelProbe'&&sender.id===chrome.runtime.id){reply({received:true,status:el('status').textContent,hub:!!C.hubUrl(location.href),courses:discovered,selected:[...selected]});return;}
    if(message.type!=='canvasCoursePanelControl'||sender.id!==chrome.runtime.id||sender.tab||sender.url&&!sender.url.startsWith(chrome.runtime.getURL('sidepanel/'))&&!sender.url.startsWith(chrome.runtime.getURL('background/')))return;
    if(message.action==='courses'&&C.hubUrl(location.href)&&(!run||run.phase==='done')){el('load-courses').click();reply({received:true});return;}
    if(message.action==='start'&&C.entryUrl(location.href)&&(!run||run.phase==='done')){const o=message.options||{};if(!['normal','slow','human'].includes(o.pace)||!['faster','typical','deliberate'].includes(o.speed)||typeof o.started!=='boolean'||typeof o.skipPastDue!=='boolean'){reply({received:false,error:'Invalid course options.'});return;}if(C.hubUrl(location.href)){if(!Array.isArray(o.courses)||o.courses.some(url=>!discovered.some(c=>c.url===url))){reply({received:false,error:'Refresh the course list and choose courses again.'});return;}selected=new Set(o.courses);pickerKey='';}el('pace').value=o.pace;el('speed').value=o.speed;el('started').checked=o.started;el('skip-past-due').checked=o.skipPastDue;startCourse();reply({received:true});return;}else if(message.action==='retry'&&run?.phase==='attention'){el('retry').click();reply({received:true});}else if(message.action==='stop'){el('stop').click();reply({received:true});}else if(message.action==='reviewed'&&['review','attention'].includes(run?.phase)){el('reviewed').click();reply({received:true});}else reply({received:false,error:'Course action is unavailable.'});
  });
  setInterval(refresh,1800);refresh();
})();
