// Cleanup uses NotebookLM's home-card menus for tracked notebooks.
(() => {
  'use strict';
  if(!['notebook.google.com','notebooklm.google.com'].includes(location.hostname)||location.pathname!=='/')return;
  const visible=e=>e?.isConnected&&e.getClientRects().length>0;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  // Material menus include hidden icon ligatures ("delete Delete") in
  // textContent; the visible menu-item text is the action's actual label.
  const label=e=>clean(e.getAttribute('aria-label')||e.querySelector('.mat-mdc-menu-item-text')?.textContent||e.textContent);
  function notebook(value){try{const u=new URL(value,location.origin);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['notebook.google.com','notebooklm.google.com'].includes(u.hostname)&&/^\/notebook\/[\w-]+$/.test(u.pathname)?u.pathname:null;}catch{return null;}}
  let panel=null,busy=false,pending=null,scheduled=false,limitedAt=null,autoAttempted=false,stopped=false;
  const identitySelector='a[href],[routerlink],[data-notebook-id],[data-project-id]';
  const nativeCardSelector='mat-card,mat-row,tr,[role="row"]';
  const viewSettleMs=1500;
  function identityPath(element){
    const direct=notebook(element.href||element.getAttribute?.('routerlink'));
    if(direct)return direct;
    const id=element.getAttribute?.('data-notebook-id')||element.getAttribute?.('data-project-id');
    return id&&/^[\w-]+$/.test(id)?'/notebook/'+id:null;
  }
  function identityNodes(scope){
    return [...scope.querySelectorAll(identitySelector)].filter(node=>!node.closest('#study-notebook-cleanup')&&(visible(node)||visible(node.closest(nativeCardSelector))));
  }
  function actionMenus(scope){
    return [...scope.querySelectorAll('button,[role="button"]')].filter(e=>visible(e)&&!e.disabled&&/^(?:project actions(?: menu)?|notebook actions(?: menu)?)$/i.test(label(e)));
  }
  function cardFor(path,nodes=identityNodes(document).filter(node=>identityPath(node)===path)){
    if(!path)return null;
    const menus=new Set();
    for(const identity of nodes){
      const card=identity.closest(nativeCardSelector);
      for(let node=identity;node&&node!==document.body;node=node.parentElement){
        const paths=new Set([identityPath(node),...identityNodes(node).map(identityPath)].filter(Boolean));
        if(paths.size!==1||!paths.has(path))break;
        const actions=actionMenus(node);
        if(actions.length>1)return null;
        if(actions.length===1){menus.add(actions[0]);break;}
        if(node===card)break;
      }
    }
    return menus.size===1?[...menus][0]:null;
  }
  function visibleNotebookUrls(){
    const byPath=new Map();
    for(const node of identityNodes(document)){
      const path=identityPath(node);
      if(!path)continue;
      if(!byPath.has(path))byPath.set(path,[]);
      byPath.get(path).push(node);
    }
    return [...byPath].filter(([path,nodes])=>cardFor(path,nodes)).slice(0,1000)
      .map(([path])=>new URL(path,location.origin).href);
  }
  const listingLabels=['See more recent notebooks','My notebooks','List view'];
  function revealNotebookCards(used){
    const all=[...document.querySelectorAll('button,[role="button"],[role="tab"]')];
    for(const name of listingLabels){
      if(used.has(name))continue;
      const buttons=all.filter(button=>visible(button)&&!button.disabled&&['aria-disabled','aria-selected','aria-pressed','aria-expanded'].every(attr=>button.getAttribute(attr)!=='true')&&label(button).toLowerCase()===name.toLowerCase());
      if(buttons.length!==1)continue;
      used.add(name);buttons[0].click();return true;
    }
    return false;
  }
  async function findNotebookMenu(path){
    const used=new Set(),deadline=Date.now()+6000;
    let menu=cardFor(path);
    while(!menu&&Date.now()<deadline&&revealNotebookCards(used)){
      const settle=Date.now()+viewSettleMs;
      do{
        await new Promise(resolve=>setTimeout(resolve,250));
        menu=cardFor(path);
      }while(!menu&&Date.now()<settle);
    }
    return menu;
  }
  function showNamedMenu(title,path){
    if(!clean(title))return false;
    const named=[...document.querySelectorAll(nativeCardSelector)].filter(card=>{
      const heading=card.querySelector('h3,[role="heading"],.project-title');
      return visible(card)&&clean(heading?.textContent||card.getAttribute('aria-label'))===clean(title);
    });
    if(named.length!==1)return false;
    const [card]=named,actions=actionMenus(card);
    const paths=[identityPath(card),...identityNodes(card).map(identityPath)].filter(Boolean);
    if(actions.length!==1||paths.some(id=>id!==path))return false;
    actions[0].scrollIntoView?.({block:'nearest'});
    actions[0].click();
    return true;
  }
  // Links offered by this helper remain after a native card is removed.
  // Only the site's own elements can establish whether deletion completed.
  const notebookPresent=path=>[...document.querySelectorAll(identitySelector)].some(node=>!node.closest('#study-notebook-cleanup')&&identityPath(node)===path);
  async function chooseQuotaCandidate(step){
    const deadline=Date.now()+8000;
    const used=new Set();
    let nextView=0;
    do{
      const result=await step('quota',{visibleNotebookUrls:visibleNotebookUrls()});
      if(!result.waitingForCard)return result;
      if(Date.now()>=nextView&&revealNotebookCards(used))nextView=Date.now()+viewSettleMs;
      await new Promise(resolve=>setTimeout(resolve,400));
    }while(Date.now()<deadline);
    throw Error('NotebookLM is full. No eligible notebook card could be verified. Open NotebookLM and free a slot, then try again.');
  }
  async function review(book,status,{allowTitle=false}={}){
    if(busy)return;busy=true;
    try{
      if(document.querySelector('[role="dialog"],mat-dialog-container'))throw Error('Close the existing NotebookLM dialog first.');
      const path=notebook(book.url),menu=await findNotebookMenu(path);
      if(!menu){
        if(allowTitle&&showNamedMenu(book.title,path)){
          status.textContent='Opened the menu for the matching title. Check the notebook, then choose Delete in NotebookLM.';
          return;
        }
        status.textContent='Could not verify the notebook card. Use Open notebook to identify it, then use its three-dot menu on the NotebookLM home page.';
        return;
      }
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
  async function removeNotebook(book,status,row){
    if(busy)return;
    if(pending&&!document.querySelector('[role="dialog"],mat-dialog-container')&&notebookPresent(pending.path))pending=null;
    stopped=false;
    status.textContent='Deleting '+(book.title||'notebook')+'…';
    let id;
    try{
      await deleteTracked(async (step)=>{
        const result=await chrome.runtime.sendMessage({type:'readingsCleanupDelete',url:book.url,id,step});
        if(!result?.received)throw Error(result?.error||'Notebook deletion stopped.');
        if(result.id)id=result.id;
        return result;
      });
      row.remove();
      status.textContent='Notebook deleted. The slot is available for reading preparation.';
    }catch(error){status.textContent=error.message;}
  }
  async function scan(){
    scheduled=false;
    if(location.pathname!=='/')return;
    const {notebookCleanupPreferences:prefs={},readingNotebooks:books={},notebookCleanupWalkthrough}=await chrome.storage.local.get(['notebookCleanupPreferences','readingNotebooks','notebookCleanupWalkthrough']);
    const requested=new URL(location.href).searchParams.get('studyCleanup');
    const limit=/reached the maximum number of notebooks/i.test(document.body?.innerText||'');
    if(limit){if(limitedAt===null){limitedAt=Date.now();setTimeout(()=>scan().catch(()=>{}),8100);}}else limitedAt=null;
    if(!panel&&!((prefs.afterUse||prefs.afterSubmit)&&requested||prefs.atLimit&&limit&&Date.now()-limitedAt>=8000))return;
    if(!panel){
      panel=document.createElement('aside');panel.id='study-notebook-cleanup';panel.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#141b2d;color:white;padding:18px;border:1px solid #6477c0;border-radius:12px;width:360px;max-height:65vh;overflow:auto;font:14px system-ui';
      const style=document.createElement('style');
      style.textContent='#study-notebook-cleanup{box-sizing:border-box;max-width:calc(100vw - 32px);line-height:1.45;box-shadow:0 7px 28px #0004}#study-notebook-cleanup [hidden]{display:none!important}#study-notebook-cleanup button{appearance:none;font:inherit;line-height:1.35;border:1px solid #6477c0;border-radius:8px;background:#303c58;color:#edf1ff;padding:8px 11px;cursor:pointer;white-space:normal;text-align:left}#study-notebook-cleanup button:hover{filter:brightness(1.15)}#study-notebook-cleanup button:focus-visible,#study-notebook-cleanup a:focus-visible{outline:2px solid #bdc8ff;outline-offset:3px}#study-notebook-cleanup button:disabled{opacity:.5;cursor:default}#study-notebook-cleanup .cleanup-heading,#study-notebook-cleanup .cleanup-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#study-notebook-cleanup .cleanup-heading{justify-content:space-between}#study-notebook-cleanup h2{margin:0;font:600 16px system-ui}#study-notebook-cleanup p{margin:12px 0}#study-notebook-cleanup .cleanup-delete{background:#6b3d50;border-color:#aa768b;flex:1;overflow-wrap:anywhere}#study-notebook-cleanup a{color:#b7c8ff;font:inherit}#study-notebook-cleanup details{margin-top:12px}#study-notebook-cleanup summary{cursor:pointer;color:#b7c8ff}';
      const heading=document.createElement('div');heading.className='cleanup-heading';
      const title=document.createElement('h2');title.textContent='Notebook cleanup';
      const collapse=document.createElement('button');collapse.type='button';collapse.textContent='Collapse';
      collapse.setAttribute('aria-expanded','true');collapse.setAttribute('aria-controls','study-cleanup-list');
      heading.append(title,collapse);
      const status=document.createElement('p');status.id='study-cleanup-status';status.setAttribute('role','status');
      status.textContent=prefs.atLimit?'Automatic cleanup frees one unused tracked notebook when reading preparation reaches the limit.':'Choose a tracked notebook to delete.';
      const stop=document.createElement('button');stop.type='button';stop.textContent='Stop cleanup';stop.setAttribute('data-cleanup-stop','');stop.hidden=true;
      stop.onclick=()=>{stopped=true;status.textContent='Cleanup stopped.';};
      const list=document.createElement('div');list.id='study-cleanup-list';
      const help=document.createElement('details'),summary=document.createElement('summary'),walkthrough=document.createElement('p');
      summary.textContent='Cleanup warning and walkthrough';
      walkthrough.textContent='Delete notebook permanently removes that notebook and its contents. Automatic limit cleanup removes one unused notebook created by Study Assistant, then resumes preparation. Stop cleanup cancels before final deletion. Use Open notebook to inspect an entry.';
      help.open=notebookCleanupWalkthrough!==1;
      const acknowledge=document.createElement('button');acknowledge.type='button';acknowledge.textContent='I understand';
      acknowledge.hidden=notebookCleanupWalkthrough===1;
      acknowledge.onclick=async()=>{await chrome.storage.local.set({notebookCleanupWalkthrough:1});acknowledge.hidden=true;help.open=false;};
      help.append(summary,walkthrough,acknowledge);
      const close=document.createElement('button');close.type='button';close.textContent='Close';
      close.onclick=()=>{stopped=true;panel.remove();panel=null;observer.disconnect();};
      collapse.onclick=()=>{list.hidden=!list.hidden;help.hidden=list.hidden;collapse.textContent=list.hidden?'Open':'Collapse';collapse.setAttribute('aria-expanded',String(!list.hidden));};
      panel.append(style,heading,status,stop,list,help,close);document.body.append(panel);
      const eligible=Object.values(books).filter(b=>b.createdByAutomation===true&&notebook(b.url)&&(!requested||notebook(b.url)===notebook(requested)));
      const unique=[...new Map(eligible.map(book=>[notebook(book.url),book])).values()];
      const titleCounts=new Map();
      for(const book of Object.values(books)){
        const title=clean(book.title),path=notebook(book.url);
        if(!title||!path)continue;
        if(!titleCounts.has(title))titleCounts.set(title,new Set());
        titleCounts.get(title).add(path);
      }
      for(const book of unique){
        const row=document.createElement('p'),button=document.createElement('button'),open=document.createElement('a');
        const path=notebook(book.url),duplicateTitle=titleCounts.get(clean(book.title))?.size>1;
        button.type='button';
        button.className='cleanup-delete';
        button.textContent='Delete notebook · '+(book.title||'Notebook')+(duplicateTitle?' · '+path.slice(-8):'');
        button.onclick=()=>removeNotebook(book,status,row);
        open.href=book.url;open.target='_blank';open.rel='noopener noreferrer';
        open.textContent='Open notebook';open.style.cssText='display:inline-block;margin:4px 0 0 8px;color:#b7c8ff';
        row.className='cleanup-actions';row.append(button,open);list.append(row);
      }
      if(!unique.length)list.textContent='No notebooks with verified automation ownership are eligible. Existing personal notebooks are kept.';
    }
    const submitId=new URL(location.href).searchParams.get('studyCleanupSubmit')==='1'&&new URL(location.href).searchParams.get('studyCleanupRun');
    if(submitId&&prefs.afterSubmit&&!autoAttempted&&requested&&cardFor(notebook(requested))){
      autoAttempted=true;
      try{await deleteTracked(async step=>{const result=await chrome.runtime.sendMessage({type:'readingsCleanupSubmit',id:submitId,step});if(!result?.received)throw Error(result?.error||'Submitted-quiz cleanup stopped.');return result;});panel.querySelector('#study-cleanup-status').textContent='Submitted quiz notebook deleted.';}
      catch(error){panel.querySelector('#study-cleanup-status').textContent='Cleanup needs review: '+error.message;}
      return;
    }
    // Auto opens only this exact tracked notebook's native confirmation; the
    // final irreversible Delete still requires the user's own action.
    if(!autoAttempted&&prefs.afterUse&&requested&&new URL(location.href).searchParams.get('studyCleanupAuto')==='1'){
      const paths=Object.values(books).filter(book=>book.createdByAutomation===true&&notebook(book.url)===notebook(requested));
      if(paths.length&&!busy){autoAttempted=true;await review(paths[0],panel.querySelector('#study-cleanup-status'));}
    }
    // Do not forget the association while a confirmation dialog is still open.
    if(pending&&!busy&&!document.querySelector('[role="dialog"],mat-dialog-container')&&!notebookPresent(pending.path)){
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
  async function deleteTracked(step,{atLimit=false}={}){
    if(busy||pending||document.querySelector('[role="dialog"],mat-dialog-container'))throw Error('Close the existing notebook dialog before automatic cleanup.');
    busy=true;
    const stop=panel?.querySelector('button[data-cleanup-stop]');
    if(stop)stop.hidden=false;
    const active=()=>{if(stopped)throw Error('Cleanup stopped.');};
    try{
      active();
      const {candidate}=atLimit?await chooseQuotaCandidate(step):await step('quota');
      const path=notebook(candidate?.url),menu=path&&await findNotebookMenu(path);
      if(!menu)throw Error('The eligible notebook card is missing or ambiguous. No notebook was deleted.');
      active();menu.click();
      const wait=async(read,error='Notebook cleanup controls did not become ready.')=>{const end=Date.now()+8000;while(Date.now()<end){active();const value=read();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error(error);};
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
      active();await step('quotaConfirm');
      active();if(confirmation()!==confirm)throw Error('The notebook deletion confirmation changed. No notebook was deleted.');
      confirm.click();
      await wait(()=>!document.querySelector('[role="dialog"],mat-dialog-container')&&!notebookPresent(path),'NotebookLM has not confirmed removal of the selected notebook. Check its home-page entry before retrying.');
      await step('quotaRemoved');
    }finally{busy=false;if(stop)stop.hidden=true;}
  }
  globalThis.StudyNotebookCleanup={async freeSlot(id){
    stopped=false;
    return deleteTracked(async (name,extra)=>{
      const result=await chrome.runtime.sendMessage({type:'readingsStep',id,step:name,...extra});
      if(!result?.received)throw Error(result?.error||'Notebook cleanup stopped.');
      return result;
    },{atLimit:true});
  }};
  const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;setTimeout(()=>scan().catch(()=>{}),250);}});observer.observe(document.documentElement,{childList:true,subtree:true});scan().catch(()=>{});
})();
