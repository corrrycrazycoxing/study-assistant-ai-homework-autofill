const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const transform=(e=0,f=0)=>({a:1,b:0,c:0,d:1,e,f,inverse(){return transform(-this.e,-this.f);},multiply(other){return transform(this.e+other.e,this.f+other.f);}});
let scrollFrames=0;const screenMatrix=()=>transform(0,scrollFrames?-700:0);
const offsets={Supply:0,Demand:0},slopes={Supply:-0.5,Demand:0.5},starts={Supply:300,Demand:150};
let clock=0,active=null,startX=0,startY=0,startOffset=0,moves=0,retain=true,snapTo=0,dragMode='vertical';const drops=[],overlay={style:{visibility:'visible'},getBoundingClientRect:()=>({left:800,right:980,top:20,bottom:780})};
const surface={tagName:'path',dispatchEvent(event){
 if(event.type.startsWith('pointer'))return true;
 assert.equal(event.which,1,'legacy primary-button handlers receive which=1');
 assert.equal(event.pageX,event.clientX);assert.equal(event.pageY,event.clientY);
 assert.equal(overlay.style.visibility,'visible','a nonoverlapping panel stays visible through the drag');
 if(event.type==='mousedown'){
  active=Object.keys(offsets).find(label=>Math.abs(event.clientY-(starts[label]+slopes[label]*(event.clientX-50-offsets[label])))<3)||null;
  startX=event.clientX;startY=event.clientY;startOffset=offsets[active]||0;
 }else if(event.type==='mousemove'){moves++;if(active&&retain){if(dragMode==='horizontal')offsets[active]=startOffset+event.clientX-startX;else{assert.equal(event.clientX,startX,'vertical widget receives its supported gesture');offsets[active]=startOffset+(startY-event.clientY)/slopes[active];}}}
 else if(event.type==='mouseup'){if(active){if(snapTo)offsets[active]=Math.round(offsets[active]/snapTo)*snapTo;drops.push({label:active,offset:offsets[active]});}active=null;}
 return true;
}};
const win={innerWidth:1000,innerHeight:800,getComputedStyle:n=>({display:'block',visibility:'visible',opacity:'1',strokeOpacity:'1',strokeWidth:'3',stroke:n.getAttribute('stroke')||'none'}),requestAnimationFrame(callback){clock+=16;if(scrollFrames)scrollFrames--;callback();},MouseEvent:class{constructor(type,values){this.type=type;Object.assign(this,values);}}};
win.PointerEvent=class{constructor(type,values){this.type=type;Object.assign(this,values);assert.equal(this.pointerType,'mouse');assert.equal(this.isPrimary,true);}};
const labelHit={tagName:'text',dispatchEvent(){throw Error('A curve label must never receive the drag');}};
const doc={defaultView:win,getElementById:()=>overlay,elementFromPoint(x){if(x>240&&x<290)return labelHit;return surface;}};
function node(tag,attrs={},text=''){
 return {tagName:tag,nodeType:1,isConnected:true,namespaceURI:'http://www.w3.org/2000/svg',ownerDocument:doc,parentElement:null,textContent:text,
 getAttribute:name=>attrs[name]??null,getClientRects:()=>[{}],closest:()=>null,getScreenCTM:screenMatrix,
 getBBox:()=>({x:Number(attrs.x)||0,y:(Number(attrs.y)||0)-5,width:text.length*5,height:10})};
}
const svg=node('svg',{width:'520',height:'440'});svg.scrollIntoView=options=>{assert.equal(options.behavior,'instant');scrollFrames=4;};
svg.contains=hit=>hit===surface||hit===labelHit;
svg.createSVGPoint=()=>({x:0,y:0,matrixTransform(m){return {x:this.x+m.e,y:this.y+m.f};}});
const texts=[node('text',{x:'270',y:'160'},'Supply'),node('text',{x:'265',y:'270'},'Demand'),node('text',{x:'30',y:'420'},'LOANABLE FUNDS (Billions of dollars)'),node('text',{x:'-100',y:'200'},'INTEREST RATE (Percent)')];
for(const text of texts.slice(0,2)){const original=text.getAttribute;const y=Number(original('y'));text.getAttribute=name=>name==='y'?String(y-slopes[text.textContent]*offsets[text.textContent]):original(name);text.getBBox=()=>({x:Number(original('x')),y:Number(text.getAttribute('y'))-5,width:text.textContent.length*5,height:10});}
const paths=Object.keys(offsets).map(label=>{
 const n=node('path',{stroke:label==='Supply'?'#ff9900':'#83acd3'}),get=n.getAttribute;
 n.getAttribute=name=>name==='d'?`M50,${starts[label]-slopes[label]*offsets[label]}L350,${starts[label]+slopes[label]*(300-offsets[label])}`:get(name);
 return n;
});[...paths,...texts].forEach(n=>n.parentElement=svg);
svg.querySelectorAll=selector=>selector==='text'?texts:selector==='path,line,polyline'?paths:[];
let delayedRevert=false;
const context={Date:{now:()=>clock},setTimeout(callback,ms){clock+=ms;if(delayedRevert)offsets.Supply=offsets.Demand=0;callback();}};vm.createContext(context);vm.runInContext(fs.readFileSync('shared/media.js','utf8'),context);vm.runInContext(fs.readFileSync('shared/mindtap-graph.js','utf8'),context);
const api=context.StudyMindTapGraph,prompt='You will not be graded on any changes you make to the graph. Scenario 1: Saving increases. Scenario 2: A tax credit is repealed. Scenario 3: A budget deficit grows.';
const graph=api.inspectCurves(svg,prompt);assert(graph,'visible straight supply/demand curves and numbered scenarios are recognized');
assert.equal(graph.mode,'curve-shifts');assert.equal(graph.scenarios.length,3);assert.equal(graph.referenceData.mode,'qualitative');
assert(!JSON.stringify(graph.referenceData).includes('geometry'),'DOM nodes and drawing geometry stay out of the AI prompt');
assert.equal(api.inspectCurves(svg,prompt.replace('not be graded','be graded')),null,'this adapter cannot modify a graded graph');
const plan=[{scenario:1,label:'Supply',direction:'right'},{scenario:2,label:'Demand',direction:'left'},{scenario:3,label:'Supply',direction:'left'}];
assert.equal(api.validate(plan,graph).length,3);
assert.throws(()=>api.validateCurvePlan(plan.slice(1),graph),/one curve shift/);
assert.throws(()=>api.validateCurvePlan([{...plan[0],direction:'up'},...plan.slice(1)],graph),/left\/right/);
assert.throws(()=>api.validateCurvePlan([{...plan[0],label:'Other'},...plan.slice(1)],graph),/visible curve/);
assert.throws(()=>api.validateCurvePlan([{...plan[0],scenario:2},...plan.slice(1)],graph),/numbered scenario/);
(async()=>{
 const status=[],receipt=await api.applyCurvePlan(graph,plan,()=>true,message=>status.push(message));
 assert.equal(receipt.completed,3);assert.equal(receipt.restored,true);assert.equal(drops.length,6,'each scenario drag is followed by a verified reset');
 for(const [index,expected] of [[0,75],[1,0],[2,-75],[3,0],[4,-75],[5,0]])assert(Math.abs(drops[index].offset-expected)<0.01);
 assert.equal(offsets.Supply,0);assert.equal(offsets.Demand,0);assert(api.curvesMatch(api.inspectCurves(svg,prompt),graph));
 assert.equal(overlay.style.visibility,'visible');assert(status.some(s=>s.includes('Scenario 3')));
 // Cover the preferred quarter-point with a draggable label. The adapter
 // must find another clear segment rather than sending input to the text.
 const hitTest=doc.elementFromPoint;
 doc.elementFromPoint=x=>x<140?labelHit:hitTest(x);
 await api.applyCurvePlan(graph,plan,()=>true);
 assert(api.curvesMatch(api.inspectCurves(svg,prompt),graph));doc.elementFromPoint=hitTest;
 snapTo=100;
 const snapped=await api.applyCurvePlan(graph,plan,()=>true);
 assert.equal(snapped.completed,3,'preset curve positions may differ from the pointer distance');
 assert.equal(offsets.Supply,0);assert.equal(offsets.Demand,0);snapTo=0;
 retain=false;
 await assert.rejects(api.applyCurvePlan(graph,plan,()=>true),/did not retain/,'a no-op drag cannot be reported as completed');
 assert.equal(overlay.style.visibility,'visible');retain=true;
 const before=moves;
 await assert.rejects(api.applyCurvePlan(graph,plan,()=>moves<before+3),/Stopped/);
 assert.equal(moves,before+3,'Stop halts further movement');assert.equal(active,null,'Stop releases the mouse button');
 assert.equal(overlay.style.visibility,'visible','Stop restores the overlay');
 offsets.Supply=offsets.Demand=0;
 const answerPrompt='You will not be graded on any changes you make to this graph. Enter the wage. Adjust the graph to show what happens to employment and wages in the eastern state.';
 const graded=api.inspectShiftAnswer(svg,answerPrompt);assert.equal(graded.mode,'curve-answer');
 assert.equal(api.validate([plan[0]],graded).length,1);assert.throws(()=>api.validate(plan,graded),/one curve shift/);
 const earlier={tagName:'svg',closest:()=>null};
 const instruction={...node('p',{},'Adjust the graph to show employment.'),children:[],compareDocumentPosition:node=>node===svg?4:2};
 const root={querySelectorAll:()=>[instruction]};
 assert.equal(api.shiftAnswerTarget(root,[earlier,svg],answerPrompt)?.svg,svg,'only the graph after the local adjustment instruction is an answer');
 const duplicate={...instruction};assert.equal(api.shiftAnswerTarget({querySelectorAll:()=>[instruction,duplicate]},[svg],answerPrompt),null,'ambiguous graph instructions require manual review');
 const oldClosest=svg.closest;svg.closest=()=>({});assert.equal(api.shiftAnswerTarget(root,[svg],answerPrompt),null,'calculator exhibits are never shift answers');svg.closest=oldClosest;
 const beforeAnswer=drops.length,placed=await api.applyCurveAnswer(graded,[plan[0]],()=>true);
 assert.equal(placed.completed,1);assert.equal(drops.length,beforeAnswer+1,'graded graph is shifted once and never reset');assert(offsets.Supply>0);assert.equal(offsets.Demand,0);
 assert(api.curvesMatch(api.inspectCurveChart(graded),placed.placed));
 assert.equal(api.inspectCurveChart(graded).populated,true,'a confirmed shift remains protected as existing work in the same page');
 assert.equal(JSON.stringify(api.inspectCurveChart(graded).referenceData),JSON.stringify(graded.referenceData),'answer movement does not masquerade as a question change');
 await assert.rejects(api.applyCurveAnswer(graded,[plan[0]],()=>true),/changed while waiting/,'stale AI plans cannot compound a manual or previous shift');
 offsets.Supply=0;delayedRevert=true;
 await assert.rejects(api.applyCurveAnswer(api.inspectShiftAnswer(svg,answerPrompt),[plan[0]],()=>true),/reverted.*before grading/,'a delayed snap-back blocks grading');delayedRevert=false;
 const beforeStop=drops.length;await assert.rejects(api.applyCurveAnswer(graded,[plan[0]],()=>false),/Stopped/);assert.equal(drops.length,beforeStop);
 offsets.Supply=300;
 assert(api.inspectShiftAnswer(svg,answerPrompt),'a shifted full path beyond the plot remains readable for curve verification');
 assert.equal(api.readReference(svg),null,'ordinary numeric reference extraction still rejects uncalibrated/out-of-bounds paths');
 offsets.Supply=0;
 dragMode='horizontal';
 const horizontalBefore=drops.length,horizontal=await api.applyCurveAnswer(api.inspectShiftAnswer(svg,answerPrompt),[plan[0]],()=>true);
 assert.equal(horizontal.completed,1);assert.equal(drops.length,horizontalBefore+2,'horizontal-only widget gets one verified no-op then its alternate gesture');assert(offsets.Supply>0);assert.equal(offsets.Demand,0);
 offsets.Supply=0;dragMode='vertical';
 const supplyText=texts[0],supplyGet=supplyText.getAttribute;
 supplyText.getAttribute=name=>name==='y'?String(Number(supplyGet(name))+180):supplyGet(name);
 const hover=node('path',{stroke:'#e04820',d:'M50,200L350,200'});hover.parentElement=svg;paths.push(hover);
 const labelMoved=api.inspectShiftAnswer(svg,answerPrompt);
 assert(labelMoved,'independently moved text and transient hover helpers do not erase known curve identity');
 assert(api.curvesMatch(labelMoved,graded),'moving a label is not a curve shift');
 const actualCurve=await api.applyCurveAnswer(labelMoved,[plan[0]],()=>true);
 assert(actualCurve.placed&&offsets.Supply>0,'retention follows the actual curve when its label stays elsewhere');
 offsets.Supply=0;paths.pop();supplyText.getAttribute=supplyGet;
 const beforeOrder=api.inspectShiftAnswer(svg,answerPrompt);paths.reverse();texts.reverse();
 const afterOrder=api.inspectShiftAnswer(svg,answerPrompt);
 assert.equal(JSON.stringify(afterOrder.referenceData),JSON.stringify(beforeOrder.referenceData),'redraw ordering cannot invalidate a completed graph answer');
 assert.equal(afterOrder.series.map(s=>s.label).join(','),beforeOrder.series.map(s=>s.label).join(','),'curve inventory stays stable when Raphael reorders paths');
 paths.reverse();texts.reverse();
 const source=fs.readFileSync('content-scripts/mindtap.js','utf8');
 assert(source.includes('await StudyMindTapGraph.applyCurvePlan(chart,f.value,current,say)'),'production Fill uses the verified curve handler');
 assert(source.includes('curveShiftReceipt?.id===pending.id'),'retention requires a receipt for the current request');
 assert(source.includes('curveShiftReceipt.completed===f.value.length'),'all scenario shifts must complete before Auto advances');
 assert(source.includes('Each scenario starts from the original graph'),'AI receives independent scenario instructions');
 console.log('PASS MindTap curve plans, ungraded resets, separate graded answer targeting, retained placement, delayed snap-back/stale-plan rejection and Stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
