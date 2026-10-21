const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const helpers=source.slice(source.indexOf('  const sourceLabel='),source.indexOf('  async function captureLinkedSources('));
const scope={clean:value=>String(value||'').trim(),usable:node=>node.visible!==false,StudyPearsonLabels:{text:node=>node.text}};
vm.createContext(scope);vm.runInContext(helpers,scope);
const values=['0.266','0.258','0.352','0.211','0.189','0.225','0.315','0.275','0.317','0.255','0.218','0.261','0.267','0.305','0.286','0.322','0.244','0.247'];
const table=(data,visible=true)=>({visible,querySelectorAll:()=>data.map(text=>({text,querySelector:()=>null}))});
const roots=(data,visible=true)=>[{querySelectorAll:selector=>selector==='table,[role="table"],[role="grid"]'?[table(data,visible)]:[]}];
const text='A random sample of 18 photographic bubble images. These data are reproduced in the accompanying table.';
assert.equal(scope.missingRequiredSource(roots(values),text),false,'all 18 inline values satisfy the accompanying-table reference');
assert.equal(scope.missingRequiredSource(roots(values.slice(0,17)),text),true,'an incomplete sample remains missing');
assert.equal(scope.missingRequiredSource(roots(values,false),text),true,'a hidden table does not satisfy a visible source reference');
assert.equal(scope.missingRequiredSource(roots([]),text),true,'a reference with no data still blocks');
assert.equal(scope.missingRequiredSource(roots(values),'Refer to the analysis printout.'),true,'an unrelated table cannot replace a required analysis printout');
assert.equal(scope.missingRequiredSource(roots(values),'Use the course packet and accompanying table.'),true);
assert.equal(scope.missingRequiredSource(roots(values),'Choose the null and alternative hypotheses.'),false);
const linked={textContent:'View data table',getAttribute:()=>null};
assert.equal(scope.missingRequiredSource([{querySelectorAll:selector=>selector.startsWith('a,button')?[linked]:[]}],text),false,'a usable linked-source opener is still supported');

// Numeric equation labels may be provided only through aria-label. Preserve
// those labels before stripping their duplicate visual .eqDocument rendering.
const textCode=source.slice(source.indexOf('    function textOf(root)'),source.indexOf('    const text=roots.map(textOf)'));
const nodes=values.map(value=>({value:'',getAttribute:()=>value,replaceWith(node){this.value=node.value;}}));
let visualsRemoved=0;
const copy={querySelectorAll:selector=>selector==='.eqLabel[aria-label]'?nodes:[{remove:()=>visualsRemoved++}],get textContent(){return nodes.map(node=>node.value).join(' ');}};
const reader={fields:[],clean:value=>value.trim(),document:{createTextNode:value=>({value})}};vm.createContext(reader);vm.runInContext(textCode,reader);
const captured=reader.textOf({cloneNode:()=>copy});assert.equal(captured.split(' ').length,18);for(const value of values)assert(captured.includes(value));assert.equal(visualsRemoved,1);
console.log('PASS Pearson inline sample tables, genuinely missing source guards and accessible math data capture');
