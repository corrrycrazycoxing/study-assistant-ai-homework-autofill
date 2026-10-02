// Read only the player's answer/navigation state; never authentication or network data.
(() => {
  'use strict';
  const visible=e=>e&&e.getClientRects().length&&!e.closest('.hidden,[aria-hidden="true"]');
  const revisions=new WeakMap();
  document.addEventListener('mylab-assistant-player-request',event=>{
    let request;try{request=JSON.parse(event.detail);}catch{return;}
    if(typeof request?.token!=='string'||request.token.length>80)return;
    let registry;try{registry=window.require?.('dijit/registry');}catch{}
    const root=document.querySelector('.playerViewer');
    const viewer=registry?.byId(root?.getAttribute('widgetid')||root?.id);
    if(viewer&&!revisions.has(viewer)){revisions.set(viewer,0);viewer.on?.('resultsposted',()=>revisions.set(viewer,(revisions.get(viewer)||0)+1));}
    const fields=[...document.querySelectorAll('.contentPanel .inputField,.contentPanel .xlMultipleChoice')].map(el=>{
      const widget=registry?.byId(el.getAttribute('widgetid')||el.id);
      const states=widget?.answeredStates;
      return {id:el.id,answered:widget?.isAnswered===true,correct:widget?.isCorrect===true,states:Array.isArray(states)?states.map(s=>String(s).slice(0,100)):undefined};
    });
    const buttons=[...document.querySelectorAll('.controlPanel button,.btnNext,.feedbackDialog button')].filter(visible).map(el=>{
      const widget=registry?.byId(el.getAttribute('widgetid')||el.id);
      return {id:el.id,command:typeof widget?.command==='string'?widget.command:'',enabled:!el.disabled&&el.getAttribute('aria-disabled')!=='true'};
    });
    const result={token:request.token,mode:root?.classList.contains('playmode-test')?'test':'homework',correctness:String(viewer?._correctness||'').toLowerCase(),feedbackOpen:Boolean(viewer?.feedbackOpened),revision:revisions.get(viewer)||0,fields,buttons};
    document.dispatchEvent(new CustomEvent('mylab-assistant-player-result',{detail:JSON.stringify(result)}));
  });
})();
