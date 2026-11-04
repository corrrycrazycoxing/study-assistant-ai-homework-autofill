/* Only acts on a matching, active Canvas queue; never submits an assignment. */
(() => {
  if(location.origin!=='https://connect.router.integration.prod.mheducation.com')return;
  const C=StudyCanvasMcGrawCourse,send=(type,values={})=>chrome.runtime.sendMessage({type,...values}),clean=s=>String(s||'').replace(/\s+/g,' ').trim(),visible=e=>e?.isConnected&&e.getClientRects().length&&!e.disabled&&!e.closest('[hidden],[aria-hidden="true"]');let busy=false,acted=false;
  async function check(){if(busy||acted)return;busy=true;try{
    if(location.pathname.startsWith('/v1/lms/')){const result=await send('canvasCourseLaunch');if(!result?.launch)return;const button=[...document.querySelectorAll('button,a')].filter(e=>visible(e)&&/^(?:launch|open) assignment$/i.test(clean(e.innerText||e.textContent)));if(button.length===1){acted=true;button[0].click();}return;}
    if(window!==window.top||location.pathname!=='/app/')return;
    const title=clean(document.querySelector('h2')?.innerText||document.querySelector('h2')?.textContent),text=clean(document.body.innerText);const smartbook=/\bSmartBook 2\.0\b/i.test(text)||/\bSmartBook\b/i.test(title);if(!title)return;
    const controls=[...document.querySelectorAll('button,a')].filter(e=>visible(e)&&/^(?:begin|resume|continue(?: assignment)?|view results|review(?: assignment)?)$/i.test(clean(e.innerText||e.textContent)));if(controls.length!==1)return;
    const action=clean(controls[0].innerText||controls[0].textContent);
    if(!smartbook&&C.attempts(text)===null)return;
    const result=await send('canvasCourseCover',{title,smartbook,attempts:text.slice(0,10000),action});
    if(result?.start){acted=true;controls[0].click();}else if(result?.skip||result?.verified)acted=true;
  }catch{}finally{busy=false;}}
  // The Canvas LTI often opens its tab automatically; give that launch time to register.
  setTimeout(()=>{check();setInterval(check,1800);},5000);
})();
