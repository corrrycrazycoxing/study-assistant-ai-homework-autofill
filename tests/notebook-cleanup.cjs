const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='https://notebook.google.com',managed={url:root+'/notebook/managed',title:'Managed reading',createdByAutomation:true};
async function fixture({prefs={afterUse:true},requested=managed.url,limit=false,duplicate=false,sameCardLinks=false,cardIdentity=null,sameTitle=false,menuLabel="Project actions",expand=false,slowView=false,missing=false,personal=false,auto=false,wrongDialog=false,revoke=false,generic=false,icon=false,delayedDialog=false,changeOnConfirm=false,run=false,submit=false}={}){
 let clock=100,observer,menuOpen=false,dialog=false,cardPresent=!missing&&!expand,menuClicks=0,deleteClicks=0,confirmClicks=0;
 const timers=[];const local={notebookCleanupPreferences:prefs,readingNotebooks:{managed:structuredClone(personal?{...managed,createdByAutomation:false}:managed),old:{url:root+'/notebook/old',title:'Legacy reading'},personal:{url:root+'/notebook/personal',title:'Personal reading',createdByAutomation:false}}};
 class Element{
  constructor(tag,text=''){this.tagName=tag.toUpperCase();this.textContent=text;this.children=[];this.isConnected=true;this.style={};}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  getClientRects(){return this.isConnected&&!this.hidden?[{}]:[];}
  closest(selector){return matches(this,selector)?this:this.parentElement?.closest(selector)||null;}
  setAttribute(name,value){this.attributes||={};this.attributes[name]=value;}
  getAttribute(name){return name==='aria-label'?this.ariaLabel||null:this.attributes?.[name]||null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(matches(child,selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){if(selector==='.mat-mdc-menu-item-text')return this.menuText||null;return this.querySelectorAll(selector)[0]||null;}
  remove(){this.isConnected=false;this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
  click(){return this.onclick?.();}
 }
 const identitySelector='a[href],[routerlink],[data-notebook-id],[data-project-id]';
 function matches(el,selector){
  if(selector==='button[data-cleanup-stop]')return el.tagName==='BUTTON'&&Object.hasOwn(el.attributes||{},'data-cleanup-stop');
  if(selector.startsWith('#'))return el.id===selector.slice(1);
  if(selector===identitySelector)return Boolean(el.href||el.attributes?.routerlink||el.attributes?.['data-notebook-id']||el.attributes?.['data-project-id']);
  if(selector==='mat-card,mat-row,tr,[role="row"]')return el.tagName==='MAT-CARD';
  if(selector==='h3,[role="heading"],.project-title')return el.tagName==='H3';
  return selector.includes('button')&&el.tagName==='BUTTON';
 }
 const body=new Element('body');body.innerText=limit?'You have reached the maximum number of notebooks.':'';
 const card=new Element(cardIdentity?'mat-card':'div'),link=new Element('a');
 if(cardIdentity==='routerlink')card.attributes={routerlink:'/notebook/managed'};
 else if(['id','wrong'].includes(cardIdentity))card.attributes={'data-notebook-id':cardIdentity==='wrong'?'other':'managed'};
 else if(!cardIdentity||cardIdentity==='hidden-link')link.href=managed.url;
 if(cardIdentity==='hidden-link')link.hidden=true;
 if(cardIdentity)card.append(new Element('h3',managed.title));
 if(sameTitle)local.readingNotebooks.second={...managed,url:root+'/notebook/other123'};
 const menu=new Element('button');menu.ariaLabel=menuLabel;menu.onclick=()=>{menuClicks++;menuOpen=true;};card.append(link,menu);body.append(card);
 const extraLink=new Element('a');extraLink.href=managed.url;
 if(sameCardLinks)card.append(extraLink);
 if(duplicate){const otherCard=new Element('div'),otherMenu=new Element('button');otherMenu.ariaLabel='Project Actions Menu';otherMenu.onclick=()=>menuClicks++;otherCard.append(extraLink,otherMenu);body.append(otherCard);}
 if(expand){
  const more=new Element('button','See more recent notebooks');
  let changedView=false;
  more.onclick=()=>{
   if(!slowView){cardPresent=true;return;}
   timers.push({time:clock+1100,fn:()=>{if(!changedView)cardPresent=true;}});
  };
  body.append(more);
  if(slowView){const mine=new Element('button','My notebooks');mine.onclick=()=>{changedView=true;};body.append(mine);}
 }

 const deleteItem=new Element('button','Delete');deleteItem.onclick=()=>{
  deleteClicks++;dialog=true;menuOpen=false;
  if(delayedDialog){const text=dialogNode.textContent;dialogNode.textContent='';dialogNode.children=[];timers.push({time:clock+250,fn:()=>{dialogNode.textContent=text;dialogNode.append(confirm);}});}
 };
 if(icon){deleteItem.textContent='delete Delete';deleteItem.menuText=new Element('span',' Delete ');}
 const confirm=new Element('button','Delete');confirm.onclick=()=>{confirmClicks++;dialog=false;cardPresent=false;};
 const dialogNode=new Element('div',wrongDialog?'Delete Personal reading?':generic?'Delete this notebook?This notebook and all of its content will be permanently deleted across all locations, including Gemini.CancelDelete':'Delete Managed reading?');dialogNode.append(confirm);
 const steps=[],messages=[];
 const document={body,documentElement:{},createElement:tag=>new Element(tag),querySelectorAll(selector){
  if(selector===identitySelector){
   const native=cardPresent?(duplicate||sameCardLinks?[link,extraLink]:cardIdentity==='title'?[]:cardIdentity&&cardIdentity!=='hidden-link'?[card]:[link]):[];
   const helper=body.querySelector('#study-notebook-cleanup')?.querySelectorAll(identitySelector)||[];
   return [...native,...helper];
  }
  if(selector==='mat-card,mat-row,tr,[role="row"]'&&!cardPresent)return [];
  if(selector==='[role="menuitem"],button')return menuOpen?[deleteItem]:dialog?[confirm]:[];
  return body.querySelectorAll(selector);
 },querySelector(selector){if(selector==='[role="dialog"],mat-dialog-container')return dialog?dialogNode:null;return body.querySelector(selector);}};
 const location={origin:root,hostname:'notebook.google.com',pathname:'/',href:root+'/?'+(requested?'studyCleanup='+encodeURIComponent(requested):'')+(auto?'&studyCleanupAuto=1':'')+(run?'&studyCleanupRun=cleanup-run':'')+(submit?'&studyCleanupSubmit=1':'')};
 const context={document,location,URL,Date:{now:()=>clock},chrome:{runtime:{async sendMessage(message){messages.push(message);steps.push(message.step);if(message.type==='readingsCleanupDelete'&&message.step==='quotaRemoved')delete local.readingNotebooks.managed;if(message.step==='quota'&&message.visibleNotebookUrls&&!message.visibleNotebookUrls.includes(managed.url))return {received:true,waitingForCard:true};if(message.step==='quotaConfirm'&&revoke)return {received:false,error:'Stopped'};if(message.step==='quotaConfirm'&&changeOnConfirm)dialog=false;return {received:true,candidate:{...managed}};}},storage:{local:{async get(){return structuredClone(local);},async set(data){Object.assign(local,structuredClone(data));}}}},MutationObserver:class{constructor(fn){observer=this;this.fn=fn;}observe(){}disconnect(){this.disconnected=true;}},setTimeout(fn,ms){timers.push({fn,time:clock+ms});}};
 vm.runInNewContext(fs.readFileSync('content-scripts/notebook-cleanup.js','utf8'),context);
 const flush=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);};
 await flush();
 const advance=async ms=>{clock+=ms;for(let i=0;i<20;i++){const index=timers.findIndex(t=>t.time<=clock);if(index<0)break;const [timer]=timers.splice(index,1);timer.fn();await flush();}};
 const mutate=async()=>{observer.fn();await advance(250);};
 const buttons=()=>body.querySelectorAll('button,[role="button"]').filter(x=>x.textContent.startsWith('Delete notebook'));
 return {freeSlot:()=>context.StudyNotebookCleanup.freeSlot('job'),steps,messages,local,body,location,buttons,mutate,advance,flush,counts:()=>({menuClicks,deleteClicks,confirmClicks}),status:()=>body.querySelector('#study-cleanup-status')?.textContent,cancel:async()=>{dialog=false;await mutate();},confirm:async()=>{confirm.click();await mutate();await advance(1800);},hideCard:async()=>{cardPresent=false;await mutate();},restoreCard:async()=>{cardPresent=true;await mutate();},clearLimit:async()=>{body.innerText='';await mutate();}};
}
(async()=>{
 const ownLink=await fixture();
 const deletionResult=ownLink.freeSlot();
 const settled=deletionResult.then(()=>({ok:true}),error=>({error}));
 await ownLink.flush();await ownLink.advance(8100);
 const result=await settled;
 assert.equal(result.error,undefined,'the helper Open notebook link must not prevent the removal receipt');
 assert.deepEqual(ownLink.steps,['quota','quotaConfirm','quotaRemoved']);
 assert(ownLink.body.querySelector('#study-cleanup-list').querySelectorAll('a[href],[routerlink],[data-notebook-id],[data-project-id]').some(link=>link.href===managed.url),'the extension link is still present when native removal completes');
 for(const menuLabel of ['Project actions','Project Actions Menu','Notebook actions']){
  const liveLabel=await fixture({menuLabel});
  await liveLabel.buttons()[0].click();
  assert.equal(liveLabel.counts().confirmClicks,1,'Delete notebook completes the native flow for '+menuLabel);
  assert(liveLabel.messages.every(message=>message.type==='readingsCleanupDelete'));
 }
 const submitted=await fixture({prefs:{afterSubmit:true},run:true,submit:true,generic:true});assert.equal(submitted.counts().confirmClicks,1);assert.deepEqual(submitted.steps,['quota','quotaConfirm','quotaRemoved']);assert(submitted.messages.every(message=>message.type==='readingsCleanupSubmit'));await submitted.mutate();assert.equal(submitted.counts().confirmClicks,1,'submission cleanup is one-shot');
 const disabled=await fixture({prefs:{}});assert.equal(disabled.buttons().length,0,'cleanup is opt-in');
 const full=await fixture({prefs:{atLimit:true},requested:null});await full.freeSlot();assert.deepEqual(full.steps,['quota','quotaConfirm','quotaRemoved']);assert.equal(full.counts().confirmClicks,1,'quota cleanup confirms the matched notebook then reports removal');
 const sameCard=await fixture({sameCardLinks:true});await sameCard.freeSlot();assert.equal(sameCard.counts().confirmClicks,1,'duplicate links within one verified card can share its action menu');
 const expanded=await fixture({prefs:{atLimit:true},expand:true});const finding=expanded.freeSlot();await expanded.flush();assert.equal(expanded.counts().confirmClicks,0);await expanded.advance(400);await finding;
 assert.equal(expanded.counts().confirmClicks,1,'quota cleanup waits for an eligible card revealed by expanding the notebook list');
 assert.equal(expanded.messages[0].visibleNotebookUrls.length,0);assert.equal(expanded.messages[1].visibleNotebookUrls[0],managed.url);
 const slow=await fixture({expand:true,slowView:true});
 const waitingForView=slow.freeSlot();await slow.flush();
 for(let i=0;i<4;i++)await slow.advance(400);
 await waitingForView;
 assert.equal(slow.counts().confirmClicks,1,'wait for the expanded view before changing filters');
 const ambiguous=await fixture({duplicate:true});const noMatch=assert.rejects(ambiguous.freeSlot(),/No eligible notebook card could be verified/);await ambiguous.flush();await ambiguous.advance(8100);await noMatch;assert.equal(ambiguous.counts().confirmClicks,0);
 for(const cardIdentity of ['routerlink','id','hidden-link']){
  const modern=await fixture({cardIdentity});await modern.buttons()[0].click();
  assert.equal(modern.counts().deleteClicks,1,'a clickable card with a visible notebook identity opens the native confirmation');
  assert.equal(modern.counts().confirmClicks,1,'the delete button completes native confirmation');
  assert(!modern.local.readingNotebooks.managed,'wait for the identity-bearing card to disappear');
  const quotaModern=await fixture({cardIdentity});await quotaModern.freeSlot();assert.equal(quotaModern.counts().confirmClicks,1);
 }
 const opened=await fixture({cardIdentity:'title'});await opened.buttons()[0].click();
 assert.equal(opened.counts().menuClicks,0,'a title alone cannot authorize deletion');
 const wrongId=await fixture({cardIdentity:'wrong'});await wrongId.buttons()[0].click();assert.equal(wrongId.counts().menuClicks,0,'an explicit conflicting notebook ID blocks title-only menu review');
 const sameTitle=await fixture({cardIdentity:'title',requested:null,limit:true,prefs:{atLimit:true},sameTitle:true});await sameTitle.advance(8200);
 const choices=sameTitle.buttons();assert.equal(choices.length,2);assert.notEqual(choices[0].textContent,choices[1].textContent);
 assert.deepEqual(choices.map(button=>button.parentElement.children[1].href),[managed.url,root+'/notebook/other123']);
 await choices[1].click();assert.equal(sameTitle.counts().menuClicks,0,'same-titled notebooks cannot be matched by title');assert.match(sameTitle.status(),/missing or ambiguous/);
 const native=await fixture({generic:true});await native.freeSlot();assert.equal(native.counts().confirmClicks,1,'observed native generic dialog works after an exact card/menu selection');
 const material=await fixture({generic:true,icon:true});const removing=material.freeSlot();await material.flush();await material.advance(8100);await removing;assert.equal(material.counts().confirmClicks,1,'native Material icon text does not hide the Delete action');
 const delayed=await fixture({generic:true,icon:true,delayedDialog:true});const rendering=delayed.freeSlot();await delayed.flush();assert.equal(delayed.counts().confirmClicks,0,'empty mounted dialog cannot be confirmed');await delayed.advance(300);await rendering;assert.equal(delayed.counts().confirmClicks,1,'wait for the native warning and Delete button to render');assert.deepEqual(delayed.steps,['quota','quotaConfirm','quotaRemoved']);
 const cancellable=await fixture({generic:true,delayedDialog:true});
 const cancelDeletion=assert.rejects(cancellable.freeSlot(),/Cleanup stopped/);await cancellable.flush();
 const cancelButton=cancellable.body.querySelectorAll('button').find(button=>button.textContent==='Stop cleanup');
 assert.equal(cancelButton.hidden,false);cancelButton.click();await cancellable.advance(300);await cancelDeletion;
 assert.equal(cancellable.counts().confirmClicks,0,'Stop cancels while the final dialog mounts');
 const styled=await fixture();
 const collapse=styled.body.querySelectorAll('button').find(button=>button.textContent==='Collapse');
 collapse.click();assert.equal(collapse.getAttribute('aria-expanded'),'false');assert(styled.body.querySelector('#study-cleanup-list').hidden);
 assert.equal(styled.status().length>0,true,'status remains available when collapsed');
 collapse.click();assert.equal(collapse.getAttribute('aria-expanded'),'true');
 const wrong=await fixture({wrongDialog:true});const rejected=assert.rejects(wrong.freeSlot(),/does not identify/);await wrong.flush();await wrong.advance(8100);await rejected;assert.equal(wrong.counts().confirmClicks,0);
 const changed=await fixture({changeOnConfirm:true});await assert.rejects(changed.freeSlot(),/confirmation changed/);assert.equal(changed.counts().confirmClicks,0,'a changed dialog after backend authorization must not be clicked');
 const stopped=await fixture({revoke:true});await assert.rejects(stopped.freeSlot(),/Stopped/);assert.equal(stopped.counts().confirmClicks,0,'Stop just before confirmation prevents deletion');
 const automatic=await fixture({auto:true});assert.deepEqual(automatic.counts(),{menuClicks:1,deleteClicks:1,confirmClicks:0},'after-use trigger opens the exact confirmation automatically');await automatic.mutate();assert.equal(automatic.counts().deleteClicks,1,'automatic trigger runs once');
 const iconReview=await fixture({auto:true,icon:true});assert.deepEqual(iconReview.counts(),{menuClicks:1,deleteClicks:1,confirmClicks:0},'icon-bearing Delete works for normal after-use confirmation handoff too');
 const managedRun=await fixture({auto:true,run:true});assert.equal(managedRun.messages.length,0,'do not close before confirmed removal');await managedRun.confirm();assert.equal(managedRun.messages.length,1);assert.equal(managedRun.messages[0].type,'readingsCleanupFinished');assert.equal(managedRun.messages[0].id,'cleanup-run');await managedRun.mutate();assert.equal(managedRun.messages.length,1,'one closure receipt after sustained removal');
 const after=await fixture({auto:true});assert.equal(after.buttons().length,1,'only automation-owned requested notebook is offered');
 await after.flush();assert.deepEqual(after.counts(),{menuClicks:1,deleteClicks:1,confirmClicks:0},'real cleanup code opens menu and dialog but never confirms');
 await after.cancel();await after.advance(2000);assert(after.local.readingNotebooks.managed,'Cancel retains the association');
 await after.buttons()[0].click();await after.flush();assert(!after.local.readingNotebooks.managed,'confirmed removal forgets its saved mapping');assert(after.local.readingNotebooks.personal&&after.local.readingNotebooks.old,'personal and legacy mappings survive');assert.equal(after.counts().confirmClicks,1,'delete button confirms deletion after the confirmation-only attempt was cancelled');
 const transient=await fixture({prefs:{atLimit:true},requested:null,limit:true});assert.equal(transient.buttons().length,0);await transient.clearLimit();await transient.advance(8200);assert.equal(transient.buttons().length,0,'transient quota banner does not offer cleanup');
 const quota=await fixture({prefs:{atLimit:true},requested:null,limit:true});await quota.advance(8200);assert.equal(quota.buttons().length,1,'persistent quota banner offers owned notebook cleanup');
 for(const options of [{duplicate:true},{missing:true}]){const run=await fixture(options);await run.buttons()[0].click();await run.flush();assert.equal(run.counts().deleteClicks,0,'missing/ambiguous card cannot delete another notebook');}
 const privateBook=await fixture({personal:true});assert.equal(privateBook.buttons().length,0,'user-created notebook cannot be offered even when requested');
 const unsafe=await fixture({requested:'https://attacker.example/notebook/managed'});assert.equal(unsafe.buttons().length,0,'foreign URL cannot select a candidate');
 const flicker=await fixture({auto:true});await flicker.flush();await flicker.cancel();await flicker.hideCard();await flicker.restoreCard();await flicker.advance(2000);assert(flicker.local.readingNotebooks.managed,'transient card disappearance does not forget the association');
 console.log('PASS production notebook cleanup: both opt-in triggers, stable quota, owned exact card, native confirmation handoff, Cancel, confirmed removal, ambiguous/missing controls, foreign URL and render flicker');
})().catch(error=>{console.error(error);process.exitCode=1;});
