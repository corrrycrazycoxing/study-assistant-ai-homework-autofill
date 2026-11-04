const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mindtap.js','utf8');
const code=source.slice(source.indexOf('  async function beginCourse(){'),source.indexOf('  function mount(){'));
async function scenario(action,{never=false}={}){
 let ticks=0,started=0,opened=0;const messages=[],statuses=[];
 const context={URLSearchParams,Date,courseReadyRequested:false,ui:{},ready:Promise.resolve(),location:{search:'?quiz_action='+action},settings:{pacingMode:'instant'},courseRun:false,courseSkipPause:false,courseOriginalPause:null,
 assignmentItems:()=>action==='showContents'&&ticks>=3&&!never?[{id:'Q123456789',title:'First question'}]:[],questionRoots:()=>action==='takeQuiz'&&ticks>=1&&!never?[{}]:[],editable:()=>ticks>=3&&!never,assignmentOverview:()=>action==='showContents',courseStartEvidence:()=>({overviewReadable:true,untouched:true}),
 delay:async()=>{ticks++;},say:text=>statuses.push(text),start:async()=>{started++;},openAssignmentItem:()=>{opened++;},
 chrome:{runtime:{sendMessage:async message=>{messages.push(message);if(message.type==='mindtapCourseReady'){assert(ticks>=3,'authorization waits for controls');return {start:true,title:'Homework'};}return {running:false};}}}};
 vm.createContext(context);vm.runInContext(code,context);await context.beginCourse();return {context,ticks,started,opened,messages,statuses};
}
(async()=>{
 const question=await scenario('takeQuiz');assert.equal(question.started,1);assert.equal(question.opened,0);assert.equal(question.messages.some(x=>x.type==='mindtapCourseBlocked'),false);
 const overview=await scenario('showContents');assert.equal(overview.opened,1);assert.equal(overview.started,0);
 const timeout=await scenario('takeQuiz',{never:true});assert.equal(timeout.started,0);assert.equal(timeout.messages.length,0,'an empty shell cannot authorize Auto or bank a false failure');assert.equal(timeout.context.courseReadyRequested,false,'late controls can trigger another readiness check');
 assert(source.includes('questionRoots().length&&editable()||assignmentItems().length'),'status mutations cannot restart another empty-shell wait until controls are ready');
 console.log('PASS MindTap delayed overview/question rendering, no premature authorization and retry after empty-shell timeout');
})().catch(error=>{console.error(error);process.exitCode=1;});
