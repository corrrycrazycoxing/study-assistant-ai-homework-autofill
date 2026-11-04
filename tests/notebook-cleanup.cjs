const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='https://notebook.google.com',managed={url:root+'/notebook/managed',title:'Managed reading',createdByAutomation:true};
async function fixture({prefs={afterUse:true},requested=managed.url,limit=false,duplicate=false,missing=false,personal=false,auto=false,wrongDialog=false,revoke=false,generic=false,icon=false,delayedDialog=false,changeOnConfirm=false,run=false}={}){
 let clock=100,observer,menuOpen=false,dialog=false,cardPresent=!missing,menuClicks=0,deleteClicks=0,confirmClicks=0;
 const timers=[];const local={notebookCleanupPreferences:prefs,readingNotebooks:{managed:structuredClone(personal?{...managed,createdByAutomation:false}:managed),old:{url:root+'/notebook/old',title:'Legacy reading'},personal:{url:root+'/notebook/personal',title:'Personal reading',createdByAutomation:false}}};
 class Element{
  constructor(tag,text=''){this.tagName=tag.toUpperCase();this.textContent=text;this.children=[];this.isConnected=true;this.style={};}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  getClientRects(){return this.isConnected?[{}]:[];}
  getAttribute(name){return name==='aria-label'?this.ariaLabel||null:null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(matches(child,selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){if(selector==='.mat-mdc-menu-item-text')return this.menuText||null;return this.querySelectorAll(selector)[0]||null;}
  remove(){this.isConnected=false;this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
  click(){return this.onclick?.();}
 }
 function matches(el,selector){return selector.startsWith('#')?el.id===selector.slice(1):selector==='a[href]'?Boolean(el.href):(selector==='button,[role="button"]'||selector==='button')?el.tagName==='BUTTON':false;}
 const body=new Element('body');body.innerText=limit?'You have reached the maximum number of notebooks.':'';
 const card=new Element('div'),link=new Element('a');link.href=managed.url;
 const menu=new Element('button');menu.ariaLabel='Project Actions Menu';menu.onclick=()=>{menuClicks++;menuOpen=true;};card.append(link,menu);body.append(card);
 const deleteItem=new Element('button','Delete');deleteItem.onclick=()=>{
  deleteClicks++;dialog=true;menuOpen=false;
  if(delayedDialog){const text=dialogNode.textContent;dialogNode.textContent='';dialogNode.children=[];timers.push({time:clock+250,fn:()=>{dialogNode.textContent=text;dialogNode.append(confirm);}});}
 };
 if(icon){deleteItem.textContent='delete Delete';deleteItem.menuText=new Element('span',' Delete ');}
 const confirm=new Element('button','Delete');confirm.onclick=()=>{confirmClicks++;dialog=false;cardPresent=false;};
 const dialogNode=new Element('div',wrongDialog?'Delete Personal reading?':generic?'Delete this notebook?This notebook and all of its content will be permanently deleted across all locations, including Gemini.CancelDelete':'Delete Managed reading?');dialogNode.append(confirm);
 const steps=[],messages=[];
 const document={body,documentElement:{},createElement:tag=>new Element(tag),querySelectorAll(selector){
  if(selector==='a[href]')return cardPresent?(duplicate?[link,link]:[link]):[];
  if(selector==='[role="menuitem"],button')return menuOpen?[deleteItem]:dialog?[confirm]:[];
  return body.querySelectorAll(selector);
 },querySelector(selector){if(selector==='[role="dialog"],mat-dialog-container')return dialog?dialogNode:null;return body.querySelector(selector);}};
 const location={origin:root,hostname:'notebook.google.com',pathname:'/',href:root+'/?'+(requested?'studyCleanup='+encodeURIComponent(requested):'')+(auto?'&studyCleanupAuto=1':'')+(run?'&studyCleanupRun=cleanup-run':'')};
 const context={document,location,URL,Date:{now:()=>clock},chrome:{runtime:{async sendMessage(message){messages.push(message);steps.push(message.step);if(message.step==='quotaConfirm'&&revoke)return {received:false,error:'Stopped'};if(message.step==='quotaConfirm'&&changeOnConfirm)dialog=false;return {received:true,candidate:{...managed}};}},storage:{local:{async get(){return structuredClone(local);},async set(data){Object.assign(local,structuredClone(data));}}}},MutationObserver:class{constructor(fn){observer=this;this.fn=fn;}observe(){}disconnect(){this.disconnected=true;}},setTimeout(fn,ms){timers.push({fn,time:clock+ms});}};
 vm.runInNewContext(fs.readFileSync('content-scripts/notebook-cleanup.js','utf8'),context);
 const flush=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);};
 await flush();
 const advance=async ms=>{clock+=ms;for(let i=0;i<20;i++){const index=timers.findIndex(t=>t.time<=clock);if(index<0)break;const [timer]=timers.splice(index,1);timer.fn();await flush();}};
 const mutate=async()=>{observer.fn();await advance(250);};
 const buttons=()=>body.querySelectorAll('button,[role="button"]').filter(x=>x.textContent.startsWith('Review delete'));
 return {freeSlot:()=>context.StudyNotebookCleanup.freeSlot('job'),steps,messages,local,body,location,buttons,mutate,advance,flush,counts:()=>({menuClicks,deleteClicks,confirmClicks}),status:()=>body.querySelector('#study-cleanup-status')?.textContent,cancel:async()=>{dialog=false;await mutate();},confirm:async()=>{confirm.click();await mutate();await advance(1800);},hideCard:async()=>{cardPresent=false;await mutate();},restoreCard:async()=>{cardPresent=true;await mutate();},clearLimit:async()=>{body.innerText='';await mutate();}};
}
(async()=>{
 const disabled=await fixture({prefs:{}});assert.equal(disabled.buttons().length,0,'cleanup is opt-in');
 const full=await fixture({prefs:{atLimit:true},requested:null});await full.freeSlot();assert.deepEqual(full.steps,['quota','quotaConfirm','quotaRemoved']);assert.equal(full.counts().confirmClicks,1,'quota cleanup confirms the matched notebook then reports removal');
 const native=await fixture({generic:true});await native.freeSlot();assert.equal(native.counts().confirmClicks,1,'observed native generic dialog works after an exact card/menu selection');
 const material=await fixture({generic:true,icon:true});const removing=material.freeSlot();await material.flush();await material.advance(8100);await removing;assert.equal(material.counts().confirmClicks,1,'native Material icon text does not hide the Delete action');
 const delayed=await fixture({generic:true,icon:true,delayedDialog:true});const rendering=delayed.freeSlot();await delayed.flush();assert.equal(delayed.counts().confirmClicks,0,'empty mounted dialog cannot be confirmed');await delayed.advance(300);await rendering;assert.equal(delayed.counts().confirmClicks,1,'wait for the native warning and Delete button to render');assert.deepEqual(delayed.steps,['quota','quotaConfirm','quotaRemoved']);
 const wrong=await fixture({wrongDialog:true});const rejected=assert.rejects(wrong.freeSlot(),/does not identify/);await wrong.flush();await wrong.advance(8100);await rejected;assert.equal(wrong.counts().confirmClicks,0);
 const changed=await fixture({changeOnConfirm:true});await assert.rejects(changed.freeSlot(),/confirmation changed/);assert.equal(changed.counts().confirmClicks,0,'a changed dialog after backend authorization must not be clicked');
 const stopped=await fixture({revoke:true});await assert.rejects(stopped.freeSlot(),/Stopped/);assert.equal(stopped.counts().confirmClicks,0,'Stop just before confirmation prevents deletion');
 const automatic=await fixture({auto:true});assert.deepEqual(automatic.counts(),{menuClicks:1,deleteClicks:1,confirmClicks:0},'after-use trigger opens the exact confirmation automatically');await automatic.mutate();assert.equal(automatic.counts().deleteClicks,1,'automatic trigger runs once');
 const iconReview=await fixture({auto:true,icon:true});assert.deepEqual(iconReview.counts(),{menuClicks:1,deleteClicks:1,confirmClicks:0},'icon-bearing Delete works for normal after-use confirmation handoff too');
 const managedRun=await fixture({auto:true,run:true});assert.equal(managedRun.messages.length,0,'do not close before confirmed removal');await managedRun.confirm();assert.equal(managedRun.messages.length,1);assert.equal(managedRun.messages[0].type,'readingsCleanupFinished');assert.equal(managedRun.messages[0].id,'cleanup-run');await managedRun.mutate();assert.equal(managedRun.messages.length,1,'one closure receipt after sustained removal');
 const after=await fixture();assert.equal(after.buttons().length,1,'only automation-owned requested notebook is offered');
 await after.buttons()[0].click();await after.flush();assert.deepEqual(after.counts(),{menuClicks:1,deleteClicks:1,confirmClicks:0},'real cleanup code opens menu and dialog but never confirms');
 await after.cancel();await after.advance(2000);assert(after.local.readingNotebooks.managed,'Cancel retains the association');
 await after.buttons()[0].click();await after.flush();await after.confirm();assert(!after.local.readingNotebooks.managed,'confirmed removal forgets its saved mapping');assert(after.local.readingNotebooks.personal&&after.local.readingNotebooks.old,'personal and legacy mappings survive');assert.equal(after.counts().confirmClicks,1,'only simulated user confirmed deletion');
 const transient=await fixture({prefs:{atLimit:true},requested:null,limit:true});assert.equal(transient.buttons().length,0);await transient.clearLimit();await transient.advance(8200);assert.equal(transient.buttons().length,0,'transient quota banner does not offer cleanup');
 const quota=await fixture({prefs:{atLimit:true},requested:null,limit:true});await quota.advance(8200);assert.equal(quota.buttons().length,1,'persistent quota banner offers owned notebook cleanup');
 for(const options of [{duplicate:true},{missing:true}]){const run=await fixture(options);await run.buttons()[0].click();await run.flush();assert.equal(run.counts().deleteClicks,0,'missing/ambiguous card cannot delete another notebook');}
 const privateBook=await fixture({personal:true});assert.equal(privateBook.buttons().length,0,'user-created notebook cannot be offered even when requested');
 const unsafe=await fixture({requested:'https://attacker.example/notebook/managed'});assert.equal(unsafe.buttons().length,0,'foreign URL cannot select a candidate');
 const flicker=await fixture();await flicker.buttons()[0].click();await flicker.flush();await flicker.cancel();await flicker.hideCard();await flicker.restoreCard();await flicker.advance(2000);assert(flicker.local.readingNotebooks.managed,'transient card disappearance does not forget the association');
 console.log('PASS production notebook cleanup: both opt-in triggers, stable quota, owned exact card, native confirmation handoff, Cancel, confirmed removal, ambiguous/missing controls, foreign URL and render flicker');
})().catch(error=>{console.error(error);process.exitCode=1;});
