const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/pearson.js','utf8');
let heading='Question 4, 6.5.60',labels=[];
const scope={clean:value=>String(value||'').replace(/\s+/g,' ').trim(),document:{querySelector:()=>({textContent:heading}),querySelectorAll:()=>labels.map(item=>({getAttribute:name=>item[name]||null,textContent:item.text||'',querySelectorAll:()=>item.icon?[{getAttribute:name=>name==='alt'?item.icon:null}]:[]}))}};
vm.createContext(scope);vm.runInContext(source.slice(source.indexOf('  function currentQuestionIsCorrect()'),source.indexOf('  function partContinueButton()')),scope);
for(const label of ['Question 4, Correct','Question 4 Correct']){labels=[{'aria-label':label}];assert.equal(scope.currentQuestionIsCorrect(),true);}
for(const label of ['Question 3, Correct','Question 40, Correct','Question 4, Incorrect','Question 4, Partially correct','Question 4, Not correct','Question 4']){labels=[{'aria-label':label}];assert.equal(scope.currentQuestionIsCorrect(),false,label+' cannot skip an unanswered question');}
labels=[{text:'Question 4',icon:'Correct'}];assert.equal(scope.currentQuestionIsCorrect(),true,'native correct icons are part of the accessible question status');labels=[{text:'Question 4',icon:'Incorrect'}];assert.equal(scope.currentQuestionIsCorrect(),false);
labels=[{text:'Question 4 Correct'}];assert.equal(scope.currentQuestionIsCorrect(),true);heading='';assert.equal(scope.currentQuestionIsCorrect(),false);
const ui=fs.readFileSync('content-scripts/pearson-course.js','utf8');const routes={clean:scope.clean};vm.createContext(routes);vm.runInContext(ui.slice(ui.indexOf('  function questionRoute('),ui.indexOf('  const mediaLinks=')),routes);
const link=attrs=>({textContent:attrs.text||'',getAttribute:name=>attrs[name]||null});
assert.equal(routes.questionRoute(link({'aria-label':'Question 4 Correct',href:'javascript:doExercise(7);'})).id,'7','media exercise IDs differ from displayed question numbers');
assert.equal(routes.questionRoute(link({text:'Correct Question 4',href:'javascript:doExercise(7);'})).number,'4','leading accessible correctness text cannot drop the verified route');
assert.equal(routes.questionRoute(link({text:'Question 4',href:'javascript:doMedia_overview(7);'})),null);
console.log('PASS Pearson exact correct-question navigation and accessible overview route labels');
