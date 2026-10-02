(() => {
  'use strict';
  if(!['notebooklm.google.com','notebook.google.com'].includes(location.hostname))return;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const visible=e=>e&&e.getClientRects().length>0&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
  const input=()=>[...document.querySelectorAll('textarea.query-box-input,textarea[aria-label="Query box"]')].find(visible);
  const busy=()=>Boolean([...document.querySelectorAll('query-box button[aria-label="Stop generating"],button[aria-label="Stop generating"],button[aria-label="Stop response"]')].find(visible));
  const sourceCount=()=>Number((document.querySelector('query-box .selected-num')?.textContent||'').match(/(\d+)\s+sources?/i)?.[1]||0);
  const sourceFingerprint=()=>JSON.stringify([...document.querySelectorAll('input[type="checkbox"]:checked,[role="checkbox"][aria-checked="true"]')].map(e=>e.getAttribute('aria-label')||e.id).sort());
  const messages=()=>[...document.querySelectorAll('chat-panel .to-user-message-inner-content,.to-user-message-inner-content')];
  let active=null;
  function clear(){if(active){clearTimeout(active.timer);clearInterval(active.fallback);active.observer?.disconnect();}active=null;}
  function textOf(node){
    const clone=node.cloneNode(true);
    clone.querySelectorAll('thinking-chain-view,.thinking-chain,button:not(.citation-marker),script,style').forEach(e=>e.remove());
    clone.querySelectorAll('.citation-marker').forEach(e=>e.replaceWith(document.createTextNode(' ['+(e.querySelector('[aria-label]')?.getAttribute('aria-label')||clean(e.textContent))+'] ')));
    return clean(clone.textContent);
  }
  async function fail(request,error){if(active!==request)return;clear();await chrome.runtime.sendMessage({type:'notebookError',id:request.id,error}).catch(()=>{});}
  async function send(message){
    if(active||busy())throw Error('NotebookLM is busy. Wait for its answer to finish.');
    if(!/\/notebook\/[^/]+/.test(location.pathname))throw Error('Open the notebook containing your readings.');
    const editor=input();if(!editor)throw Error('NotebookLM chat input is unavailable. Reload the notebook.');
    if(editor.value.trim())throw Error('NotebookLM has an unsent draft. Send or clear it first.');
    if(!sourceCount())throw Error('Select notebook sources before asking for an answer.');
    if(typeof message.id!=='string'||typeof message.prompt!=='string')throw Error('Invalid notebook request.');
    const request={id:message.id,prompt:clean(message.prompt),path:location.pathname,sources:sourceFingerprint(),baseline:new Set(messages()),started:Date.now(),last:'',stableAt:0,timer:null};active=request;
    try{
      editor.focus();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(editor,message.prompt);editor.dispatchEvent(new Event('input',{bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,350));
      if(active!==request)throw Error('Cancelled.');
      const button=[...document.querySelectorAll('query-box button[aria-label="Submit"],query-box button[aria-label="Send"]')].find(visible);
      if(!button)throw Error('NotebookLM Send is unavailable. Check its prompt and reload the tab.');
      button.click();
      let scheduled=false,settling=false;
      async function scan(){
        scheduled=false;
        if(active!==request)return;
        if(location.pathname!==request.path||sourceFingerprint()!==request.sources)return fail(request,'The notebook or selected sources changed. Auto stopped.');
        if(Date.now()-request.started>170000)return fail(request,'NotebookLM response timed out.');
        const latest=messages().filter(n=>!request.baseline.has(n)).find(n=>clean(n.closest('.chat-message-pair')?.querySelector('.from-user-message-inner-content')?.textContent)===request.prompt);
        if(!latest)return;
        const text=textOf(latest);if(text!==request.last){request.last=text;request.stableAt=Date.now();}
        if(!text||busy()||settling)return;
        if(Date.now()-request.stableAt<600){
          settling=true;try{const reply=await chrome.runtime.sendMessage({type:'studyDelay',ms:600});if(!reply?.waited)await new Promise(r=>setTimeout(r,600));}catch{await new Promise(r=>setTimeout(r,600));}
          settling=false;if(active===request)schedule();return;
        }
        if(!latest.querySelector('.citation-marker')&&!/SOURCE_NOT_FOUND/i.test(text))return fail(request,'NotebookLM did not provide a source citation. Review the readings and answer manually.');
        clear();await chrome.runtime.sendMessage({type:'notebookResponse',id:request.id,response:text}).catch(()=>{});
      }
      function schedule(){if(!scheduled){scheduled=true;queueMicrotask(scan);}}
      request.observer=new MutationObserver(schedule);request.observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','disabled','aria-disabled','aria-checked','hidden']});
      request.fallback=setInterval(schedule,5000);request.timer=setTimeout(()=>fail(request,'NotebookLM response timed out.'),170000);schedule();
      return {received:true};
    }catch(error){if(active===request)clear();throw error;}
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message.type==='notebookReady'){const editor=input();const sources=sourceCount();const reason=!/\/notebook\/[^/]+/.test(location.pathname)?'Open a readings notebook':!editor?'Reload this notebook':active||busy()?'Generating source answer':!sources?'Select notebook sources':editor.value.trim()?'Unsent draft':'Ready';reply({ready:reason==='Ready',reason,sources});return;}
    if(message.type==='cancelQuestion'){if(active?.id===message.id)clear();reply({received:true});return;}
    if(message.type==='receiveSourceQuestion'){send(message).then(reply,error=>reply({received:false,error:error.message}));return true;}
  });
})();
