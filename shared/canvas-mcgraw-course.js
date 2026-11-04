/* Pure guards for Canvas -> McGraw course navigation. */
(() => {
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  function hubUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^(?:\/|\/dashboard\/?|\/courses\/?|\/courses\/\d+\/?)$/.test(u.pathname)?u:null;}catch{return null;}}
  function entryUrl(value){return hubUrl(value)||listUrl(value);}
  function courseUrl(value,base){try{const u=new URL(value,base),origin=new URL(base);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.origin===origin.origin&&/^\/courses\/\d+\/?$/.test(u.pathname)?u.origin+u.pathname.replace(/\/$/,''):null;}catch{return null;}}
  function courses(items,base){
    if(!Array.isArray(items)||items.length>500)throw Error('Invalid course list.');
    const seen=new Set(),result=[];
    for(const item of items){if(!item||typeof item!=='object')continue;const url=courseUrl(item.url,base),title=clean(item.title);if(!url||!title||title.length>240||seen.has(url))continue;seen.add(url);result.push({title,url,listUrl:url+'/assignments'});}
    return result;
  }
  function discoverCourses(doc,base,rendered=true){
    const visible=e=>(!rendered||e?.getClientRects().length)&&!e.closest('[hidden],[aria-hidden="true"]');
    const rows=[];
    for(const a of doc.querySelectorAll('a[href]')){
      const href=a.getAttribute('href');
      if(!visible(a)||!courseUrl(href,base)||a.closest('#breadcrumbs,#global_nav_courses_link'))continue;
      // Canvas's All Courses page places past enrollments in a separate table.
      if(a.closest('#past_enrollments_table,#future_enrollments_table'))continue;
      const card=a.closest('.ic-DashboardCard'),titleNode=card?.querySelector('.ic-DashboardCard__header-title');
      const title=clean(titleNode?.getAttribute('title')||titleNode?.textContent||a.getAttribute('title')||a.textContent);
      if(title&&!/^(?:go to course|home|grades|assignments|course home)$/i.test(title))rows.push({url:courseUrl(href,base),title});
    }
    const own=courseUrl(base,base);
    if(own&&!rows.some(row=>courseUrl(row.url,base)===own)){
      const heading=doc.querySelector('#breadcrumbs li:nth-child(2),.ic-Layout-contentMain h1,#content h1');
      if(clean(heading?.textContent))rows.push({url:own,title:clean(heading.textContent)});
    }
    return courses(rows.slice(0,500),base);
  }
  function listUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^\/courses\/\d+\/assignments\/?$/.test(u.pathname)?u:null;}catch{return null;}}
  function assignmentUrl(value,list){try{const u=new URL(value),base=listUrl(list);if(!base||u.origin!==base.origin||!new RegExp('^'+base.pathname.replace(/\/$/,'')+'/\\d+/?$').test(u.pathname))return null;return u.origin+u.pathname.replace(/\/$/,'');}catch{return null;}}
  function assignments(items,list){
    if(!Array.isArray(items)||items.length>200)throw Error('Invalid assignment list.');
    const seen=new Set(),result=[];for(const item of items){const title=clean(item.title),url=assignmentUrl(item.url,list);if(!url||!title||title.length>180||/\b(?:exam|quiz|test)\b/i.test(title)||seen.has(url))continue;seen.add(url);result.push({title,url,dueAt:Number.isFinite(item.dueAt)&&item.dueAt>0?item.dueAt:null,scored:item.scored===true});}return result;
  }
  function titleMatches(a,b){const norm=s=>clean(s).toLowerCase().replace(/\s+/g,' ');return !!norm(a)&&norm(a)===norm(b);}
  function attempts(text){const m=clean(text).match(/\b(\d+)\s+attempt\s*\(s\)\s+completed\b/i);return m?Number(m[1]):null;}
  function begin(text,includeStarted){const value=clean(text).toLowerCase();if(value==='begin')return true;if(includeStarted&&/^(?:resume|continue)(?: assignment)?$/.test(value))return true;return false;}
  function canvasStatus(text){
    const value=clean(text);
    if(/\breview feedback\s+submitted\s*:/i.test(value)||/\battempt\s*\d+\s+score\s*:\s*-?\d+(?:\.\d+)?\s*\/\s*\d/i.test(value)||/\bsubmitted\s*:\s*(?:[a-z]+\s+\d|\d)/i.test(value))return 'submitted';
    const lines=String(text||'').split(/\r?\n/).map(s=>clean(s).toLowerCase());
    if(lines.some(s=>/^(submitted|graded)(?:\s+on\b.*)?$/.test(s)))return 'submitted';
    if(lines.some(s=>/^in progress(?:\s+next up:.*)?$/.test(s)))return 'started';
    if(lines.some(s=>/^not started(?:\s+next up:.*)?$/.test(s)))return 'unfinished';return 'unknown';
  }
  function dueTime(text){
    const value=clean(text),match=value.match(/\bDue:\s*(?:[A-Za-z]+\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:am|pm))/i);
    if(!match)return null;const time=Date.parse(match[1].replace(/(\d)(am|pm)$/i,'$1 $2'));return Number.isFinite(time)?time:null;
  }
  function detailReady(snapshot,expected,skipPastDue){
    if(!snapshot||!titleMatches(snapshot.title,expected))return false;
    if(snapshot.status==='submitted')return true;
    return ['unfinished','started'].includes(snapshot.status)&&(!skipPastDue||Number.isFinite(snapshot.dueAt));
  }
  function isPastDue(time,now=Date.now()){return Number.isFinite(time)&&time<now;}
  function completed(status){return /^(?:Finished supported questions|Reached the last information page)\./i.test(clean(status));}
  globalThis.StudyCanvasMcGrawCourse={hubUrl,entryUrl,courseUrl,courses,discoverCourses,listUrl,assignmentUrl,assignments,titleMatches,attempts,begin,canvasStatus,dueTime,detailReady,isPastDue,completed};
})();
