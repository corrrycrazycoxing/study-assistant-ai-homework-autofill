const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let now=0,scroll=0,allowed=true,change=false;const messages=[],status=[],panel={style:{visibility:'visible'}};
const image=top=>({isConnected:true,tagName:'IMG',complete:true,naturalWidth:400,nodeType:1,parentElement:null,
 closest:()=>null,matches:()=>false,getClientRects:()=>[{}],scrollIntoView(){scroll=top-150;},
 getBoundingClientRect:()=>({x:100,y:top-scroll,width:400,height:300,right:500,bottom:top-scroll+300})});
const images=[image(0),image(1600)],root={querySelectorAll:()=>images};
const context={innerWidth:1000,innerHeight:800,setTimeout:callback=>{now+=600;callback();}};vm.createContext(context);vm.runInContext(fs.readFileSync('shared/media.js','utf8'),context);
const chrome={runtime:{sendMessage:async message=>{assert.equal(panel.style.visibility,'hidden');messages.push({message,now});if(change)images.pop();return {received:true,token:'part-'+messages.length};}}};
(async()=>{
 const token=await context.StudyMedia.capture(chrome,root,'q1',()=>allowed,panel,s=>status.push(s));
 assert.equal(token,'part-2');assert.equal(messages.length,2);assert.equal(messages[0].message.part.index,0);assert.equal(messages[1].message.part.previousToken,'part-1');
 assert.equal(messages[1].message.part.total,2);assert(messages.every(({message})=>message.rect.y===142&&message.rect.height===316),'each offscreen graph is scrolled and cropped separately');
 assert(messages[1].now-messages[0].now>=500,'capture requests respect Chrome screenshot quota');assert(status[1].includes('2 of 2'));assert.equal(panel.style.visibility,'visible');
 allowed=false;await assert.rejects(context.StudyMedia.capture(chrome,root,'q2',()=>allowed,panel),/Stopped/);assert.equal(messages.length,2);
 allowed=true;change=true;await assert.rejects(context.StudyMedia.capture(chrome,root,'q3',()=>true,panel),/pictures changed/);assert.equal(panel.style.visibility,'visible');
 console.log('PASS separated picture scroll/capture order, token chain, quota spacing, Stop, picture replacement and panel restoration');
})().catch(error=>{console.error(error);process.exitCode=1;});
