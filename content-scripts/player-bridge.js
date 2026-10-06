// Read only the player's answer/navigation state; never authentication or network data.
(() => {
  'use strict';
  const visible=e=>e&&e.getClientRects().length&&!e.closest('.hidden,[aria-hidden="true"]');
  const revisions=new WeakMap();
  document.addEventListener('mylab-assistant-course-open-request',event=>{
    let request;try{request=JSON.parse(event.detail);}catch{return;}
    if(typeof request?.token!=='string'||request.token.length>80||typeof request.id!=='string'||!/^\d{1,12}$/.test(request.id))return;
    let result;
    try{
      if(location.origin!=='https://mylab.pearson.com'||!(/^\/student\/doassignments\.aspx$/i.test(location.pathname)||/^\/courses\/\d+\/assignments\/?$/i.test(location.pathname)))throw Error('Pearson assignment links can only be opened from the assignments list.');
      const link=[...document.querySelectorAll('a[href^="javascript:doHomework("]')].find(anchor=>visible(anchor)&&new RegExp('^javascript:doHomework\\('+request.id+'\\s*,','i').test(anchor.getAttribute('href')||''));
      if(!link)throw Error('Pearson no longer shows this assignment link. Refresh the assignment list and try again.');
      if(typeof window.doHomework!=='function')throw Error('Pearson did not expose its assignment opener. Open the assignment manually.');
      result={ok:true};
    }catch(error){result={ok:false,error:error.message};}
    document.dispatchEvent(new CustomEvent('mylab-assistant-course-open-result',{detail:JSON.stringify({token:request.token,...result})}));
    if(result.ok)window.doHomework(Number(request.id),false,true);
  });
  document.addEventListener('mylab-assistant-course-save-request',event=>{
    let request;try{request=JSON.parse(event.detail);}catch{return;}
    if(typeof request?.token!=='string'||request.token.length>80)return;
    let result;
    try{
      if(location.origin!=='https://mylab.pearson.com'||location.pathname.toLowerCase()!=='/student/playerhomework.aspx')throw Error('Pearson Save is available only on the homework player.');
      if(typeof window.homeworkSaveForLater!=='function')throw Error('Pearson did not expose its Save action. Save this assignment manually.');
      window.homeworkSaveForLater();
      result={ok:true};
    }catch(error){result={ok:false,error:error.message};}
    document.dispatchEvent(new CustomEvent('mylab-assistant-course-save-result',{detail:JSON.stringify({token:request.token,...result})}));
  });
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
