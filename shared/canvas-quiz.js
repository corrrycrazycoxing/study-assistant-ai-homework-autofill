/* Public Canvas page evidence shared by the course handoff and submission watcher. */
(() => {
  function base(value){try{const u=new URL(value);const path=u.pathname.match(/^\/courses\/\d+\/quizzes\/\d+(?=\/|$)/)?.[0];return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&path?u.origin+path:null;}catch{return null;}}
  function overview(value){try{const quiz=base(value);return !!quiz&&new URL(value).pathname.replace(/\/$/,'')===new URL(quiz).pathname;}catch{return false;}}
  function title(doc){for(const selector of ['#quiz_title','#quiz_show h1','h1.quiz-title','#content h1','h1']){const text=doc.querySelector(selector)?.textContent?.replace(/\s+/g,' ').trim();if(text)return text;}return '';}
  function submitted(doc,href,intent=false){
    if(!overview(href))return false;
    if(doc.querySelector('#submit_quiz_form,#quiz_show form[action*="/take"]'))return false;
    const shown=node=>!!node&&(typeof node.getClientRects!=='function'||node.getClientRects().length>0);
    const explicit=doc.querySelector('#quiz-submitted,[data-quiz-submitted="true"]');
    if(shown(explicit))return true;
    const text=doc.querySelector('#content,#quiz_show')?.innerText||'';
    if(/\b(?:your quiz has been submitted|quiz (?:was |successfully )?submitted|you submitted this quiz)\b/i.test(text))return true;
    // A history table alone can describe an older attempt. Require a submit
    // intent from this tab's current attempt before accepting that weaker view.
    return intent&&shown(doc.querySelector('#quiz-submission-version-table,.quiz-submission'))&&/\bsubmitted\b/i.test(text);
  }
  function duration(text){
    const value=String(text||'').trim();
    if(!value||/^-|\b(?:NaN|expired|time.?s up)\b/i.test(value))return /expired|time.?s up/i.test(value)?0:null;
    const clock=value.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if(clock)return Number(clock[2])<60&&Number(clock[3])<60?Number(clock[1]||0)*3600+Number(clock[2])*60+Number(clock[3]):null;
    const units=[...value.matchAll(/(\d+(?:\.\d+)?)\s*(days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi)];
    if(!units.length||value.replace(/\d+(?:\.\d+)?\s*(?:days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi,'').replace(/[,\s]/g,''))return null;
    return units.reduce((sum,match)=>sum+Number(match[1])*(/^d/i.test(match[2])?86400:/^h/i.test(match[2])?3600:/^m/i.test(match[2])?60:1),0);
  }
  function timeLimit(doc){
    const text=doc.querySelector('#quiz_student_details')?.textContent||'';
    return duration(text.match(/Time Limit\s*:?\s*([\d.,\s]+(?:Hours?|Minutes?|Seconds?)(?:[\d.,\s]+(?:Hours?|Minutes?|Seconds?))*)/i)?.[1]);
  }
  function clock(doc){
    let previous='',countdown=null,fallback=null;
    function seed(limitSeconds,startedAt){
      if(Number.isFinite(limitSeconds)&&limitSeconds>0&&Number.isFinite(startedAt))fallback=startedAt+limitSeconds*1000;
    }
    function read(){
      const now=Date.now(),ends=[];
      for(const selector of ['.end_at','.end_at_without_time_limit']){
        const text=doc.querySelector(selector)?.textContent?.trim();
        if(text&&/^\d{4}-\d{2}-\d{2}T/.test(text)){
          const end=Date.parse(text);if(Number.isFinite(end))ends.push(end);
        }
      }
      const remaining=doc.querySelector('.time_remaining'),running=doc.querySelector('#quiz-time-elapsed .time_running');
      const header=doc.querySelector('#quiz-time-elapsed .time_header')?.textContent||'';
      const timer=remaining||(!/time elapsed/i.test(header)?running:null);
      const text=timer?.textContent?.trim()||'';
      const seconds=duration(text);
      if(seconds!==null){
        if(text!==previous||countdown===null){countdown=now+seconds*1000;previous=text;}
        ends.push(countdown);
      }else if(countdown!==null)ends.push(countdown);
      if(!ends.length&&fallback!==null)ends.push(fallback);
      if(!ends.length)return null;
      const deadlineAt=Math.min(...ends);
      return {deadlineAt,remainingMs:Math.max(0,deadlineAt-now),reserveMs:30000};
    }
    return {read,seed};
  }
  globalThis.StudyCanvasQuiz={base,overview,title,submitted,duration,timeLimit,clock};
})();
