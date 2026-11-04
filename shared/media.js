(() => {
  'use strict';
  const visible=e=>e?.isConnected&&e.getClientRects().length>0&&!e.closest('[hidden],[aria-hidden="true"]');
  const videoArtwork=e=>e.closest('video,[aria-label*="Video Player"],[id^="GASPAR_"],.video-js,.jwplayer,.mejs-container');
  // aria-hidden describes accessibility, not whether a picture is drawn.
  // Aplia hides its visible SVG from screen readers and supplies an image role
  // separately. Respect actual rendering and hidden HTML instead.
  function drawn(e){
    if(!e?.isConnected||!e.getClientRects().length||e.closest('[hidden]'))return false;
    const win=e.ownerDocument?.defaultView;
    for(let node=e;node?.nodeType===1;node=node.parentElement){
      const style=win?.getComputedStyle(node);
      if(style&&(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||Number(style.opacity)===0))return false;
    }
    return true;
  }
  function videos(root){return [...root.querySelectorAll('video,[aria-label*="Video Player"],[id^="GASPAR_"],.video-js,.jwplayer,.mejs-container')].filter(visible);}
  function graphics(root){
    return [...root.querySelectorAll('img,canvas,svg')].filter(e=>drawn(e)&&!videoArtwork(e)&&!e.matches('.equation_image,.math_equation,.q4-select-vertical-spacer,.q4-choice-option-correctness-indicator,.q4-numericEntry-control-correctness')&&!e.closest('.q4-explanation,.q4-equation,.eqEditor,[data-equation-content]')).filter(e=>{const r=e.getBoundingClientRect();return r.width>=40&&r.height>=30;});
  }
  async function capture(chrome,root,id,guard,panel,status=()=>{}){
    if(!guard())throw Error('Stopped.');
    const images=graphics(root);if(!images.length)throw Error('No visible picture could be identified. Enter this question manually.');
    if(images.some(e=>e.tagName==='IMG'&&(!e.complete||!e.naturalWidth)))throw Error('A picture is still loading. Wait, then retry.');
    if(images.length>8)throw Error('This question has too many pictures to capture together. Review it manually.');
    const previous=panel?.style.visibility;if(panel)panel.style.visibility='hidden';
    try{
      let token;
      for(const [index,image] of images.entries()){
        if(!guard()||!image.isConnected)throw Error('Stopped.');
        status('Capturing picture '+(index+1)+' of '+images.length+'…');
        image.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
        // Chrome permits at most two captures a second. Also let instant
        // scrolling settle before locating each picture in nested frames.
        await new Promise(r=>setTimeout(r,index?600:200));
        if(!guard())throw Error('Stopped.');
        const current=graphics(root);
        if(current.length!==images.length||current.some((e,i)=>e!==images[i]))throw Error('The pictures changed during capture. Retry.');
        const {x,y,right,bottom}=image.getBoundingClientRect();
        if(x<0||y<0||right>innerWidth||bottom>innerHeight)throw Error('Picture '+(index+1)+' is larger than the assignment window or is clipped. Resize or zoom out, then retry.');
        const margin=8,rect={x:Math.max(0,x-margin),y:Math.max(0,y-margin),width:Math.min(innerWidth,right+margin)-Math.max(0,x-margin),height:Math.min(innerHeight,bottom+margin)-Math.max(0,y-margin),viewportWidth:innerWidth,viewportHeight:innerHeight};
        const result=await chrome.runtime.sendMessage({type:'studyCapture',id,rect,part:{index,total:images.length,previousToken:token}});
        if(!guard())throw Error('Stopped.');
        if(!result?.received)throw Error(result?.error||'Screenshot capture failed.');
        token=result.token;
      }
      return token;
    }finally{if(panel)panel.style.visibility=previous;}
  }
  globalThis.StudyMedia={graphics,videos,capture,drawn};
})();
