const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Drive the production background state machine through a complete synthetic
// Pearson course run. No browser, Pearson account, or assignment is contacted.
const stored={},messages=[],updates=[];
const chrome={storage:{session:{get:async key=>({[key]:stored[key]}),set:async value=>Object.assign(stored,value),remove:async key=>{delete stored[key];}}},tabs:{sendMessage:async(tab,message,options)=>{messages.push({tab,message,options});return {received:true};},update:async(tab,options)=>{updates.push({tab,options});return {};}}};
const context={chrome,URL,Date,Error};vm.createContext(context);
vm.runInContext(fs.readFileSync('background/pearson-course.js','utf8'),context);
const send=(type,from,fields={})=>context.pearsonCourseMessage({type,...fields},from);
const link=(id,title)=>({title,key:`javascript:doHomework(${id}, false, true)`});
const list={url:'https://mylab.pearson.com/Student/DoAssignments.aspx',tab:{id:10},frameId:2};
const overview=(id,from=list)=>({...from,url:`https://mylab.pearson.com/Student/OverviewHomework.aspx?homeworkId=${id}`});
const gate=(id)=>({...list,url:`https://mylab.pearson.com/Student/DoHomework.aspx?homeworkId=${id}`});
const player=(id,questionId,tabId=11)=>({url:`https://mylab.pearson.com/Student/PlayerHomework.aspx?homeworkId=${id}&questionId=${questionId}`,tab:{id:tabId,openerTabId:10,url:`https://mylab.pearson.com/Student/PlayerHomework.aspx?homeworkId=${id}&questionId=${questionId}`},frameId:0});

(async()=>{
  const lesson=link(101,'Lesson Section 6.1-6.2 Large Sample Confidence Intervals (Z)');
  const homework=link(202,'HW Section 6.1-6.3 Z and T Intervals');
  const skipped={title:'Already-scored lesson',reason:'Already has a score'};
  assert.equal((await send('pearsonCourseStart',list,{assignments:[lesson,homework],skippedAssignments:[skipped],skipReviewPause:true})).received,true);
  assert.equal((await send('pearsonCourseList',list)).title,lesson.title);

  // Pearson confirms the native Start button before entering the assignment.
  assert.equal((await send('pearsonCourseGate',gate(101),{canStart:true})).action,'start');
  assert.equal((await send('pearsonCourseOverview',overview(101),{notStarted:true,mediaPending:false,questionsPending:true,pendingQuestionIds:['11','12']})).action,'question');

  const first=player(101,'11');
  assert.equal((await send('pearsonCoursePlayerReady',first)).start,true);
  assert.equal((await send('pearsonCourseQuestionSkipped',first,{questionId:'11',label:'Question 1',reason:'Linked data table and analysis were not captured.'})).received,true);
  const secondQuestion=player(101,'12');
  assert.equal((await send('pearsonCourseQuestionSkipped',secondQuestion,{questionId:'12',label:'Question 2',reason:'Fixture marks this as uncertain; do not guess.'})).received,true);
  assert.equal((await send('pearsonCoursePlayerDone',secondQuestion)).received,true);
  assert.equal(messages.at(-1).message.type,'pearsonCourseSave','assignment completion invokes Pearson Save for later');
  assert(!messages.some(item=>/final.?submit|submit.?assignment/i.test(item.message.type)),'the run must never submit an assignment');

  // The overview reports both still-unanswered IDs. Because each is explicitly
  // recorded as skipped, course mode can save and continue while retaining review.
  const savedFirst=overview(101,{tab:{id:11,openerTabId:10},frameId:0});
  const next=await send('pearsonCourseOverview',savedFirst,{mediaPending:false,questionsPending:true,pendingQuestionIds:['11','12']});
  assert.equal(next.action,'saved-list');
  assert.equal((await send('pearsonCourseList',list)).title,homework.title,'Pearson Save returns to the list and advances to the next eligible assignment');

  // A second assignment completes without any skipped question.
  assert.equal((await send('pearsonCourseGate',gate(202),{canStart:true})).action,'start');
  assert.equal((await send('pearsonCourseOverview',overview(202),{notStarted:true,mediaPending:true,questionsPending:true,pendingQuestionIds:['21']})).action,'question','assignment questions continue even while media remains pending');
  const last=player(202,'21');
  assert.equal((await send('pearsonCoursePlayerReady',last)).start,true);
  assert.equal((await send('pearsonCoursePlayerDone',last)).received,true);
  assert.equal(messages.at(-1).message.type,'pearsonCourseSave');
  const savedLast=overview(202,{tab:{id:11,openerTabId:10},frameId:0});
  const done=await send('pearsonCourseOverview',savedLast,{mediaPending:true,questionsPending:false,pendingQuestionIds:[]});
  assert.equal(done.action,'saved-list');
  const report=await send('pearsonCourseList',list);
  assert.equal(report.phase,'done');
  assert.equal(report.skippedQuestions.length,2);
  assert.equal(report.skippedAssignments[0].title,skipped.title);
  assert.equal(report.pendingMediaAssignments[0].title,homework.title,'the end-of-run report retains pending media for the specific assignment');
  assert.equal(report.pendingMediaAssignments[0].assignmentId,'202','the media-review action is tied to the Pearson assignment ID');
  assert.equal(updates.at(-1).options.url,list.url,'the last Save returns to the original course assignment list');
  assert.equal(messages.filter(item=>item.message.type==='pearsonCourseSave').length,2);

  // Unknown unanswered questions still stop the run; media status is tracked
  // independently and never counts as watched merely because the tab returned.
  await send('pearsonCourseStop',list);
  await send('pearsonCourseStart',list,{assignments:[lesson],skipReviewPause:true});
  await send('pearsonCourseOverview',overview(101),{notStarted:true,mediaPending:false,questionsPending:true,pendingQuestionIds:['11']});
  const current=player(101,'11');
  await send('pearsonCoursePlayerReady',current);
  await send('pearsonCourseQuestionSkipped',current,{questionId:'11',label:'Question 1',reason:'Unavailable linked resource.'});
  await send('pearsonCoursePlayerDone',current);
  const mediaWait=await send('pearsonCourseOverview',overview(101,{tab:{id:11,openerTabId:10},frameId:0}),{mediaPending:true,questionsPending:true,pendingQuestionIds:['11']});
  assert.equal(mediaWait.action,'saved-list','pending media does not block a saved assignment from advancing');
  assert.equal(mediaWait.pendingMediaAssignments[0].assignmentId,'101');
  await send('pearsonCourseStop',list);

  // The mock site is a local visual fixture, never an alternate route to live MyLab.
  const page=fs.readFileSync('docs/pearson-course-mock.html','utf8');
  const script=fs.readFileSync('docs/pearson-course-mock.js','utf8');
  assert.match(page,/aria-label="Pearson assignments"/);
  assert.match(page,/data-state="not-started"/);
  assert.match(page,/Continue after questions needing manual attention/);
  assert.match(page,/role="alertdialog"/);
  assert.match(page,/pearson-course-mock\.js/);
  assert.match(script,/No answer entered/);
  assert.match(script,/Pearson Save for later clicked/);
  assert.match(script,/Final submission was not used/);
  assert.match(script,/finish-summary/);

  // Exercise every button in the standalone mock with a small DOM double, so
  // the fixture itself has a repeatable Go → question → Save → next → report run.
  class MockElement{
    constructor(id,hidden=false){this.id=id;this.hidden=hidden;this.textContent='';this.innerHTML='';this.checked=false;this.children=[];this.handlers={};this.attributes={};this.classes=new Set();this.classList={toggle:(name,on)=>{if(on===undefined)on=!this.classes.has(name);on?this.classes.add(name):this.classes.delete(name);},add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name)};}
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
    async fire(type){for(const fn of this.handlers[type]||[])await fn({target:this});}
    setAttribute(name,value){this.attributes[name]=value;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=[...nodes];}
  }
  const elements=new Map([...page.matchAll(/\bid="([^"]+)"/g)].map(match=>{
    const tag=page.match(new RegExp(`<[^>]*\\bid="${match[1]}"[^>]*>`))?.[0]||'';
    return [match[1],new MockElement(match[1],/\shidden(?:\s|>|=)/.test(tag))];
  }));
  const mockDocument={getElementById:id=>elements.get(id),createElement:tag=>new MockElement(tag)};
  const mockWindow={};
  vm.runInNewContext(script,{document:mockDocument,window:mockWindow});
  const click=async id=>elements.get(id).fire('click');
  elements.get('continue-skips').checked=true;
  await click('go-course');await click('start-assignment');
  assert.equal(mockWindow.__pearsonCourseMock.state.current,'lesson');
  await click('skip-question');
  assert.equal(mockWindow.__pearsonCourseMock.state.skipCount,1,'unsupported linked material is skipped without entering a guessed value');
  await click('next-question');await click('return-overview');
  assert.equal(mockWindow.__pearsonCourseMock.state.current,'homework','the Save step selects the next eligible fixture');
  assert.equal(elements.get('media-note').hidden,false,'the assignment clearly shows media still needs review');
  assert.equal(elements.get('start-assignment').hidden,true,'the fixture models an unstarted assignment with no Start button');
  assert.equal(elements.get('first-question-link').hidden,false,'Pearson can expose the first question as the entry route');
  await click('first-question-link');assert.equal(elements.get('player').classList.contains('active'),true,'the first question link starts work while media is separately tracked');
  await click('start-assignment');await click('next-question');await click('next-question');await click('return-overview');
  assert.equal(elements.get('finish').classList.contains('active'),true);
  assert.equal(elements.get('review-shade').classList.contains('show'),true,'the mock presents the large end-of-course review');
  assert.match(elements.get('review-items').children[0].textContent,/linked data table \/ XLSTAT printout unavailable/);
  assert.match(elements.get('review-items').children[1].textContent,/Pearson may update media credit after its route returns/);
  assert.equal(elements.get('review-items').children[1].children[0].textContent,'Open assignment','pending media has a direct action back to its assignment');
  await elements.get('review-items').children[1].children[0].fire('click');
  assert.equal(mockWindow.__pearsonCourseMock.state.current,'homework','the final media action reopens the exact assignment');
  assert.equal(mockWindow.__pearsonCourseMock.state.answerCount,18);
  await click('close-review');assert.equal(elements.get('review-shade').classList.contains('show'),false);
  await click('reset');assert.equal(elements.get('list').classList.contains('active'),true);
  console.log('PASS Pearson course end-to-end queue, Start/question-link entry, skip review, Save, next assignment, and pending-media report');
})().catch(error=>{console.error(error);process.exitCode=1;});
