const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8'),clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const values=['Purchase price','Freight','Installation','Testing','Property tax'];let activeCell,listOpen=false,valid=true,writes=[],activations=0;
const cells=[],rows=[],table={rows,visible:true,caption:'Account names and amounts; total is entered in row 3.'};
function cell(row,col,classes,text=''){
 const item={id:`0_table0_cell_c${col}_r${row}`,textContent:text,tagName:'TD',visible:true,isConnected:true,
 classList:{contains:name=>classes.includes(name)},hasAttribute:name=>classes.includes('formula')&&name==='formula',getAttribute:()=>null,
 closest:selector=>selector==='table'?table:null,parentElement:rows[row]};return item;
}
for(let r=0;r<3;r++)rows.push({cells:[],closest:()=>table});
for(let r=0;r<2;r++){rows[r].cells=[cell(r,0,['responseCell','dropDownList']),cell(r,1,['responseCell','isN'])];cells.push(...rows[r].cells);}
rows[2].cells=[cell(2,0,[],'Total cost of machine'),cell(2,1,['responseCell','isN'])];cells.push(rows[2].cells[1]);
const computed=cell(3,1,['td-readOnly','formula'],'0');
const options=()=>values.map(value=>({textContent:value,disabled:false,getAttribute:()=>null,querySelector:()=>({textContent:value}),click(){activeCell.textContent=value;writes.push({kind:'dropdown',value,cell:activeCell.id});listOpen=false;}}));
const button={visible:true,click(){listOpen=!listOpen;}};
const list={get visible(){return listOpen;},querySelectorAll:()=>options()};
const doc={body:{classList:{contains:()=>true}},querySelector:selector=>selector==='#listbox-id'?list:null,querySelectorAll:selector=>selector==='table.jSheet'?[table]:selector==='input.dropdownButton'?[button]:[]};
table.querySelectorAll=()=>[...cells,computed];table.querySelector=selector=>selector==='caption'?{textContent:table.caption}:null;
const frame={contentDocument:doc},S={text:clean,sameAmount:(a,b)=>Number(a)===Number(b)};
const context={S,StudySecurity:{snapshot:()=>({snapshotHash:'mixed'})},window:{top:null},visible:e=>!!e?.visible,enabled:e=>e&&!e.disabled,watchEdits(){},active:()=>null,
 all:(selector,root=doc)=>Array.from(root.querySelectorAll(selector)),$:(selector,root=doc)=>root.querySelector(selector),label:()=>'',guard:()=>{if(!valid)throw Error('Stopped');},current:()=>valid,
 until:async(fn,message)=>{const result=fn();if(!result)throw Error(message);return result;},
 bridge:async(owner,action,id,transaction,value,mode)=>{assert.equal(mode,'worksheet');const target=cells.find(c=>c.id===id);if(action==='activate'){activeCell=target;activations++;}else if(action==='verify')assert.equal(target.textContent,value);return {ok:true};},
 settings:{replaceExisting:false},pacer:{beforeField:async()=>{}},sleep:async()=>{},Date,
 typeNumber:async(snap,id,transaction,value)=>{cells.find(c=>c.id===id).textContent=value;writes.push({kind:'number',value,cell:id});}};
context.window.top=context.window;context.requiredState=()=>null;vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function numericCells('),source.indexOf('  async function readyJournal(')),context);
vm.runInContext(source.slice(source.indexOf('  function validateNative('),source.indexOf('  async function nativeWrite(')),context);
vm.runInContext(source.slice(source.indexOf('  async function fillWorksheet('),source.indexOf('  async function fillJournal(')),context);
(async()=>{
 const snap=await context.worksheetSnapshot(frame,doc,{question:'Determine cost.',key:'q1'},0);
 assert.equal(snap.fields.length,5);assert.equal(snap.fields[0].type,'select');assert.equal(snap.fields[0].options.join(','),values.join(','));
 assert.equal(snap.fields[1].numeric,true);assert.equal(snap.fields[0].allowEmpty,true);assert.equal(snap.fields[4].allowEmpty,false);
 assert.equal(activations,2);assert.equal(writes.length,0,'reading menus cannot enter an answer');assert.equal(listOpen,false);
 assert.equal(snap.context[0].rows[0][0].field,'f0');assert.equal(snap.context[0].rows[0][1].field,'f1');
 const answer={f0:'Purchase price',f1:'23500',f2:'',f3:'',f4:'23500'};
 assert.equal(context.validateNative(snap,answer).length,5);
 assert.throws(()=>context.validateNative(snap,{...answer,f0:'Unknown'}),/did not match/);
 assert.throws(()=>context.validateNative(snap,{...answer,f4:''}),/did not match/,'editable total is required');
 await assert.rejects(context.fillWorksheet(snap,{...answer,f2:'Freight'},0),/both be filled/);assert.equal(writes.length,0);
 await context.fillWorksheet(snap,answer,0);assert.equal(writes.length,3);assert.equal(cells[2].textContent,'');assert.equal(cells[3].textContent,'');
 assert.equal(computed.textContent,'0','formula/read-only totals are never written');assert(!listOpen);
 writes=[];const prepared=await context.worksheetSnapshot(frame,doc,{question:'Determine cost.',key:'q1'},0);
 await assert.rejects(context.fillWorksheet(prepared,{...answer,f1:'9'},0),/Existing worksheet answers differ/);assert.equal(writes.length,0);
 cells[4].textContent='7';await assert.rejects(context.fillWorksheet(prepared,answer,0),/changed while waiting/);assert.equal(writes.length,0);
 cells.forEach(c=>c.textContent='');const stopped=await context.worksheetSnapshot(frame,doc,{question:'Determine cost.',key:'q1'},0);valid=false;
 await assert.rejects(context.fillWorksheet(stopped,answer,0),/worksheet changed/);assert.equal(writes.length,0);
 console.log('PASS mixed worksheet discovery, per-cell choices, optional unused rows, required editable totals, native dropdown/numeric fills, preservation, stale edits and Stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
