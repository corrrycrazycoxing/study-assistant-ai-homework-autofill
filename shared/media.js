(() => {
  'use strict';
  const visible=e=>e?.isConnected&&e.getClientRects().length>0&&!e.closest('[hidden],[aria-hidden="true"]');
  function graphics(root){
    return [...root.querySelectorAll('img,canvas,svg')].filter(e=>visible(e)&&!e.matches('.equation_image,.math_equation,.q4-select-vertical-spacer,.q4-choice-option-correctness-indicator,.q4-numericEntry-control-correctness')&&!e.closest('.q4-explanation,.q4-equation,.eqEditor,[data-equation-content]')).filter(e=>{const r=e.getBoundingClientRect();return r.width>=40&&r.height>=30;});
  }
  async function capture(chrome,root,id,guard,panel){
    if(!guard())throw Error('Stopped.');
    const images=graphics(root);if(!images.length)throw Error('No visible picture could be identified. Enter this question manually.');
    if(images.some(e=>e.tagName==='IMG'&&(!e.complete||!e.naturalWidth)))throw Error('A picture is still loading. Wait, then retry.');
    images[0].scrollIntoView({block:'center',behavior:'instant'});
    await new Promise(r=>setTimeout(r,200));if(!guard())throw Error('Stopped.');
    const rects=images.map(e=>e.getBoundingClientRect()),x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y)),right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));
    if(x<0||y<0||right>innerWidth||bottom>innerHeight)throw Error('All pictures must fit visibly in the assignment window. Resize or zoom out, then retry.');
    const margin=8,rect={x:Math.max(0,x-margin),y:Math.max(0,y-margin),width:Math.min(innerWidth,right+margin)-Math.max(0,x-margin),height:Math.min(innerHeight,bottom+margin)-Math.max(0,y-margin),viewportWidth:innerWidth,viewportHeight:innerHeight};
    const previous=panel?.style.visibility;if(panel)panel.style.visibility='hidden';
    try{
      const result=await chrome.runtime.sendMessage({type:'studyCapture',id,rect});
      if(!guard())throw Error('Stopped.');
      if(!result?.received)throw Error(result?.error||'Screenshot capture failed.');
      return result.token;
    }finally{if(panel)panel.style.visibility=previous;}
  }
  globalThis.StudyMedia={graphics,capture};
})();
