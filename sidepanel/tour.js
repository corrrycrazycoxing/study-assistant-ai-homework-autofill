/* Local guided tour. It never starts AI requests, fills answers, or changes settings. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const steps=[
  {target:'#assignment',title:'1. Choose your assignment',text:'Pick the assignment you want help with. If it is missing, reload its page first.'},
  {target:'.connections',title:'2. Connect an AI tab',text:'Open your preferred chatbot and sign in. NotebookLM can use selected course readings when you enable it. Opening a tab alone does not send a question.'},
  {target:'.main-actions',title:'3. Choose how to get help',text:'Ask AI shows one answer. Fill answers enters it in Auto modes. Start Auto repeats the supported flow. In Guided Answers, Guide me shows the answer and explanation; you enter it yourself.'},
  {target:'.answer-card',title:'4. Read the answer',text:'Find each answer beside its question or field label, then read the explanation. Edit answer changes a prepared draft before filling. Nerd mode shows technical details.'},
  {target:'#activity',title:'5. Follow progress',text:'The bar shows the current question stage, not assignment completion. Timed modes show countdown controls here. Guided Answers has no countdown or automatic entry.'},
  {target:'#settings',title:'6. Open Settings',text:'Choose the highlighted Settings button. It opens within this side panel.',action:'settings',button:'Open Settings →'},
  {frame:'#settings-frame',target:'.pace-card:first-child',title:'7. Choose a mode',text:'These cards explain the four modes. Choose one after the walkthrough: the Auto modes enter answers; Guided Answers lets you enter them yourself.'},
  {frame:'#settings-frame',target:'.settings-nav',title:'8. Find other preferences',text:'Use AI & readings for chatbots and NotebookLM, Pictures for visible graphics, and Platform options for site controls. Changes save automatically.'},
  {target:'#back-to-assistant',title:'9. Return to the assistant',text:'Choose Back to return to the assignment controls. Expanded view is available if you want more room.',action:'back',button:'Back to assistant →'},
  {target:'#stop-all',title:'10. Stop when needed',text:'Stop all cancels pending work; entered values remain. Reopen this walkthrough from Help whenever you want.'},
  {frame:'#help-frame',target:'#full-course-mode',view:'help',title:'11. Pearson course mode',text:'On Pearson’s assignments page, Full Course Mode offers to run not-started homework and lessons in order, entering through Start or the first question link. It leaves tests, exams and quizzes untouched. Questions can continue while related media stays unverified; a final review panel links back to each assignment with media to check. Pearson Save is used between assignments; final submission remains yours.'}
 ];
 let index=-1,hooks=null,clock=null,returnFocus=null,currentTarget=null;
 const layer=document.createElement('div');layer.id='tour-layer';layer.hidden=true;
 layer.innerHTML='<div class="tour-shade tour-top"></div><div class="tour-shade tour-left"></div><div class="tour-shade tour-right"></div><div class="tour-shade tour-bottom"></div><div id="tour-spotlight" aria-hidden="true"></div><div id="tour-block" aria-hidden="true"></div><section id="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description"><div class="tour-topline"><span id="tour-progress"></span><button id="tour-skip" class="tour-link">Skip walkthrough</button></div><h2 id="tour-title"></h2><p id="tour-description"></p><p id="tour-target-note" class="hint"></p><div class="tour-actions"><button id="tour-back" class="secondary">Back</button><button id="tour-next">Next →</button></div><small>Learning the controls only · nothing is sent or entered.</small></section>';
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
 function show(){const step=steps[index];$('tour-progress').textContent='WALKTHROUGH · '+(index+1)+' / '+steps.length;$('tour-title').textContent=step.title;$('tour-description').textContent=step.text;$('tour-back').disabled=index===0;$('tour-next').textContent=step.button||'Next →';
  if(step.view==='help'){hooks.openHelp();const frame=$('help-frame');frame.addEventListener('load',scrollTarget,{once:true});}
  else if(step.frame){hooks.closeHelp();hooks.openSettings();const frame=$('settings-frame');const doc=frame.contentDocument;doc?.querySelector('[data-category="automation"]')?.click();frame.addEventListener('load',scrollTarget,{once:true});}
  else if(step.target!=='#back-to-assistant'){hooks.closeSettings();hooks.closeHelp();}
  scrollTarget();$('tour-next').focus();
 }
 function finish(){if(index<0)return;index=-1;clearInterval(clock);clock=null;layer.hidden=true;document.body.classList.remove('touring');hooks?.closeSettings();hooks?.closeHelp();returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus.focus():$('help').focus();}
 function advance(){if(index<0)return;const step=steps[index];if(step.action==='settings')hooks.openSettings();if(step.action==='back')hooks.closeSettings();if(index===steps.length-1){finish();return;}index++;show();}
 $('tour-skip').onclick=finish;$('tour-next').onclick=advance;$('tour-back').onclick=()=>{if(index>0){index--;if(steps[index].target==='#back-to-assistant')hooks.openSettings();show();}};
 document.addEventListener('click',event=>{if(index<0)return;const step=steps[index];if(step.action&&event.target.closest(step.target)){event.preventDefault();event.stopImmediatePropagation();advance();}},true);
 document.addEventListener('keydown',event=>{if(index<0)return;if(event.key==='Escape'){event.preventDefault();finish();return;}if(event.key!=='Tab')return;const focusables=[...card.querySelectorAll('button:not([disabled])')];if(steps[index].action&&currentTarget&&!currentTarget.disabled)focusables.unshift(currentTarget);const first=focusables[0],last=focusables.at(-1);if(event.shiftKey&&(document.activeElement===first||!focusables.includes(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!focusables.includes(document.activeElement))){event.preventDefault();first.focus();}});
 globalThis.StudyTour={active:()=>index>=0,bind(value){hooks=value;},start(){if(!hooks||!hooks.canStart())return false;returnFocus=document.activeElement;hooks.closeSettings();index=0;layer.hidden=false;document.body.classList.add('touring');show();clock=setInterval(position,250);return true;},stop:finish};
 window.addEventListener('pagehide',()=>{clearInterval(clock);clock=null;});
})();
