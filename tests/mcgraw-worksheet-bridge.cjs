const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let handler,response,mode=true,formula=false,readOnly=false,native='Freight',activations=0,commits=0;
const td={textContent:'Freight',classList:{contains:name=>name==='dropDownList'||name==='td-readOnly'&&readOnly},matches:selector=>selector==='td.responseCell',closest:()=>({}),getClientRects:()=>[{}],hasAttribute:()=>formula};
const js={i:0,cellLast:{},cellEdit(value){this.cellLast.td=value;activations++;},obj:{sheet:()=>[{contains:()=>true}]},getTdLocation:()=>[0,0],tableCellProviders:[{getCell:()=>({value:native})}],evt:{cellEditDone(){commits++;}}};
const jq=e=>[e];jq.sheet={instance:[js]};
const document={body:{classList:{contains:()=>mode}},getElementById:()=>td,querySelector:()=>null,addEventListener:(name,listener)=>handler=listener,dispatchEvent:event=>response=JSON.parse(event.detail)};
const context={document,window:{jQuery:jq},CustomEvent:class{constructor(type,values){Object.assign(this,values);}},Event:class{}};vm.createContext(context);vm.runInContext(fs.readFileSync('content-scripts/mcgraw-accounting-bridge.js','utf8'),context);
function send(action,value){handler({detail:JSON.stringify({id:'bridge-test',mode:'worksheet',cell:'0_table0_cell_c0_r0',transaction:null,action,value})});return response;}
assert.equal(send('activate').ok,true,'mixed worksheet dropdown uses the same verified native editor activation');assert.equal(activations,1);
assert.equal(send('verify','Freight').ok,true);native='Installation';assert.match(send('verify','Freight').error,/did not retain/,'display text alone is not saved answer evidence');native='Freight';
assert.match(send('number','42').error,/Invalid numeric/,'numeric actions cannot write a dropdown');assert.equal(commits,0);
formula=true;assert.match(send('activate').error,/not an editable/);formula=false;
readOnly=true;assert.match(send('activate').error,/unavailable/);readOnly=false;
mode=false;assert.match(send('activate').error,/not in editable/);
console.log('PASS mixed worksheet bridge activation, exact saved dropdown value verification, no numeric-to-dropdown writes and formula/read-only/review guards');
