const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let stored={},messages=[],saveReply={received:true,saveClicked:true};
const storage={get:async keys=>structuredClone(Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,stored[key]]))),set:async values=>Object.assign(stored,structuredClone(values)),remove:async key=>delete stored[key]};
const bg={URL,Date,Error,crypto:require('node:crypto').webcrypto,chrome:{storage:{session:storage,local:storage},tabs:{sendMessage:async(tab,message,options)=>{messages.push({tab,message,options});if(message.type==='pearsonCourseSave'){if(saveReply instanceof Error)throw saveReply;return saveReply;}return {received:true};}}}};
vm.createContext(bg);vm.runInContext(fs.readFileSync('background/pearson-course.js','utf8'),bg);
const list={url:'https://mylab.pearson.com/Student/DoAssignments.aspx',tab:{id:10},frameId:2};
const overview={...list,url:'https://mylab.pearson.com/Student/OverviewHomework.aspx?homeworkId=456'};
const player={url:'https://tdx.acs.pearson.com/Player/Player.aspx',tab:{id:20,openerTabId:10,url:'https://mylab.pearson.com/Student/PlayerHomework.aspx?homeworkId=456'},frameId:7,documentId:'current'};
const call=(type,sender=player,fields={})=>bg.pearsonCourseMessage({type,...fields},sender);
const start=async()=>{stored={};messages=[];await call('pearsonCourseStart',list,{assignments:[{title:'HW Section 6.1',key:'javascript:doHomework(456, false, true);'},{title:'HW Section 6.2',key:'javascript:doHomework(789, false, true);'}]});await call('pearsonCourseOverview',overview,{notStarted:true,questionsPending:true,pendingQuestionIds:['1']});await call('pearsonCoursePlayerReady');};
(async()=>{
  await start();await bg.pearsonCoursePlayerClosed(20);
  assert.equal(stored.pearsonCourse.phase,'attention','closing a player without Save cannot begin score verification');assert.equal(stored.pearsonCourse.index,0);assert(!messages.some(item=>item.message.type==='pearsonCourseVerify'));
  await call('pearsonCourseSaveObserved');assert.equal(stored.pearsonCourse.phase,'verify','a delayed genuine click receipt recovers a prior close notification');assert.equal(messages.at(-1).message.type,'pearsonCourseVerify');
  await start();assert.equal((await call('pearsonCourseOverview',{...overview,tab:{id:20},frameId:0},{questionsPending:false,pendingQuestionIds:[]})).action,'attention','redirecting to an overview without Save cannot count as saving');assert.equal(stored.pearsonCourse.index,0);
  await start();saveReply={received:true};const unconfirmed=await call('pearsonCoursePlayerDone');assert.equal(unconfirmed.attention,true,'a generic transport acknowledgement is not a Save click receipt');await bg.pearsonCoursePlayerClosed(20);assert.equal(stored.pearsonCourse.phase,'attention');assert.equal(stored.pearsonCourse.index,0);
  await start();saveReply=Error('The message channel closed');assert.equal((await call('pearsonCoursePlayerDone')).attention,true);assert.equal(stored.pearsonCourse.saveClicked,false);
  assert.equal((await call('pearsonCourseSaveObserved',{...player,frameId:8})).received,false);assert.equal((await call('pearsonCourseSaveObserved',{...player,documentId:'stale'})).received,false);
  // Native capture can record the click after its original frame reply is lost.
  assert.equal((await call('pearsonCourseSaveObserved')).received,true);assert.equal(stored.pearsonCourse.saveClicked,true);await bg.pearsonCoursePlayerClosed(20);assert.equal(messages.at(-1).message.type,'pearsonCourseVerify');assert.equal(stored.pearsonCourse.index,0);
  assert.equal((await call('pearsonCourseOverview',overview,{questionsPending:false,pendingQuestionIds:[]})).action,'list');assert.equal(stored.pearsonCourse.index,1);assert.equal(stored.pearsonCourse.saveClicked,undefined,'the prior Save receipt cannot authorize the next assignment');
  await start();saveReply={received:true,saveClicked:true};await call('pearsonCoursePlayerDone');assert.equal(stored.pearsonCourse.saveClicked,true);await call('pearsonCourseSaveFailed',player,{error:'Unchecked answer: Save was cancelled.'});assert.equal(stored.pearsonCourse.phase,'attention');assert.equal(stored.pearsonCourse.index,0);assert.match(messages.at(-1).message.reason,/Unchecked answer/);
  console.log('PASS Pearson Save click receipts, dropped-channel recovery, exact ownership, unchecked failure and no closed-tab completion');
})().catch(error=>{console.error(error);process.exitCode=1;});
