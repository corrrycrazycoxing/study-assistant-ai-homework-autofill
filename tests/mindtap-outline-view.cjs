const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const shared=fs.readFileSync('shared/mindtap-course.js','utf8'),ui=fs.readFileSync('content-scripts/mindtap-course.js','utf8');
const prepareCode=ui.slice(ui.indexOf('  async function prepareOutline(){'),ui.indexOf('  function outlineHint()'));
function fixture({stuck=false,withTab=true,status='Not started',score=''}={}){
 let selected=false,requested=false,expanded=false,ticks=0,tabClicks=0,expandClicks=0;
 const visible=()=>selected&&expanded;
 const tab={textContent:'',innerText:'',disabled:false,getAttribute:name=>name==='aria-label'?'Outline View':name==='aria-selected'?String(selected):null,getClientRects:()=>[{}],closest:()=>null,click:()=>{requested=true;tabClicks++;}};
 const hiddenTab={...tab,getClientRects:()=>[],click:()=>{throw Error('Hidden duplicate tab was clicked');}};
 const expand={innerText:'Expand All Folders',disabled:false,getClientRects:()=>selected&&!expanded?[{}]:[],closest:()=>null,click:()=>{expandClicks++;expanded=true;}};
 const section={innerText:'',textContent:'Apply It Chapter 13 Homework'};
 const row={textContent:`Chapter 13 Homework ${status} COUNTS TOWARDS GRADE ${score}`,classList:{contains:name=>name==='activity-activityType-2'},closest:selector=>selector==='.topic-level-3'?section:null,querySelector:()=>null};
 const activity={id:'activity-heading-1301',innerText:'Chapter 13 Homework',textContent:'Chapter 13 Homework',disabled:false,getAttribute:()=>null,getClientRects:()=>visible()?[{}]:[],closest:selector=>selector==='.activity-activityType-2'||selector==='li'?row:null};
 const elements={'activity-status-1301':{textContent:status},'activity-gradable-1301':{textContent:'COUNTS TOWARDS GRADE'},outlineViewPane:{getAttribute:()=>String(selected),click:()=>{throw Error('The content pane is not the tab');}}};
 const document={getElementById:id=>elements[id]||null,querySelectorAll:selector=>selector==='*'?[]:selector.includes('activity-heading-')?[activity]:selector.includes('iframe')||selector.includes('ActivityFrameHeader')?[]:selector.includes('[role="tab"]')?(withTab?[hiddenTab,tab,expand]:[expand]):[expand]};
 const statuses=[];
 const context={document,Error,clean:value=>String(value||'').replace(/\s+/g,' ').trim(),status:text=>statuses.push(text),wait:async()=>{ticks++;if(requested&&!stuck&&ticks>=2)selected=true;}};
 vm.createContext(context);vm.runInContext(shared+prepareCode,context);
 return {context,statuses,state:()=>({selected,expanded,tabClicks,expandClicks}),visible:()=>{selected=true;expanded=true;}};
}
(async()=>{
 const calendar=fixture();
 const hidden=calendar.context.StudyMindTapCourse.scan(calendar.context.document)[0];assert.equal(hidden.visible,false);assert.equal(hidden.category,'apply','section metadata comes from textContent even while calendar hides the outline');assert.equal(calendar.context.StudyMindTapCourse.eligible(hidden),false,'hidden rows remain excluded');
 assert.equal(calendar.context.StudyMindTapCourse.hasOutline(calendar.context.document),true,'a calendar course page with an Outline View tab exposes Course Mode');
 await calendar.context.prepareOutline();assert.deepEqual(calendar.state(),{selected:true,expanded:true,tabClicks:1,expandClicks:1});assert(calendar.statuses.some(text=>/Switching/.test(text)));
 const scanned=calendar.context.StudyMindTapCourse.scan(calendar.context.document);assert.equal(scanned.filter(item=>calendar.context.StudyMindTapCourse.eligible(item)).length,1,'the visible, unstarted grade-counting homework is eligible only after the real view switch');
 await calendar.context.prepareOutline();assert.equal(calendar.state().tabClicks,1,'an already selected outline is not toggled again');
 for(const score of ['--/50 points','— / 50 points']){const due=fixture({status:'Due soon',score});due.visible();const candidate=due.context.StudyMindTapCourse.scan(due.context.document)[0];assert.equal(candidate.requiresStartVerification,true);assert.equal(due.context.StudyMindTapCourse.eligible(candidate),true,'unscored Due soon rows enter overview inspection');}
 const scored=fixture({status:'Due soon',score:'0/50 points'});scored.visible();assert.equal(scored.context.StudyMindTapCourse.eligible(scored.context.StudyMindTapCourse.scan(scored.context.document)[0]),false,'a scored zero cannot prove untouched work');
 const combined=fixture({status:'Due soon and in progress',score:'--/50 points'});combined.visible();const combinedItem=combined.context.StudyMindTapCourse.scan(combined.context.document)[0];assert.equal(combinedItem.requiresStartVerification,true);assert.equal(combined.context.StudyMindTapCourse.eligible(combinedItem),true,'unscored combined status permits overview inspection without granting answer entry');assert.equal(combined.context.StudyMindTapCourse.eligible({...combinedItem,unscored:false}),false,'scored started work still requires opt-in');assert.equal(combined.context.StudyMindTapCourse.eligible(combinedItem,['apply'],{includeInProgress:true}),true,'live combined deadline/start status is recognized with opt-in');
 const opened=fixture({status:'In progress',score:'--/50 points'});opened.visible();assert.equal(opened.context.StudyMindTapCourse.eligible(opened.context.StudyMindTapCourse.scan(opened.context.document)[0]),true,'opening-only status may inspect untouched attempts without started-work consent');
 const stuck=fixture({stuck:true});await assert.rejects(stuck.context.prepareOutline(),/did not switch to Outline View/);assert.equal(stuck.state().expandClicks,0,'a hidden Expand control cannot be clicked');
 const absent=fixture({withTab:false});await assert.rejects(absent.context.prepareOutline(),/no visible activity rows/);assert.equal(absent.state().expandClicks,0,'no hidden-row fallback when the view control is missing');
 assert(!ui.includes('(async()=>{await prepareOutline();'),'loading the extension does not change the user-selected course view');
 console.log('PASS MindTap calendar-to-outline switch, delayed rendering, visible expansion, section labels and hidden-row rejection');
})().catch(error=>{console.error(error);process.exitCode=1;});
