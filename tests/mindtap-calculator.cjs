const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mindtap.js','utf8');
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const base=(tag,text='')=>({nodeType:1,tagName:tag,textContent:text,isConnected:true,childNodes:text?[{nodeType:3,textContent:text}]:[],getClientRects:()=>[{}],getAttribute:()=>null,querySelectorAll:()=>[],closest:()=>null,matches:()=>false});
const input=(label,value)=>({...base('INPUT'),type:'number',value,disabled:false,readOnly:false,getAttribute:key=>key==='aria-label'?label:null,matches:selector=>selector==='input'});
const wage=input('Wage','12.50'),demand=input('Labor Demanded','375'),supply=input('Labor Supplied','625'),answer=input('Labor demanded answer','');demand.readOnly=supply.readOnly=true;
const cell=(label,entry)=>({...base('TD',label),querySelectorAll:()=>entry?[entry]:[]});
const rows=[{...base('TR'),cells:[cell('Wage (Dollars per hour)'),cell('',wage)]},{...base('TR'),cells:[cell('Labor Demanded (Thousands of workers)'),cell('',demand),cell('Labor Supplied (Thousands of workers)'),cell('',supply)]}];
const table={...base('TABLE'),rows,contains:element=>[wage,demand,supply].includes(element)};
const svg=base('svg');
const instruction='Consider the following graph. You will not be graded on any changes you make to the calculator. Complete the table for a wage of $12.50.';
const node={...base('DIV',instruction),childNodes:[{nodeType:3,textContent:instruction},answer],querySelectorAll:()=>[wage,demand,supply,answer],querySelector:()=>null};
const root={...base('SECTION',instruction),querySelector:selector=>selector==='.q4-container-root'?node:selector==='.q4-problem-title'?{textContent:'5. Minimum-wage laws and unemployment'}:null,
 querySelectorAll:selector=>selector.includes('table.q4-idmtable')?[table]:selector==='svg'?[svg]:[]};
const reference={source:'Rendered SVG',series:[{label:'Demand',points:[{x:0,y:20},{x:1000,y:0}]},{label:'Supply',points:[{x:0,y:0},{x:1000,y:20}]}],intersections:[{x:500,y:10}]};
const context={clean,visible:element=>!!element,usable:element=>!!element&&!element.disabled&&!element.readOnly,selected:()=>false,
 window:{},StudyConfig:{assignLabels(){}},StudySecurity:{snapshot:()=>({snapshotHash:'calculator-hash'})},
 StudyMedia:{graphics:()=>[svg],drawn:()=>true},StudyMindTapGraph:{inspect:()=>null,readReference:()=>reference},
 StudyMindTapFields:{requiresManualGraph:()=>false,hasAnswer:({value})=>!!value}};
context.window.top=context.window;vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function textOf('),source.indexOf('  const selected=')),context);
const snap=context.snapshot(root);
assert.equal(snap.fields.length,1,'an ungraded calculator input must never be sent or filled as an answer');
assert.equal(snap.fields[0].el,answer);assert.equal(snap.unansweredFields.length,1);
assert.equal(snap.needsPicture,false);assert(snap.referenceData);
assert(snap.text.includes('12.50'));assert(snap.text.includes('375'));assert(snap.text.includes('625'));assert(snap.text.includes('Thousands of workers'));
root.textContent='Use this input to answer the question.';assert.equal(context.calculatorSources(root).length,0,'the ungraded calculator disclosure is required before excluding native inputs');
root.textContent='You will not be graded on any changes you make to this graph.';assert.equal(context.calculatorSources(root).length,1,'the native graph-input-tool wording also identifies its status table as ungraded reference data');
root.textContent=instruction;
(async()=>{
 const messages=[],controls=new Map();Object.assign(context,{settings:{pacingMode:'instant',includePictures:false},pending:null,answer:null,correction:null,running:false,crypto:{randomUUID:()=> 'calc-request'},setTimeout:()=>1,
  editable:()=>true,say:()=>{},ui:{getElementById:id=>{if(!controls.has(id))controls.set(id,{});return controls.get(id);}},chrome:{runtime:{sendMessage:async message=>{messages.push(message);return {received:true};}}}});
 context.StudyConfig.clearPreview=()=>{};context.StudySecurity.redact=value=>value;context.StudyMedia.capture=()=>{throw Error('A complete chart must not require capture.');};
 vm.runInContext(source.slice(source.indexOf('  async function request('),source.indexOf('  const pacer=')),context);
 await context.request(snap);assert.equal(messages.length,1);assert.equal(messages[0].imageToken,undefined);
 assert(messages[0].prompt.includes('375'));assert(messages[0].prompt.includes('625'));assert(messages[0].prompt.includes('"field":"f0"'));assert(!messages[0].prompt.includes('"field":"f1"'));
 console.log('PASS ungraded calculator isolation, current outputs/units and complete graph data through the production request without capture');
})().catch(error=>{console.error(error);process.exitCode=1;});
