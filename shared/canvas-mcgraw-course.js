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
  function quizUrl(value,list){try{const u=new URL(value),base=listUrl(list);return base&&u.origin===base.origin&&new RegExp('^/courses/'+base.pathname.split('/')[2]+'/quizzes/\\d+/?$').test(u.pathname)?u.origin+u.pathname.replace(/\/$/,''):null;}catch{return null;}}
  function savedIssue(item,bank,list){
    const urls=new Set([item.url,item.quizUrl,item.assignmentUrl].map(value=>itemUrl(value,list)).filter(Boolean));
    return Object.entries(bank||{}).find(([key,issue])=>issue&&typeof issue==='object'&&[key,issue.url,issue.assignmentUrl].some(value=>urls.has(itemUrl(value,list))))?.[1]||null;
  }
  const typeNames={quiz:'Canvas quiz',homework:'Homework / assignment',discussion:'Discussion',upload:'File upload',written:'Written response',external:'Other external tool',exam:'Exam / test',unknown:'Unknown'};
  function workTypes(value,includeQuizzes=false){
    if(value===undefined||value===null)return {homework:true,quiz:includeQuizzes===true};
    if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['homework','quiz'].includes(key))||typeof value.homework!=='boolean'||typeof value.quiz!=='boolean')throw Error('Invalid assignment type selection.');
    return {homework:value.homework,quiz:value.quiz};
  }
  function itemUrl(value,list){try{const u=new URL(value),base=listUrl(list);return base&&!u.username&&!u.password&&!u.port&&u.origin===base.origin&&new RegExp('^/courses/'+base.pathname.split('/')[2]+'/(?:assignments|quizzes|discussion_topics)/\\d+/?$').test(u.pathname)?u.origin+u.pathname.replace(/\/$/,''):null;}catch{return null;}}
  function classify(item,list){
    const url=itemUrl(item.url,list);if(!url)return null;
    const title=clean(item.title),kind=clean(item.kind).toLowerCase();
    let type='unknown';
    if(/\/discussion_topics\//.test(url)||kind==='discussion')type='discussion';
    else if(/\b(?:exam|test|proctor(?:ed|ing)?)\b/i.test(title))type='exam';
    else if(['upload','written','external','unknown'].includes(kind))type=kind;
    else if(quizUrl(url,list)||kind==='quiz')type='quiz';
    else if(/\bdiscussion(?: post| board)?\b/i.test(title))type='discussion';
    else if(/\bquiz\b/i.test(title))type='quiz';
    else if(assignmentUrl(url,list))type='homework';
    return {url,type};
  }
  function catalog(items,list){
    if(!Array.isArray(items)||items.length>4000)throw Error('Invalid assignment list.');
    const seen=new Set(),result=[];
    for(const item of items){
      if(!item||typeof item!=='object')continue;
      const title=clean(item.title),identified=classify(item,list);
      if(!identified||!title||title.length>180||seen.has(identified.url))continue;
      seen.add(identified.url);
      const alias=assignmentUrl(item.assignmentUrl,list);
      result.push({title,url:identified.url,...(alias?{assignmentUrl:alias}:{}),type:identified.type,kind:identified.type,typeLabel:typeNames[identified.type],dueAt:Number.isFinite(item.dueAt)&&item.dueAt>0?item.dueAt:null,scored:item.scored===true,...(item.missing===true?{missing:true}:{})});
    }
    return result;
  }
  function applyMetadata(items,list,metadata){
    if(!Array.isArray(metadata))return items;
    const known=new Map(), matched=new Set();
    for(const item of metadata){
      const url=itemUrl(item.url,list),alias=assignmentUrl(item.assignmentUrl,list);
      if(url)known.set(url,item);
      if(alias)known.set(alias,item);
    }
    const rows=items.map(item=>{
      const found=known.get(itemUrl(item.url,list));
      if(!found)return {...item,kind:'unknown'};
      matched.add(found);
      const nativeQuiz=found.type==='quiz'&&quizUrl(found.url,list);
      return {
        ...item,
        url:nativeQuiz||item.url,
        assignmentUrl:found.assignmentUrl,
        kind:typeNames[found.type]?found.type:'unknown',
        dueAt:Number.isFinite(found.dueAt)?found.dueAt:item.dueAt,
        scored:found.scored===true||item.scored===true&&found.missing!==true,
        missing:found.missing===true
      };
    });
    // Missing Classic quizzes can be absent from the rendered assignment
    // group. Only add records that Canvas identifies by quiz ID and status.
    for(const item of metadata){
      const url=quizUrl(item.url,list);
      if(!matched.has(item)&&item.type==='quiz'&&url&&item.missing===true&&!item.scored)rows.push({...item,url,kind:'quiz'});
    }
    return rows;
  }
  function apiAssignments(items,course){
    if(!Array.isArray(items)||items.length>2000)throw Error('Invalid assignment metadata.');
    const list=course+'/assignments',mapped=[];
    for(const item of items){
      if(!item||item.published===false||!Number.isSafeInteger(Number(item.id))||Number(item.id)<=0)continue;
      const submissions=Array.isArray(item.submission_types)?item.submission_types:[];let kind='unknown';
      if(submissions.includes('discussion_topic'))kind='discussion';
      else if(submissions.includes('online_quiz')||item.is_quiz_assignment===true)kind='quiz';
      else if(submissions.includes('online_upload'))kind='upload';
      else if(submissions.includes('online_text_entry')||submissions.includes('media_recording')||submissions.includes('student_annotation'))kind='written';
      else if(submissions.includes('external_tool')){try{const host=new URL(item.external_tool_tag_attributes?.url).hostname;kind=/(^|\.)mheducation\.com$/.test(host)?'homework':'external';}catch{kind='external';}}
      else if(submissions.some(type=>['none','on_paper'].includes(type)))kind='homework';
      const quizId=Number(item.quiz_id),url=kind==='quiz'&&Number.isSafeInteger(quizId)&&quizId>0?course+'/quizzes/'+quizId:course+'/assignments/'+item.id;
      const dueAt=Date.parse(item.due_at),submission=item.submission;
      const submitted=Boolean(submission?.submitted_at)||['submitted','pending_review'].includes(submission?.workflow_state);
      const missing=submission?.missing===true&&!submitted&&!submission.excused;
      const scored=submitted||submission?.excused===true||!missing&&submission?.workflow_state==='graded';
      mapped.push({
        title:item.name,url,assignmentUrl:course+'/assignments/'+item.id,kind,
        dueAt:Number.isFinite(dueAt)?dueAt:null,scored,
        missing:missing&&item.locked_for_user!==true
      });
    }
    return catalog(mapped,list);
  }
  function assignments(items,list,selection=false){
    const types=typeof selection==='boolean'?workTypes(undefined,selection):workTypes(selection);
    return catalog(items,list).filter(item=>types[item.type]===true).map(item=>({title:item.title,url:item.url,...(item.type==='quiz'?{kind:'quiz'}:{}),...(item.assignmentUrl?{assignmentUrl:item.assignmentUrl}:{}),dueAt:item.dueAt,scored:item.scored}));
  }
  function emptyQueueReason(catalog,list,types,policy,retryIssueBank){
    const enabled=assignments(catalog,list,types);
    if(!enabled.length){
      const quizCount=catalog.filter(item=>item.type==='quiz').length;
      if(quizCount&&!types.quiz)return 'Canvas quizzes are off for this course. Enable Canvas quiz in the course inventory.';
      return 'No assignments match the enabled types for this course.';
    }
    const unfinished=enabled.filter(item=>!item.scored);
    if(!unfinished.length)return 'Canvas marks the assignments of the selected types as submitted or scored.';
    const dated=unfinished.filter(item=>dateAllowed(item.dueAt,policy));
    if(!dated.length)return policy.onlyPastDue
      ? 'No unfinished assignments have a confirmed past due date.'
      : 'The unfinished assignments are past due. Turn off Skip past-due assignments to include them.';
    if(retryIssueBank)return 'No eligible assignments have saved issues. Use the regular start button to include work without a saved issue.';
    return 'No eligible assignments match the selected types and dates.';
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
  function datePolicy(value={}){return {onlyPastDue:value.onlyPastDue===true,skipPastDue:value.onlyPastDue!==true&&value.skipPastDue===true};}
  function dateAllowed(time,value,now=Date.now()){
    const policy=datePolicy(value);
    return policy.onlyPastDue?isPastDue(time,now):!policy.skipPastDue||!isPastDue(time,now);
  }
  function completed(status){return /^(?:Finished supported questions|Reached the last information page)\./i.test(clean(status));}
  globalThis.StudyCanvasMcGrawCourse={hubUrl,entryUrl,courseUrl,courses,discoverCourses,listUrl,assignmentUrl,quizUrl,itemUrl,savedIssue,typeNames,workTypes,classify,catalog,applyMetadata,apiAssignments,assignments,emptyQueueReason,titleMatches,attempts,begin,canvasStatus,dueTime,detailReady,isPastDue,datePolicy,dateAllowed,completed};
})();
