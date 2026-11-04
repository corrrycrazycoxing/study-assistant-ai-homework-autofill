/* Recognize the Connect assignment-information screen before the question player. */
(() => {
  if(window!==window.top)return;let busy=false,clicked=false;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim(),visible=e=>e?.isConnected&&e.getClientRects().length&&!e.disabled&&!e.closest('[hidden],[aria-hidden="true"]');
  async function check(){
    if(busy||clicked||!/^#\/activity\/?$/.test(location.hash))return;busy=true;
    try{
      const heading=[...document.querySelectorAll('h1,h2')].find(e=>visible(e)&&/assignment information/i.test(e.getAttribute('aria-label')||e.innerText||e.textContent));
      if(!heading)return;
      const title=clean(heading.innerText||heading.textContent).replace(/\s+Assignment information$/i,'');
      const progress=clean(document.body.innerText).match(/\b(\d+)\s*(?:out of\s*\/?|\/)\s*(\d+)\s+questions answered\b/i);
      const buttons=[...document.querySelectorAll('button')].filter(e=>visible(e)&&/^continue$/i.test(clean(e.getAttribute('aria-label')||e.innerText||e.textContent)));
      if(!title||!progress||buttons.length!==1)return;
      const result=await chrome.runtime.sendMessage({type:'canvasCoursePlayerGate',title,answered:Number(progress[1]),total:Number(progress[2])});
      if(result?.start){clicked=true;buttons[0].click();}else if(result?.skip)clicked=true;
    }catch{}finally{busy=false;}
  }
  setInterval(check,1800);check();
})();
