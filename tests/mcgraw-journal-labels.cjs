const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
function cell(label,kind){return {tagName:'TD',textContent:'',getAttribute:()=>label,hasAttribute:()=>false,classList:{contains:name=>name==='isN'&&kind!=='account'},matches:selector=>selector==='td.responseCell'||selector==='td.dropDownList.responseCell'&&kind==='account'};}
const account=cell('General Journal blank','account'),debit=cell('Debit blank','debit'),credit=cell('Credit blank','credit');
const transaction={tagName:'TD',matches:()=>false},row={cells:[transaction,account,debit,credit]},table={tBodies:[{rows:[{cells:[{tagName:'TH'}]},row]}]};
let headers=['Transaction','General Journal','Debit','Credit'].map((textContent,cellIndex)=>({textContent,cellIndex,colSpan:1,closest:()=>table}));
const ctx={$:()=>table,visible:()=>true,all:()=>headers,S:{text:v=>String(v??'').trim()}};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function journalRows('),source.indexOf('  function values(')),ctx);
assert.equal(ctx.journalRows({})[0].debit,debit,'readable labels identify native debit/credit cells');
for(const [d,c] of [['Debit 11,200','Credit 77,000'],['__debit__','__credit__'],['__debit__ blank','__credit__ blank'],[' blank input cell',' blank input cell'],['','']]){debit.getAttribute=()=>d;credit.getAttribute=()=>c;assert.equal(ctx.journalRows({})[0].credit,credit);assert.equal(ctx.journalRows({})[0].debit,debit);}
credit.getAttribute=()=> 'Debit blank';assert.throws(()=>ctx.journalRows({}),/unsupported:/,'contradictory credit label is rejected');
credit.getAttribute=()=> 'Credit blank';row.cells=[transaction,account,debit];assert.throws(()=>ctx.journalRows({}),/unsupported:/,'missing credit is rejected');
row.cells=[transaction,account,debit,credit,cell('Credit blank','credit')];assert.throws(()=>ctx.journalRows({}),/unsupported:/,'extra response cell is rejected');
row.cells=[transaction,account,debit,credit];credit.hasAttribute=name=>name==='formula';assert.throws(()=>ctx.journalRows({}),/unsupported:/,'calculated cells cannot become journal answers');credit.hasAttribute=()=>false;
const real=headers;headers=[...real,{...real[2]}];assert.equal(ctx.journalRows({})[0].debit,debit,'repeated heading at the same column remains unambiguous');headers=[...real,{...real[2],cellIndex:1}];assert.throws(()=>ctx.journalRows({}),/ambiguous/,'duplicate debit header rejected');headers=real;
headers[2].colSpan=2;assert.throws(()=>ctx.journalRows({}),/ambiguous/,'merged debit header rejected');headers[2].colSpan=1;
headers=[{textContent:'Debit',closest:()=>({})},...real.filter(h=>h.textContent!=='Debit')];assert.throws(()=>ctx.journalRows({}),/ambiguous/,'nested table header cannot identify an amount column');
console.log('PASS stable journal header columns across filled label changes, legacy labels, and missing/duplicate/extra/formula/ambiguous/nested guards');
