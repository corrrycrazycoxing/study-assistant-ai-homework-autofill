/* Shared course queue chrome; filters, reports and navigation stay platform-owned. */
(() => {
  const css=':host{font:13px/1.45 system-ui;color:#edf1ff}*{box-sizing:border-box}[hidden]{display:none!important}.card{background:#141925;border:1px solid #6d7da5;border-radius:12px;box-shadow:0 7px 28px #0004}.card button{font:inherit;border:1px solid #627298;border-radius:7px;background:#5365ee;color:white;padding:7px 9px;cursor:pointer}.card button.secondary{background:#303c58}.card button:disabled{opacity:.45}.card progress{width:100%;height:8px;accent-color:#949fff}.card button:focus-visible{outline:2px solid #bdc8ff;outline-offset:3px}.study-course-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.study-course-heading h2{font-size:15px;margin:0}.study-course-body{max-height:50vh;overflow:auto}.study-course-summary{padding:0 12px 9px;font-size:12px;color:#b9c7e4}.study-course-summary p{margin:7px 0}.study-course-summary progress{display:block}';
  function decorate(root){
    if(root.getElementById('study-course-style'))return;
    const style=document.createElement('style');style.id='study-course-style';style.textContent=css;root.append(style);
    const card=root.querySelector('.card');if(!card)return;
    // The direct MyLab list has no shell disclosure. Give it the same compact
    // entry point as embedded MyLab and MindTap, without moving the report modal.
    if(!card.querySelector('.bar,.heading')){
      const heading=document.createElement('div');heading.className='study-course-heading';
      const title=card.querySelector('h2');if(title){title.textContent='Pearson Course Mode';heading.append(title);}
      const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';toggle.textContent='Open';toggle.setAttribute('aria-expanded','false');
      const body=document.createElement('div');body.className='study-course-body';body.hidden=true;body.id='study-course-options';toggle.setAttribute('aria-controls',body.id);
      for(const child of [...card.childNodes])body.append(child);heading.append(toggle);card.append(heading,body);
      toggle.onclick=()=>{body.hidden=!body.hidden;toggle.textContent=body.hidden?'Open':'Close';toggle.setAttribute('aria-expanded',String(!body.hidden));};
    }
    const summary=document.createElement('div');summary.className='study-course-summary';summary.innerHTML='<p role="status"></p><progress aria-label="Course assignments processed" hidden max="1" value="0"></progress>';
    const heading=card.querySelector('.bar,.heading,.study-course-heading');heading.after(summary);
    const label=summary.querySelector('p'),bar=summary.querySelector('progress');
    function update(){
      const source=root.getElementById('state')||root.getElementById('status'),text=source?.textContent||'Ready to scan assignments';if(label.textContent!==text)label.textContent=text;
      const progress=root.getElementById('course-queue-bar'),box=root.getElementById('course-queue-progress'),show=!!progress&&!box?.hidden;
      bar.hidden=!show;if(show){if(bar.max!==progress.max)bar.max=progress.max;if(bar.value!==progress.value)bar.value=progress.value;}
    }
    const observer=new MutationObserver(update);const status=root.getElementById('state')||root.getElementById('status');if(status)observer.observe(status,{childList:true,subtree:true,characterData:true});
    const progress=root.getElementById('course-queue-progress');if(progress)observer.observe(progress,{subtree:true,attributes:true,attributeFilter:['hidden','value','max'],childList:true,characterData:true});update();
  }
  function disclosure(toggle, body) {
    const render = () => {
      toggle.textContent = body.hidden ? 'Open' : 'Collapse';
      toggle.setAttribute('aria-expanded', String(!body.hidden));
    };
    toggle.setAttribute('aria-controls', body.id);
    toggle.onclick = () => { body.hidden = !body.hidden; render(); };
    render();
  }

  function canvasIntroduction(container) {
    const key = 'studyCanvasCourseIntro';
    const version = 4;
    let acknowledged = false;
    container.innerHTML = '<details open><summary>Course Auto warning and walkthrough</summary><p><strong>Review required.</strong> Course Auto can open eligible McGraw homework and enter AI-suggested answers. The Canvas course inventory scans active courses in the background without navigating your tab, starting attempts or entering answers. Use each course’s enable and type switches before starting a run. Choose homework, Canvas quizzes, or both; discussions and unsupported types stay excluded. If you include Canvas reading quizzes, it loads the matched notebook before starting the quiz timer. Source failures are saved and skipped on later runs. Use Retry saved issues to recheck saved failures for the selected courses and filters. You can also clear one saved issue in the inventory. Canvas Auto submits completed native quizzes after checking the whole question list and visible answers. It waits for Canvas’s submission results before cleanup and the next assignment. Incomplete or unsupported quizzes stop for review. Use Pause After Fill to review entries before continuing, or Stop to take over. It can make mistakes or skip work. Other assignments keep their documented manual final submission.</p><ol><li>Choose courses, or open a course’s Assignments list.</li><li>Choose a speed, started-work preference and due-date filter. Only past-due assignments excludes future and undated work. Leave both date filters off to include every due date.</li><li>Start the run. Use Stop at any time and check the review report for skipped work.</li></ol><button type="button" class="secondary">I understand</button><p role="status" hidden></p></details>';
    const details = container.querySelector('details');
    const button = container.querySelector('button');
    const status = container.querySelector('[role="status"]');
    function update(value) {
      const complete = value === version;
      if (acknowledged !== complete) details.open = !complete;
      acknowledged = complete;
      button.hidden = complete;
    }
    const ready = chrome.storage.local.get(key).then(data => update(data[key])).catch(() => {});
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[key]) update(changes[key].newValue);
    });
    button.onclick = async () => {
      await ready;
      button.disabled = true;
      try {
        await chrome.storage.local.set({[key]: version});
        update(version);
        status.hidden = true;
      } catch {
        status.hidden = false;
        status.textContent = 'Could not save your acknowledgement. Try again.';
      } finally {
        button.disabled = false;
      }
    };
    return async () => {
      await ready;
      if (acknowledged) return true;
      details.open = true;
      button.focus();
      return false;
    };
  }
  function typeSelection(homework,quiz,onChange=()=>{}){
    let revision=0;
    const get=()=>({homework:homework.checked,quiz:quiz.checked});
    function apply(value){if(!value)return;const types=StudyCanvasMcGrawCourse.workTypes(value);homework.checked=types.homework;quiz.checked=types.quiz;onChange();}
    for(const input of [homework,quiz])input.addEventListener('change',()=>{revision++;chrome.storage.local.set({canvasCourseTypeSelection:get()}).catch(()=>{});onChange();});
    chrome.storage.local.get('canvasCourseTypeSelection').then(data=>{if(!revision)apply(data.canvasCourseTypeSelection);}).catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.canvasCourseTypeSelection){revision++;apply(changes.canvasCourseTypeSelection.newValue);}});
    return get;
  }
  function dateSelection(skip,only,onChange=()=>{}){
    let revision=0;
    const get=()=>StudyCanvasMcGrawCourse.datePolicy({skipPastDue:skip.checked,onlyPastDue:only.checked});
    const apply=value=>{if(!value)return;const policy=StudyCanvasMcGrawCourse.datePolicy(value);skip.checked=policy.skipPastDue;only.checked=policy.onlyPastDue;onChange();};
    for(const input of [skip,only])input.addEventListener('change',()=>{
      revision++;if(input.checked)(input===skip?only:skip).checked=false;
      chrome.storage.local.set({canvasCourseDueSelection:get()}).catch(()=>{});onChange();
    });
    chrome.storage.local.get('canvasCourseDueSelection').then(data=>{if(!revision)apply(data.canvasCourseDueSelection);}).catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.canvasCourseDueSelection){revision++;apply(changes.canvasCourseDueSelection.newValue);}});
    return get;
  }
  function typeReport(container,items,selection){
    const key=JSON.stringify([items,selection]);if(container.__studyTypes===key)return;container.__studyTypes=key;
    const counts={};for(const item of items)counts[item.type]=(counts[item.type]||0)+1;
    const note=document.createElement('p');note.textContent=Object.entries(counts).map(([type,count])=>(StudyCanvasMcGrawCourse.typeNames[type]||'Unknown')+': '+count).join(' · ')||'No assignment types detected yet.';
    const list=document.createElement('ul');
    for(const item of items){const row=document.createElement('li'),supported=['quiz','homework'].includes(item.type);row.append(titleLink(item),document.createTextNode(' · '+(StudyCanvasMcGrawCourse.typeNames[item.type]||'Unknown')+' · '+(supported?(selection?.[item.type]?'selected type':'excluded type'):'unsupported; excluded')));list.append(row);}
    container.replaceChildren(note,list);
  }
  function inventory(container,source=()=>({}),onChange=()=>{}){
    container.innerHTML='<details open><summary>Canvas course inventory</summary><p data-inventory-status role="status">Loading saved inventory…</p><button type="button" data-inventory-scan>Scan all Canvas courses · read-only</button><button type="button" data-inventory-stop hidden>Stop scan</button><p>Background scan only reads course and assignment metadata. Enable courses and types below; Start Course Auto is a separate action. Discussions and unsupported types are never answered.</p><details data-inventory-issues hidden><summary>Saved source issues</summary><ul data-inventory-issue-list></ul></details><div data-inventory-courses></div></details>';
    const el=name=>container.querySelector('[data-inventory-'+name+']');let busy=false,last='',lastIssues='',latest=null;
    const send=(type,extra={})=>chrome.runtime.sendMessage({type,...source(),...extra});
    function render(data){
      latest=data;const catalog=data.catalog,scanning=catalog?.phase==='scanning';
      el('status').textContent=!catalog?'No inventory saved. Scan your active Canvas courses.':scanning?'Scanning in background · '+catalog.processed+' of '+catalog.total+' courses':catalog.error||'Inventory updated '+new Date(catalog.finishedAt||catalog.startedAt).toLocaleString()+' · '+catalog.courses.length+' courses';
      el('scan').disabled=scanning;el('stop').hidden=!scanning;
      const saved=Object.values(data.issueBank||{}).sort((a,b)=>b.savedAt-a.savedAt);
      const issueKey=JSON.stringify(saved);
      if(issueKey!==lastIssues){
        lastIssues=issueKey;el('issues').hidden=!saved.length;
        el('issue-list').replaceChildren(...saved.map(issue=>{
          const row=document.createElement('li');
          row.append(titleLink(issue),document.createTextNode(' · '+issue.reason));
          if(issue.readingUrl)row.append(document.createTextNode(' · '),titleLink({title:'Reading source',url:issue.readingUrl}));
          if(issue.notebookUrl)row.append(document.createTextNode(' · '),titleLink({title:'Notebook',url:issue.notebookUrl}));
          const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Clear issue & allow retry';
          retry.onclick=async()=>{
            retry.disabled=true;
            try{
              const result=await send('canvasCatalogIssueClear',{origin:data.origin,url:issue.url});
              if(!result?.received)throw Error(result?.error||'Could not clear this saved issue.');
              render(result);onChange(result);
            }catch(error){el('status').textContent=error.message;retry.disabled=false;}
          };
          row.append(document.createTextNode(' '),retry);
          return row;
        }));
      }
      const key=JSON.stringify([catalog?.courses,data.policies,data.selected,data.defaults]);if(key===last)return;last=key;const opened=new Set([...el('courses').querySelectorAll('details[data-course-url]')].filter(node=>node.open).map(node=>node.dataset.courseUrl));
      el('courses').replaceChildren(...(catalog?.courses||[]).map(course=>{
        const policy=data.policies[course.url],types=policy?.types||data.defaults,enabled=policy?policy.enabled:data.selected.includes(course.url),counts={};for(const item of course.items)counts[item.type]=(counts[item.type]||0)+1;
        const details=document.createElement('details'),heading=document.createElement('summary');details.dataset.courseUrl=course.url;details.open=opened.has(course.url);heading.textContent=course.title+' · '+(enabled?'enabled':'disabled')+' · '+course.items.length+' assignments'+(course.error?' · scan needs attention':'');details.append(heading);
        const enableLabel=document.createElement('label'),enable=document.createElement('input');enable.type='checkbox';enable.checked=enabled;enableLabel.style.display='block';enableLabel.append(enable,document.createTextNode(' Enable this course for Course Auto'));details.append(enableLabel);
        const controls={};for(const type of ['quiz','homework']){const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=types[type]===true;input.disabled=!(counts[type]>0);row.style.display='block';row.append(input,document.createTextNode(' '+StudyCanvasMcGrawCourse.typeNames[type]+' ('+(counts[type]||0)+')'));details.append(row);controls[type]=input;}
        const excluded=document.createElement('p');excluded.textContent=Object.entries(counts).filter(([type])=>!['quiz','homework'].includes(type)).map(([type,n])=>(StudyCanvasMcGrawCourse.typeNames[type]||'Unknown')+': '+n+' (excluded)').join(' · ');details.append(excluded);
        if(course.error){const warning=document.createElement('p');warning.textContent=course.error;details.append(warning);}
        const report=document.createElement('div');typeReport(report,course.items,types);details.append(report);

        const save=async()=>{const inputs=[enable,...Object.values(controls)];inputs.forEach(input=>input.disabled=true);try{const result=await send('canvasCatalogPolicy',{origin:data.origin,courseId:course.id,enabled:enable.checked,assignmentTypes:{homework:controls.homework.checked,quiz:controls.quiz.checked}});if(!result?.received)throw Error(result?.error||'Could not save course selection.');render(result);onChange(result);}catch(error){last='';el('status').textContent=error.message;await refresh();}};
        enable.onchange=save;for(const input of Object.values(controls))input.onchange=save;return details;
      }));
    }
    async function refresh(auto=false){if(busy)return latest;busy=true;try{const result=await send('canvasCatalogGet',{refreshIfStale:auto});if(!result?.received)throw Error(result?.error||'Canvas inventory is unavailable.');render(result);return result;}catch(error){el('status').textContent=error.message;}finally{busy=false;}}
    el('scan').onclick=async()=>{const result=await send('canvasCatalogScan');if(result?.received)render(result);else el('status').textContent=result?.error||'Could not start scan.';};
    el('stop').onclick=async()=>{const result=await send('canvasCatalogStop');if(result?.received)render(result);};
    return {refresh};
  }
  async function enabled(platform){const data=await chrome.storage.sync.get(['platformMode','featureSettings']);return StudyConfig.courseAllowed(platform,data);}
  function titleLink(item,onOpen){
    let href='';try{const url=new URL(item.url);if(url.protocol==='https:'&&!url.username&&!url.password)href=url.href;}catch{}
    const node=document.createElement(href||onOpen?'a':'span');node.textContent=item.title||'Assignment needing review';
    if(href||onOpen){node.href=href||'#';node.style.cssText='color:#aebfff;text-decoration:underline;cursor:pointer';if(onOpen)node.addEventListener('click',event=>{event.preventDefault();onOpen();});else{node.target='_blank';node.rel='noopener noreferrer';}}
    return node;
  }
  function linkReport(root){
    for(const row of root.querySelectorAll('li,.skipped-item')){
      const button=row.querySelector('button'),first=row.firstChild;if(!button||!first||first.nodeName==='A')continue;
      const text=first.textContent||'',title=text.split(' · ')[0];if(!title)continue;
      const link=titleLink({title},()=>button.click());first.replaceWith(link,document.createTextNode(text.slice(title.length)));
    }
  }
  globalThis.StudyCourseUI={decorate,disclosure,canvasIntroduction,typeSelection,dateSelection,typeReport,inventory,enabled,titleLink,linkReport};
})();
