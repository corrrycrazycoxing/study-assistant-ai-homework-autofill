/* Background-only metadata inventory. This module makes GET requests only. */
(() => {
  const types=new Set(['canvasCatalogGet','canvasCatalogScan','canvasCatalogStop','canvasCatalogPolicy','canvasCatalogIssueClear']),active=new Map();
  const catalogVersion=2;
  let writes=Promise.resolve();
  const mutate=fn=>{const next=writes.then(fn);writes=next.catch(()=>{});return next;};
  async function originFor(message,sender){
    if(sender.id!==chrome.runtime.id)throw Error('Open Canvas Course Auto to scan assignment types.');
    const data=await config();let url=sender.url;
    if(!sender.tab){if(!panelSender(sender)||!Number.isInteger(message.tab))throw Error('Choose a connected Canvas course first.');url=(await chrome.tabs.get(message.tab)).url;}
    else if(sender.frameId!==0)throw Error('Scan from the top-level Canvas page.');
    const u=new URL(url);if(message.origin&&message.origin!==u.origin)throw Error('The Canvas site changed. Refresh the inventory before saving.');
    if(StudyConfig.detect(url,data.canvasOrigins||[])!=='canvas'||!StudyConfig.courseAllowed('canvas',data))throw Error('Enable Canvas Course Auto in settings.');
    if(!await chrome.permissions.contains({origins:[u.origin+'/*']}))throw Error('Enable this Canvas site before scanning.');
    return u.origin;
  }
  async function state(origin){const {canvasCatalogs={},canvasCoursePolicies={},canvasCourseSelections={},canvasCourseTypeSelection,canvasCourseIssueBank={}}=await chrome.storage.local.get(['canvasCatalogs','canvasCoursePolicies','canvasCourseSelections','canvasCourseTypeSelection','canvasCourseIssueBank']);return {catalog:canvasCatalogs[origin]||null,policies:canvasCoursePolicies[origin]||{},selected:canvasCourseSelections[origin]||[],defaults:canvasCourseTypeSelection||{homework:true,quiz:false},issueBank:canvasCourseIssueBank[origin]||{}};}
  async function save(job,initial=false){return mutate(async()=>{
    const {canvasCatalogs={}}=await chrome.storage.local.get('canvasCatalogs');
    if(!initial&&canvasCatalogs[job.origin]?.id!==job.id)return;
    canvasCatalogs[job.origin]=job.value;await chrome.storage.local.set({canvasCatalogs});
  });}
  async function check(job){
    if(job.controller.signal.aborted)throw Error('Scan stopped.');
    if(!StudyConfig.courseAllowed('canvas',await config()))throw Error('Canvas Course Auto was disabled.');
  }
  async function pages(job,path){
    const expected=new URL(path,job.origin).pathname,seen=new Set(),result=[];let next=new URL(path,job.origin).href;
    for(let page=0;next;page++){
      if(page>=20||seen.has(next))throw Error('Canvas pagination exceeded the scan limit.');seen.add(next);await check(job);
      const requested=new URL(next);if(requested.origin!==job.origin||requested.pathname!==expected)throw Error('Canvas returned an unexpected pagination link.');
      const response=await fetch(next,{method:'GET',credentials:'include',redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.any([job.controller.signal,AbortSignal.timeout(20000)])});
      if(!response.ok)throw Error(response.status===401?'Sign in to Canvas, then scan again.':'Canvas metadata request failed ('+response.status+').');
      if(response.url&&(new URL(response.url).origin!==job.origin||new URL(response.url).pathname!==expected)||!response.headers.get('content-type')?.includes('application/json'))throw Error('Canvas returned a login page or unexpected metadata response.');
      const text=await response.text();if(text.length>5000000)throw Error('Canvas metadata response is too large.');
      const data=JSON.parse(text.replace(/^while\s*\(1\);\s*/,''));if(!Array.isArray(data))throw Error('Canvas did not return an assignment/course list.');result.push(...data);
      if(result.length>2000)throw Error('Canvas metadata list exceeds the scan limit.');
      next=null;const link=response.headers.get('link')||'';for(const part of link.split(',')){const match=part.match(/<([^>]+)>;\s*rel="next"/);if(match)next=new URL(match[1],job.origin).href;}
    }
    return result;
  }
  async function execute(job){
    try{
      const raw=await pages(job,'/api/v1/courses?enrollment_state=active&per_page=100');
      const seen=new Set(),courses=raw.filter(c=>Number.isSafeInteger(Number(c.id))&&Number(c.id)>0&&!['completed','deleted'].includes(c.workflow_state)&&!seen.has(Number(c.id))&&seen.add(Number(c.id))).map(c=>({id:String(c.id),title:String(c.name||c.course_code||'Course '+c.id).slice(0,240),url:job.origin+'/courses/'+c.id,items:[],error:'',scannedAt:null}));
      if(courses.length>200)throw Error('Too many active courses for one scan.');job.value.courses=courses;job.value.total=courses.length;job.value.totalItems=0;await save(job);
      // Two bounded workers keep the current Canvas tab free and avoid a burst
      // of requests across every course at once.
      let index=0;
      await Promise.all([0,1].map(async()=>{while(index<courses.length){const course=courses[index++];await check(job);
        try{const assignments=await pages(job,'/api/v1/courses/'+course.id+'/assignments?per_page=100&include%5B%5D=submission');const items=StudyCanvasMcGrawCourse.apiAssignments(assignments,course.url),remaining=Math.max(0,5000-job.value.totalItems);course.items=items.slice(0,remaining);job.value.totalItems+=course.items.length;if(items.length>remaining)course.error='Inventory reached its 5,000-assignment limit; additional items are excluded.';course.scannedAt=Date.now();}
        catch(error){if(job.controller.signal.aborted)throw error;course.error=error.message||'Course metadata is unavailable.';}
        job.value.processed++;await save(job);
      }}));
      await check(job);job.value.phase='ready';job.value.finishedAt=Date.now();await save(job);
    }catch(error){job.value.phase=job.controller.signal.aborted?'cancelled':'error';job.value.error=error.message||'Canvas scan failed.';job.value.finishedAt=Date.now();await save(job);}
    finally{if(active.get(job.origin)===job)active.delete(job.origin);}
  }
  async function start(origin){
    if(active.has(origin)&&!active.get(origin).controller.signal.aborted)return;
    const id=crypto.randomUUID(),job={id,origin,controller:new AbortController(),value:{id,origin,version:catalogVersion,phase:'scanning',startedAt:Date.now(),finishedAt:null,processed:0,total:0,courses:[],error:''}};
    active.set(origin,job);await save(job,true);void execute(job).catch(()=>{});
  }
  async function policy(origin,message){return mutate(async()=>{
    const current=await state(origin),course=current.catalog?.courses.find(c=>c.id===String(message.courseId));if(!course)throw Error('Scan this course before changing its Course Auto selection.');
    if(typeof message.enabled!=='boolean')throw Error('Invalid course selection.');const types=StudyCanvasMcGrawCourse.workTypes(message.assignmentTypes);
    const {canvasCoursePolicies={},canvasCourseSelections={}}=await chrome.storage.local.get(['canvasCoursePolicies','canvasCourseSelections']);
    canvasCoursePolicies[origin] ||= {};canvasCoursePolicies[origin][course.url]={enabled:message.enabled,types};
    const selection=new Set(canvasCourseSelections[origin]||[]);if(message.enabled)selection.add(course.url);else selection.delete(course.url);canvasCourseSelections[origin]=[...selection];
    await chrome.storage.local.set({canvasCoursePolicies,canvasCourseSelections});
    const {canvasMcGrawCourse:run}=await chrome.storage.session.get('canvasMcGrawCourse'),item=run?.items?.[run.index],type=item?.kind==='quiz'?'quiz':'homework';
    if(run?.origin===origin&&item&&!['done','scanning','attention'].includes(run.phase)&&(item.listUrl||run.listUrl)===course.url+'/assignments'&&(!message.enabled||!types[type])){
      run.phase='attention';run.issues.push({title:item.title,url:item.url,reason:'Course or assignment type was disabled in the Canvas inventory.'});run.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:run});
      for(const tab of new Set([run.tab,run.playerTab].filter(Boolean)))await chrome.tabs.sendMessage(tab,{type:'studyStop'},{frameId:0}).catch(()=>{});
    }
  });}
  async function handle(message,sender){
    const origin=await originFor(message,sender);
    if(message.type==='canvasCatalogPolicy')await policy(origin,message);
    if(message.type==='canvasCatalogIssueClear')await mutate(async()=>{
      const {canvasCourseIssueBank:bank={}}=await chrome.storage.local.get('canvasCourseIssueBank');
      if(typeof message.url!=='string'||!bank[origin]?.[message.url])throw Error('This saved issue is no longer available.');
      delete bank[origin][message.url];await chrome.storage.local.set({canvasCourseIssueBank:bank});
    });
    if(message.type==='canvasCatalogStop'){const job=active.get(origin);if(job){job.controller.abort();job.value.phase='cancelled';job.value.error='Scan stopped.';await save(job);}}
    if(message.type==='canvasCatalogScan')await start(origin);
    let result=await state(origin);
    if(message.type==='canvasCatalogGet'&&message.refreshIfStale===true&&(!result.catalog||result.catalog.version!==catalogVersion||Date.now()-(result.catalog.finishedAt||result.catalog.startedAt)>900000)){await start(origin);result=await state(origin);}
    if(result.catalog?.phase==='scanning'&&!active.has(origin)){result.catalog.phase='interrupted';result.catalog.error='The extension restarted during the scan. Scan again to refresh the inventory.';const job={id:result.catalog.id,origin,value:result.catalog};await save(job);}
    return {received:true,origin,...result};
  }
  globalThis.StudyCanvasCatalog={handles:type=>types.has(type),handle};
})();
