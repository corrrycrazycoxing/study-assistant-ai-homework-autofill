const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const start=source.indexOf("    if(message.type==='pearsonCourseSave'){");
const handler=source.slice(start,source.indexOf("    if(!['pearsonAnswer'",start));
const helpers=source.slice(source.indexOf('  function nativeSaveButtons(){'),source.indexOf('  // A manual click'));
let failures=[];
let clicked=[],replies=[],buttons=[];
const button=(label,enabled=true)=>({textContent:label,getAttribute:()=>null,value:'',enabled,click:()=>clicked.push(label)});
const scope={chrome:{runtime:{sendMessage:async message=>{failures.push(message);return {received:true};}}},courseSaveWaiter:null,loopGeneration:0,delay:async()=>{},handleUncheckedWarning:()=>false,document:{querySelectorAll:selector=>{assert(selector.includes('.playerViewer button'));return buttons;}},usable:el=>el.enabled,clean:value=>String(value||'').trim()};
vm.createContext(scope);vm.runInContext(helpers+'function receive(message,reply){'+handler+'}',scope);
const receive=async(extra={})=>{scope.receive({type:'pearsonCourseSave',...extra},reply=>replies.push(reply));await new Promise(setImmediate);};
(async()=>{
buttons=[button('Submit assignment'),button('Save'),button('Next question')];await receive();assert.deepEqual(clicked,['Save']);assert.equal(replies.at(-1).saveClicked,true,'only the actual nested native Save is acknowledged');
buttons=[button('Save',false),button('Submit assignment')];await receive();assert.equal(replies.at(-1).received,false);assert.deepEqual(clicked,['Save'],'no submit fallback when Save is disabled');
buttons=[button('Save'),button('Save')];await receive();assert.equal(replies.at(-1).received,false,'ambiguous Save stops');assert.equal(clicked.length,1);
buttons=[button('Save')];let allowed=null;scope.handleUncheckedWarning=allow=>{allowed=allow;return true;};await receive({skipUnchecked:true});assert.equal(allowed,true,'the banked skip permit reaches the Save warning handler');assert.equal(replies.at(-1).received,true);
scope.handleUncheckedWarning=allow=>{assert.equal(allow,false);throw Error('This answer has not been checked.');};await receive();assert.equal(failures.at(-1).type,'pearsonCourseSaveFailed','normal Save reports the rejected unchecked warning after its click receipt');
scope.handleUncheckedWarning=()=>false;scope.delay=async()=>{scope.loopGeneration++;};await receive({skipUnchecked:true});assert.equal(replies.at(-1).saveClicked,true,'Stop cannot erase a native click receipt already delivered');
assert(!fs.readFileSync('content-scripts/player-bridge.js','utf8').includes('window.homeworkSaveForLater()'),'outer focus/exit shortcut cannot bypass the actual player Save');
// Save can unload the frame during the first asynchronous delay. Its receipt
// must already have arrived, rather than waiting 1.2 seconds for warnings.
scope.loopGeneration=0;let delivered=false;scope.delay=async()=>{assert(delivered,'the Save receipt must precede the first wait');scope.loopGeneration++;};scope.receive({type:'pearsonCourseSave'},reply=>{delivered=reply.saveClicked===true;});assert(delivered);await new Promise(setImmediate);
// The Auto completion path must not cancel the warning watcher as soon as
// the immediate click receipt returns to the background.
vm.runInContext(source.slice(source.indexOf('  async function advance('),source.indexOf('  async function skipCourseQuestion(')),scope);
let release,stops=0;const gate=new Promise(resolve=>{release=resolve;});
scope.loopGeneration=0;scope.courseRun=true;scope.say=()=>{};scope.nextButton=()=>null;scope.resultDialog=()=>null;scope.document.querySelector=()=>null;scope.delay=async()=>gate;scope.stop=async()=>{stops++;scope.loopGeneration++;};
scope.chrome.runtime.sendMessage=async message=>{if(message.type==='pearsonCoursePlayerDone'){scope.receive({type:'pearsonCourseSave',skipUnchecked:message.skipUnchecked},()=>{});return {received:true};}return {received:true};};
const completion=scope.advance({});await new Promise(setImmediate);assert.equal(stops,0,'Auto cannot cancel an outstanding Save warning wait');release();await completion;assert.equal(stops,1);
console.log('PASS Pearson native Save click, disabled/ambiguous rejection and no wrapper/Submit fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
