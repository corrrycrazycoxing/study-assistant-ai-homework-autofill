const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tab={id:1,active:true,url:'https://ng.cengage.com/',windowId:3};
const rect={x:0,y:0,width:100,height:100,viewportWidth:1000,viewportHeight:800};
let reason;
const context={Date,crypto:{randomUUID:()=> 'token'},expiry:600000,
 sourcePlatform:async()=> 'mindtap',config:async()=>({}),StudyConfig:{preferences:()=>({includePictures:true})},activeRun:async()=>null,
 chrome:{storage:{session:{get:async()=>({})}},tabs:{get:async()=>tab,query:async()=>[tab],sendMessage:async()=>({received:true,rect}),captureVisibleTab:async()=>{throw Error(reason);}}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('background/capture.js','utf8'),context);
(async()=>{
 reason='Either the <all_urls> or activeTab permission is required.';
 await assert.rejects(context.capturePicture({id:'q1',rect},{tab,frameId:2}),/permission was denied:.*activeTab/);
 reason='MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota exceeded.';
 await assert.rejects(context.capturePicture({id:'q1',rect},{tab,frameId:2}),error=>/Browser picture capture failed:.*quota/.test(error.message)&&!/Click the extension icon/.test(error.message));
 reason='Failed to capture tab: image readback failed.';
 await assert.rejects(context.capturePicture({id:'q1',rect},{tab,frameId:2}),/image readback failed/);
 console.log('PASS actual browser capture errors, permission-specific recovery and quota/readback diagnostics');
})().catch(error=>{console.error(error);process.exitCode=1;});
