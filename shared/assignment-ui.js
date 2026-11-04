/* One presentation for assignment adapters. Site fields and native actions stay
   owned by the adapter; all text received here is rendered as text, never HTML. */
(() => {
  if(globalThis.StudyAssignmentUI)return;
  function model(state,observation={}){
    const active=!!state.controls?.stop,course=state.course||null;
    const activity=globalThis.StudyReview?.activity({page:{...state,tab:0},run:active?{tab:0,phase:observation.run?.phase}:null,phase:observation.phase})||{stage:null,label:state.status};
    return {active,course,activity,title:course?'Course Auto':'Study Assistant',attention:/unsupported|stopped|failed|unavailable|did not|could not|needs attention/i.test(state.status||'')};
  }
  function create({command,openPanel,replace}){
    const host=document.createElement('div');host.id='study-assignment-ui';host.style.cssText='position:fixed;right:16px;bottom:78px;z-index:2147483600;width:310px;max-width:calc(100vw - 32px)';
    const root=host.attachShadow({mode:'open'});
    root.innerHTML='<style>:host{font:13px/1.45 system-ui;color:#edf1ff}*{box-sizing:border-box}[hidden]{display:none!important}section{max-height:calc(100vh - 100px);overflow:auto;background:#141925;border:1px solid #6d7da5;border-radius:12px;box-shadow:0 7px 28px #0004;padding:12px}.heading,.actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.heading{justify-content:space-between}h2{font-size:15px;margin:0}button{font:inherit;border:1px solid #627298;border-radius:7px;background:#303c58;color:#fff;padding:7px 9px;cursor:pointer}button:disabled{opacity:.45;cursor:default}button:focus-visible,summary:focus-visible{outline:2px solid #bdc8ff;outline-offset:3px}#start,#ask{background:#5365ee}#stop{background:#693c4d}p{margin:8px 0;overflow-wrap:anywhere}#status{max-height:100px;overflow:auto}.muted{font-size:11px;color:#acbbd7}.actions{margin-top:9px}progress{width:100%;height:8px;accent-color:#949fff}ol{display:flex;list-style:none;justify-content:space-between;padding:0;margin:5px 0;font-size:10px;color:#aab7d2}li[aria-current]{color:#fff;font-weight:700}pre{font:12px/1.5 system-ui;white-space:pre-wrap;overflow:auto;max-height:200px}summary{cursor:pointer;padding:6px 0}#toggle{padding:3px 7px}label{display:block;margin-top:8px;font-size:12px}#status[data-attention="true"]{color:#ffda98}</style><section aria-label="Study Assistant assignment controls"><div class="heading"><h2 id="title">Study Assistant</h2><button id="toggle" aria-expanded="false" aria-controls="body" title="Expand assignment controls">Open</button></div><div id="body" hidden><p id="identity" class="muted"></p><div id="course" hidden><p id="course-label"></p><progress id="course-progress" max="1" value="0" aria-label="Assignments processed"></progress></div><p id="stage" class="muted"></p><progress id="progress" max="5" value="0" aria-label="Current question stage"></progress><ol aria-label="Automation stages"><li>Read</li><li>Ask AI</li><li>Prepare</li><li>Enter</li><li>Check</li></ol><p id="status" role="status" aria-live="polite"></p><div class="actions"><button id="start">Start Auto</button><button id="ask">Ask AI</button><button id="fill">Fill answers</button><button id="resume">Resume Auto</button><button id="stop">Stop</button><button id="cancel">Cancel</button><button id="replaceStart">Replace and restart</button></div><label id="replace-option" hidden><input type="checkbox" id="replace"> Replace existing answers on this question</label><div id="timer" hidden><p id="timer-label"></p><progress id="timer-progress" max="1" value="0" aria-label="Review countdown"></progress><p id="timer-note" class="muted"></p><div class="actions"><button id="timerPause">Pause</button><button id="timerContinue">Continue now</button><button id="timerStop">Stop</button></div></div><details id="preview-wrap" hidden><summary>Answer preview</summary><pre id="preview"></pre></details><button id="panel">Open side panel ↗</button></div><div id="mini" class="actions" hidden><span id="mini-label" class="muted"></span><button id="mini-stop">Stop</button></div></section>';
    const el=id=>root.getElementById(id);let expanded=false,wasActive=false,last=null,lastAttention='',lastPreview='';
    const expand=value=>{expanded=value;el('body').hidden=!value;el('toggle').textContent=value?'Collapse':'Open';el('toggle').setAttribute('aria-expanded',String(value));el('mini').hidden=value||!last?.active;};
    el('toggle').onclick=()=>expand(!expanded);el('panel').onclick=openPanel;
    for(const action of ['start','ask','fill','resume','stop','cancel','replaceStart','timerPause','timerContinue','timerStop'])el(action).onclick=()=>Promise.resolve(command(action)).catch(error=>{el('status').textContent=error.message;expand(true);});
    el('mini-stop').onclick=()=>el('stop').click();el('replace').onchange=()=>replace(el('replace').checked);
    document.body.append(host);
    return {host,root,render(state,observation={}){
      const m=model(state,observation);last=m;
      if(m.active&&!wasActive||state.preview&&state.preview!==lastPreview||m.attention&&state.status!==lastAttention)expand(true);wasActive=m.active;lastAttention=m.attention?state.status:'';lastPreview=state.preview||'';
      el('title').textContent=m.title;el('identity').textContent=(globalThis.StudyConfig?.names?.[state.platform]||state.platform)+' · '+(globalThis.StudyBuild?.version||'')+' · Build '+(state.buildId||'unknown');
      el('stage').textContent=m.activity.label;el('mini-label').textContent=m.activity.label;
      el('progress').value=m.activity.stage===null?0:m.activity.stage+1;
      el('progress').setAttribute('aria-valuetext',m.activity.label);
      [...root.querySelectorAll('li')].forEach((item,i)=>{if(i===m.activity.stage)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
      el('status').textContent=state.status;el('status').dataset.attention=String(m.attention);
      for(const action of ['start','ask','fill','resume','stop','cancel','replaceStart']){el(action).hidden=!state.controls?.[action]||m.active&&['start','ask','fill','replaceStart'].includes(action);el(action).disabled=observation.retired===true;}
      el('stop').textContent=m.course?'Stop Course Auto':'Stop';el('mini-stop').textContent=el('stop').textContent;el('mini-stop').disabled=observation.retired===true;
      el('course').hidden=!m.course;
      if(m.course){el('course-label').textContent=m.course.label;el('course-progress').max=m.course.total;el('course-progress').value=m.course.done;}
      el('replace-option').hidden=!state.replace;el('replace').checked=state.replace?.checked===true;
      el('preview-wrap').hidden=!state.preview;el('preview').textContent=state.preview||'';
      el('timer').hidden=!state.timer;if(state.timer){el('timer-label').textContent=state.timer.label;el('timer-progress').value=state.timer.progress;el('timer-note').textContent=state.timer.note;el('timerPause').textContent=state.timer.pauseLabel;}
      expand(expanded);
    },visibility(visible){host.hidden=!visible;},retire(state){this.render(state,{retired:true});expand(true);}};
  }
  globalThis.StudyAssignmentUI={create,model};
})();
