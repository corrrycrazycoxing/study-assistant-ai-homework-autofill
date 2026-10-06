// Keep the Pearson course launcher attached to the visible top-level page,
// rather than the tall cross-origin assignment iframe.
(() => {
  if (window.top !== window || !/^\/courses\/\d+\/menu\//i.test(location.pathname)) return;
  if (document.getElementById('study-pearson-course-shell')) return;

  const childOrigin = 'https://mylab.pearson.com';
  const source = 'study-assistant-pearson-course';
  const host = document.createElement('div');
  host.id = 'study-pearson-course-shell';
  host.style.cssText = 'position:fixed!important;right:12px!important;bottom:12px!important;top:auto!important;left:auto!important;z-index:2147483600!important;width:300px!important;max-width:calc(100vw - 24px)!important;max-height:calc(100vh - 24px)!important;margin:0!important;transform:none!important;pointer-events:auto!important;user-select:none!important';
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `<style>
    :host{font:13px/1.45 system-ui,-apple-system,sans-serif;color:#e8edff}
    *{box-sizing:border-box}
    .card{background:#10151f;border:1px solid #6b7bac;border-radius:12px;box-shadow:0 8px 30px #0007;overflow:hidden}
    .bar{display:flex;align-items:center;gap:8px;padding:9px 11px}
    .title{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
    .count{font-size:11px;color:#b9c7e4;white-space:nowrap}
    button{font:inherit;background:#5264ff;color:white;border:0;border-radius:7px;padding:7px 10px;cursor:pointer;white-space:nowrap}
    button.secondary{background:#30394d}
    button:disabled{opacity:.45;cursor:default}
    .body{padding:0 12px 12px;border-top:1px solid #293248;max-height:min(48vh,390px);overflow:auto}
    .body[hidden]{display:none}
    p{margin:9px 0;color:#b9c7e4}
    label{display:flex;align-items:flex-start;gap:7px;margin:8px 0;color:#dce4f7}
    small{display:block;color:#9faeca;margin-top:8px;font-size:11px}
    .actions{display:flex;gap:7px;flex-wrap:wrap}
    .attention{position:fixed;inset:0;background:#050811d9;z-index:2147483647;display:grid;place-items:center;padding:20px;user-select:text}
    .attention[hidden]{display:none}
    .dialog{width:min(680px,100%);max-height:85vh;overflow:auto;background:#171f33;border:2px solid #8496ff;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0009}
    .dialog h2{font-size:24px;margin:0 0 8px}.dialog p{line-height:1.6}
    .dialog li{margin:9px 0}.reason{display:block;color:#bdc9e2}
    @media(max-width:380px){:host{right:8px!important;bottom:8px!important;width:calc(100vw - 16px)!important}.body{max-height:42vh}}
  </style>
  <section class="card" aria-label="Pearson Full Course Mode">
    <div class="bar"><span class="title">Pearson Course Mode</span><span id="count" class="count">Checking…</span><button id="toggle" class="secondary" aria-expanded="false">Open</button></div>
    <div id="body" class="body" hidden>
      <p id="status">Waiting for the Pearson assignments list.</p>
      <label><input id="skip-pause" type="checkbox"> Continue without review pauses</label>
      <div class="actions"><button id="go" disabled>Go through homework &amp; lessons</button><button id="stop" class="secondary" hidden>Stop</button></div>
      <small>Only confirmed zero-score, unstarted homework or lessons are opened, using Start or the first question link Pearson provides. Questions can continue while required media stays pending for final review. Check media status in Pearson. Pearson Save is used between assignments; final submission stays yours.</small>
    </div>
  </section>
  <div id="attention" class="attention" hidden><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="attention-title"><h2 id="attention-title">Manual review needed</h2><p id="summary"></p><div id="items"></div><button id="close" class="secondary">Close</button></section></div>`;
  document.documentElement.append(host);

  const el=id=>root.getElementById(id);
  let count=0,ready=false;
  const frames=()=>[...document.querySelectorAll('iframe')].filter(frame=>frame.isConnected);
  function send(type,extra={}){
    const frame=frames().find(candidate=>{try{return candidate.contentWindow===lastSource;}catch{return false;}});
    if(frame)frame.contentWindow.postMessage({source:'study-assistant-pearson-course-shell',type,...extra},childOrigin);
  }
  let lastSource=null;
  function updateCount(){el('count').textContent=count?`${count} assignments`:'No list found';}
  el('toggle').addEventListener('click',()=>{
    const open=el('body').hidden;
    el('body').hidden=!open;el('toggle').textContent=open?'Close':'Open';el('toggle').setAttribute('aria-expanded',String(open));
  });
  el('go').addEventListener('click',()=>{send('go',{skipReviewPause:el('skip-pause').checked});el('go').disabled=true;});
  el('stop').addEventListener('click',()=>send('stop'));
  el('close').addEventListener('click',()=>{el('attention').hidden=true;el('toggle').focus();});
  window.addEventListener('message',event=>{
    if(event.origin!==childOrigin||event.data?.source!==source)return;
    const frame=frames().find(candidate=>candidate.contentWindow===event.source);
    if(!frame)return;
    lastSource=event.source;
    if(event.data.type==='ready'){
      ready=true;count=Number(event.data.count)||0;updateCount();
      el('status').textContent=`${count} homework or lesson assignments are listed. Go checks each score before opening anything.`;
      el('go').disabled=count===0;
    }
    if(event.data.type==='status'){
      count=Number(event.data.count)||count;updateCount();el('status').textContent=String(event.data.text||'');
      if(/Course run finished|No confirmed 0%|Stopped\./i.test(event.data.text||'')){el('go').disabled=!ready;el('stop').hidden=true;}
      else if(/Opening |Working on assignment|Checking score|saved this assignment|Required media/i.test(event.data.text||'')){el('go').disabled=true;el('stop').hidden=false;}
    }
    if(event.data.type==='review'){
      el('attention').hidden=false;el('toggle').setAttribute('aria-expanded','true');el('body').hidden=false;el('toggle').textContent='Close';
      const questions=Array.isArray(event.data.questions)?event.data.questions:[];
      const assignments=Array.isArray(event.data.assignments)?event.data.assignments:[];
      const media=Array.isArray(event.data.media)?event.data.media:[];
      el('summary').textContent=(questions.length?`${questions.length} question${questions.length===1?' was':'s were'} skipped for manual review. `:'')+(assignments.length?`${assignments.length} assignment${assignments.length===1?' was':'s were'} left unopened because the score or start status needed review. `:'')+(media.length?`${media.length} required media item${media.length===1?' still needs':'s still need'} attention.`:'');
      const items=el('items');items.replaceChildren();
      for(const [heading,values,render,openable] of [
        ['Questions to review',questions,true,false],
        ['Assignments left unopened',assignments,false,true],
        ['Media still to review',media,false,true]
      ])if(values.length){const h=document.createElement('h3');h.textContent=heading;items.append(h);const list=document.createElement(render?'ol':'ul');for(const item of values){const li=document.createElement('li');li.append(document.createTextNode(render?`${item.title} · ${item.label}`:`${item.title} · ${item.reason}`));if(render){const reason=document.createElement('span');reason.className='reason';reason.textContent=item.reason;li.append(reason);}if(openable&&/^\d{1,12}$/.test(String(item.assignmentId||''))){const button=document.createElement('button');button.className='secondary';button.textContent='Open assignment';button.addEventListener('click',()=>send('reviewAssignment',{id:String(item.assignmentId)}));li.append(button);}list.append(li);}items.append(list);}
      el('close').focus();
    }
  });
  updateCount();
})();
