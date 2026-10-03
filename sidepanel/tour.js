/* Local guided tour. It never starts AI requests, fills answers, or changes settings. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const steps=[
  {target:'#assignment',title:'1. Choose your assignment',text:'This is the page the assistant will work on. Pick it here when several assignments are open. If the list is empty, reload a supported assignment first.'},
  {target:'.connections',title:'2. Connect an AI tab',text:'Click an AI card outside the tour to open or switch to that service. Keep it signed in with an empty prompt box. NotebookLM can answer from your selected course readings; a chatbot then formats that answer for entry.'},
  {target:'.main-actions',title:'3. Ask, fill, or run Auto',text:'Ask AI prepares an answer. Fill answers enters the prepared answer. Start Auto repeats that flow and continues where supported. This tour explains the buttons without starting any work.'},
  {target:'#activity',title:'4. Follow what is happening',text:'The progress bar follows the five stages of the current question. The labels below it are status indicators, not buttons. This is stage progress, not a time estimate or an assignment completion percentage. Countdown controls appear here during timed review: Pause freezes the countdown, Continue now moves on, and Stop cancels the pending action. Website quiz timers keep running.'},
  {target:'.answer-card',title:'5. Review the answer',text:'Read numbered answers and their explanations here. Edit answer appears for supported drafts before filling. Save changes updates the draft; Fill answers enters it. Nerd mode reveals technical details only when you want them.'},
  {target:'.run-options',title:'6. Decide when to pause',text:'Pause after fill adds a review stop after a question is entered. Watch automation follows tab switches; leaving it off keeps your current tab visible. These are separate from the pace mode.'},
  {target:'#settings',title:'7. Open Settings',text:'Click the highlighted Settings button to see where the four pace cards live. Settings opens inside this panel.',action:'settings',button:'Open Settings →'},
  {frame:'#settings-frame',target:'.pace-cards',title:'8. Pick an automation pace',text:'Instant Auto adds no countdown. Timed Auto continues automatically when each countdown ends. Human pace uses an adjustable AI estimate for the question. Review each step waits for Continue now. Click a card when configuring your preferences; this tour leaves your saved mode unchanged.',modes:true},
  {frame:'#settings-frame',target:'.settings-nav',title:'9. Find the other features',text:'Automation holds pace and answer controls. AI & readings holds chatbot and NotebookLM preferences. Pictures enables visible question graphics. Platform options holds site access and checking settings. Changes save automatically.'},
  {target:'#back-to-assistant',title:'10. Return to your assistant',text:'Click the highlighted Back button to return. Expanded view in Settings is available when you want a full browser tab.',action:'back',button:'Back to assistant →'},
  {target:'.activity-history',title:'11. Recover carefully',text:'Recent activity keeps the last eight observed updates while this panel is open. Saved progress appears when supported. Attention cards explain problems and offer actions. Uncertain saves or grading still require your review.'},
  {target:'#stop-all',title:'12. You are in control',text:'Stop all cancels pending automation; values already entered remain. Review answers and follow your course rules. You can replay this walkthrough from Help whenever you want.',button:'Finish walkthrough ✓'}
 ];
 let index=-1,hooks=null,clock=null,returnFocus=null,currentTarget=null;
 const layer=document.createElement('div');layer.id='tour-layer';layer.hidden=true;
 layer.innerHTML='<div class="tour-shade tour-top"></div><div class="tour-shade tour-left"></div><div class="tour-shade tour-right"></div><div class="tour-shade tour-bottom"></div><div id="tour-spotlight" aria-hidden="true"></div><div id="tour-block" aria-hidden="true"></div><section id="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description"><div class="tour-topline"><span id="tour-progress"></span><button id="tour-skip" class="tour-link">Skip walkthrough</button></div><h2 id="tour-title"></h2><p id="tour-description"></p><div id="tour-mode-legend" hidden></div><p id="tour-target-note" class="hint"></p><div class="tour-actions"><button id="tour-back" class="secondary">Back</button><button id="tour-next">Next →</button></div><small>Learning the controls only · nothing is sent or entered.</small></section>';
 document.body.append(layer);
 const card=$('tour-card');
 function box(el){const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}
 function locate(){const step=steps[index];if(!step)return null;let doc=document,frame=null;if(step.frame){frame=document.querySelector(step.frame);try{doc=frame?.contentDocument;}catch{return null;}if(!doc)return null;}
  const elements=[...doc.querySelectorAll(step.target)].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));if(!elements.length)return null;
  const rects=elements.map(box),offset=frame?box(frame):{left:0,top:0};return {el:elements[0],elements,left:Math.min(...rects.map(r=>r.left))+offset.left,top:Math.min(...rects.map(r=>r.top))+offset.top,right:Math.max(...rects.map(r=>r.right))+offset.left,bottom:Math.max(...rects.map(r=>r.bottom))+offset.top};
 }
 function rect(el,x,y,w,h){Object.assign(el.style,{left:x+'px',top:y+'px',width:Math.max(0,w)+'px',height:Math.max(0,h)+'px'});}
 function position(){if(index<0)return;const found=locate(),W=window.innerWidth,H=window.innerHeight;
  const valid=found&&found.bottom>0&&found.top<H&&found.right>0&&found.left<W;
  currentTarget=valid?found.el:null;
  const l=valid?Math.max(5,found.left-5):W/2,t=valid?Math.max(5,found.top-5):0,r=valid?Math.min(W-5,found.right+5):W/2,b=valid?Math.min(H-5,found.bottom+5):0;
  rect(layer.querySelector('.tour-top'),0,0,W,t);rect(layer.querySelector('.tour-left'),0,t,l,b-t);rect(layer.querySelector('.tour-right'),r,t,W-r,b-t);rect(layer.querySelector('.tour-bottom'),0,b,W,H-b);
  const spot=$('tour-spotlight'),block=$('tour-block');spot.hidden=!valid;rect(spot,l,t,r-l,b-t);block.hidden=!valid||!!steps[index].action;rect(block,l,t,r-l,b-t);
  $('tour-target-note').textContent=valid?'':steps[index].frame?'Settings is loading. You can wait or skip this step.':'This control appears when an assignment is connected. You can still continue the tour.';
  const h=card.offsetHeight,cw=Math.min(360,W-24),left=Math.min(Math.max(12,(l+r-cw)/2),W-cw-12);
  let top=valid&&H-b>=h+18?b+12:valid&&t>=h+18?t-h-12:Math.max(12,H-h-12);
  card.style.width=cw+'px';card.style.left=left+'px';card.style.top=Math.max(8,Math.min(top,H-h-8))+'px';
 }
 function scrollTarget(){const found=locate();if(found){found.el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});}position();}
 function show(){const step=steps[index];$('tour-progress').textContent='WALKTHROUGH · '+(index+1)+' / '+steps.length;$('tour-title').textContent=step.title;$('tour-description').textContent=step.text;$('tour-back').disabled=index===0;$('tour-next').textContent=step.button||'Next →';$('tour-mode-legend').hidden=!step.modes;
  if(step.modes&&!$('tour-mode-legend').children.length)for(const [src,name] of [['instant','Instant Auto'],['timed','Timed Auto'],['review','Review each step']]){const row=document.createElement('span'),img=document.createElement('img');img.src='../assets/mode-'+src+'.png';img.alt='';row.append(img,document.createTextNode(name));$('tour-mode-legend').append(row);}
  if(step.frame){hooks.openSettings();const frame=$('settings-frame');const doc=frame.contentDocument;doc?.querySelector('[data-category="automation"]')?.click();frame.addEventListener('load',scrollTarget,{once:true});}
  else if(step.target!=='#back-to-assistant')hooks.closeSettings();
  scrollTarget();$('tour-next').focus();
 }
 function finish(){if(index<0)return;index=-1;clearInterval(clock);clock=null;layer.hidden=true;document.body.classList.remove('touring');hooks?.closeSettings();returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus.focus():$('help').focus();}
 function advance(){if(index<0)return;const step=steps[index];if(step.action==='settings')hooks.openSettings();if(step.action==='back')hooks.closeSettings();if(index===steps.length-1){finish();return;}index++;show();}
 $('tour-skip').onclick=finish;$('tour-next').onclick=advance;$('tour-back').onclick=()=>{if(index>0){index--;if(steps[index].target==='#back-to-assistant')hooks.openSettings();show();}};
 document.addEventListener('click',event=>{if(index<0)return;const step=steps[index];if(step.action&&event.target.closest(step.target)){event.preventDefault();event.stopImmediatePropagation();advance();}},true);
 document.addEventListener('keydown',event=>{if(index<0)return;if(event.key==='Escape'){event.preventDefault();finish();return;}if(event.key!=='Tab')return;const focusables=[...card.querySelectorAll('button:not([disabled])')];if(steps[index].action&&currentTarget&&!currentTarget.disabled)focusables.unshift(currentTarget);const first=focusables[0],last=focusables.at(-1);if(event.shiftKey&&(document.activeElement===first||!focusables.includes(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!focusables.includes(document.activeElement))){event.preventDefault();first.focus();}});
 globalThis.StudyTour={active:()=>index>=0,bind(value){hooks=value;},start(){if(!hooks||!hooks.canStart())return false;returnFocus=document.activeElement;hooks.closeSettings();index=0;layer.hidden=false;document.body.classList.add('touring');show();clock=setInterval(position,250);return true;},stop:finish};
 window.addEventListener('pagehide',()=>{clearInterval(clock);clock=null;});
})();
