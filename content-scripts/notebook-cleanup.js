// Cleanup uses NotebookLM's home-card menu and leaves final confirmation to
// the user. Old associations without explicit creation provenance are excluded.
(() => {
  'use strict';
  if(!['notebook.google.com','notebooklm.google.com'].includes(location.hostname)||location.pathname!=='/')return;
  const visible=e=>e?.isConnected&&e.getClientRects().length>0;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  // Material menus include hidden icon ligatures ("delete Delete") in
  // textContent; the visible menu-item text is the action's actual label.
  const label=e=>clean(e.getAttribute('aria-label')||e.querySelector('.mat-mdc-menu-item-text')?.textContent||e.textContent);
  function notebook(value){try{const u=new URL(value,location.origin);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['notebook.google.com','notebooklm.google.com'].includes(u.hostname)&&/^\/notebook\/[\w-]+$/.test(u.pathname)?u.pathname:null;}catch{return null;}}
  let panel=null,busy=false,pending=null,scheduled=false,limitedAt=null,autoAttempted=false;
  function cardFor(path){
    const links=[...document.querySelectorAll('a[href]')].filter(e=>visible(e)&&notebook(e.href)===path);
    if(links.length!==1)return null;
    for(let node=links[0].parentElement;node&&node!==document.body;node=node.parentElement){
      const notebookLinks=[...node.querySelectorAll('a[href]')].filter(e=>notebook(e.href));
      const menus=[...node.querySelectorAll('button,[role="button"]')].filter(e=>visible(e)&&clean(e.getAttribute('aria-label')||e.textContent)==='Project Actions Menu');
      if(notebookLinks.length===1&&menus.length===1)return menus[0];
      if(notebookLinks.length>1)return null;
    }return null;
  }
  async function review(book,status){
    if(busy)return;busy=true;
    try{
      const path=notebook(book.url),menu=cardFor(path);if(!menu)throw Error('Find this notebook on the home page or choose See more recent notebooks, then retry.');
      menu.click();
      let control=null;const deadline=Date.now()+4000;
      while(!control&&Date.now()<deadline){
        const hits=[...document.querySelectorAll('[role="menuitem"],button')].filter(e=>visible(e)&&label(e)==='Delete');
        if(hits.length===1)control=hits[0];else await new Promise(resolve=>setTimeout(resolve,100));
      }
      if(!control)throw Error('NotebookLM’s Delete menu item was not found. Use the notebook’s three-dot menu.');
      pending={path,url:book.url};control.click();status.textContent='Review NotebookLM’s confirmation dialog. Confirm there to delete, or Cancel to keep the notebook.';
    }catch(error){status.textContent=error.message;}finally{busy=false;}
  }
  async function scan(){
    scheduled=false;
    if(location.pathname!=='/')return;
    const {notebookCleanupPreferences:prefs={},readingNotebooks:books={}}=await chrome.storage.local.get(['notebookCleanupPreferences','readingNotebooks']);
    const requested=new URL(location.href).searchParams.get('studyCleanup');
    const limit=/reached the maximum number of notebooks/i.test(document.body?.innerText||'');
    if(limit){if(limitedAt===null){limitedAt=Date.now();setTimeout(()=>scan().catch(()=>{}),8100);}}else limitedAt=null;
    if(!panel&&!(prefs.afterUse&&requested||prefs.atLimit&&limit&&Date.now()-limitedAt>=8000))return;
    if(!panel){
      panel=document.createElement('aside');panel.id='study-notebook-cleanup';panel.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#141b2d;color:white;padding:18px;border:1px solid #6477c0;border-radius:12px;width:360px;max-height:65vh;overflow:auto;font:14px system-ui';
      const heading=document.createElement('strong');heading.textContent='Notebook cleanup';const close=document.createElement('button');close.textContent='Close';close.onclick=()=>{panel.remove();panel=null;observer.disconnect();};panel.append(heading,close);
      const status=document.createElement('p');status.id='study-cleanup-status';status.textContent='Choose a notebook to review for deletion. After freeing a slot, return to Canvas and retry reading preparation.';panel.append(status);
      const list=document.createElement('div');list.id='study-cleanup-list';panel.append(list);document.body.append(panel);
      const eligible=Object.values(books).filter(b=>b.createdByAutomation===true&&notebook(b.url)&&(!requested||notebook(b.url)===notebook(requested)));
      const seen=new Set();for(const book of eligible){if(seen.has(book.url))continue;seen.add(book.url);const row=document.createElement('p'),button=document.createElement('button');button.textContent='Review delete · '+book.title;button.onclick=()=>review(book,status);row.append(button);list.append(row);}
      if(!seen.size)list.textContent='No notebooks with verified automation ownership are eligible. Existing personal notebooks are kept.';
    }
    // Auto opens only this exact tracked notebook's native confirmation; the
    // final irreversible Delete still requires the user's own action.
    if(!autoAttempted&&prefs.afterUse&&requested&&new URL(location.href).searchParams.get('studyCleanupAuto')==='1'){
      const paths=Object.values(books).filter(book=>book.createdByAutomation===true&&notebook(book.url)===notebook(requested));
      if(paths.length&&cardFor(notebook(requested))){autoAttempted=true;await review(paths[0],panel.querySelector('#study-cleanup-status'));}
    }
    // Do not forget the association while a confirmation dialog is still open.
    if(pending&&!busy&&!document.querySelector('[role="dialog"],mat-dialog-container')&&![...document.querySelectorAll('a[href]')].some(a=>notebook(a.href)===pending.path)){
      if(!pending.missingSince){pending.missingSince=Date.now();setTimeout(()=>scan().catch(()=>{}),1800);return;}
      if(Date.now()-pending.missingSince<1500)return;
      const removed=pending;pending=null;
      const latest=(await chrome.storage.local.get('readingNotebooks')).readingNotebooks||{};
      for(const [key,book] of Object.entries(latest))if(book.createdByAutomation===true&&notebook(book.url)===removed.path)delete latest[key];
      await chrome.storage.local.set({readingNotebooks:latest});panel.querySelector('#study-cleanup-status').textContent='Notebook removed from the home page. Its saved association was cleared; reading preparation can create it again.';
      const run=new URL(location.href).searchParams.get('studyCleanupRun');
      if(run){
        const result=await chrome.runtime.sendMessage({type:'readingsCleanupFinished',id:run});
        if(!result?.received)panel.querySelector('#study-cleanup-status').textContent=result?.error||'Notebook deleted; return to Canvas to continue.';
      }
    }else if(pending)pending.missingSince=null;
  }
  async function deleteTracked(step){
    if(busy||pending||document.querySelector('[role="dialog"],mat-dialog-container'))throw Error('Close the existing notebook dialog before automatic cleanup.');
    const {candidate}=await step('quota'),path=notebook(candidate?.url);
    const menu=path&&cardFor(path);if(!menu)throw Error('The eligible notebook card is missing or ambiguous. No notebook was deleted.');
    busy=true;
    try{
      menu.click();
      const wait=async(read,error='Notebook cleanup controls did not become ready.')=>{const end=Date.now()+8000;while(Date.now()<end){const value=read();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error(error);};
      const deletion=await wait(()=>{const controls=[...document.querySelectorAll('[role="menuitem"],button')].filter(e=>visible(e)&&label(e)==='Delete');return controls.length===1?controls[0]:null;});
      deletion.click();
      // NotebookLM's real dialog omits the notebook title. Accept its exact
      // generic warning only after opening the uniquely matched card/menu in
      // this operation, with that same card still present behind the dialog.
      // Angular mounts the empty dialog container before its warning/buttons.
      // Wait for the complete confirmation, not merely the container's arrival.
      const confirmation=()=>{
        const dialog=document.querySelector('[role="dialog"],mat-dialog-container');
        if(!visible(dialog))return null;
        const dialogText=clean(dialog.textContent);
        const nativeGeneric=dialogText.startsWith('Delete this notebook?')&&dialogText.includes('This notebook and all of its content will be permanently deleted across all locations, including Gemini.');
        const titled=candidate.title&&dialogText.includes(clean(candidate.title));
        const buttons=[...dialog.querySelectorAll('button')].filter(e=>visible(e)&&!e.disabled&&label(e)==='Delete');
        return (titled||nativeGeneric)&&cardFor(path)&&buttons.length===1?buttons[0]:null;
      };
      const confirm=await wait(confirmation,'The deletion dialog does not identify the expected notebook or is not ready. Confirm it manually.');
      await step('quotaConfirm');
      if(confirmation()!==confirm)throw Error('The notebook deletion confirmation changed. No notebook was deleted.');
      confirm.click();
      await wait(()=>!document.querySelector('[role="dialog"],mat-dialog-container')&&![...document.querySelectorAll('a[href]')].some(a=>notebook(a.href)===path));
      await step('quotaRemoved');
    }finally{busy=false;}
  }
  globalThis.StudyNotebookCleanup={async freeSlot(id){return deleteTracked(async name=>{const result=await chrome.runtime.sendMessage({type:'readingsStep',id,step:name});if(!result?.received)throw Error(result?.error||'Notebook cleanup stopped.');return result;});}};
  const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;setTimeout(()=>scan().catch(()=>{}),250);}});observer.observe(document.documentElement,{childList:true,subtree:true});scan().catch(()=>{});
})();
