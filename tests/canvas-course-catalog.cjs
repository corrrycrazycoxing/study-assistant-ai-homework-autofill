const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/canvas-mcgraw-course.js','utf8'),discover=source.slice(source.indexOf('  async function discover(){'),source.indexOf('  function assignmentItems(){'));
const origin='https://canvas.example.edu',extra={title:'ACCT 201 - 04',url:origin+'/courses/2'},visible={title:'MATH 108 - 01',url:origin+'/courses/1'};
async function fixture({redirect=false}={}){
 let renders=0;const calls=[];
 const context={URL,Set,AbortSignal,location:{origin,href:origin+'/'},selectionLoaded:false,selected:new Set(),discovered:[],catalog:null,catalogError:'',document:{},chrome:{storage:{local:{get:async()=>({canvasCourseSelections:{[origin]:[extra.url,'https://foreign.test/courses/99']}})}}},renderCourses(){renders++;},C:{hubUrl:()=>true,courseUrl:(url,base)=>url.startsWith(origin+'/courses/')?url:null,discoverCourses:doc=>doc.detached?[extra,visible]:[visible],courses:items=>[...new Map(items.map(item=>[item.url,item])).values()]},DOMParser:class{parseFromString(text,type){assert.equal(type,'text/html');assert.equal(text,'All Courses');return {detached:true};}},fetch:async(url,options)=>{calls.push({url,options});return {ok:true,url:redirect?'https://login.test/':origin+'/courses',headers:{get:()=> 'text/html'},text:async()=> 'All Courses'};}};
 vm.createContext(context);vm.runInContext(discover,context);await context.discover();await context.discover();return {context,calls,renders};
}
(async()=>{
 const {context,calls}=await fixture();assert.equal(calls.length,1,'load the current course catalog once per page');assert.equal(calls[0].url,origin+'/courses');assert.equal(calls[0].options.credentials,'same-origin');assert.equal(context.discovered.length,2,'dashboard includes courses beyond its visible cards');assert(context.selected.has(extra.url),'saved checkbox selection returns on dashboard');assert(!context.selected.has('https://foreign.test/courses/99'));
 const bounced=await fixture({redirect:true});assert.equal(bounced.context.discovered.length,1,'login redirects cannot supply course links');assert.match(bounced.context.catalogError,/Open All Courses/);
 console.log('PASS dashboard All Courses loading, same-origin credentials, saved selection, one fetch, merged catalog and login-redirect fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
