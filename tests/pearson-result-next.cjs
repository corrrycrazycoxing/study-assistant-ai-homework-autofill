const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const start=source.indexOf('  function resultDialog()');
const end=source.indexOf('  function closeFeedback()',start);
assert(start>=0&&end>start,'Pearson result navigation helpers are present');
const feedbackKindSource=source.slice(source.indexOf('  function feedbackKind('),source.indexOf('  function domFeedback('));
let nextClicks=0,headerClicks=0,submitClicks=0;
const button=(label,click)=>({disabled:false,readOnly:false,closest:()=>null,getClientRects:()=>[{}],getAttribute:()=>null,textContent:label,value:'',matches:()=>false,click});
const next=button('Next question',()=>nextClicks++);
const header=button('Next question',()=>headerClicks++);
const submit=button('Submit',()=>submitClicks++);
const dialog={textContent:'Nice work! Next question',disabled:false,readOnly:false,closest:()=>null,getClientRects:()=>[{}],querySelectorAll:()=>[next]};
const document={querySelectorAll:selector=>selector.startsWith('[role="dialog"]')?[dialog]:selector.includes('.controlPanel .btnNext')?[header,submit]:[]};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const usable=e=>e&&!e.disabled&&!e.readOnly&&!e.closest('[aria-disabled="true"],.disabled,.hidden,[hidden],[aria-hidden="true"]')&&e.getClientRects().length>0;
const selected=vm.runInNewContext(feedbackKindSource+source.slice(start,end)+'\nnextButton()', {document,clean,usable});
assert.equal(selected,next,'result dialog Next takes precedence over background navigation');
selected.click();
assert.equal(nextClicks,1);
assert.equal(headerClicks,0);
assert.equal(submitClicks,0);
const dialogStart=source.indexOf('  function resultDialog()');
const dialogEnd=source.indexOf('  function nextButton()',dialogStart);
assert(dialogStart>=0&&dialogEnd>dialogStart,'Pearson result-dialog detection helper is present');
const dialogSource=source.slice(dialogStart,dialogEnd);
const feedbackStart=source.indexOf('  function domFeedback()');
const feedbackEnd=source.indexOf('  async function waitForCheck(',feedbackStart);
assert(feedbackStart>=0&&feedbackEnd>feedbackStart);
assert.equal(vm.runInNewContext(feedbackKindSource+dialogSource+source.slice(feedbackStart,feedbackEnd)+'\ndomFeedback()', {document,clean,usable}),'correct','Nice work is recognized as correct feedback');

dialog.textContent='That is not correct. Try again. Next question';
assert.equal(vm.runInNewContext(feedbackKindSource+dialogSource+source.slice(feedbackStart,feedbackEnd)+'\ndomFeedback()', {document,clean,usable}),'incorrect','not correct never counts as correct');
dialog.textContent='Partially correct. Next question';
assert.equal(vm.runInNewContext(feedbackKindSource+dialogSource+source.slice(feedbackStart,feedbackEnd)+'\ndomFeedback()', {document,clean,usable}),'partial');

const config=fs.readFileSync('shared/config.js','utf8');
assert.match(config,/pauseBeforeSubmit:false/,'new installs default to no pause after fill');
// A correct-result dialog can contain only OK. Dismiss it, then use the native
// header Next rather than treating the temporary dialog as an unavailable route.
const advanceSource=source.slice(source.indexOf('  async function advance('),source.indexOf('  async function skipCourseQuestion('));
let open=true,dismissed=0,moved=0;
const advanceContext={document:{querySelector:()=>null},clean,running:true,courseRun:true,runId:'run',runCount:1,handleUncheckedWarning:()=>false,nextButton:()=>open?null:{click:()=>moved++},resultDialog:()=>open?{}:null,closeFeedback:()=>{open=false;dismissed++;return true;},waitUntil:async read=>{assert(read());},snapshot:()=>({fields:[{}],signature:moved?'new':'old'}),say:()=>{},chrome:{runtime:{sendMessage:async()=>({received:true})}}};
vm.createContext(advanceContext);vm.runInContext(advanceSource,advanceContext);
advanceContext.advance({signature:'old',fields:[]}).then(async result=>{assert.equal(result,true);assert.equal(dismissed,1);assert.equal(moved,1);open=true;moved=0;advanceContext.closeFeedback=()=>{open=false;return true;};advanceContext.snapshot=()=>({fields:[{}],signature:'already-advanced'});await advanceContext.advance({signature:'old',fields:[]});assert.equal(moved,0,'Continue that already reveals the next part cannot skip it with a second Next click');console.log('PASS Pearson result-dialog Next, OK-only result recovery and default pause');}).catch(error=>{console.error(error);process.exitCode=1;});
