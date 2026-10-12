(() => {
  'use strict';
  const clamp=(v,lo,hi,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback;
  function options(raw={}){
    const min=clamp(raw.reviewMinSeconds,1,300,5),max=Math.max(min,clamp(raw.reviewMaxSeconds,1,300,120));
    return {mode:['normal','slow','review','human'].includes(raw.pacingMode)?raw.pacingMode:'normal',min,max,
      seconds:clamp(raw.reviewSeconds,min,max,Math.max(min,Math.min(max,30))),ai:raw.useSuggestedTime!==false,
      advance:clamp(raw.advanceSeconds,0,30,3),smooth:raw.smoothScroll!==false,
      humanSpeed:['faster','typical','deliberate'].includes(raw.humanSpeed)?raw.humanSpeed:'typical',
      humanMin:clamp(raw.humanMinSeconds,10,7200,15),humanMax:clamp(raw.humanMaxSeconds,10,7200,3600)};
  }
  const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
  const format=seconds=>seconds>=60?Math.floor(seconds/60)+'m '+Math.round(seconds%60)+'s':Math.round(seconds)+'s';
  function fallback(context={}){
    const text=String(context.text||''),fields=context.fields||[],words=text.split(/\s+/).length;
    const calculation=/\b(calculate|compute|solve|evaluate|derive|estimate|simplify|standard (?:deviation|error)|margin of error)\b/i.test(text);
    const written=fields.some(f=>f.el?.tagName==='TEXTAREA')||/\b(essay|write a paragraph|justify|prove)\b/i.test(text);
    const numberCount=fields.filter(f=>['equation','number'].includes(f.kind)||f.numeric).length;
    const questionType=written?'written':calculation||numberCount>0&&!/\b(interpret|given|provided|coefficient)\b/i.test(text)?'calculation':'reading';
    const reading=Math.max(12,words/3.5);
    const weights=fields.map(f=>questionType==='calculation'?(['equation','number'].includes(f.kind)||f.numeric?75:30):f.el?.tagName==='TEXTAREA'?150:f.options?12:20);
    return {estimatedSeconds:Math.max(questionType==='calculation'?90:questionType==='written'?180:20,reading+weights.reduce((a,b)=>a+b,0)),weights,questionType,reason:'Estimated from question length and answer controls; AI timing was unavailable.'};
  }
  function estimate(raw,suggestion,context={}){
    const o=options(raw),base=fallback(context),timing=suggestion&&typeof suggestion==='object'?suggestion:{};
    const ai=finite(timing.estimatedSeconds)&&timing.estimatedSeconds<=7200;
    let seconds=ai?timing.estimatedSeconds:base.estimatedSeconds;
    // Reject implausibly short calculation/writing estimates instead of imposing a 10s-per-box budget.
    const type=['reading','conceptual','calculation','written','mixed'].includes(timing.questionType)?timing.questionType:base.questionType;
    if(type==='calculation')seconds=Math.max(60,seconds);
    if(type==='written')seconds=Math.max(90,seconds);
    const factor={faster:0.7,typical:1,deliberate:1.4}[o.humanSpeed];
    seconds=clamp(seconds*factor,o.humanMin,Math.max(o.humanMin,o.humanMax),base.estimatedSeconds);
    const weights=(context.fields||[]).map((f,i)=>finite(timing.fieldSeconds?.[f.key||f.id])?clamp(timing.fieldSeconds[f.key||f.id],1,7200,1):base.weights[i]||1);
    return {seconds,weights,ai,questionType:type,reason:ai?String(timing.reason||'AI estimate for reading, working and checking.').slice(0,300):base.reason,
      elapsed:clamp(timing.elapsedSeconds,0,7200,0)};
  }
  function duration(raw,suggestion,context){const o=options(raw);if(o.mode==='human')return estimate(raw,suggestion,context).seconds;const value=typeof suggestion==='object'?suggestion?.estimatedSeconds:suggestion;return o.ai&&finite(value)?clamp(value,o.min,o.max,o.seconds):o.seconds;}
  async function sleep(ms){
    // The extension worker owns short waits so a hidden tab cannot stretch each keystroke to a minute.
    if(globalThis.chrome?.runtime?.sendMessage&&ms<=1000){try{const r=await chrome.runtime.sendMessage({type:'studyDelay',ms});if(r?.waited)return;}catch{}}
    await new Promise(resolve=>setTimeout(resolve,ms));
  }
  function create(getSettings,onStop,platform){
    let host,box,paceControls,state=null,epoch=0,plan=null;
    function attachControls(root){
      if(!platform||paceControls?.isConnected)return;
      paceControls=document.createElement('div');paceControls.className='study-pace-controls';
      paceControls.style.cssText='position:fixed;top:0;right:12px;left:auto;z-index:2147483646;width:auto;max-width:calc(100vw - 24px);margin:0;padding:0;background:transparent;border:0;box-shadow:none;pointer-events:none';
      const ui=paceControls.attachShadow({mode:'open'});
      const modes=[
        {key:'normal',name:'Instant Auto',icon:'<path d="M35 10 18 35h13l-2 19 18-28H34z" fill="#9ce8dc"/>',note:'Fills when ready. No added countdown.'},
        {key:'slow',name:'Timed Auto',icon:'<circle cx="32" cy="32" r="19" fill="none" stroke="#97bcff" stroke-width="3"/><path d="M32 20v13l9 5" fill="none" stroke="#97bcff" stroke-width="3" stroke-linecap="round"/>',note:'Uses your review countdown, then continues automatically.'},
        {key:'human',name:'Human pace',icon:'<circle cx="32" cy="19" r="8" fill="none" stroke="#d9b4ff" stroke-width="3"/><path d="M17 43v-4c0-9 30-9 30 0v4M13 39l19 6 19-6v14l-19 6-19-6zM32 45v14" fill="none" stroke="#d9b4ff" stroke-width="3" stroke-linejoin="round"/>',note:'Uses an AI estimate of reading and working time for this question.'},
        {key:'review',name:'Guided Answers',icon:'<path d="M22 18v28M42 18v28" stroke="#f4cc88" stroke-width="8" stroke-linecap="round"/>',note:'Shows an AI answer and explanation; you enter answers yourself.'}
      ];
      ui.innerHTML='<style>:host{display:block;width:max-content;max-width:calc(100vw - 24px);margin:0;font:12px/1.4 system-ui;color:inherit;pointer-events:none}*{box-sizing:border-box}.dock{display:grid;justify-items:end;gap:7px;pointer-events:none}.top-actions{display:flex;align-items:flex-start;gap:6px;pointer-events:none}.trigger{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:0 0 9px 9px;background:#171b27ed;border:1px solid #586584;border-top:0;color:#e5eaff;font-weight:650;font-size:11px;box-shadow:0 3px 10px #0003}.trigger svg{width:14px;height:14px}.quick-start{background:#5264ff;color:#fff;border-color:#8491ff;border-radius:0 0 9px 9px;font-weight:700;padding:6px 11px;box-shadow:0 3px 10px #0003}.quick-start:disabled{opacity:.72;cursor:wait}.menu{display:grid;justify-items:end;gap:7px;max-width:calc(100vw - 24px);padding:8px;background:#171b27ed;border:1px solid #586584;border-radius:10px;box-shadow:0 5px 16px #0003;pointer-events:auto}.modes{display:flex;justify-content:flex-end;align-items:flex-start;gap:7px;width:min(620px,calc(100vw - 42px));margin:0;pointer-events:none}button{font:inherit;color:#c8cfdf;background:#202431;border:1px solid #424b63;border-radius:10px;cursor:pointer;min-width:0;margin:0;padding:7px 6px;pointer-events:auto}.modes button{display:flex;flex:1 1 0;max-width:145px;min-height:58px;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:11px;line-height:1.2}svg{width:27px;height:27px;display:block}button[aria-checked="true"]{background:#303c65;border-color:#a3adff;box-shadow:inset 0 0 0 1px #a3adff;color:#fff}button:focus-visible{outline:2px solid #c1caff;outline-offset:2px}.speeds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.speeds button{font-size:11px;padding:6px 3px}.speed-wrap{width:min(240px,calc(100vw - 42px));padding:7px 9px;background:#232a3a;border:1px solid #414b62;border-radius:8px;color:#b9c2d8}.speed-wrap>span{display:block;margin-bottom:5px}.more{width:100%;text-align:right}.more summary{cursor:pointer;color:#bec9e3;padding:4px 2px;pointer-events:auto}.quick-links{display:flex;justify-content:flex-end;gap:6px;padding-top:5px;pointer-events:none}.quick-links button{font-size:10px;padding:6px 9px;background:#232a3a;border-radius:7px}[hidden]{display:none!important}small{display:block;margin-top:5px;color:#ffcf83}.menu small{width:min(360px,calc(100vw - 42px));text-align:right;text-shadow:0 1px 3px #000}#description{display:none}</style><div class="dock"><div class="top-actions"><button id="trigger" class="trigger" type="button" aria-expanded="false" aria-controls="menu" title="Choose automation pace"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-2 8H6l5 12 2-8h5z" fill="#9ce8dc"/></svg><span id="mode-name">Pace</span><span aria-hidden="true">⌄</span></button><button id="quick-start" class="quick-start" type="button" title="Start the current supported assignment">Start Auto</button></div><div id="menu" class="menu" hidden><div class="modes" role="radiogroup" aria-label="Automation pace">'+modes.map(m=>'<button type="button" role="radio" aria-checked="false" data-mode="'+m.key+'" title="'+m.note+'"><svg viewBox="0 0 64 64" aria-hidden="true">'+m.icon+'</svg><span>'+m.name+'</span></button>').join('')+'</div><div id="speed-label" class="speed-wrap" hidden><span>Working speed</span><div class="speeds" role="radiogroup" aria-label="Human working speed"><button type="button" role="radio" data-speed="faster">Faster</button><button type="button" role="radio" data-speed="typical">Typical</button><button type="button" role="radio" data-speed="deliberate">Deliberate</button></div></div><details class="more"><summary>More options</summary><div class="quick-links"><button id="settings" type="button" title="Open settings in a tab">⚙ Settings</button><button id="panel" type="button" title="Open assignment controls">Assignment controls ↗</button></div></details><small id="note" role="status"></small></div></div>';
      const renderControls=()=>{const o=options(getSettings());for(const b of ui.querySelectorAll('[data-mode]')){const selected=b.dataset.mode===o.mode;b.setAttribute('aria-checked',String(selected));b.tabIndex=selected?0:-1;}for(const b of ui.querySelectorAll('[data-speed]')){const selected=b.dataset.speed===o.humanSpeed;b.setAttribute('aria-checked',String(selected));b.tabIndex=selected?0:-1;}ui.getElementById('speed-label').hidden=o.mode!=='human';};
      const trigger=ui.getElementById('trigger'),menu=ui.getElementById('menu');
      const renderOpen=()=>{trigger.setAttribute('aria-expanded',String(!menu.hidden));const mode=options(getSettings()).mode;ui.getElementById('mode-name').textContent=modes.find(m=>m.key===mode).name;ui.getElementById('quick-start').textContent=mode==='review'?'Guide me':'Start Auto';};
      trigger.onclick=()=>{menu.hidden=!menu.hidden;renderOpen();};
      ui.getElementById('quick-start').onclick=async()=>{const button=ui.getElementById('quick-start');button.disabled=true;button.textContent='Starting…';ui.getElementById('note').textContent='';try{const result=await chrome.runtime.sendMessage({type:'studyQuickStart'});if(!result?.received)throw Error(result?.error||'No active supported assignment was found.');button.textContent='Started';setTimeout(renderOpen,1200);}catch(error){button.textContent='Start Auto';menu.hidden=false;renderOpen();ui.getElementById('note').textContent=error.message||'Could not start Auto.';}finally{button.disabled=false;if(button.textContent==='Starting…')renderOpen();}};
      ui.getElementById('settings').onclick=()=>{menu.hidden=true;renderOpen();chrome.runtime.sendMessage({type:'studyOpenOptions'}).then(r=>{if(!r?.received){menu.hidden=false;renderOpen();ui.getElementById('note').textContent=r?.error||'Settings could not be opened. Try the extension icon.';}}).catch(()=>{menu.hidden=false;renderOpen();ui.getElementById('note').textContent='Reload the extension, then try Settings again.';});};
      ui.getElementById('panel').onclick=()=>{menu.hidden=true;renderOpen();chrome.runtime.sendMessage({type:'studyOpenPanel'}).then(r=>{if(!r?.received)ui.getElementById('note').textContent=r?.error||'The assistant panel could not be opened.';}).catch(()=>{ui.getElementById('note').textContent='Reload the extension, then try opening the assistant panel again.';});};
      document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!paceControls.contains(event.target)){menu.hidden=true;renderOpen();}},true);
      ui.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){menu.hidden=true;renderOpen();trigger.focus();}});
      let saving=Promise.resolve();
      function save(values){
        Object.assign(getSettings(),values);renderControls();if(plan)ui.getElementById('note').textContent='Applies to the next question. Stop and restart to change the current wait.';
        saving=saving.catch(()=>{}).then(async()=>{const {pacingSettings={}}=await chrome.storage.sync.get('pacingSettings');await chrome.storage.sync.set({pacingSettings:{...StudyConfig.pacingDefaults,...pacingSettings,...values}});}).catch(()=>{ui.getElementById('note').textContent='Could not save pace. Reload the extension.';});
      }
      for(const button of ui.querySelectorAll('[data-mode],[data-speed]'))button.onclick=()=>{save(button.dataset.mode?{pacingMode:button.dataset.mode}:{humanSpeed:button.dataset.speed});menu.hidden=true;renderOpen();};
      for(const group of ui.querySelectorAll('[role="radiogroup"]'))group.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...group.querySelectorAll('button')],index=buttons.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+buttons.length)%buttons.length;buttons[next].focus();buttons[next].click();};
      chrome.storage?.onChanged?.addListener((changes,area)=>{if(area==='sync'&&(changes.platformSettings||changes.pacingSettings)){const values=StudyConfig.preferences({platformSettings:changes.platformSettings?.newValue,pacingSettings:changes.pacingSettings?.newValue},platform);Object.assign(getSettings(),values);renderControls();renderOpen();}});
      root.append(paceControls);renderControls();renderOpen();
      chrome.storage?.sync?.get(['platformSettings','pacingSettings']).then(data=>{Object.assign(getSettings(),StudyConfig.preferences(data,platform));renderControls();renderOpen();}).catch(()=>{});
    }
    function attach(root){
      if(box?.isConnected)return;
      host=root||document.body;if(root&&(platform!=='mindtap'||window===window.top))attachControls(document.body);
      box=document.createElement('div');box.className='study-pacing';box.hidden=true;
      const shadow=box.attachShadow({mode:'open'});
      shadow.innerHTML='<style>:host([hidden]){display:none!important}:host{display:block;font:13px/1.5 system-ui;color:#eee;margin-top:10px}*{box-sizing:border-box}section{padding:12px;background:#20243b;border:1px solid #59668d;border-radius:10px;max-width:360px}p{margin:0 0 7px;white-space:pre-wrap}progress{width:100%;accent-color:#8897ff}button{font:inherit;padding:7px 9px;margin:7px 5px 0 0;border:0;border-radius:6px;background:#4f62d4;color:#fff;cursor:pointer}small{color:#bdc4da}button:last-child{background:#63394a}</style><section aria-label="Review pacing"><p id="label" role="status" aria-live="polite"></p><progress id="progress" max="1" value="0"></progress><br><small id="note"></small><br><button id="pause">Pause</button><button id="continue">Continue now</button><button id="stop">Stop</button></section>';
      shadow.getElementById('pause').onclick=()=>{if(state){state.paused=!state.paused;state.last=Date.now();render();}};
      shadow.getElementById('continue').onclick=()=>{if(state){state.skip=true;state.paused=false;render();}};
      shadow.getElementById('stop').onclick=()=>{cancel();onStop?.();};
      host.append(box);
      if(host===document.body)box.style.cssText='position:fixed;right:16px;bottom:20px;z-index:2147483647';
    }
    function render(){
      if(!box||!state)return;
      const seconds=Math.ceil(state.remaining/1000),manual=state.manual&&state.remaining<=0;
      box.hidden=false;
      box.shadowRoot.getElementById('label').textContent=state.label+'\n'+(state.paused?'Paused':manual?'Ready — click Continue now':seconds+' seconds remaining');
      box.shadowRoot.getElementById('note').textContent=manual?'Review each step waits for Continue now.':state.note;
      box.shadowRoot.getElementById('pause').textContent=state.paused?'Resume countdown':'Pause';
      box.shadowRoot.getElementById('progress').value=state.total?1-state.remaining/state.total:1;
    }
    function cancel(){epoch++;if(state){clearTimeout(state.timer);const reject=state.reject;state=null;reject(Error('Stopped.'));}if(box)box.hidden=true;plan=null;}
    function begin(suggestion,count,context={}){
      cancel();const raw=getSettings(),o=options(raw),human=o.mode==='human'?estimate(raw,suggestion,context):null;
      plan={options:o,seconds:duration(raw,suggestion,context),count:Math.max(1,count),suggested:human?human.ai:raw.useSuggestedTime!==false&&finite(typeof suggestion==='object'?suggestion?.estimatedSeconds:suggestion),human};
      if(human)plan.seconds=Math.max(0,human.seconds-human.elapsed);
    }
    function check(guard,mine=epoch){if(mine!==epoch||!guard())throw Error('The question changed or automation stopped.');}
    function wait(ms,label,guard,{manual=false,note=''}={}){
      check(guard);if(!ms&&!manual)return Promise.resolve();attach();
      const mine=epoch;
      return new Promise((resolve,reject)=>{
        state={remaining:ms,total:ms,label,manual,note,paused:false,skip:false,last:Date.now(),reject,timer:null};
        const current=state;
        function tick(){
          if(state!==current)return;
          try{check(guard,mine);}catch(e){state=null;box.hidden=true;reject(e);return;}
          const now=Date.now();if(!current.paused)current.remaining=Math.max(0,current.remaining-(now-current.last));current.last=now;
          render();
          if(current.skip||(!current.paused&&!manual&&current.remaining<=0)){state=null;box.hidden=true;resolve();return;}
          sleep(document.hidden?1000:100).then(()=>{if(state===current)tick();});
        }
        tick();
      });
    }
    async function beforeField(index,count,guard,fieldLabel=''){
      check(guard);const p=plan;
      if(!p||p.options.mode==='normal')return;
      const weights=p.human?.weights,weight=weights?.length===count?weights[index]/weights.reduce((a,b)=>a+b,0):1/count;
      const label=fieldLabel||'Field '+(index+1)+' of '+count;
      await wait(p.seconds*1000*weight,label+' · '+(p.human?'working time before entry':'review before entry'),guard,{manual:p.options.mode==='review',note:p.human?(p.suggested?'AI':'Fallback')+' estimate: '+format(p.human.seconds)+' total · '+p.options.humanSpeed+'. '+p.human.reason+(p.human.elapsed?' AI wait already counted.':''):(p.suggested?'AI suggested':'Configured')+' total review: '+Math.round(p.seconds)+'s. Quiz timers continue.'});
      check(guard);
    }
    async function afterQuestion(guard){if(plan&&plan.options.mode!=='normal')await wait(plan.options.advance*1000,'Review before continuing',guard,{manual:plan.options.mode==='review',note:'The website’s own timer keeps running.'});check(guard);}
    async function setText(el,value,guard){
      check(guard);const w=el.ownerDocument.defaultView,prototype=el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype;
      const setter=Object.getOwnPropertyDescriptor(prototype,'value').set;
      value=String(value);const mine=epoch,valid=()=>mine===epoch&&guard()&&el.isConnected&&!el.disabled&&!el.readOnly;
      // Use the platform value setter and an ordinary untrusted input event so
      // site models update. Never synthesize keyboard events or alter isTrusted.
      const write=text=>{check(valid);setter.call(el,text);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
      el.focus();
      if(el.value)write('');
      let text='';
      await typeCharacters(value,async char=>{
        check(valid);text+=char;write(text);
      },valid);
      check(valid);el.dispatchEvent(new w.Event('change',{bubbles:true}));el.blur();
    }
    async function typeCharacters(value,write,guard){const mine=epoch;for(const char of String(value)){check(guard,mine);await write(char);check(guard,mine);await sleep(0);}check(guard,mine);}
    async function scroll(el,guard){check(guard);const smooth=options(getSettings()).mode!=='normal'&&options(getSettings()).smooth;el.scrollIntoView({block:'center',behavior:smooth?'smooth':'instant'});if(smooth)await wait(400,'Scrolling to question',guard);check(guard);}
    function attachControlsTo(root){attachControls(root||document.body);paceControls.hidden=false;return paceControls;}
    function hideControls(){if(paceControls)paceControls.hidden=true;}
    return {attach,attachControls:attachControlsTo,hideControls,begin,beforeField,afterQuestion,setText,typeCharacters,scroll,cancel,check,wait};
  }
  globalThis.StudyPacing={options,duration,estimate,fallback,format,sleep,create};
})();
