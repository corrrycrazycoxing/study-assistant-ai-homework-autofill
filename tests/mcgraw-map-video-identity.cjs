const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
const start=source.indexOf('  function problemText('),end=source.indexOf('\n  function guard(',start);
assert(start>=0&&end>start);
let question='Synthetic knowledge check',transcript='Reference transcript',player='Video Player is loading. 0:00 10%';
function clone(){
  const nodes=[{kind:'question',text:question},{kind:'transcript',text:transcript},{kind:'player',text:player}];
  for(const node of nodes)node.remove=()=>{node.removed=true;};
  return {nodes,get textContent(){return nodes.filter(node=>!node.removed).map(node=>node.text).join(' ');}};
}
const context={root:()=>({cloneNode:clone}),S:{text:text=>String(text).trim()},
  location:{href:'https://ezto.mheducation.com/#/same-question'},
  $:selector=>({textContent:selector==='#question-info-holder'?'Item 1':'Question 1 of 34'}),
  all:(selector,root)=>root.nodes.filter(node=>node.kind==='player'&&selector.includes('video,.video-js')||node.kind==='transcript'&&selector.includes('.gaspar-desc-transcript')),
};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
const initial=context.key();
assert.match(context.problemText(),/Reference transcript/,'prompt retains the transcript');
assert.doesNotMatch(context.problemText(),/Video Player/,'prompt excludes live player controls');
player='Current Time 0:01 Loaded 80%';transcript='Transcript arriving after player initialization';
assert.equal(context.key(),initial,'asynchronous video controls and transcript loading do not invalidate the question');
question='A genuinely different knowledge check';
assert.notEqual(context.key(),initial,'actual question text changes still invalidate the request');
question='Synthetic knowledge check';context.location.href+='-next';
assert.notEqual(context.key(),initial,'navigation still invalidates the request');
console.log('PASS Connect question identity ignores video loading while preserving prompt references');
