/* Pearson Course Auto presentation. Course pace is local to the queue. */
(() => {
  const modes={normal:'Instant Auto',slow:'Timed Auto',human:'Human pace'};
  function paceMarkup(){return '<div id="course-speed-setup"><label for="course-pace">Course Auto speed</label><select id="course-pace"><option value="">Choose a speed…</option><option value="normal">Instant Auto</option><option value="slow">Timed Auto</option><option value="human">Human pace</option></select><div id="course-human-wrap" hidden><label for="course-human-speed">Human working speed</label><select id="course-human-speed"><option value="faster">Faster</option><option value="typical" selected>Typical</option><option value="deliberate">Deliberate</option></select></div><small>Timed uses your review countdown. Human uses an estimate for each question.</small></div>';}
  function hasPace(root){return Object.hasOwn(modes,root.getElementById('course-pace')?.value||'');}
  function readPace(root){
    if(!hasPace(root))throw Error('Choose a Course Auto speed before starting.');
    const humanSpeed=root.getElementById('course-human-speed').value;
    return {pacingMode:root.getElementById('course-pace').value,humanSpeed:['faster','typical','deliberate'].includes(humanSpeed)?humanSpeed:'typical'};
  }
  function bindPace(root,changed){
    const update=()=>{root.getElementById('course-human-wrap').hidden=root.getElementById('course-pace').value!=='human';changed();};
    root.getElementById('course-pace').addEventListener('change',update);
    root.getElementById('course-human-speed').addEventListener('change',update);update();
  }
  function queueMarkup(){return '<div id="course-queue-progress" hidden><strong>Course Auto progress</strong><p id="course-queue-label"></p><progress id="course-queue-bar" aria-label="Course assignment progress" max="1" value="0"></progress></div>';}
  function queueProgress(root,value){
    const box=root.getElementById('course-queue-progress');if(!value){box.hidden=true;return;}
    const max=Number(value.max),done=Number(value.value);if(!Number.isFinite(max)||max<=0||!Number.isFinite(done))return;
    box.hidden=false;const bar=root.getElementById('course-queue-bar');bar.max=max;bar.value=Math.max(0,Math.min(done,max));
    root.getElementById('course-queue-label').textContent=String(value.label||'Going through assignments')+' · '+Math.round(bar.value)+' of '+max;
  }
  function player(root,{read,onStop}){
    const box=document.createElement('section');box.id='course-auto-view';box.hidden=true;
    box.innerHTML='<style>#course-auto-view{border:1px solid #58668e;border-radius:9px;padding:10px;margin:10px 0;background:#1b2235}#course-auto-view p{margin:5px 0;color:#c7d2ee;font-size:12px}#course-auto-view progress{display:block;width:100%;height:9px;margin:6px 0;accent-color:#929bff}#course-auto-view ol{display:flex;justify-content:space-between;list-style:none;padding:0;margin:6px 0;font-size:10px;color:#aab8d4}#course-auto-view li[aria-current]{font-weight:750;color:#d3d5ff}#course-auto-view button{background:#63394a;color:#fff;margin:9px 0 0}#course-auto-view small{font-size:11px}#course-auto-view [hidden]{display:none!important}</style><strong>Course Auto</strong><p id="course-current-assignment"></p><p id="course-current-pace"></p><small id="course-count"></small><progress id="course-total-progress" aria-label="Assignments processed" max="1" value="0"></progress><p id="course-current-question"></p><progress id="course-stage-progress" aria-label="Current question stage" max="5" value="0"></progress><ol aria-label="Automation stages"><li>Read</li><li>Ask AI</li><li>Prepare</li><li>Enter</li><li>Check</li></ol><p id="course-current-stage" role="status" aria-live="polite"></p><button id="stop-course-auto" type="button">Stop Course Auto</button>';
    root.getElementById('status').before(box);
    const el=id=>root.getElementById(id);let context=null,clock=null,last='';
    function update(){
      if(!context)return;
      const state=read(),pace=state.pace||{},current=StudyReview.activity({page:{tab:0,status:state.status,timer:state.timer,controls:state.controls||{}},run:state.running?{tab:0}:null,phase:state.reloading?'reloading':null});
      const key=JSON.stringify([context,state,current]);if(key===last)return;last=key;
      el('course-current-assignment').textContent='Assignment '+(context.index+1)+' of '+context.total+' · '+context.title;
      el('course-current-pace').textContent=(modes[pace.pacingMode]||'Auto')+(pace.pacingMode==='human'?' · '+pace.humanSpeed:'');
      el('course-count').textContent=context.index+' of '+context.total+' assignments processed';
      el('course-total-progress').max=context.total;el('course-total-progress').value=context.index;
      el('course-current-question').textContent=state.question||'Current question';
      const stage=current.stage;el('course-stage-progress').value=stage===null?0:stage+1;
      el('course-stage-progress').setAttribute('aria-valuetext',stage===null?current.label:'Stage '+(stage+1)+' of 5: '+current.label);
      el('course-current-stage').textContent=state.running?current.label:'Paused · review the message below';
      [...box.querySelectorAll('li')].forEach((item,index)=>{if(index===stage)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
    }
    el('stop-course-auto').onclick=async()=>{const button=el('stop-course-auto');if(button.disabled)return;button.disabled=true;try{await onStop();}finally{button.disabled=false;}};
    return {show(value){context=value;last='';box.hidden=false;el('assignment-controls').hidden=true;el('assistant-title').textContent='✦ Course Auto';root.querySelector('details').open=true;update();if(clock===null)clock=setInterval(update,500);},update,hide(){context=null;box.hidden=true;el('assignment-controls').hidden=false;el('assistant-title').textContent='✦ MyLab Assistant';if(clock!==null)clearInterval(clock);clock=null;last='';}};
  }
  globalThis.StudyPearsonCourseUI={paceMarkup,hasPace,readPace,bindPace,queueMarkup,queueProgress,player};
})();
