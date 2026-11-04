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

const samplePopup={textContent:'  ',title:'',getAttribute:name=>name==='aria-label'?'Sample Data':name==='aria-haspopup'?'dialog':null,querySelectorAll:()=>[]};
assert.equal(scope.sourceTitle(samplePopup),'Sample Data','whitespace visual content does not hide the accessible source label');
assert.equal(scope.sourceTriggers([{querySelectorAll:()=>[samplePopup]}]).length,1,'Sample Data popup with aria-haspopup=dialog is captured');
const iconPopup={...samplePopup,getAttribute:name=>name==='aria-haspopup'?'menu':null,querySelectorAll:()=>[{getAttribute:()=>'Sample Data'}]};
assert.equal(scope.sourceTriggers([{querySelectorAll:()=>[iconPopup]}]).length,1,'icon-only source uses its image alternative');
const ancestor={...samplePopup,contains:node=>node===samplePopup};
assert.equal(scope.sourceTriggers([{querySelectorAll:()=>[ancestor,samplePopup]}]).length,1,'nested popup wrappers do not open the same source twice');
const ordinary={...samplePopup,getAttribute:name=>name==='aria-label'?'Select answer':name==='aria-haspopup'?'listbox':null};
assert.equal(scope.sourceTriggers([{querySelectorAll:()=>[ordinary]}]).length,0,'answer dropdowns are never source openers');

const walking={...samplePopup,getAttribute:name=>name==='aria-label'?'Walking Speed':name==='aria-haspopup'?'dialog':null,querySelector:()=>({})};
const sourceRoot={textContent:'Click the icon to view the findings.',contains:()=>true,querySelectorAll:()=>[walking]};
assert.equal(scope.sourceTriggers([sourceRoot]).length,1,'custom-named linked findings icon is captured');
assert.equal(scope.sourceTriggers([{...sourceRoot,querySelectorAll:()=>[{...walking,querySelector:()=>null,matches:selector=>selector==='.xlPopupIcon'}]}]).length,1,'native CSS-generated Pearson popup icons need no child image');
assert.equal(scope.sourceTriggers([{...sourceRoot,textContent:'Choose an answer.'}]).length,0,'unreferenced arbitrary popup is not clicked');
assert.equal(scope.sourceTriggers([{...sourceRoot,querySelectorAll:()=>[{...walking,closest:()=>({})}]}]).length,0,'nested answer icons never become linked sources');
const dataRows=[['Community College Transfer','No Transfer'],['n','275','1144'],['Sample mean time in years','5.47','4.44'],['Sample standard deviation','1.179','1.017']];
const sourceTable={querySelectorAll:()=>dataRows.map(row=>({querySelectorAll:()=>row.map(text=>({text,querySelector:()=>null}))}))};
const sourceBody=scope.sourceDialogText({text:'Sample Data',querySelectorAll:()=>[sourceTable]});
assert(sourceBody.includes('n | 275 | 1144'));assert(sourceBody.includes('Sample mean time in years | 5.47 | 4.44'));assert(sourceBody.includes('1.179 | 1.017'),'linked table cells retain column boundaries and accessible numeric values');

const garage='Part 1 Consider again the Garage example and fill in the blanks. We can be 95% confident that Garage I will charge between $ [f0] to $ [f1] more than Garage II.';
assert.equal(scope.missingRequiredSource(roots([]),garage),true,'a previous lesson example with only a confidence percentage needs its source');
assert.equal(scope.missingRequiredSource(roots(['10','12','15','18']),garage),false,'available example data is not blocked');
assert.equal(scope.missingRequiredSource(roots([]),garage+' The confidence interval is (15.2, 37.8).'),false,'explicit bounds already in the question can be used');
assert.equal(scope.missingRequiredSource(roots([]),'Consider again the Garage example. Choose what a confidence interval means.'),false,'conceptual questions without missing numeric fields are not blocked');

// Numeric equation labels may be provided only through aria-label. Preserve
// those labels before stripping their duplicate visual .eqDocument rendering.
const textCode=source.slice(source.indexOf('    function textOf(root)'),source.indexOf('    const text=roots.map(textOf)'));
const nodes=values.map(value=>({value:'',getAttribute:()=>value,replaceWith(node){this.value=node.value;}}));
let visualsRemoved=0;
const copy={querySelectorAll:selector=>selector==='.eqLabel[aria-label]'?nodes:[{remove:()=>visualsRemoved++}],get textContent(){return nodes.map(node=>node.value).join(' ');}};
const reader={retainBoxplotDescriptions:()=>{},fields:[],clean:value=>value.trim(),document:{createTextNode:value=>({value})}};vm.createContext(reader);vm.runInContext(textCode,reader);
const captured=reader.textOf({cloneNode:()=>copy});assert.equal(captured.split(' ').length,18);for(const value of values)assert(captured.includes(value));assert.equal(visualsRemoved,1);
console.log('PASS Pearson inline sample tables, genuinely missing source guards and accessible math data capture');
