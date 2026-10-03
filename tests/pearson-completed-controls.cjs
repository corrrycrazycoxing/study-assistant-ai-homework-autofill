const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const start=source.indexOf('  const usable =');
const end=source.indexOf('  const numeric =',start);
assert(start>=0&&end>start,'Pearson answer-control helper is present');
const active=vm.runInNewContext(source.slice(start,end)+'\nactiveAnswerControl');
const visible={disabled:false,readOnly:false,closest:()=>null,getClientRects:()=>[{}]};
const control=(kind,children={})=>({
  ...visible,
  matches:selector=>selector===kind,
  querySelector:selector=>children[selector]||null,
  querySelectorAll:selector=>children[selector]||[],
  classList:{contains:()=>false}
});
const dropdownHit=(answered=false)=>({...visible,classList:{contains:name=>name==='answered'&&answered}});
const dropdown=hit=>control('.xlFillin',{'.xlFillinItem[aria-haspopup]':hit});
const editor=input=>control('.eqEditor',{'input':input});
const choice=inputs=>control('.xlMultipleChoice',{'input[type=radio],input[type=checkbox]':inputs});

assert.equal(active(dropdown(dropdownHit(true))),false,'graded Pearson dropdown is ignored');
assert.equal(active(dropdown(dropdownHit())),true,'unanswered Pearson dropdown is captured');
assert.equal(active(editor({...visible,disabled:true})),false,'graded numeric editor is ignored');
assert.equal(active(editor(visible)),true,'editable numeric editor is captured');
assert.equal(active(choice([{...visible,disabled:true}])),false,'graded choice is ignored');
assert.equal(active(choice([visible,visible])),true,'editable choice is captured');
console.log('PASS Pearson completed controls');
