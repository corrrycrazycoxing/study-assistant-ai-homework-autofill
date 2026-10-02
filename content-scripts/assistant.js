(() => {
  'use strict';
  const configs = {
    'chatgpt.com': {input:['#prompt-textarea'],send:['button[data-testid="send-button"]','button[aria-label="Send prompt"]'],messages:['[data-message-author-role="assistant"]'],stop:['button[data-testid="stop-button"]']},
    'gemini.google.com': {input:['.ql-editor[contenteditable="true"]'],send:['button[aria-label="Send message"]','.send-button.submit'],messages:['model-response'],stop:['.send-button.stop','button[aria-label="Stop response"]']},
    'chat.deepseek.com': {input:['#chat-input','textarea[data-testid="chat_input_input"]','textarea'],send:['[data-testid="chat_input_send_button"]','[data-testid="send-button"]','[aria-label="Send message"]','[aria-label="Send"]','[role="button"].f6d670'],messages:['[data-testid="chat-message-assistant"]','.ds-markdown'],stop:['[data-testid="stop-button"]','[aria-label="Stop generating"]']}
  };
  const config = configs[location.hostname];
  if (!config) return;
  const visible = e => e && e.getClientRects().length > 0 && !e.disabled && e.getAttribute('aria-disabled') !== 'true';
  const find = selectors => selectors.flatMap(s=>[...document.querySelectorAll(s)]).find(visible);
  const busy = () => Boolean(find(config.stop));
  const input = () => find(config.input);
  const inputText = e => 'value' in e ? e.value.trim() : e.textContent.trim();
  const nodes = () => {
    for (const selector of config.messages) { const list=[...document.querySelectorAll(selector)]; if (list.length) return list; }
    return [];
  };
  let active = null;
  function clear() { if(active){clearTimeout(active.timer);clearInterval(active.fallback);active.observer?.disconnect();active.sendObserver?.disconnect();active.sendCancel?.();}active=null; }
  function sendButton(request){
    return new Promise((resolve,reject)=>{
      let done=false;
      const finish=(button,error)=>{if(done)return;done=true;clearTimeout(timeout);request.sendObserver?.disconnect();request.sendCancel=null;error?reject(error):resolve(button);};
      const check=()=>{if(active!==request)return finish(null,Error('Request cancelled.'));const button=find(config.send);if(button)finish(button);};
      const timeout=setTimeout(()=>finish(null,Error('AI send button was not found or is disabled. You can send the inserted prompt manually.')),4000);
      request.sendCancel=()=>finish(null,Error('Request cancelled.'));
      request.sendObserver=new MutationObserver(check);request.sendObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true});check();
    });
  }
  function watch(request){
    let queued=false;
    async function scan(){
      queued=false;if(active!==request)return;
      const latest=nodes().filter(n=>!request.baseline.has(n)||request.baseline.get(n)!==n.textContent).at(-1);
      if(!latest||busy())return;
      const blocks=[...latest.querySelectorAll('pre code')];
      const raw=blocks.map(e=>e.textContent).join('\n')||latest.textContent;
      const parsed=jsonFrom(raw);if(!parsed||parsed.requestId!==request.id)return;
      clear();await chrome.runtime.sendMessage({type:'assistantResponse',id:request.id,response:JSON.stringify(parsed)}).catch(()=>{});
    }
    const schedule=()=>{if(!queued){queued=true;queueMicrotask(scan);}};
    request.observer=new MutationObserver(schedule);
    request.observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','disabled','aria-disabled','hidden','data-testid']});
    // Mutation events handle the fast path; this is only a recovery check.
    request.fallback=setInterval(schedule,5000);
    request.timer=setTimeout(()=>fail(request,'AI response timed out. Check the AI tab and retry.'),170000);
    schedule();
  }
  function jsonFrom(text) {
    // Scan balanced objects, respecting braces inside quoted strings.
    text = text.replace(/[\u200B-\u200D\uFEFF]/g,'');
    for (let start=text.indexOf('{'); start>=0; start=text.indexOf('{',start+1)) {
      let depth=0, quoted=false, escaped=false;
      for (let i=start;i<text.length;i++) {
        const c=text[i];
        if (quoted) { if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue; }
        if(c==='"')quoted=true;
        else if(c==='{')depth++;
        else if(c==='}'&&!--depth) { try { const value=JSON.parse(text.slice(start,i+1)); if(value && value.answer && typeof value.answer==='object' && !Array.isArray(value.answer))return value; }catch{} break; }
      }
    }
    return null;
  }
  async function fail(request,error) {
    if (active !== request) return;
    clear();
    await chrome.runtime.sendMessage({type:'assistantError',id:request.id,error}).catch(()=>{});
  }
  async function send(message) {
    if (active || busy()) throw Error('The AI tab is still answering another prompt. Wait for it to finish.');
    const editor=input();
    if (!editor) throw Error('AI prompt box was not found. Sign in and reload the AI tab.');
    if (inputText(editor)||StudyImageUpload.hasDraft(editor)) throw Error('The AI prompt box has an unsent draft. Send or clear it first.');
    if (typeof message.id!=='string' || typeof message.prompt!=='string') throw Error('Invalid AI request.');
    const request={id:message.id,started:Date.now(),baseline:new Map(nodes().map(n=>[n,n.textContent])),timer:null};
    active=request;request.phase=message.image?'Uploading picture':'Sending prompt';
    const prompt=message.prompt+'\n\nAlso include the top-level key "requestId" with this exact string: '+JSON.stringify(message.id)+'.';
    try {
      if(message.image)await StudyImageUpload.attach(message.image,editor,()=>active===request);
      if(active!==request)throw Error('Request cancelled.');
      editor.focus();
      if ('value' in editor) {
        const prototype=editor.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype,'value').set.call(editor,prompt);
      } else {
        const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(editor);selection.removeAllRanges();selection.addRange(range);
        if (!document.execCommand('insertText',false,prompt)) editor.replaceChildren(Object.assign(document.createElement('p'),{textContent:prompt}));
      }
      editor.dispatchEvent(new Event('input',{bubbles:true}));
      const button=await sendButton(request);
      if (active!==request) throw Error('Request cancelled.');
      watch(request);button.click();request.phase='Generating answer';
      return {received:true};
    } catch(error) { if(active===request)clear(); throw error; }
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if (message.type==='assistantReady') { const editor=input();const reason=active?active.phase:!editor?'Sign in or reload':busy()?'Generating answer':inputText(editor)||StudyImageUpload.hasDraft(editor)?'Unsent draft':'Ready';reply({ready:reason==='Ready',reason,model:location.hostname}); return; }
    if (message.type==='cancelQuestion') { if(active?.id===message.id)clear();reply({received:true});return; }
    if (message.type==='receiveQuestion') { send(message).then(reply,error=>reply({received:false,error:error.message}));return true; }
  });
})();
