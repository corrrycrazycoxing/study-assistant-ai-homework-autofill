const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/canvas-smartbook-welcome.js','utf8');
async function fixture({action='Start Questions',separator='',permit=true,skip=false,duplicate=false}={}){
 let tick,cleared=false,welcome=true,tips=false,question=false,clicks=0,tipClicks=0;const messages=[];
 const visible={isConnected:true,getClientRects:()=>[1],closest:()=>null};
 const heading={...visible,innerText:"SmartBook Assignment "+separator+"SmartBook CH10 Stockholders' Equity"};
 const button={...visible,innerText:action,click:()=>{clicks++;welcome=false;}};
 const gotIt={...visible,innerText:'Got It',click:()=>{tipClicks++;tips=false;}};
 const tipDialog={...visible,querySelectorAll:s=>s==='h1,h2,h3'?[{innerText:'Assignment Tips'}]:s==='button'?[gotIt]:[]};
 const prompt={...visible,innerText:'The corporation issues shares to raise capital.'};
 const probe={...visible,querySelector:s=>s==='.prompt'?prompt:null};
 const ctx={window:{},location:{origin:'https://learning.mheducation.com',pathname:'/static/awd/index.html'},document:{querySelectorAll:s=>s==='h1,h2,h3'&&welcome?[heading]:s==='button'&&welcome?(duplicate?[button,button]:[button]):s==='[role="dialog"],dialog'&&tips?[tipDialog]:[],querySelector:s=>s==='.probe-container .prompt'&&question?prompt:s==='.probe-container'&&question?probe:null},chrome:{runtime:{sendMessage:async m=>{messages.push(m);return {received:permit,start:permit&&!skip,skip};}}},setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{cleared=true;}};
 ctx.window.top=ctx.window;vm.createContext(ctx);vm.runInContext(source,ctx);const flush=async()=>{for(let i=0;i<4;i++)await new Promise(setImmediate);};await flush();
 return {messages,tick:async()=>{await tick();await flush();},counts:()=>({clicks,tipClicks,cleared}),showTips:()=>{tips=true;},showQuestion:()=>{question=true;},changeQuestion:text=>{prompt.innerText=text;}};
}
(async()=>{
 for(const [action,separator] of [['Start Questions',''],['Continue Questions','| '],['Start Questions',': ']]){
  const run=await fixture({action,separator});assert.equal(run.messages[0].title,"SmartBook CH10 Stockholders' Equity");assert.equal(run.messages[0].action,action.startsWith('Continue')?'continue':'start');assert.equal(run.counts().clicks,1);
  await run.tick();assert(!run.messages.some(m=>m.type==='canvasCourseSmartbookReady'),'empty transition cannot start question Auto');
  run.showTips();await run.tick();assert.equal(run.counts().tipClicks,1);assert.equal(run.messages.at(-1).type,'canvasCourseSmartbookWelcome','tips dismissal rechecks course ownership');
  await run.tick();assert(!run.messages.some(m=>m.type==='canvasCourseSmartbookReady'));
  run.showQuestion();await run.tick();assert(!run.messages.some(m=>m.type==='canvasCourseSmartbookReady'),'first prompt observation waits for stable render');
  await run.tick();assert.equal(run.messages.at(-1).type,'canvasCourseSmartbookReady');assert(run.counts().cleared);assert.equal(run.counts().clicks,1,'welcome is clicked once');
 }
 const denied=await fixture({action:'Continue Questions',permit:false});assert.equal(denied.counts().clicks,0,'unowned or stopped course run never clicks native controls');
 const skipped=await fixture({action:'Continue Questions',skip:true});assert.equal(skipped.counts().clicks,0);assert(skipped.counts().cleared,'started-work preference skip ends the welcome runner');
 const ambiguous=await fixture({duplicate:true});assert.equal(ambiguous.messages.length,0);assert.equal(ambiguous.counts().clicks,0);
 console.log('PASS SmartBook Start/Continue Questions, screenshot pipe title, exact authorization, tips, delayed/stable question readiness, preference skip and duplicate controls');
})().catch(error=>{console.error(error);process.exitCode=1;});
