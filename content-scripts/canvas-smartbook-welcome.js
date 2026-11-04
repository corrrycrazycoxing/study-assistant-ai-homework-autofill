/* Only advance a course-owned, title-matched SmartBook welcome screen. */
(() => {
  if(window!==window.top||location.origin!=='https://learning.mheducation.com'||!location.pathname.startsWith('/static/awd/'))return;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const visible=e=>e?.isConnected&&e.getClientRects().length&&!e.disabled&&!e.closest('[hidden],[aria-hidden="true"]');
  const label=e=>clean(e.innerText||e.textContent);
  const questionButtons=()=>[...document.querySelectorAll('button')].filter(e=>visible(e)&&/^(?:Start|Continue) Questions$/i.test(label(e)));
  const send=(type,extra={})=>chrome.runtime.sendMessage({type,title:startedTitle,...extra});
  let busy=false,clicked=false,startedTitle='',action='',lastTip=null,questionKey='',stableQuestion=0;
  async function check(){
    if(busy)return;busy=true;
    try{
      const buttons=questionButtons();
      if(!clicked){
        const headings=[...document.querySelectorAll('h1,h2,h3')].filter(visible);
        const assignments=headings.filter(e=>/^SmartBook Assignment\b/i.test(label(e)));
        if(buttons.length!==1||assignments.length!==1)return;
        const title=label(assignments[0]).replace(/^SmartBook Assignment\s*(?:[|:—–-]\s*)?/i,'');
        if(!title)return;
        const nextAction=/^Continue /i.test(label(buttons[0]))?'continue':'start';
        const permit=await chrome.runtime.sendMessage({type:'canvasCourseSmartbookWelcome',title,action:nextAction});
        if(permit?.skip){clearInterval(timer);return;}
        if(permit?.start&&visible(buttons[0])&&questionButtons().length===1&&questionButtons()[0]===buttons[0]){clicked=true;startedTitle=title;action=nextAction;buttons[0].click();}
        return;
      }
      if(buttons.length)return;
      const dialogs=[...document.querySelectorAll('[role="dialog"],dialog')].filter(visible);
      const tips=dialogs.filter(e=>[...e.querySelectorAll('h1,h2,h3')].some(h=>/^Assignment Tips$/i.test(label(h))));
      if(tips.length){
        const controls=tips.length===1?[...tips[0].querySelectorAll('button')].filter(e=>visible(e)&&/^Got It$/i.test(label(e))):[];
        if(controls.length===1&&controls[0]!==lastTip){
          const permit=await send('canvasCourseSmartbookWelcome',{action});
          if(permit?.start){lastTip=controls[0];controls[0].click();}
        }
        return;
      }
      if(dialogs.length)return;
      const question=document.querySelector('.probe-container'),prompt=question?.querySelector('.prompt');
      const key=visible(question)&&visible(prompt)?label(prompt):'';
      if(!key){questionKey='';stableQuestion=0;return;}
      stableQuestion=key===questionKey?stableQuestion+1:1;questionKey=key;
      if(stableQuestion<2)return;
      const result=await send('canvasCourseSmartbookReady');
      if(result?.received)clearInterval(timer);
    }catch{}finally{busy=false;}
  }
  const timer=setInterval(check,1800);check();
})();
