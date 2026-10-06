// Launcher and conservative queue scan for the MindTap course outline.
(() => {
  if(window.top!==window||location.origin!=='https://ng.cengage.com'||location.pathname!=='/static/nb/ui/evo/index.html'||document.getElementById('study-mindtap-course'))return;
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const send=(type,more={})=>chrome.runtime.sendMessage({type,...more});
  let host,ui,busy=false,state=null;
  function mount(){
    if(host?.isConnected)return ui;
    host=document.createElement('div');host.id='study-mindtap-course';host.style.cssText='position:fixed;right:18px;bottom:20px;z-index:2147483600;width:310px;max-width:calc(100vw - 36px)';
    ui=host.attachShadow({mode:'open'});
    ui.innerHTML='<style>:host{font:13px/1.45 system-ui;color:#e8edff}section{background:#10151f;border:1px solid #6b7bac;border-radius:12px;box-shadow:0 8px 30px #0005;padding:14px}h2{font-size:16px;margin:0 0 4px}p{margin:6px 0 10px;color:#b9c7e4}button{font:inherit;background:#5264ff;color:white;border:0;border-radius:7px;padding:8px 11px;cursor:pointer;margin:5px 6px 0 0}button.secondary{background:#30394d}button:disabled{opacity:.45}small{display:block;color:#9faeca;margin-top:8px}.section-options{display:grid;gap:5px;margin:8px 0}.section-options label{display:block}.skipped-list{display:grid;gap:8px;margin:12px 0}.skipped-item{border:1px solid #47536f;border-radius:9px;padding:10px}.veil{position:fixed;inset:0;background:#050811d9;z-index:2147483647;display:grid;place-items:center;padding:20px}.veil[hidden]{display:none}.dialog{width:min(640px,100%);max-height:85vh;overflow:auto;background:#171f33;border:2px solid #8496ff;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0009}.dialog h2{font-size:24px}</style><section><h2>MindTap Course Mode</h2><p id="state">Checking the course outline…</p><fieldset class="section-options"><legend>Activity sections</legend><label><input type="checkbox" data-category="apply" checked> Apply It · grade-counting work</label><label><input type="checkbox" data-category="study"> Study It · practice assessments</label><label><input type="checkbox" data-category="learn"> Learn It · practice assessments</label><label><input type="checkbox" data-category="other"> Other sections · grade-counting or practice assessments</label></fieldset><label><input id="skip-pause" type="checkbox"> Skip per-question review pauses (assignment review still required)</label><div><button id="go">Go through selected assignments</button><button id="stop" class="secondary" hidden>Stop</button><button id="continue" hidden>Continue after review</button></div><small>Only visible assessments MindTap marks Not started are opened. Apply It includes only work that counts toward your grade. Other sections can include explicit practice assessments when selected. Reading/media, quiz, test and exam activities stay excluded. Review and submit each assignment yourself before continuing.</small></section><div class="veil" id="veil" hidden><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="title"><h2 id="title">Assignment needs review</h2><p id="summary"></p><p id="reason"></p><div class="skipped-list" id="skipped-items"></div><button id="close" class="secondary">Close</button><button id="next">Continue to next assignment</button><button id="finish" class="secondary" hidden>Finish</button></section></div>';
    document.body.append(host);
    ui.getElementById('go').onclick=start;
    ui.getElementById('stop').onclick=async()=>{await send('mindtapCourseStop');state=null;render('Stopped.');};
    ui.getElementById('continue').onclick=async()=>{const r=await send('mindtapCourseContinue');if(!r?.received)render(r?.error||'Could not continue.');else await refresh();};
    ui.getElementById('next').onclick=async()=>{ui.getElementById('veil').hidden=true;const r=await send('mindtapCourseContinue');if(!r?.received){render(r?.error||'Could not continue.');return;}await refresh();};
    ui.getElementById('finish').onclick=async()=>{ui.getElementById('veil').hidden=true;await send('mindtapCourseStop');state=null;render('Course run finished. Review the listed skipped work manually.');};
    ui.getElementById('close').onclick=()=>ui.getElementById('veil').hidden=true;
    ui.getElementById('skipped-items').addEventListener('click',event=>{const button=event.target.closest('button[data-reopen]');if(!button)return;const target=[...document.querySelectorAll('#activity-heading-'+button.dataset.reopen)].find(item=>item.getClientRects().length&&!item.disabled);if(!target){status('That skipped activity is not visible in the outline. Expand its section and try again.');return;}ui.getElementById('veil').hidden=true;target.click();});
    return ui;
  }
  const status=text=>{mount().getElementById('state').textContent=text;};
  function render(text){
    const root=mount();if(text)status(text);
    const running=state&&['opening','running','review'].includes(state.phase);
    root.getElementById('go').hidden=!!running;root.getElementById('stop').hidden=!running;root.getElementById('continue').hidden=state?.phase!=='review';
    if(state?.phase==='done'){root.getElementById('go').hidden=true;root.getElementById('stop').hidden=true;}
  }
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function renderSkipped(items=[]){const list=mount().getElementById('skipped-items');list.replaceChildren();for(const item of items){const card=document.createElement('div');card.className='skipped-item';const label=document.createElement('strong');label.textContent=item.title||'Assignment needing attention';const reason=document.createElement('p');reason.textContent=item.reason||'Needs manual review.';card.append(label,reason);if(/^\d{1,16}$/.test(String(item.id||''))){const button=document.createElement('button');button.className='secondary';button.dataset.reopen=String(item.id);button.textContent='Open this assignment';card.append(button);}list.append(card);}list.hidden=!items.length;}
  async function prepareOutline(){
    const outline=document.querySelector('#outlineViewPane');
    if(outline&&outline.getAttribute('aria-selected')!=='true'){outline.click();await wait(350);}
    const expand=[...document.querySelectorAll('button')].find(button=>/Expand All Folders/i.test(clean(button.innerText||button.getAttribute('aria-label'))));
    if(expand){expand.click();await wait(500);}
  }
  async function start(){
    if(busy)return;busy=true;const button=mount().getElementById('go');button.disabled=true;
    try{
      await prepareOutline();
      const selectedCategories=[...mount().querySelectorAll('[data-category]:checked')].map(input=>input.dataset.category);
      const all=StudyMindTapCourse.scan(document),items=all.filter(item=>StudyMindTapCourse.eligible(item,selectedCategories)).map(({id,title,status,gradeable,practice,category,visible,excluded,assessment})=>({id,title,status,gradeable,practice,category,visible,excluded,assessment}));
      if(!items.length){render('No gradeable assessment is confirmed as Not started. In-progress, scored and unclear work was left untouched.');return;}
      state=await send('mindtapCourseStart',{assignments:items,selectedCategories,skipReviewPause:mount().getElementById('skip-pause').checked});
      if(!state?.received)throw Error(state?.error||'Could not start MindTap Course Mode.');
      await refresh();
    }catch(error){render(error.message);}finally{busy=false;button.disabled=false;}
  }
  async function openItem(message){
    const item=message.item;if(!item||!/^[0-9]{1,16}$/.test(String(item.id||''))){status('MindTap did not provide an activity ID. Stopped for review.');return;}
    const button=document.getElementById('activity-heading-'+item.id);
    if(!button||!button.getClientRects().length||button.disabled){status('Could not find '+item.title+' in the expanded outline. Stop and review the course page.');return;}
    status('Opening '+(message.index+1)+' of '+message.total+': '+item.title);
    button.click();
  }
  async function refresh(){
    const result=await send('mindtapCourseState');if(result?.received){state=result.phase==='idle'?null:result;}
    if(state?.phase==='done'){
      status('Course run finished. '+state.done+' assignments saved for review; '+state.skipped+' need attention.');
      const modal=mount().getElementById('veil');modal.hidden=false;ui.getElementById('summary').textContent='Review each assignment and submit it in MindTap yourself. '+state.done+' assignment(s) reached their question overview; '+state.skipped+' were left for manual attention.';ui.getElementById('reason').textContent='Final assignment submission remains yours.';ui.getElementById('next').hidden=true;ui.getElementById('finish').hidden=false;
      renderSkipped(state.skippedItems||[]);
    }else render();
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message?.type==='mindtapCourseOpen'){state={...state,...message,phase:'opening'};openItem(message);reply({received:true});return;}
    if(message?.type==='mindtapCourseReview'){
      state={...state,...message,phase:message.done?'done':'review'};render(message.done?'Course run finished.':'Assignment ready for review.');
      const modal=mount().getElementById('veil');modal.hidden=false;ui.getElementById('summary').textContent=message.done?'Finished the selected queue. '+message.completed+' assignment(s) reached their question overview; '+message.skipped+' need manual attention.':'The question flow reached the assignment overview. Review the work and use MindTap’s own submit control yourself before continuing.';
      ui.getElementById('reason').textContent=message.reason||'Skipped work, if any, remains incomplete and needs your review.';renderSkipped(message.skippedItems||[]);ui.getElementById('next').hidden=!!message.done;ui.getElementById('finish').hidden=!message.done;reply({received:true});return;
    }
  });
  (async()=>{await prepareOutline();await refresh();})().catch(()=>{});
})();
