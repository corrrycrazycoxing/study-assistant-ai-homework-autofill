const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/canvas.js','utf8');
const code=source.slice(source.indexOf('  // A completed visible batch'),source.indexOf('  // The overview and player'));
const base='https://canvas.example.edu/courses/1/quizzes/2';
function fixture(options={}){
 let now=1000,clicks=0,phase='take';const sent=[],statuses=[];
 const list=[{id:'question_list_1',classList:{contains:name=>name==='answered'&&!options.unanswered}}];
 const field={value:'42',validity:{valid:true}};
 const root={classList:{contains:()=>false},matches:()=>true};
 const form={contains:node=>node===root||node===button};
 const button={disabled:false,click(){clicks++;if(options.navigate!==false){phase='submitted';ctx.location.href=base;ctx.location.pathname='/courses/1/quizzes/2';}}};
 const snap={signature:'q1',fields:[{el:field,kind:'text'}]};
 if(options.partial)snap.fields.push({el:{value:''},kind:'text'});
 if(options.choices)snap.fields=[{controls:[{checked:true},{checked:false}],kind:'radio'}];
 if(options.blankChoices)snap.fields=[{controls:[{checked:false},{checked:false}],kind:'radio'}];
 if(options.unsupported)snap.unsupported=true;
 let ctx={URL,JSON,Set,Date:{now:()=>now},location:{href:base+'/take',pathname:'/courses/1/quizzes/2/take',protocol:'https:'},window:{},document:{querySelectorAll(selector){if(selector==='#submit_quiz_form')return options.noForm?[]:[form];if(selector==='#submit_quiz_button')return options.duplicate?[button,button]:[button];if(selector==='#question_list .list_question')return options.noList?[]:list;throw Error(selector);}},StudyCanvasQuiz:{base:()=>base,submitted:()=>phase==='submitted'},visible:()=>true,usable:el=>!el.disabled,clean:s=>String(s??'').trim(),nextControl:()=>options.next?{}:null,questionRoots:()=>[root],snapshot:()=>snap,selected:e=>e.checked,
 running:true,starting:false,generation:1,checkTime(){if(options.expired)throw Error('Quiz time expired.');},pacer:{scroll:async()=>{if(options.cancelScroll)ctx.running=false;}},say:text=>statuses.push(text),stop:async text=>{statuses.push(text);ctx.running=false;ctx.generation++;},delay:async ms=>{now+=ms;},chrome:{runtime:{sendMessage:async message=>{sent.push(message);if(message.type==='canvasQuizSubmitIntent'){if(options.changed)field.value='43';if(options.cancelIntent)ctx.running=false;if(options.rejected)return {received:false};}if(message.type==='canvasRunStart')return {running:true,runId:'run'};return {received:true};}}},ready:Promise.resolve(),settings:{pacingMode:'normal'},pending:null,answer:null,done:new Set(),count:0,runId:null,ui:{getElementById:()=>({})},choose:()=>null};
 ctx.window.top=ctx.window;vm.createContext(ctx);vm.runInContext(code,ctx);
 return {ctx,field,button,sent,statuses,get clicks(){return clicks;}};
}
(async()=>{
 const success=fixture();success.ctx.running=false;await success.ctx.start();assert.equal(success.clicks,1,'Start Auto reaches native final submission when existing questions are complete');assert.deepEqual(success.sent.map(m=>m.type),['canvasRunStart','canvasQuizSubmitIntent','canvasQuizSubmitted']);assert.match(success.statuses.at(-1),/confirmed quiz submission/);
 const filled=fixture();filled.ctx.running=false;let awaiting=true;
 const question={root:{},signature:'filled',key:'abcdef12'};
 filled.ctx.choose=()=>awaiting?question:null;
 filled.ctx.request=async snap=>{filled.ctx.pending=snap;filled.ctx.responseWaiter.resolve();};
 filled.ctx.fill=async()=>{awaiting=false;return [{el:filled.field,value:'42'}];};
 filled.ctx.retained=fields=>fields.every(f=>f.el.value===f.value);
 filled.ctx.StudyCanvasBatch={keys:()=>[question.key],refresh:()=>question};
 filled.ctx.pacer.afterQuestion=async()=>{};
 await filled.ctx.start();assert.equal(filled.clicks,1,'the last freshly filled batch automatically reaches submission');assert.equal(filled.ctx.count,1);assert(filled.sent.find(m=>m.type==='canvasRunUpdate'));
 const paused=fixture();paused.ctx.running=false;let blank=true;
 paused.ctx.settings.pauseBeforeSubmit=true;
 paused.ctx.choose=()=>blank?question:null;
 paused.ctx.request=async snap=>{paused.ctx.pending=snap;paused.ctx.responseWaiter.resolve();};
 paused.ctx.fill=async()=>{blank=false;return [{el:paused.field,value:'42'}];};
 paused.ctx.retained=fields=>fields.every(f=>f.el.value===f.value);
 paused.ctx.StudyCanvasBatch={keys:()=>[question.key],refresh:()=>question};paused.ctx.pacer.afterQuestion=async()=>{};
 const pausing=paused.ctx.start();for(let i=0;i<20&&!paused.ctx.pauseWaiter;i++)await Promise.resolve();
 assert(paused.ctx.pauseWaiter);assert.equal(paused.clicks,0,'Pause After Fill blocks final submission until Resume');paused.ctx.pauseWaiter.resolve();await pausing;assert.equal(paused.clicks,1);
 const radio=fixture({choices:true});await radio.ctx.submitCompleted(1);assert.equal(radio.clicks,1);
 for(const options of [{unanswered:true},{partial:true},{blankChoices:true},{unsupported:true},{duplicate:true},{noList:true},{noForm:true},{next:true},{expired:true}]){
   const f=fixture(options);await assert.rejects(f.ctx.submitCompleted(1));assert.equal(f.clicks,0,JSON.stringify(options));assert.equal(f.sent.length,0,'incomplete quiz never prepares submission');
 }
 for(const options of [{changed:true},{rejected:true}]){const f=fixture(options);await assert.rejects(f.ctx.submitCompleted(1));assert.equal(f.clicks,0);}
 for(const options of [{cancelScroll:true},{cancelIntent:true}]){const f=fixture(options);await f.ctx.submitCompleted(1);assert.equal(f.clicks,0,'Stop cancels submission after async work');}
 const timedOut=fixture({navigate:false});await timedOut.ctx.submitCompleted(1);assert.equal(timedOut.clicks,1);assert(!timedOut.sent.some(m=>m.type==='canvasQuizSubmitted'),'click alone is not a confirmed result');assert.match(timedOut.statuses.at(-1),/not confirmed/);timedOut.ctx.running=true;await assert.rejects(timedOut.ctx.submitCompleted(timedOut.ctx.generation),/already attempted/);assert.equal(timedOut.clicks,1,'uncertain submission cannot repeat on the same document');
 const concurrent=fixture({navigate:false});concurrent.ctx.running=false;await Promise.all([concurrent.ctx.start(),concurrent.ctx.start()]);assert.equal(concurrent.clicks,1,'concurrent Start presses do not submit twice');
 console.log('PASS Canvas Auto native final submission, full-quiz/sidebar completeness, partial fields, unsupported widgets, duplicate controls, last-page guard, stale answers, Stop, expiry, intent-before-click, result confirmation and one-shot timeout');
})().catch(error=>{console.error(error);process.exitCode=1;});
