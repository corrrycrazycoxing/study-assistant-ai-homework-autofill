const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Exercise the production callback with MAP's actual id-based field inventory.
const source=fs.readFileSync('content-scripts/mcgraw-map.js','utf8');
const start=source.indexOf("    if(!['mcgrawMapAnswer','mcgrawMapError'].includes(m.type))return;");
const end=source.indexOf('\n  });\n  async function mark',start);
assert(start>=0&&end>start);
function receive(answer,{type='native',hash='snapshot-1',imageToken,manualReviewRequired}={}){
  const stopped=[],statuses=[],previews=[],replies=[];
  const fields=[{id:'f0',type:'single_choice',label:'Multiple Choice',options:['Option A','Option B']}];
  const context={location:{pathname:'/ext/map/index.html',origin:'https://ezto.mheducation.com'},
    request:{id:'req-1',token:0,type,fields,securitySnapshot:{snapshotHash:'snapshot-1'},pictureUnavailable:true,imageToken},
    result:null,run:false,answerRevision:0,answerFilled:false,settings:{showExplanation:true},
    guard(){},stop:text=>stopped.push(text),status:text=>statuses.push(text),preview:value=>previews.push(value),controls(){},
    StudyConfig:{answerLabel:field=>field.label},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('shared/security.js','utf8'),context);
  vm.runInContext('globalThis.receive=function(m,sender,reply){'+source.slice(start,end)+'\n}',context);
  context.receive({type:'mcgrawMapAnswer',id:'req-1',response:JSON.stringify({requestId:'req-1',snapshotHash:hash,answer,explanation:'The referenced video example is needed.',...(manualReviewRequired!==undefined?{manualReviewRequired}:{})})},null,reply=>replies.push(reply));
  return {context,stopped,statuses,previews,replies};
}
for(const type of ['native','worksheet']){
  const valid=receive({f0:'Option B'},{type});
  assert.equal(valid.stopped.length,0,'valid MAP field IDs are accepted');
  assert.equal(valid.context.result.data.answer.f0,'Option B');
  assert.equal(valid.replies[0].received,true);
}
const wrong=receive({unexpected:'Option B'});
assert.match(wrong.stopped[0],/fields do not match/);
assert.equal(wrong.context.result,null);
assert.match(receive({f0:'Option B'},{hash:'other-question'}).stopped[0],/stale/);
assert.match(receive({f0:'Option B'},{imageToken:'picture'}).stopped[0],/manual review/);
assert.match(receive({f0:null}).stopped[0],/needs information/);
assert.match(receive({}).stopped[0],/Missing context/);
assert.equal(receive({f0:null}).context.result,null,'missing context never prepares an answer');
console.log('PASS production Connect MAP response mapping, stale/unknown rejection, and missing context');
