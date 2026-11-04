const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tab={id:1,active:true,url:'https://ng.cengage.com/',windowId:3},sender={tab,frameId:2,url:'https://aplia.apps.ng.cengage.com/question',documentId:'doc1'};
const rect={x:10,y:20,width:200,height:100,viewportWidth:1000,viewportHeight:800};let session={},next=0,captures=0,closed=0;const canvases=[];
const png=dimensions=>'data:image/png;base64,'+Buffer.from(JSON.stringify(dimensions)).toString('base64');
const context={Date,Uint8Array,crypto:{randomUUID:()=> 'token-'+(++next)},expiry:600000,btoa:s=>Buffer.from(s,'binary').toString('base64'),
 sourcePlatform:async()=> 'mindtap',config:async()=>({}),StudyConfig:{preferences:()=>({includePictures:true})},activeRun:async()=>null,
 fetch:async url=>({blob:async()=>JSON.parse(Buffer.from(url.split(',')[1],'base64').toString())}),createImageBitmap:async dimensions=>({...dimensions,close(){closed++;}}),
 OffscreenCanvas:class{constructor(width,height){this.width=width;this.height=height;this.draws=[];canvases.push(this);}getContext(){return {fillRect(){},drawImage:(...args)=>this.draws.push(args)};}async convertToBlob(){return {arrayBuffer:async()=>Buffer.from(JSON.stringify({width:this.width,height:this.height}))};}},
 chrome:{storage:{session:{get:async key=>({[key]:session[key]}),set:async values=>Object.assign(session,values)}},tabs:{get:async()=>tab,query:async()=>[tab],sendMessage:async()=>({received:true,rect}),captureVisibleTab:async()=>{captures++;return png({width:1000,height:800});}}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('background/capture.js','utf8'),context);
const capture=(part,owner=sender,id='q1')=>context.capturePicture({id,rect,part},owner);
(async()=>{
 const first=await capture({index:0,total:2});assert.equal(session.pictureCapture.partCount,1);assert.equal(session.pictureCapture.total,2);
 assert.equal(canvases[0].width,200);assert.equal(canvases[0].height,100);
 const part={index:1,total:2,previousToken:first.token};
 for(const owner of [{...sender,documentId:'doc2'},{...sender,frameId:3},{...sender,url:'https://aplia.apps.ng.cengage.com/other'},{...sender,tab:{...tab,id:5}}])await assert.rejects(capture(part,owner),/different question/);
 await assert.rejects(capture(part,sender,'q2'),/different question/);await assert.rejects(capture({...part,previousToken:'bad'}),/different question/);
 assert.equal(captures,1,'ownership failures do not capture another screenshot');
 const second=await capture(part);assert.notEqual(second.token,first.token);assert.equal(session.pictureCapture.partCount,2);
 assert.equal(canvases[1].height,224,'ordered screenshots are stitched with a visible separator');assert.equal(canvases[1].draws.length,2);
 assert.equal(closed,3,'all source and earlier composite bitmaps are released');
 await assert.rejects(capture(part),/different question/,'a sequence step cannot be replayed');
 await assert.rejects(capture({index:0,total:9}),/Invalid picture sequence/);
 tab.active=false;await assert.rejects(capture({index:0,total:1}),/Keep the assignment tab visible/);tab.active=true;
 const background=fs.readFileSync('background/background.js','utf8');assert(background.includes('c.partCount!==c.total'),'AI request cannot consume a partial collage');assert(background.includes('c.documentId!==sender.documentId'),'a reloaded document cannot consume old captures');
 console.log('PASS ordered screenshot stitching, partial-sequence guard, question/tab/frame/document ownership, replay rejection and resource cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
