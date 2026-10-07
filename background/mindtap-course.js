// Course-mode state contains activity IDs and status only; no prompts or answers.
async function mindtapCourseMessage(message,sender){
  if(!sender.tab)return {received:false};
  let url;try{url=new URL(sender.url||'');}catch{return {received:false};}
  const host=url.origin==='https://ng.cengage.com'&&url.pathname==='/static/nb/ui/evo/index.html';
  const player=url.origin==='https://aplia.apps.ng.cengage.com'&&url.pathname==='/af/servlet/quiz';
  const read=async()=>((await chrome.storage.session.get('mindtapCourse')).mindtapCourse||null);
  const save=run=>chrome.storage.session.set({mindtapCourse:run});
  if(message.type==='mindtapCourseStart'){
    const categories=Array.isArray(message.selectedCategories)?message.selectedCategories:['apply'];
    const includeInProgress=message.includeInProgress===true;
    if(!host||sender.frameId!==0||categories.length>4||categories.some(key=>!StudyMindTapCourse.categoryKeys.includes(key))||!Array.isArray(message.assignments)||!message.assignments.length||message.assignments.length>200||message.assignments.some(a=>!StudyMindTapCourse.eligible(a,categories,{includeInProgress})))throw Error('Choose supported activity sections and assessments explicitly marked Not started, or explicitly allow in-progress work.');
    const run={tab:sender.tab.id,courseUrl:url.href,assignments:message.assignments,selectedCategories:categories,includeInProgress,index:0,phase:'opening',done:[],skipped:[],skipReviewPause:message.skipReviewPause===true,time:Date.now()};
    await save(run);await chrome.tabs.sendMessage(run.tab,{type:'mindtapCourseOpen',item:run.assignments[0],index:0,total:run.assignments.length},{frameId:0}).catch(()=>{});
    return {received:true,phase:run.phase,title:run.assignments[0].title,total:run.assignments.length};
  }
  const run=await read();
  if(message.type==='mindtapCourseState'){
    if(!host||sender.frameId!==0||run?.tab!==sender.tab.id)return {received:true,phase:'idle',eligible:0};
    if(Date.now()-run.time>4*60*60*1000){await chrome.storage.session.remove('mindtapCourse');return {received:true,phase:'idle',eligible:0};}
    return {received:true,phase:run.phase,index:run.index,total:run.assignments.length,title:run.assignments[run.index]?.title||'',done:run.done.length,skipped:run.skipped.length,skippedItems:run.skipped,skipReviewPause:run.skipReviewPause};
  }
  if(message.type==='mindtapCourseStop'){
    if((!host||sender.frameId!==0)&&!player||run?.tab!==sender.tab.id)return {received:false};
    await chrome.storage.session.remove('mindtapCourse');
    return {received:true};
  }
  if(!run||sender.tab.id!==run.tab||Date.now()-run.time>4*60*60*1000)return {received:false};
  if(message.type==='mindtapCourseReady'){
    if(!player||run.phase!=='opening'&&run.phase!=='running')return {received:false};
    run.phase='running';run.time=Date.now();await save(run);
    return {received:true,start:true,skipReviewPause:run.skipReviewPause,title:run.assignments[run.index]?.title||''};
  }
  if(message.type==='mindtapCourseFinished'||message.type==='mindtapCourseBlocked'){
    if(!player||run.phase!=='running')return {received:false};
    if(message.type==='mindtapCourseFinished')run.done.push(run.assignments[run.index]);
    else {
      const reason=typeof message.reason==='string'?message.reason.slice(0,300):'Needs manual review';
      run.skipped.push({id:run.assignments[run.index]?.id||'',title:run.assignments[run.index]?.title||'Assignment',category:run.assignments[run.index]?.category||'',reason});
    }
    run.phase='review';run.time=Date.now();await save(run);
    await chrome.tabs.sendMessage(run.tab,{type:'mindtapCourseReview',title:run.assignments[run.index]?.title||'',index:run.index,total:run.assignments.length,completed:run.done.length,skipped:run.skipped.length,reason:message.reason||''},{frameId:0}).catch(()=>{});
    return {received:true,phase:'review'};
  }
  if(message.type==='mindtapCourseContinue'){
    if(!host||sender.frameId!==0||run.phase!=='review')return {received:false};
    run.index++;run.time=Date.now();
    if(run.index>=run.assignments.length){run.phase='done';await save(run);await chrome.tabs.sendMessage(run.tab,{type:'mindtapCourseReview',index:run.index,total:run.assignments.length,completed:run.done.length,skipped:run.skipped.length,skippedItems:run.skipped,done:true},{frameId:0}).catch(()=>{});return {received:true,phase:'done'};}
    run.phase='opening';await save(run);
    await chrome.tabs.sendMessage(run.tab,{type:'mindtapCourseOpen',item:run.assignments[run.index],index:run.index,total:run.assignments.length},{frameId:0}).catch(()=>{});
    return {received:true,phase:'opening',title:run.assignments[run.index].title,index:run.index,total:run.assignments.length};
  }
  return {received:false};
}
