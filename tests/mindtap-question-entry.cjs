const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/mindtap.js','utf8');
const code=source.slice(source.indexOf('  function openAssignmentItem('),source.indexOf('  async function startAssignmentRun('));
const id='Q4PLC0A801010000009ab8a000040000',target='/af/servlet/quiz?quiz_action=takeQuiz&quiz_probGuid='+id+'&ctx=course-a&ck=native-token';
let links=[],navigations=[],warnings=[],watched=[];
const link=(href,hidden=false)=>({getAttribute:name=>name==='href'?`javascript:onClickProblemSetItem('${href}')`:null,hidden,click:()=>{throw Error('Isolated-world javascript link clicks must not be used');}});
const context={URL,URLSearchParams,document:{querySelectorAll:()=>links},location:{origin:'https://aplia.apps.ng.cengage.com',search:'?quiz_action=showContents&ctx=course-a',assign:url=>navigations.push(url)},assignmentOverview:()=>true,visible:element=>!element.hidden,say:text=>warnings.push(text),watchAssignmentItem:item=>watched.push(item)};
vm.createContext(context);vm.runInContext(code,context);
const item={id,title:'Financial institutions'};
links=[link(target,true),link(target.replace('ctx=course-a','ctx=course-b')),link('https://example.com'+target),link(target)];
assert.equal(context.openAssignmentItem(item),true);assert.equal(navigations.length,1);assert.equal(navigations[0],context.location.origin+target);assert.equal(watched.length,1);
for(const invalid of [target.replace('ctx=course-a','ctx=course-b'),'https://example.com'+target,target.replace('takeQuiz','submitQuiz'),target.replace(id,'QDIFFERENT123')]){links=[link(invalid)];assert.equal(context.openAssignmentItem(item),false);}
assert.equal(navigations.length,1,'invalid or unrelated links never navigate');
const courseUi=fs.readFileSync('content-scripts/mindtap-course.js','utf8');assert(!courseUi.includes('window.confirm(`Include '),'explicit started-work checkbox does not prompt again');
console.log('PASS MindTap native question URL entry, isolated-world link avoidance, exact context and no repeated started-work confirmation');
