const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const url=id=>'https://notebook.google.com/notebook/'+id;
let tabs=[],states={};
const ctx={URL,notebookHosts:[],chrome:{tabs:{query:async()=>tabs}},probeAiTab:async tab=>states[tab.id]||{ready:false,reason:'Select notebook sources'}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('background/notebooks.js','utf8'),ctx);
(async()=>{
 tabs=[{id:1,url:url('empty')},{id:2,url:url('reading')},{id:3,url:'https://notebook.google.com/'}];states={2:{ready:true,sources:1}};
 assert.equal((await ctx.openReadingNotebook({})).tab.id,2,'empty preparation tabs do not veto the ready notebook');
 assert.equal((await ctx.openReadingNotebook({notebookUrl:url('closed')})).tab.id,2,'a stale closed preference does not lock out the only source-ready open notebook');
 tabs.push({id:4,url:url('other')});states[4]={ready:true,sources:2};
 await assert.rejects(ctx.openReadingNotebook({}),/Multiple source-ready/,'multiple ready notebooks require explicit selection');
 assert.equal((await ctx.openReadingNotebook({notebookUrl:url('other')})).tab.id,4,'explicit choice wins');
 tabs.push({id:5,url:url('other')+'?authuser=0'});states[5]={ready:true,sources:2};
 assert.equal((await ctx.openReadingNotebook({notebookUrl:url('other')})).tab.id,4,'duplicate tabs for the same notebook are one source choice');
 states[4]={ready:false,reason:'Unsent draft'};states[5]=states[4];
 const busy=await ctx.openReadingNotebook({notebookUrl:url('other')});assert.equal(busy.tab,null);assert.equal(busy.states[0].state.reason,'Unsent draft','a chosen notebook draft is not bypassed');
 console.log('PASS manual NotebookLM priority, empty/duplicate notebook exclusion, stale preference recovery and ambiguity/draft protection');
})().catch(error=>{console.error(error);process.exitCode=1;});
