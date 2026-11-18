(() => {
  'use strict';
  if(!['notebook.google.com','notebooklm.google.com'].includes(location.hostname))return;
  if(globalThis.StudyNotebookSetup)return;
  const clean=StudyReadings.clean,visible=e=>e?.isConnected&&e.getClientRects().length&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
  const label=node=>{
    if(node.getAttribute('aria-label'))return clean(node.getAttribute('aria-label'));
    const copy=node.cloneNode(true);copy.querySelectorAll('mat-icon,[aria-hidden="true"]').forEach(e=>e.remove());return clean(copy.textContent);
  };
  const button=(text,scope=document)=>{const hits=[...scope.querySelectorAll('button,[role="button"]')].filter(e=>visible(e)&&label(e).toLowerCase()===text.toLowerCase());return hits.length===1?hits[0]:null;};
  const sourceNames=()=>[...new Set([...document.querySelectorAll('input[type="checkbox"],[role="checkbox"]')].filter(visible).map(e=>clean(e.getAttribute('aria-label'))).filter(s=>/^Select /i.test(s)&&!/^Select all(?: sources)?$/i.test(s)).map(s=>s.replace(/^Select /i,'')))];
  const sourceCount=()=>Number((document.querySelector('query-box .selected-num')?.textContent||'').match(/(\d+)\s+sources?/i)?.[1]||0);
  const setText=(element,value)=>{const proto=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));};
  const send=async(message)=>{const result=await chrome.runtime.sendMessage(message);if(!result?.received)throw Error(result?.error||'Reading preparation disconnected.');return result;};
  let working=false,stopped=false;
  const tick=()=>new Promise(resolve=>setTimeout(resolve,350));
  async function current(id){const {job}=await send({type:'readingsJob'});if(!job||job.id!==id)throw Error('Reading preparation stopped.');return job;}
  async function waitFor(id,read,timeout=45000){const end=Date.now()+timeout;do{await current(id);const result=read();if(result)return result;await tick();}while(Date.now()<end);throw Error('NotebookLM’s source controls did not become ready. Check the notebook before retrying.');}
  async function step(id,name,extra={}){return send({type:'readingsStep',id,step:name,...extra});}
  async function run(job){
    const id=job.id;
    if(location.pathname==='/'){
      if(job.phase!=='opening')throw Error('Notebook creation was not confirmed. Open the created notebook before retrying.');
      if(job.notebookUrl){
        await waitFor(id,()=>/Notebook not found\. Please check the URL and try again\./i.test(document.body?.innerText||''));
        await step(id,'missing');job=await current(id);
      }
      let limitedAt=null;
      const findCreate=()=>{
        // The home page briefly renders its limit banner before quota data
        // arrives. Only report a persistent limit with no usable create control.
        if(/reached the maximum number of notebooks/i.test(document.body?.innerText||'')){
          limitedAt??=Date.now();
          if(Date.now()-limitedAt>=8000)throw Error('NotebookLM has reached its notebook limit. Free a notebook slot or use an existing notebook before preparing another reading.');
          return null;
        }else limitedAt=null;
        return button('New notebook');
      };
      let create;
      try{create=await waitFor(id,findCreate);}catch(error){
        if(!/notebook limit/i.test(error.message)||!globalThis.StudyNotebookCleanup)throw error;
        await current(id);await StudyNotebookCleanup.freeSlot(id);limitedAt=null;
        create=await waitFor(id,findCreate);
      }
      await step(id,'creating');create.click();
      await waitFor(id,()=>/^\/notebook\/[\w-]+$/.test(location.pathname)&&!location.pathname.endsWith('/creating'));
    }
    if(location.pathname.endsWith('/creating'))await waitFor(id,()=>!location.pathname.endsWith('/creating'));
    job=await current(id);
    if(['opening','creating'].includes(job.phase)){await step(id,'created');job=await current(id);}
    if(!['importing','adding'].includes(job.phase))return;
    // A prepared notebook is reused only with its previously recorded single
    // source. Never deselect a user's sources or clear an existing chat draft.
    if(job.sourceName){
      await waitFor(id,()=>sourceCount()===1&&sourceNames().length===1);
      if(sourceNames()[0]!==job.sourceName)throw Error('The prepared notebook’s sources changed. Restore its reading source or prepare a new notebook.');
      await step(id,'ready',{sourceName:job.sourceName});return;
    }
    if(job.phase==='importing'){
      const nameInput=await waitFor(id,()=>[...document.querySelectorAll('input')].find(e=>visible(e)&&['Untitled notebook',job.source.title].includes(clean(e.value))));
      if(sourceNames().length||sourceCount())throw Error('This notebook already contains an unverified source. Select it manually in settings.');
      if([...document.querySelectorAll('textarea[aria-label="Query box"]')].some(e=>visible(e)&&clean(e.value)))throw Error('This notebook has an unsent draft. Clear it before importing a reading.');
      await current(id);setText(nameInput,job.source.title);nameInput.dispatchEvent(new Event('blur'));nameInput.blur();
      await waitFor(id,()=>clean(nameInput.value)===job.source.title);
      let urls=[...document.querySelectorAll('textarea')].find(e=>visible(e)&&e.getAttribute('aria-label')==='Enter URLs');
      if(!urls){
        let websites=button('Websites');
        if(!websites){const add=button('Add sources')||button('Add source')||button('add a source');if(!add)throw Error('NotebookLM’s Add source control is unavailable.');add.click();websites=await waitFor(id,()=>button('Websites'));}
        await current(id);websites.click();urls=await waitFor(id,()=>[...document.querySelectorAll('textarea')].find(e=>visible(e)&&e.getAttribute('aria-label')==='Enter URLs'));
      }
      if(clean(urls.value))throw Error('NotebookLM has an unsent source link. Clear it before preparing readings.');
      const url=job.source.kind==='drive'?'https://drive.google.com/uc?export=download&id='+encodeURIComponent(job.source.id):job.source.kind==='doc'?'https://docs.google.com/document/d/'+job.source.id+'/export?format=pdf':job.source.url;
      await current(id);setText(urls,url);const insert=await waitFor(id,()=>button('Insert'));
      await step(id,'adding');insert.click();
    }
    const sourceName=await waitFor(id,()=>{
      const failure=[...document.querySelectorAll('[role="alert"]')].filter(visible).some(e=>/couldn.t|could not|failed|unable|unsupported|error/i.test(e.textContent));
      const failedRow=[...document.querySelectorAll('[data-source-status="failed"],[data-status="error"],.source-error,.source-item-error,[aria-label*="failed to import" i],[aria-label*="error loading source" i],[aria-label*="unable to import" i]')].some(visible);
      if(failure||failedRow)throw Error('NotebookLM could not import the assigned source. On Canvas, choose Try source again or Move on & save issue.');
      const names=sourceNames(),loading=[...document.querySelectorAll('[role="progressbar"],mat-progress-spinner,progress')].some(visible);
      return names.length===1&&sourceCount()===1&&!loading&&(job.source.kind==='web'||/\.pdf$/i.test(names[0]))?names[0]:null;
    },150000);
    await step(id,'ready',{sourceName});
  }
  async function scan(){
    if(working||stopped)return;working=true;let job;
    try{job=(await send({type:'readingsJob'})).job;if(job)await run(job);}
    catch(error){if(job)await step(job.id,'failed',{error:error.message}).catch(()=>{});if(/context invalidated/i.test(error.message))stopped=true;}
    finally{working=false;}
  }
  globalThis.StudyNotebookSetup={scan,sourceNames,sourceCount};
  // Each preparation opens a task-owned tab after its job has been saved.
  // An idle user's notebook therefore needs one probe, not a permanent poll.
  scan();
})();
