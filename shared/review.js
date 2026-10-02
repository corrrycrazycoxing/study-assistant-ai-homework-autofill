/* Presentation helpers: observed progress, recovery advice and inert edit forms. */
(() => {
  function activity(s){
    const p=s.page,status=p?.status||'',run=s.run?.tab===p?.tab?s.run:null;
    if(!p)return {stage:null,label:'Connect an assignment to see progress'};
    if(s.phase==='vision')return {stage:0,label:'Reading the picture'};
    if(s.phase==='grounding')return {stage:1,label:'Checking assigned readings'};
    if(s.phase==='formatting')return {stage:2,label:'Preparing the source answer'};
    if(s.phase==='answer')return {stage:1,label:'Waiting for the chatbot'};
    if(/checking|recording|saving and continuing|advancing|moving to|next question/i.test(status)||run&&['grade','advance'].includes(run.phase))return {stage:4,label:'Checking, saving or moving on'};
    if(/filled|entered|paused.*review/i.test(status)||p.controls?.resume)return {stage:3,label:p.controls?.resume?'Answers entered · waiting for your review':'Answers entered'};
    if(/filling|entering|writing|verifying worksheet/i.test(status))return {stage:3,label:'Entering and verifying answers'};
    if(p.timer)return {stage:2,label:p.timer.pauseLabel==='Resume countdown'?'Review countdown paused':'Review countdown'};
    if(/answer.*ready|answer received|edited answer|formatted and ready/i.test(status)||p.controls?.fill)return {stage:2,label:'Answer ready to review'};
    if(/reading|capturing|loading/i.test(status))return {stage:0,label:'Reading the question'};
    if(/waiting for AI|asking AI/i.test(status))return {stage:1,label:'Waiting for the chatbot'};
    return {stage:null,label:run?'Run in progress':p.kind==='legacy'?'Original McGraw flow · detailed stages unavailable':'Ready for your next action'};
  }
  function recovery(s,localError=''){
    const text=localError||s.page?.status||'',page=s.page;
    if(!page)return {kind:'connection',title:'Connect your assignment',message:'Open a supported assignment, reload it after updating, then refresh this panel.',actions:['refresh']};
    if(/extension context invalidated|extension updated|reloaded|reload the extension|stale|assignment.*changed|question.*changed|panel connection|controls changed|receiving end/i.test(text))return {kind:'connection',title:'Reconnect the page',message:'Reload the assignment and AI tabs after an update, then refresh the panel. Entered answers stay on the assignment.',actions:['refresh','manual']};
    if(/notebook|sources? (?:do not|did not|missing|unavailable)|selected sources/i.test(text)&&/failed|not open|unavailable|reload|missing|choose|review|not support/i.test(text))return {kind:'readings',title:'Check your readings connection',message:'Open the selected notebook, select relevant sources and clear any unsent prompt. Then ask again when it is ready.',actions:['notebook','refresh','ask']};
    if(/timed out|timeout|no answer received|AI.*(?:failed|unavailable|did not accept)|chatbot|could not reach.*AI|no ready|AI tab.*(?:closed|busy)|open.*AI tab|regular.*tab|unsent draft|frozen/i.test(text))return {kind:'ai',title:'Check the chatbot connection',message:'Open your chatbot, finish signing in or clear its unsent draft, then refresh. Ask AI again sends a new request; it does not replay a save or grading step.',actions:['ai','refresh','ask']};
    if(/unsupported|manual entry|manually|read.only|no active worksheet|did not retain|not retain|missing or extra|invalid.*answer|did not match|unknown.*account|balance/i.test(text)&&!/^Ready\./i.test(text)&&!/^Filled.*manual/i.test(text))return {kind:'manual',title:'This question needs attention',message:'Review the current question and entered values. You can ask again when supported, or enter the answer yourself on the assignment.',actions:/unsupported|read.only|manual entry|no active worksheet/i.test(text)?['manual']:['manual','ask']};
    if(localError)return {kind:'action',title:'Review this action',message:'The action could not finish. Check the details, refresh the connection, or return to the assignment for manual entry.',actions:['refresh','manual']};
    return null;
  }
  function draft(model){
    if(!model||typeof model.token!=='string'||model.token.length>160||!Array.isArray(model.fields)||!model.fields.length||model.fields.length>200)throw Error('No supported prepared answer to edit. Ask AI with Auto Fill off.');
    const keys=new Set();
    for(const f of model.fields){
      if(typeof f.key!=='string'||!f.key||f.key.length>120||keys.has(f.key)||!['text','single','multiple'].includes(f.type))throw Error('This answer needs manual review.');keys.add(f.key);
      if(f.type!=='text'&&(!Array.isArray(f.options)||!f.options.length||f.options.length>300||f.options.some(v=>typeof v!=='string'||v.length>4000)))throw Error('This answer’s choices need manual review.');
      if(f.type==='multiple'?!Array.isArray(f.value)||f.value.some(v=>!f.options.includes(v)):!['string','number'].includes(typeof f.value)||String(f.value).length>4000||f.type==='single'&&!f.options.includes(f.value))throw Error('This answer value needs manual review.');
    }
    return model;
  }
  globalThis.StudyReview={activity,recovery,draft};
})();
