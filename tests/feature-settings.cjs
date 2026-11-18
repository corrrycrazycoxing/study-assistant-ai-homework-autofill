const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('shared/config.js','utf8');
const context={URL};vm.createContext(context);vm.runInContext(code,context);const C=context.StudyConfig;
for(const p of C.platforms){assert(C.allowed(p,{}));assert(C.courseAllowed(p,{}));}
assert(C.allowed('mcgraw',{featureSettings:{platforms:{pearson:false}}}));
assert(C.allowed('canvas',{featureSettings:{platforms:{pearson:false}}}));
assert(!C.allowed('pearson',{featureSettings:{platforms:{pearson:false}}}));
assert(!C.allowed('mcgraw','pearson'));assert(!C.allowed('mcgraw','off'));
assert(C.allowed('pearson',{featureSettings:{courses:{pearson:false}}}));
assert(!C.courseAllowed('pearson',{featureSettings:{courses:{pearson:false}}}));
assert(!C.preferences({featureSettings:{canvasQuizLauncher:false}},'canvas').quizOverviewEnabled);
let style,listener;const dom={URL,location:{href:'https://demo.instructure.com/courses/1/assignments'},document:{getElementById:()=>style,createElement:()=>({}),head:{append:node=>style=node}},chrome:{storage:{sync:{get:async()=>({featureSettings:{platforms:{pearson:false},courses:{canvas:false}}})},onChanged:{addListener:fn=>listener=fn}}}};
vm.createContext(dom);vm.runInContext(code,dom);
(async()=>{
 await new Promise(r=>setImmediate(r));
 assert(style.textContent.includes('#study-canvas-mcgraw-course'));assert(style.textContent.includes('#study-pearson-course-shell'));
 assert(!style.textContent.includes('#canvas-assistant-panel'),'course-only switch leaves Canvas quiz controls available');
 listener({featureSettings:{newValue:{platforms:{canvas:false}}}},'sync');
 assert(style.textContent.includes('#canvas-assistant-panel'));assert(style.textContent.includes('.study-pace-controls'));
 listener({featureSettings:{newValue:{}}},'sync');assert.equal(style.textContent,'','re-enabling removes all hiding rules');
 // Run actual course handler with settings disabled; no tab may launch.
 const session={canvasMcGrawCourse:{phase:'running',issues:[],playerTab:8}},sent=[];
 const ctx={URL,Date,StudyConfig:C,config:async()=>({featureSettings:{courses:{canvas:false}}}),StudyCanvasMcGrawCourse:{},chrome:{runtime:{id:'ext'},storage:{session:{get:async()=>session,set:async value=>Object.assign(session,value)}},tabs:{sendMessage:async(...args)=>sent.push(args),update:()=>{throw Error('must not navigate');}}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('background/canvas-mcgraw-course.js','utf8'),ctx);
 const sender={id:'ext',url:'https://demo.instructure.com/courses/1/assignments',tab:{id:1},frameId:0};
 await assert.rejects(ctx.canvasMcGrawCourse({type:'canvasCourseStart'},sender),/disabled/);
 assert.equal(session.canvasMcGrawCourse.phase,'done');assert.equal(sent[0][0],8);
 assert.equal((await ctx.canvasMcGrawCourse({type:'canvasCourseLaunch'},sender)).launch,false);
 const html=fs.readFileSync('popup/settings.html','utf8');for(const p of C.platforms)assert(html.includes('data-feature-platform="'+p+'"'));
 for(const p of ['canvas','pearson','mindtap'])assert(html.includes('data-feature-course="'+p+'"'));
 console.log('PASS independent platform/course/popup flags, default compatibility, live panel hiding and disabled queue guards');
})().catch(error=>{console.error(error);process.exitCode=1;});
