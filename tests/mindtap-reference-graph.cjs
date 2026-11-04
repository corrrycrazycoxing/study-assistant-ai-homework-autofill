const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mindtap.js','utf8');
const chart={isConnected:true,tagName:'IMG',complete:true,naturalWidth:600,getClientRects:()=>[{}],closest:()=>null,matches:()=>false,getBoundingClientRect:()=>({x:20,y:30,width:600,height:400,right:620,bottom:430}),scrollIntoView:()=>{}};
const root={querySelectorAll:()=>[chart]},fieldsOnly={querySelectorAll:()=>[]};let sent;
const context={setTimeout:callback=>callback(),innerWidth:1000,innerHeight:800,root,source:fieldsOnly,text:'The following graph shows the market. Based on the previous graph, select the interest rate.'};
vm.createContext(context);vm.runInContext(fs.readFileSync('shared/media.js','utf8'),context);
const start=source.indexOf('    const graphics=StudyMedia.graphics('),end=source.indexOf('    const isPlot=',start);
vm.runInContext(source.slice(start,end)+'globalThis.detected={hasDiagram,needsGraphReference};',context);
assert.equal(context.detected.hasDiagram,true,'a reference graph outside the field subtree must be detected');assert.equal(context.detected.needsGraphReference,true);
(async()=>{
 const token=await context.StudyMedia.capture({runtime:{sendMessage:async message=>{sent=message;return {received:true,token:'reference-image'};}}},root,'request-1',()=>true,{style:{visibility:''}});
 assert.equal(token,'reference-image');assert.equal(sent.type,'studyCapture');assert.equal(sent.rect.width,616,'capture includes the actual reference chart');
 const request=source.slice(source.indexOf('  async function request('),source.indexOf('  const pacer='));
 assert.match(request,/snap\.needsGraphReference&&!snap\.hasDiagram/,'a missing reference blocks text-only guessing');assert.match(request,/snap\.needsGraphReference&&snap\.needsPicture&&!settings\.includePictures/,'unreadable geometry still requires picture opt-in');
 assert.match(request,/graph itself is not an answer control/,'static graph reading is separate from plotting');
 assert.match(source,/could not answer every field from the reference graph/,'blank graph answers identify missing reference context');
 console.log('PASS MindTap reference graph outside fields, image capture, missing-picture guards and static graph-reading prompt');
})().catch(error=>{console.error(error);process.exitCode=1;});
