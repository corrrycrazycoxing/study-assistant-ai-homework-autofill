'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/mindtap-question-types.json','utf8'));
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync('shared/mindtap-fields.js','utf8'),context);
const hasAnswer=context.StudyMindTapFields.hasAnswer;
const requiresManualGraph=context.StudyMindTapFields.requiresManualGraph;
vm.runInContext(fs.readFileSync('shared/mindtap-graph.js','utf8'),context);
const graphAdapter=context.StudyMindTapGraph;
assert.equal(hasAnswer({kind:'number',value:''}),false,'blank numeric fields remain eligible');
assert.equal(hasAnswer({kind:'number',value:'  '}),false,'whitespace does not count as an answer');
assert.equal(hasAnswer({kind:'number',value:'%'}),false,'Aplia percent suffix defaults are blank, not saved answers');
assert.equal(hasAnswer({kind:'number',value:'12%'}),true,'a numeric percent answer is preserved');
assert.equal(hasAnswer({kind:'number',value:'1,250'}),true,'formatted numeric answers are preserved');
assert.equal(hasAnswer({kind:'number',value:'n/a'}),false,'invalid numeric text is not treated as a completed number');
assert.equal(hasAnswer({kind:'number',value:'0'}),true,'zero is a real answer');
assert.equal(hasAnswer({kind:'text',value:'existing work'}),true,'nonempty text is protected');
assert.equal(hasAnswer({kind:'checkbox',selectedValues:[]}),false,'an unanswered checkbox group remains eligible');
assert.equal(hasAnswer({kind:'checkbox',selectedValues:['Option A']}),true,'checked options are protected');
assert.equal(hasAnswer({kind:'radio',selectedValues:['Choice A']}),true,'a selected radio answer is protected');
assert.equal(hasAnswer({kind:'dropdown',selectedValues:['Select an option']}),false,'a selected placeholder is not treated as completed');
assert.equal(hasAnswer({kind:'dropdown',displayValue:'Choose an answer'}),false,'visible dropdown placeholder is not an answer');
assert.equal(hasAnswer({kind:'dropdown',selectedValues:['$104']}),true,'selected dropdown answers are protected');
assert.equal(requiresManualGraph({hasDiagram:true,text:'Use the points to plot values on the graph.'}),true,'a plotted graph paired with visible image content is treated as a manual interaction');
assert.equal(requiresManualGraph({hasDiagram:false,text:'Plot the points on the graph.'}),false,'graph wording without captured graph content is not enough to classify a graph widget');
assert.equal(requiresManualGraph({hasDiagram:true,text:'Which value is shown in this graph?'}),false,'ordinary questions about a figure remain eligible for supported field types');
assert.equal(hasAnswer({kind:'graph',value:false}),false,'an untouched point plot remains unanswered');
assert.equal(hasAnswer({kind:'graph',value:true}),true,'an existing point plot is preserved instead of overwritten');
const configScope={};vm.runInNewContext(fs.readFileSync('shared/config.js','utf8'),configScope);
const headerCell=(text,colSpan=1,rowSpan=1)=>({textContent:text,colSpan,rowSpan});
const table={tHead:{rows:[
  {cells:[headerCell('',1,3),headerCell('Quantity in Basket',1,3),headerCell('2022',2),headerCell('2023',2),headerCell('2024',2)]},
  {cells:['Price','Cost','Price','Cost','Price','Cost'].map(text=>headerCell(text))},
  {cells:Array(6).fill(0).map(()=>headerCell('(Dollars)'))}
]}};
const row={children:Array.from({length:8},()=>({}))};
assert.equal(configScope.StudyConfig.tableColumn(table,row,row.children[5]),'2023 · Cost · (Dollars)','multi-row, merged year headers label the correct numeric answer column');
assert.equal(configScope.StudyConfig.tableColumn(table,row,row.children[7]),'2024 · Cost · (Dollars)','later merged year headers stay aligned with table cells');
const svgNS='http://www.w3.org/2000/svg';
function text(text,x,y){return {textContent:text,getAttribute:key=>({x:String(x),y:String(y)}[key]??null)};}
function shape(tag,attrs){return {tagName:tag,getAttribute:key=>attrs[key]??null};}
const graphTexts=[text('Nominal Interest Rate',436,106),text('Real Interest Rate',445.5,176),...[2018,2019,2020,2021,2022,2023,2024].map((year,i)=>text(String(year),50+i*54,385)),...[3,2,1,0,-1,-2,-3,-4,-5,-6].map((n,i)=>text(String(n),28,50+i*36)),text('YEAR',195.5,399),text('INTEREST RATE (Percent)',-68,215)];
const orange=shape('rect',{fill:'#ff9900',opacity:'1',x:'489.6',y:'65.65',width:'8.8',height:'8.7'}),green=shape('path',{fill:'#8bd865',opacity:'1',d:'M494,136L500,144L488,144Z'});
const fakeSvg={namespaceURI:svgNS,querySelector:()=>({textContent:'Created with Raphaël 2.1.2'}),querySelectorAll:selector=>selector==='text'?graphTexts:selector==='rect,path,circle'?[orange,green]:[],createSVGPoint(){return {matrixTransform(){return {x:this.x,y:this.y}}}},getScreenCTM(){return {}}};
const graph=graphAdapter.inspect(fakeSvg,'Use the points for years 2019 to 2023.');
assert.ok(graph,'a Cartesian Raphael year-series graph is recognized');
assert.equal(graph.populated,false,'an empty chart is not mistaken for existing plotted work');
const graphWithoutDescription={...fakeSvg,querySelector:()=>null};
assert.ok(graphAdapter.inspect(graphWithoutDescription,'Use the points for years 2019 to 2023.'),'visible axes and legend identify the graph even without optional library description text');
assert.deepEqual(Array.from(graph.years),[2019,2020,2021,2022,2023]);
assert.deepEqual(Array.from(graph.series,s=>[s.label,s.color]),[['Nominal Interest Rate','#ff9900'],['Real Interest Rate','#8bd865']]);
const grayNominal=shape('rect',{fill:'#888888',opacity:'1',x:'489.6',y:'65.65',width:'8.8',height:'8.7'});
const orangePlotted=shape('rect',{fill:'#ff9900',opacity:'1',x:'210',y:'145',width:'8.8',height:'8.7'});
const grayAfterNominal={...fakeSvg,querySelectorAll:selector=>selector==='text'?graphTexts:selector==='rect,path,circle'?[grayNominal,green,orangePlotted]:[]};
const graphAfterNominal=graphAdapter.inspect(grayAfterNominal,'Use the points for years 2019 to 2023.');
assert.ok(graphAfterNominal,'a gray exhausted legend handle does not invalidate the remaining graph');
assert.deepEqual(Array.from(graphAfterNominal.series,s=>s.label),['Nominal Interest Rate','Real Interest Rate'],'legend labels remain stable when one series handle changes color');
assert.equal(graphAfterNominal.populated,true,'already-plotted colored marks are detected independently of disabled legend colors');
const grayGreen=shape('path',{fill:'#888888',opacity:'1',d:'M494,136L500,144L488,144Z'});
const greenPlotted=shape('path',{fill:'#8bd865',opacity:'1',d:'M250,200L256,208L244,208Z'});
const graphAfterBoth={...fakeSvg,querySelectorAll:selector=>selector==='text'?graphTexts:selector==='rect,path,circle'?[grayNominal,grayGreen,orangePlotted,greenPlotted]:[]};
const graphAfterBothSeries=graphAdapter.inspect(graphAfterBoth,'Use the points for years 2019 to 2023.');
assert.ok(graphAfterBothSeries,'both gray exhausted legend handles still leave a recognizable graph');
assert.equal(graphAfterBothSeries.populated,true,'colored points remain detectable after both legend handles gray out');
const whitePlotBackground=shape('rect',{fill:'#ffffff',opacity:'1',x:'350',y:'200',width:'300',height:'300'});
const blankWithBackground={...fakeSvg,querySelectorAll:selector=>selector==='text'?graphTexts:selector==='rect,path,circle'?[orange,green,whitePlotBackground]:[]};
assert.equal(graphAdapter.inspect(blankWithBackground,'Use the points for years 2019 to 2023.').populated,false,'a filled white plot background is not mistaken for a plotted answer');
assert.equal(graph.yAxisLabel,'INTEREST RATE (Percent)','the graph adapter captures the y-axis meaning for readable fallback values');
assert.equal(graph.unitSuffix,'%','percent axes label fallback coordinates with percent units');
const spaceSeparatedGreen=shape('path',{fill:'#8bd865',opacity:'1',d:'M 494 136 L 500 144 L 488 144 Z'});
const spacePathSvg={...fakeSvg,querySelectorAll:selector=>selector==='text'?graphTexts:selector==='rect,path,circle'?[orange,spaceSeparatedGreen]:[]};
assert.deepEqual(Array.from(graphAdapter.inspect(spacePathSvg,'Use the points for years 2019 to 2023.').series,s=>s.label),['Nominal Interest Rate','Real Interest Rate'],'space-separated SVG path coordinates in the green legend are recognized');
assert.deepEqual({...graphAdapter.coordinate(graph,{x:2021,y:0})},{x:212,y:158},'axis tick transforms map graph values into SVG coordinates');
const decimalPoint={x:2021,y:0.4},decimalCoordinate=graphAdapter.coordinate(graph,decimalPoint);
assert.ok(Math.abs(graphAdapter.valueAtPosition(graph.yTicks,decimalCoordinate.y)-decimalPoint.y)<1e-9,'fractional graph values survive a coordinate round-trip instead of snapping to integer ticks');
const firstYearCoordinate=graphAdapter.coordinate(graph,{x:2019,y:0}).x;
assert.equal(graphAdapter.yearAtPosition(graph.xTicks,firstYearCoordinate-1e-9),2019,'floating-point transform noise just below the first year tick is tolerated');
assert.equal(graphAdapter.yearAtPosition(graph.xTicks,graphAdapter.coordinate(graph,{x:2019.5,y:0}).x),null,'drops between integer year columns are rejected');
const graphSource=fs.readFileSync('shared/mindtap-graph.js','utf8');
assert.match(graphSource,/scrollIntoView\(\{block:'center',inline:'center'\}\)/,'graph is centered in its iframe before point drags');
assert.match(graphSource,/outside the assignment viewport/,'offscreen point sources fail clearly instead of attempting an invisible drag');
assert.match(graphSource,/doc\.elementFromPoint\(x,y\)\|\|doc/,'synthetic graph drag events follow the real pointer hit-test path through the SVG surface');
assert.match(graphSource,/overlay\.style\.visibility='hidden'/,'the floating assistant is temporarily hidden so it cannot intercept graph legend drags');
const plottedShape={getAttribute:key=>key==='fill'?'#ff9900':null,getBoundingClientRect:()=>({left:207,top:153,right:217,bottom:163,width:10,height:10})};
const plottedGraph={...graph,svg:{...fakeSvg,ownerDocument:{defaultView:{innerWidth:900,innerHeight:700,getComputedStyle:()=>({opacity:'1'})}},querySelectorAll:selector=>selector==='rect,path,circle'?[plottedShape]:[]}};
assert.equal(graphAdapter.hasPoint(plottedGraph,graph.series[0],{x:2021,y:0}),true,'a plotted point is confirmed at its requested chart coordinate');
assert.equal(graphAdapter.hasPoint(plottedGraph,graph.series[0],{x:2021,y:1}),false,'a nearby point is not mistaken for the requested coordinate');
const points=Array.from({length:5},(_,index)=>({x:2019+index,y:1-index*.5}));
const validatedSeries=graphAdapter.validate(graph.series.map(series=>({label:series.label,points})),graph);
assert.equal(validatedSeries.length,2,'complete point series validate against the legend and requested years');
assert.equal(validatedSeries[0].unitSuffix,'%','validated graph output retains the axis units for presentation');
assert.throws(()=>graphAdapter.validate([{label:graph.series[0].label,points}],graph),/one complete point series/,'missing graph series are rejected');
assert.throws(()=>graphAdapter.validate(graph.series.map(series=>({label:series.label,points:[{x:2020,y:1},...points.slice(1)]})),graph),/each requested year/,'misaligned point years are rejected');
assert.equal(graphAdapter.inspect(fakeSvg,'plot values from low to high'),null,'unrecognized x-axis instructions stay manual');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const aplia=manifest.content_scripts.find(entry=>entry.js.includes('content-scripts/mindtap.js'));
assert.ok(aplia.js.indexOf('shared/mindtap-fields.js')<aplia.js.indexOf('shared/mindtap-graph.js')&&aplia.js.indexOf('shared/mindtap-graph.js')<aplia.js.indexOf('content-scripts/mindtap.js'),'the field and graph helpers load before the Aplia adapter');
const adapter=fs.readFileSync('content-scripts/mindtap.js','utf8');
assert.match(adapter,/function promptText\(node\)\{[\s\S]*?q4-categorizationTable-choice-correctness,svg,canvas/,'dynamic Raphael labels and hover text do not make an unchanged graph question look different');
assert.match(adapter,/snap\.unansweredFields\.length/,'Auto selects a partially completed question when blank fields remain');
assert.match(adapter,/if\(snap\.unansweredFields\.length\)\{done\.delete\(snap\.key\);return snap;\}/,'a stale completed-question checkpoint cannot hide currently blank fields');
assert.match(adapter,/Already answered fields to preserve/,'AI receives existing values only as preserve-only context');
assert.match(adapter,/pending\.protectedFields/,'validation protects existing values while the blank fields are filled');
assert.match(adapter,/if\(snap\.hasDiagram&&settings\.includePictures\)/,'MindTap captures a visible graph only when image capture is enabled');
assert.match(adapter,/StudyMedia\.capture\(chrome,snap\.root/,'enabled image capture supplies the visible graph to the AI request');
assert.match(adapter,/requiresManualGraph\(\{hasDiagram,text\}\)/,'plotting tasks are recognized as graph interactions');
assert.match(adapter,/if\(snap\.manualGraph\)throw Error/,'unrecognized graph interactions stop before any part of a mixed question is sent or entered');
assert.match(adapter,/pending\?\.manualGraph\)throw Error/,'unsupported graph interactions cannot be mistaken for fully filled questions');
assert.match(adapter,/StudyMindTapGraph\.drag/,'supported point plots are entered by dragging their legend series to mapped chart coordinates');
assert.match(adapter,/MindTap did not retain plotted points/,'the graph has a final retention check after per-point verification');
assert.match(adapter,/const fresh=snapshot\(pending\.root\)/,'graph marker references are reacquired after each MindTap redraw');
assert.match(adapter,/function sameGraphQuestion\(expected,fresh\)/,'live graph guards compare stable question structure rather than redraw-sensitive SVG coordinates');
assert.match(adapter,/series\.map\(series=>series\.label\)/,'the live guard compares stable series labels instead of colors that change after placement');
assert.match(adapter,/return shape\(expected\.graph\)===shape\(fresh\.graph\)/,'the live guard still protects the expected years and legend labels during point placement');
assert.match(adapter,/function stableQuestionText\(node\)/,'live graph cancellation checks read stable question text outside the redrawn SVG');
assert.match(adapter,/stableQuestionText\(source\)===graphQuestionText/,'graph drags do not cancel on transient SVG replacement while still guarding against question changes');
assert.match(adapter,/\.q4-select-container/,'custom dropdown fields are discovered');
assert.match(adapter,/el\.type==='radio'\?'radio':el\.type==='checkbox'\?'checkbox'/,'radio and checkbox groups are classified');
assert.match(adapter,/el\.type==='number'\|\|el\.closest\('\[class\*="q4-numericEntry"\]'\)\?'number'/,'numeric-entry table fields are classified');
assert.match(adapter,/iframe/,'embedded or player-based interactions are kept out of automatic field entry');
assert.equal(fixture.answerDataCaptured,false,'live regression fixtures store structure only, never answers');
assert.equal(fixture.cases.length,4,'the four live question compositions are saved');
assert.deepEqual(fixture.cases.map(item=>item.support),['form-fields','form-fields','raphael-cartesian-year-plot','form-fields']);
const graphCase=fixture.cases.find(item=>item.id==='interactive-graph-and-radio');
assert.equal(graphCase.observed.find(item=>item.type==='drag-plot-series').pointsPerSeries,5,'graph points per series are captured as structural data');
assert.equal(graphCase.rendererEvidence.libraryLoaded,'Raphael SVG (raphael-min.js)','the live MindTap renderer is recorded for the graph adapter');
assert.match(graphCase.rendererEvidence.accessibility,/generic image/,'the live graph remains an image and uses graph-specific interaction handling');
assert.equal(graphCase.imageCapture,'when-enabled','graph context is captured for the AI when the image preference is enabled');
const graphMockHtml=fs.readFileSync('docs/mindtap-graph-mock.html','utf8');
const graphMockScript=fs.readFileSync('docs/mindtap-graph-mock.js','utf8');
assert.match(graphMockHtml,/<script src="\.\.\/shared\/mindtap-graph\.js"><\/script>/,'the browser mock exercises the same shared graph adapter');
assert.match(graphMockHtml,/contains no Cengage account, saved answers, grades, or submission controls/,'the browser graph test cannot affect live work');
assert.match(graphMockScript,/for\(const point of valueSeries\.points\)/,'the graph mock checks every point rather than just the first pair');
assert.match(graphMockScript,/retained\.length!==10/,'the graph mock requires all ten plotted points to persist');
assert.match(graphMockScript,/const freshGraph=window\.StudyMindTapGraph\.inspect/,'the graph mock forces a fresh handle lookup before every simulated placement');
assert.match(graphMockScript,/marker\.replaceWith\(replacement\)/,'the graph mock simulates MindTap replacing stale legend handles after each point');
assert.match(graphMockScript,/length===5\)replacement\.setAttribute\('fill','#888888'\)/,'the mock simulates MindTap graying out an exhausted series handle');
assert.match(graphMockScript,/valueAtPosition\(graph\.yTicks,p\.y\)/,'the graph mock retains fractional y-values at their exact plotted coordinates');
assert.match(graphMockScript,/yearAtPosition\(graph\.xTicks,p\.x\)/,'the graph mock tolerates transformed year-tick precision without accepting between-year drops');
assert.match(graphMockScript,/2019,y:2\.1[\s\S]*2023,y:2\.4[\s\S]*2019,y:-0\.3[\s\S]*2023,y:-5\.6/,'the fixture covers both complete five-point series');
const previewContext={StudyConfig:configScope.StudyConfig};vm.createContext(previewContext);vm.runInContext(fs.readFileSync('shared/preview.js','utf8'),previewContext);
const preview=previewContext.StudyPreview.parse(JSON.stringify({answer:{graph:[{label:'Nominal Interest Rate',color:'#ff9900',yAxisLabel:'INTEREST RATE (Percent)',unitSuffix:'%',points:[{x:2022,y:2.4}]}]},fieldLabels:{graph:'Plot graph points'},graphFallback:{message:'Auto stopped; place missing points manually.'}}));
assert.equal(preview.kind,'answers','graph output remains a normal answer preview with other field types');
assert.equal(preview.items[0].graphSeries[0].points[0].y,2.4,'graph fallback exposes numeric coordinates instead of object strings');
assert.equal(preview.items[0].graphSeries[0].unitSuffix,'%','percent unit survives into the readable panel model');
assert.match(preview.graphFallback.message,/place missing points manually/,'the failure preview clearly tells the learner what to do next');
console.log('PASS MindTap field-level unanswered detection and preservation');

async function testFullGraphDragSequence(){
  const placed=[];let active=null;
  const values=[
    {label:'Nominal Interest Rate',points:[{x:2019,y:2.1},{x:2020,y:2.1},{x:2021,y:0.4},{x:2022,y:0.1},{x:2023,y:2.4}]},
    {label:'Real Interest Rate',points:[{x:2019,y:-0.3},{x:2020,y:0.3},{x:2021,y:-0.8},{x:2022,y:-4.6},{x:2023,y:-5.6}]}
  ];
  const makeMarker=(x,y,color,label)=>({getBoundingClientRect:()=>({left:x-10,top:y-10,right:x+10,bottom:y+10,width:20,height:20}),dispatchEvent:event=>dispatch(event),color,label});
  const series=[
    {label:'Nominal Interest Rate',color:'#ff9900',marker:makeMarker(910,110,'#ff9900','Nominal Interest Rate')},
    {label:'Real Interest Rate',color:'#8bd865',marker:makeMarker(910,210,'#8bd865','Real Interest Rate')}
  ];
  const eventTarget={dispatchEvent:event=>dispatch(event)};
  function dispatch(event){
    if(event.type==='mousedown')active=series.find(item=>item.marker===event.target)||series.find(item=>Math.abs(item.marker.getBoundingClientRect().left+10-event.clientX)<12&&Math.abs(item.marker.getBoundingClientRect().top+10-event.clientY)<12)||null;
    if(event.type==='mouseup'&&active){const color=active.color,x=event.clientX,y=event.clientY;placed.push({getAttribute:key=>key==='fill'?color:null,getBoundingClientRect:()=>({left:x-5,top:y-5,right:x+5,bottom:y+5,width:10,height:10})});active=null;}
  }
  class FakeMouseEvent{constructor(type,options){this.type=type;Object.assign(this,options);}}
  const doc={elementFromPoint:(x,y)=>series.find(item=>{const r=item.marker.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})?.marker||eventTarget,getElementById:()=>null};
  const win={innerWidth:1200,innerHeight:800,MouseEvent:FakeMouseEvent,getComputedStyle:()=>({opacity:'1'}),requestAnimationFrame:callback=>{callback();return 1;}};
  doc.defaultView=win;
  const svg={ownerDocument:doc,scrollIntoView(){},createSVGPoint(){return {matrixTransform(){return {x:this.x,y:this.y}}}},getScreenCTM(){return {}},querySelectorAll:()=>placed};
  const xTicks=[2018,2019,2020,2021,2022,2023,2024].map((value,index)=>({value,pos:100+index*100}));
  const yTicks=[3,2,1,0,-1,-2,-3,-4,-5,-6].map((value,index)=>({value,pos:100+index*50}));
  const dragGraph={svg,xTicks,yTicks,years:[2019,2020,2021,2022,2023],plot:{left:200,right:700,top:100,bottom:550},series,populated:false};
  for(const pointSeries of values){
    const live=series.find(item=>item.label===pointSeries.label);
    for(const point of pointSeries.points){
      await graphAdapter.drag(dragGraph,live,point,()=>true);
      assert.equal(graphAdapter.hasPoint(dragGraph,live,point),true,`retained mock drag for ${live.label} ${point.x}`);
    }
  }
  assert.equal(placed.length,10,'the adapter retains every point across both consecutive series');
  console.log('PASS MindTap graph mock retains all 10 points across consecutive drags');
}
testFullGraphDragSequence().catch(error=>{console.error(error);process.exitCode=1;});
