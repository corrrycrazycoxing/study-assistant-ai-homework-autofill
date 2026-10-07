// Launcher and conservative queue scan for the MindTap course outline.
(() => {
  if(window.top!==window||location.origin!=='https://ng.cengage.com'||location.pathname!=='/static/nb/ui/evo/index.html'||document.getElementById('study-mindtap-course'))return;
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const send=(type,more={})=>chrome.runtime.sendMessage({type,...more});
  let host,ui,busy=false,state=null,expanded=false,visibilityTimer=0;
  const paceSettings={...StudyConfig.defaults.mindtap};
  const paceControls=StudyPacing.create(()=>paceSettings,null,'mindtap');
  const noticeKey='study-mindtap-course-notice-'+(new URLSearchParams(location.search).get('deploymentId')||'course');
  const observedRoots=new WeakSet();
  const visibilityObserver=new MutationObserver(()=>{
    observeOutlineRoots(document.documentElement);
    clearTimeout(visibilityTimer);
    visibilityTimer=setTimeout(syncVisibility,60);
  });
  function observeOutlineRoots(root){
    if(!root||observedRoots.has(root))return;
    observedRoots.add(root);visibilityObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-selected','aria-hidden','hidden']});
    for(const element of root.querySelectorAll?.('*')||[])if(element.shadowRoot)observeOutlineRoots(element.shadowRoot);
  }
  if(document.documentElement)observeOutlineRoots(document.documentElement);
  function mount(){
    if(host?.isConnected)return ui;
    host=document.createElement('div');host.id='study-mindtap-course';host.hidden=true;host.style.cssText='position:fixed;right:18px;bottom:20px;z-index:2147483600;width:310px;max-width:calc(100vw - 36px)';
    ui=host.attachShadow({mode:'open'});
    ui.innerHTML='<style>:host{font:13px/1.45 system-ui;color:#e8edff}.card{background:#10151f;border:1px solid #6b7bac;border-radius:12px;box-shadow:0 8px 30px #0005;padding:12px}.card[hidden]{display:none}.heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.heading h2{font-size:16px;margin:0}.heading button{margin:0}p{margin:6px 0 10px;color:#b9c7e4}.notice{margin:10px 0;padding:10px;border:1px solid #b88236;border-radius:9px;background:#2a261f;color:#f2d69a}.notice[hidden]{display:none}.notice strong{display:block;margin-bottom:4px;color:#ffd98b}.notice p{margin:0;color:#e7d8b7}button{font:inherit;background:#5264ff;color:white;border:0;border-radius:7px;padding:8px 11px;cursor:pointer;margin:5px 6px 0 0}button.secondary{background:#30394d}button:disabled{opacity:.45}small{display:block;color:#9faeca;margin-top:8px}.section-options{display:grid;gap:5px;margin:8px 0}.section-options label{display:block}.skipped-list{display:grid;gap:8px;margin:12px 0}.skipped-item{border:1px solid #47536f;border-radius:9px;padding:10px}.veil{position:fixed;inset:0;background:#050811d9;z-index:2147483647;display:grid;place-items:center;padding:20px}.veil[hidden]{display:none}.dialog{width:min(640px,100%);max-height:85vh;overflow:auto;background:#171f33;border:2px solid #8496ff;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0009}.dialog h2{font-size:24px}</style><section class="card"><div class="heading"><h2>MindTap Course Mode</h2><button id="toggle" class="secondary" aria-expanded="false">Open</button></div><div id="body" hidden><aside id="notice" class="notice" role="note" aria-label="Course mode warning"><strong>Review required</strong><p>Course Mode opens activities MindTap marks Not started by default. You can opt in to in-progress work, which may contain saved answers. It may miss activities or stop when a question needs attention. Check each assignment’s results and completion status in MindTap, and review and submit each assignment yourself.</p><button id="ack-notice" class="secondary">Got it</button></aside><p id="state">Checking the course outline…</p><fieldset class="section-options"><legend>Activity sections</legend><label><input type="checkbox" data-category="apply" checked> Apply It · grade-counting work</label><label><input type="checkbox" data-category="study"> Study It · practice assessments</label><label><input type="checkbox" data-category="learn"> Learn It · practice assessments</label><label><input type="checkbox" data-category="other"> Other sections · grade-counting or practice assessments</label></fieldset><label><input type="checkbox" id="include-in-progress"> Allow in-progress assignments (may contain saved work)</label><label><input id="skip-pause" type="checkbox"> Skip per-question review pauses (assignment review still required)</label><div><button id="go">Go through selected assignments</button><button id="stop" class="secondary" hidden>Stop</button><button id="continue" hidden>Continue after review</button></div><small>Only visible assessments MindTap marks Not started are opened by default. Select Allow in-progress assignments to include work that may already contain answers; a confirmation will appear first. Apply It includes only work that counts toward your grade. Other sections can include explicit practice assessments when selected. Reading/media, quiz, test and exam activities stay excluded. Review and submit each assignment yourself before continuing.</small></div></section><div class="veil" id="veil" hidden><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="title"><h2 id="title">Assignment needs review</h2><p id="summary"></p><p id="reason"></p><div class="skipped-list" id="skipped-items"></div><button id="close" class="secondary">Close</button><button id="next">Continue to next assignment</button><button id="finish" class="secondary" hidden>Finish</button></section></div>';
    document.body.append(host);
    ui.getElementById('toggle').onclick=()=>setExpanded(!expanded);
    const acknowledgeNotice=()=>{ui.getElementById('notice').hidden=true;try{sessionStorage.setItem(noticeKey,'1');}catch{}};
    try{ui.getElementById('notice').hidden=sessionStorage.getItem(noticeKey)==='1';}catch{}
    ui.getElementById('ack-notice').onclick=acknowledgeNotice;
    ui.querySelectorAll('input').forEach(input=>input.addEventListener('change',acknowledgeNotice));
    ui.getElementById('go').onclick=start;
    ui.getElementById('stop').onclick=async()=>{await send('mindtapCourseStop');state=null;render('Stopped.');};
    ui.getElementById('continue').onclick=async()=>{const r=await send('mindtapCourseContinue');if(!r?.received)render(r?.error||'Could not continue.');else await refresh();};
    ui.getElementById('next').onclick=async()=>{ui.getElementById('veil').hidden=true;const r=await send('mindtapCourseContinue');if(!r?.received){render(r?.error||'Could not continue.');return;}await refresh();};
    ui.getElementById('finish').onclick=async()=>{ui.getElementById('veil').hidden=true;await send('mindtapCourseStop');state=null;render('Course run finished. Review the listed skipped work manually.');};
    ui.getElementById('close').onclick=()=>ui.getElementById('veil').hidden=true;
    ui.getElementById('skipped-items').addEventListener('click',event=>{const button=event.target.closest('button[data-reopen]');if(!button)return;const target=StudyMindTapCourse.queryAll('button[id^="activity-heading-"],[role="button"][id^="activity-heading-"]').find(item=>item.id==='activity-heading-'+button.dataset.reopen&&item.getClientRects().length&&!item.disabled);if(!target){status('That skipped activity is not visible in the outline. Expand its section and try again.');return;}ui.getElementById('veil').hidden=true;target.click();});
    setExpanded(false);
    return ui;
  }
  function setExpanded(value){
    expanded=!!value;const root=mount();root.getElementById('body').hidden=!expanded;const toggle=root.getElementById('toggle');toggle.textContent=expanded?'Close':'Open';toggle.setAttribute('aria-expanded',String(expanded));
    syncVisibility();
  }
  function syncVisibility(){
    if(StudyMindTapCourse.hasActiveAssignment(document))paceControls.attachControls(document.body);else paceControls.hideControls();
    if(!host)return;const outline=StudyMindTapCourse.hasOutline(document),review=['review','done'].includes(state?.phase);host.hidden=!outline&&!review;const card=ui?.querySelector('.card');if(card)card.hidden=!outline;
  }
  const status=text=>{mount().getElementById('state').textContent=text;};
  function render(text){
    const root=mount();if(text)status(text);
    const running=state&&['opening','running','review'].includes(state.phase);
    root.getElementById('go').hidden=!!running;root.getElementById('stop').hidden=!running;root.getElementById('continue').hidden=state?.phase!=='review';
    if(state?.phase==='done'){root.getElementById('go').hidden=true;root.getElementById('stop').hidden=true;}
    syncVisibility();
  }
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function emptyScanSummary(items,categories,includeInProgress){
    const counts={status:0,section:0,gradeable:0,visible:0,assessment:0};
    for(const item of items){
      if(/^not started$/i.test(item.status||'')||(includeInProgress&&/^in progress$/i.test(item.status||'')))counts.status++;
      if(categories.includes(item.category))counts.section++;
      if(item.gradeable===true)counts.gradeable++;
      if(item.visible!==false)counts.visible++;
      if(item.assessment!==false)counts.assessment++;
    }
    return `Found ${items.length} activities, but none passed the filters. Scanner checks: ${counts.status} have an eligible status, ${counts.section} are in selected sections, ${counts.gradeable} count toward a grade, ${counts.visible} are visible, and ${counts.assessment} are recognized as assessments. No activity was opened.`;
  }
  function renderSkipped(items=[]){const list=mount().getElementById('skipped-items');list.replaceChildren();for(const item of items){const card=document.createElement('div');card.className='skipped-item';const label=document.createElement('strong');label.textContent=item.title||'Assignment needing attention';const reason=document.createElement('p');reason.textContent=item.reason||'Needs manual review.';card.append(label,reason);if(/^\d{1,16}$/.test(String(item.id||''))){const button=document.createElement('button');button.className='secondary';button.dataset.reopen=String(item.id);button.textContent='Open this assignment';card.append(button);}list.append(card);}list.hidden=!items.length;}
  async function prepareOutline(){
    const outline=StudyMindTapCourse.byId('outlineViewPane',document);
    if(outline&&outline.getAttribute('aria-selected')!=='true'){outline.click();await wait(350);}
    const expand=StudyMindTapCourse.queryAll('button,[role="button"]',document).find(button=>/Expand All Folders/i.test(clean(button.innerText||button.textContent||button.getAttribute('aria-label'))));
    if(expand){expand.click();await wait(500);}
  }
  function outlineHint(){return StudyMindTapCourse.hasOutline(document)?'Course outline detected. Choose the activity sections you want to scan.':'This is an assignment view, not the MindTap course outline. Return to the course activity list to scan assignments.';}
  async function start(){
    if(busy)return;busy=true;const button=mount().getElementById('go');button.disabled=true;
    ui.getElementById('notice').hidden=true;try{sessionStorage.setItem(noticeKey,'1');}catch{}
    try{
      await prepareOutline();
      const all=StudyMindTapCourse.scan(document);
      if(!StudyMindTapCourse.hasOutline(document)){render('This is an assignment view, not the MindTap course outline. Return to the course activity list to scan assignments.');return;}
      const selectedCategories=[...mount().querySelectorAll('[data-category]:checked')].map(input=>input.dataset.category),includeInProgress=mount().getElementById('include-in-progress').checked,items=all.filter(item=>StudyMindTapCourse.eligible(item,selectedCategories,{includeInProgress})).map(({id,title,status,gradeable,practice,category,visible,excluded,assessment})=>({id,title,status,gradeable,practice,category,visible,excluded,assessment}));
      if(!items.length){render(emptyScanSummary(all,selectedCategories,includeInProgress));return;}
      const inProgressCount=items.filter(item=>/^in progress$/i.test(item.status||'')).length;
      if(includeInProgress&&inProgressCount&&!window.confirm(`Include ${inProgressCount} in-progress assignment${inProgressCount===1?'':'s'}? These may contain saved work. Course Mode will fill supported unanswered fields and preserve existing answers. Continue?`)){render('No assignments started. In-progress work was not included.');return;}
      state=await send('mindtapCourseStart',{assignments:items,selectedCategories,includeInProgress,skipReviewPause:mount().getElementById('skip-pause').checked});
      if(!state?.received)throw Error(state?.error||'Could not start MindTap Course Mode.');
      setExpanded(true);await refresh();
    }catch(error){render(error.message);}finally{busy=false;button.disabled=false;}
  }
  async function openItem(message){
    setExpanded(StudyMindTapCourse.hasOutline(document));const item=message.item;if(!item||!/^[0-9]{1,16}$/.test(String(item.id||''))){status('MindTap did not provide an activity ID. Stopped for review.');return;}
    const button=StudyMindTapCourse.queryAll('button[id^="activity-heading-"],[role="button"][id^="activity-heading-"]').find(candidate=>candidate.id==='activity-heading-'+item.id);
    if(!button||!button.getClientRects().length||button.disabled){status('Could not find '+item.title+' in the expanded outline. Stop and review the course page.');return;}
    status('Opening '+(message.index+1)+' of '+message.total+': '+item.title);
    button.click();
  }
  async function refresh(){
    const result=await send('mindtapCourseState');if(result?.received){state=result.phase==='idle'?null:result;}
    if(state?.phase==='done'){
      setExpanded(true);status('Course run finished. '+state.done+' assignments saved for review; '+state.skipped+' need attention.');
      const modal=mount().getElementById('veil');modal.hidden=false;ui.getElementById('summary').textContent='Review each assignment and submit it in MindTap yourself. '+state.done+' assignment(s) reached their question overview; '+state.skipped+' were left for manual attention.';ui.getElementById('reason').textContent='Final assignment submission remains yours.';ui.getElementById('next').hidden=true;ui.getElementById('finish').hidden=false;
      renderSkipped(state.skippedItems||[]);
    }else if(!state){render(outlineHint());}else{if(['opening','running','review'].includes(state.phase))setExpanded(true);render();}
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message?.type==='mindtapCourseOpen'){state={...state,...message,phase:'opening'};openItem(message);reply({received:true});return;}
    if(message?.type==='mindtapCourseReview'){
      state={...state,...message,phase:message.done?'done':'review'};setExpanded(true);render(message.done?'Course run finished.':'Assignment ready for review.');
      const modal=mount().getElementById('veil');modal.hidden=false;ui.getElementById('summary').textContent=message.done?'Finished the selected queue. '+message.completed+' assignment(s) reached their question overview; '+message.skipped+' need manual attention.':'The question flow reached the assignment overview. Review the work and use MindTap’s own submit control yourself before continuing.';
      ui.getElementById('reason').textContent=message.reason||'Skipped work, if any, remains incomplete and needs your review.';renderSkipped(message.skippedItems||[]);ui.getElementById('next').hidden=!!message.done;ui.getElementById('finish').hidden=!message.done;reply({received:true});return;
    }
  });
  (async()=>{await prepareOutline();await refresh();syncVisibility();})().catch(()=>{});
})();
