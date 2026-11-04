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
    const version = 1;
    let acknowledged = false;
    container.innerHTML = '<details open><summary>Course Auto warning and walkthrough</summary><p><strong>Review required.</strong> Course Auto can open eligible McGraw homework and enter AI-suggested answers. It can make mistakes or skip work. Review the answers and submit assignments yourself.</p><ol><li>Choose courses, or open a course’s Assignments list.</li><li>Choose a speed and whether to include started or past-due work.</li><li>Start the run. Use Stop at any time and check the review report for skipped work.</li></ol><button type="button" class="secondary">I understand</button><p role="status" hidden></p></details>';
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
  async function enabled(platform){const data=await chrome.storage.sync.get('platformMode');return StudyConfig.allowed(platform,data.platformMode);}
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
  globalThis.StudyCourseUI={decorate,disclosure,canvasIntroduction,enabled,titleLink,linkReport};
})();
