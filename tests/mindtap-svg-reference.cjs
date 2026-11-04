const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const identity={inverse(){return this;},multiply(other){return other;},a:1,b:0,c:0,d:1,e:0,f:0};
const doc={defaultView:{getComputedStyle:node=>({display:'block',visibility:'visible',opacity:'1',strokeWidth:'3',strokeOpacity:'1',stroke:node.getAttribute('stroke')||'none',...node.style})}};
function node(tag,attrs={},text='',style={}){
 return {tagName:tag,nodeType:1,isConnected:true,namespaceURI:'http://www.w3.org/2000/svg',ownerDocument:doc,textContent:text,style,attrs,parentElement:null,
 getAttribute:key=>attrs[key]??null,getClientRects:()=>[{}],closest(selector){return selector==='[aria-hidden="true"]'?this.parentElement:null;},matches:()=>false,
 getScreenCTM:()=>identity,getBBox:()=>({x:Number(attrs.x)||0,y:(Number(attrs.y)||0)-5,width:text.length*5,height:10}),getBoundingClientRect:()=>({width:520,height:440})};
}
const svg=node('svg',{width:'520',height:'440'});svg.createSVGPoint=()=>({x:0,y:0,matrixTransform(m){return {x:m.a*this.x+m.c*this.y+m.e,y:m.b*this.x+m.d*this.y+m.f};}});
// Structural data observed in the live Chapter 13 loanable-funds SVG. The
// visible chart is aria-hidden; invisible red/gray helper paths also exist.
const texts=[...Array.from({length:13},(_,i)=>node('text',{x:String(50+i*24),y:'388'},String(i*100))),
 ...Array.from({length:17},(_,i)=>node('text',{x:'28',y:String(370-i*20)},String(i))),
 node('text',{x:'271.26',y:'289'},'Demand'),node('text',{x:'275.76',y:'97'},'Supply'),
 node('text',{x:'99.1',y:'403'},'LOANABLE FUNDS (Billions of dollars)'),node('text',{x:'-100',y:'213'},'INTEREST RATE (Percent)')];
const demand=node('path',{stroke:'#83acd3',d:'M357.20016799999996,370.000175L49.999832,49.999825000000044'});
const supply=node('path',{stroke:'#ff9900',d:'M357.20007200000003,49.99992500000002L49.999928,370.0000749999999'});
const paths=[demand,supply,node('path',{...demand.attrs}),node('path',{stroke:'#e04820',d:demand.attrs.d},'',{opacity:'0'}),node('path',{stroke:'#999999',d:demand.attrs.d})];
let elements=[...texts,...paths];elements.forEach(n=>n.parentElement=svg);
svg.parentElement=node('div',{'aria-hidden':'true'});
svg.querySelectorAll=selector=>selector==='text'?elements.filter(n=>n.tagName==='text'):selector==='path,line,polyline'?elements.filter(n=>n.tagName!=='text'):[];
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('shared/media.js','utf8'),context);vm.runInContext(fs.readFileSync('shared/mindtap-graph.js','utf8'),context);
const read=()=>context.StudyMindTapGraph.readReference(svg);
assert.equal(context.StudyMedia.drawn(svg),true,'aria-hidden does not mean a chart is visually hidden');
assert.equal(context.StudyMedia.graphics({querySelectorAll:()=>[svg]}).length,1,'picture fallback also detects this visible SVG');
const data=read();assert(data,'labelled straight-line chart must be readable without capture');
assert.equal(data.series.length,2,'duplicate rendered paths and invisible helper paths are not extra curves');
assert.equal(data.series[0].label,'Demand');assert.equal(data.series[1].label,'Supply');
assert(Math.abs(data.series[0].points[1].x-1280)<0.002,'SVG coordinate is converted using the actual horizontal ticks');
assert(Math.abs(data.series[0].points[0].y-16)<0.001);assert.equal(data.intersections.length,1);
assert(Math.abs(data.intersections[0].x-640)<0.002);assert(Math.abs(data.intersections[0].y-8)<0.001,'equilibrium comes from the rendered lines');
assert(data.axisLabels.some(label=>label.includes('Billions')),'units remain in chart data');
const baseline=JSON.stringify(data);
const guide=node('path',{stroke:'#88cf65',d:'M50,200L180,200M200,200L357.2,200'});elements.push(guide);
const guided=read();assert(guided,'a calculator horizontal guide does not make the labelled chart unreadable');
assert.equal(guided.series.length,2);assert.equal(guided.guides.length,1);assert.equal(guided.guides[0].points[0].y,8.5);
assert(!guided.guides[0].label,'unlabelled guide geometry is retained without an invented curve name');
guide.attrs.d='M50,200L180,190L357.2,200';assert.equal(read(),null,'non-collinear calculator artwork cannot be passed off as a straight line');elements.pop();
svg.parentElement.style.opacity='0';assert.equal(read(),null,'CSS-invisible ancestor prevents data extraction');delete svg.parentElement.style.opacity;
elements.push(node('path',{stroke:'#00cc33',d:'M50,50C100,100,200,200,300,300'}));assert.equal(read(),null,'unsupported visible curves require picture fallback');elements.pop();
elements.push(node('text',{x:'276',y:'98'},'Other supply'));assert.equal(read(),null,'ambiguous nearby line labels are not guessed');elements.pop();
const tick=texts.find(n=>n.textContent==='600');tick.textContent='650';assert.equal(read(),null,'nonlinear axes cannot use linear coordinate mapping');tick.textContent='600';
assert.equal(JSON.stringify(read()),baseline,'CSS state and temporary unsupported additions do not mutate the chart');
elements=elements.filter(n=>n.tagName!=='text'||!/^[0-9]+$/.test(n.textContent));
assert.equal(read(),null,'an unlabeled numerical scale cannot be invented');
const qualitative=context.StudyMindTapGraph.readReference(svg,{allowQualitative:true});
assert(qualitative,'explicitly ungraded word-choice graphs can use qualitative directions without points');
assert.equal(qualitative.mode,'qualitative');assert.equal(qualitative.series.find(s=>s.label==='Supply').direction,'upward');
assert.equal(qualitative.series.find(s=>s.label==='Demand').direction,'downward');
assert(qualitative.series.every(s=>!s.points),'pixel positions are not presented as invented chart values');
const source=fs.readFileSync('content-scripts/mindtap.js','utf8');
assert(source.includes('references.every(Boolean)'),'every graphic must be read before bypassing picture capture');
assert(source.includes('series:graph.series.map(s=>s.label)},referenceData]'),'rendered reference data participates in question-change detection');
assert(source.includes('if(snap.needsPicture&&settings.includePictures)'),'a fully read reference does not trigger screenshot capture');
assert(source.includes('an image is not needed for this chart'),'AI receives explicit chart context rather than a missing-image request');
assert(!source.includes('const diagnostic='),'temporary live SVG diagnostics are removed');
const eligibility=source.slice(source.indexOf('    const ungradedWordGraph='),source.indexOf('    const isPlot='));
function allowsQualitative(text,fields){const ctx={text,fields};vm.createContext(ctx);vm.runInContext(eligibility+'globalThis.allowed=ungradedWordGraph;',ctx);return ctx.allowed;}
const ungraded='Note: You will not be graded on any changes you make to the graph.';
assert.equal(allowsQualitative(ungraded,[{kind:'dropdown',options:['increase','decrease']}]),true);
assert.equal(allowsQualitative('Shift the appropriate curve on the graph.',[{kind:'dropdown',options:['increase','decrease']}]),false,'graded graph interactions cannot be bypassed');
assert.equal(allowsQualitative(ungraded,[{kind:'dropdown',options:['8%','10%']}]),false,'numeric choices require calibrated axes or an image');
assert.equal(allowsQualitative(ungraded,[{kind:'number'}]),false,'numeric fields cannot use direction-only data');
(async()=>{
 const messages=[],status=[],elements=new Map(),field={key:'f0',kind:'dropdown',label:'Interest rate',options:['8%','10%']};
 const requestContext={settings:{pacingMode:'instant',includePictures:false},pending:null,answer:null,correction:null,running:false,entryStarted:false,timer:null,
  editable:()=>true,crypto:{randomUUID:()=> 'chart-request'},StudyConfig:{clearPreview(){}},StudySecurity:{redact:value=>value},
  ui:{getElementById:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);}},say:value=>status.push(value),
  setTimeout:()=>1,StudyMedia:{capture:()=>{throw Error('Screenshot must not run for a readable SVG.');}},
  chrome:{runtime:{sendMessage:async message=>{messages.push(message);return {received:true};}}}};
 vm.createContext(requestContext);
 vm.runInContext(source.slice(source.indexOf('  async function request('),source.indexOf('  const pacer=')),requestContext);
 const snap={text:'Based on the previous graph, select the interest rate.',fields:[field],unansweredFields:[field],answeredFields:[],hasDiagram:true,needsPicture:false,referenceData:[data],needsGraphReference:true,securitySnapshot:{snapshotHash:'chart-hash'}};
 await requestContext.request(snap);
 assert.equal(messages.length,1);assert.equal(messages[0].type,'mindtapQuestion');assert.equal(messages[0].imageToken,undefined);
 assert(messages[0].prompt.includes('"intersections":'));assert(messages[0].prompt.includes('"Supply"'));assert(messages[0].prompt.includes('Billions'));
 assert(status.some(value=>value.includes('graph data read directly')),'live progress explains why no picture is needed');
 requestContext.pending=null;
 await requestContext.request({...snap,referenceData:[qualitative]});
 assert.equal(messages.length,2);assert(messages[1].prompt.includes('No point placement or numerical coordinates are needed.'));
 requestContext.pending=null;
 await assert.rejects(requestContext.request({...snap,referenceData:null,needsPicture:true}),/does not expose readable chart data/,'unreadable references cannot bypass disabled picture mode');
 assert.equal(messages.length,2,'failed fallback sends no incomplete prompt');
 console.log('PASS MindTap aria-hidden SVG rendering, direct chart data through production request with pictures off, labels/units/intersections and unreadable-chart fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
