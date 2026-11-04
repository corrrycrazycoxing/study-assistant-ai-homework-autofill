/* Only the embedded provider in its verified Canvas assignment can run. */
async function preventZoneContext(sender,message){
  const P=StudyPreventZone,u=P.url(sender.url);
  if(sender.id!==chrome.runtime.id||!sender.tab||sender.frameId===0||!u)throw Error('Open Prevent Zone inside its Canvas assignment.');
  const tab=await chrome.tabs.get(sender.tab.id),top=new URL(tab.url),data=await config();
  if(StudyConfig.detect(top.href,data.canvasOrigins||[])!=='canvas'||!/^\/courses\/\d+\/assignments\/\d+\/?$/.test(top.pathname))throw Error('The Canvas assignment changed.');
  const proof=await chrome.tabs.sendMessage(tab.id,{type:'canvasCoursePreventVerify'},{frameId:0}).catch(()=>null);
  const course=P.url(message.courseUrl);
  if(!proof?.received||!course||course.pathname!=='/courses/course/view.php'||!/^\d+$/.test(course.searchParams.get('id')||'')||!P.titleKey(message.courseTitle)||P.titleKey(proof.title)!==P.titleKey(message.courseTitle))throw Error('The training does not match the visible Canvas assignment.');
  return {tab,proof,canvasUrl:top.origin+top.pathname.replace(/\/$/,''),courseUrl:course.origin+course.pathname+'?id='+course.searchParams.get('id'),courseTitle:proof.title};
}
async function preventZoneCommand(message,sender){
  const context=await preventZoneContext(sender,message),{canvasMcGrawCourse:course,preventZoneRun:saved}=await chrome.storage.session.get(['canvasMcGrawCourse','preventZoneRun']);
  const owns=course&&course.tab===sender.tab.id&&course.items[course.index]?.url===context.canvasUrl&&course.phase!=='done';
  const matches=saved?.tab===sender.tab.id&&saved.canvasUrl===context.canvasUrl&&saved.courseUrl===context.courseUrl&&Date.now()-saved.time<14400000;
  if(owns&&course.phase==='launching'){
    course.provider='prevent-zone';course.preventCourseUrl=context.courseUrl;course.preventFrame=sender.frameId;course.phase='training';course.trainingStatus='Opening the verified training course…';course.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:course});
  }
  const active=owns?course.provider==='prevent-zone'&&course.phase==='training':matches&&saved.active;
  if(message.type==='preventZoneState')return {received:true,active:!!active,course:!!owns,phase:course?.phase||null};
  if(message.type==='preventZoneStart'){
    await requireSetup();
    if(course&&course.phase!=='done'&&!owns)throw Error('Stop the other Course Auto run first.');
    if(owns&&course.phase!=='training')throw Error('Wait for Canvas Course Auto to verify this assignment.');
    if(saved?.active&&!matches&&Date.now()-saved.time<14400000)throw Error('Training Auto is running on another assignment.');
    await chrome.storage.session.set({preventZoneRun:{...context,tab:sender.tab.id,frame:sender.frameId,active:true,time:Date.now()}});return {received:true,active:true};
  }
  if(message.type==='preventZoneStop'){
    if(matches)await chrome.storage.session.remove('preventZoneRun');
    if(owns&&course.provider==='prevent-zone'){course.phase='done';course.issues.push({title:context.courseTitle,reason:'Training Auto stopped by user.'});course.updated=Date.now();await chrome.storage.session.set({canvasMcGrawCourse:course});}
    const {pending}=await chrome.storage.session.get('pending');if(pending?.tab===sender.tab.id&&pending.frame===sender.frameId&&pending.prefix==='preventZone')await cancel(pending);
    return {received:true};
  }
  if(!active)throw Error('Training Auto is no longer active.');
  if(message.type==='preventZoneQuestion')return request(message,sender,'canvas');
  if(message.type==='preventZoneProgress'){
    if(matches){saved.time=Date.now();await chrome.storage.session.set({preventZoneRun:saved});}
    if(owns){course.updated=Date.now();course.trainingStatus=String(message.status||'').slice(0,1000);
      if(message.finish||message.issue){
        const reason=String(message.issue||'Supported training activities finished; the pledge is excluded and remains for manual review.').slice(0,1000);
        if(!course.issues.some(issue=>issue.url===context.canvasUrl&&issue.reason===reason))course.issues.push({title:context.courseTitle,url:context.canvasUrl,reason});
        course.phase='returning';await chrome.storage.session.set({canvasMcGrawCourse:course});await chrome.tabs.update(course.tab,{url:course.listUrl,active:true});
      }else await chrome.storage.session.set({canvasMcGrawCourse:course});
    }
    if(message.finish||message.issue){if(matches)await chrome.storage.session.remove('preventZoneRun');}
    return {received:true};
  }
  throw Error('Unknown training action.');
}
