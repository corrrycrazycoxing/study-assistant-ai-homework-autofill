const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.hidden=false;this.disabled=false;this.checked=false;this.open=false;this.textContent='';this.controls={};}
 set innerHTML(value){for(const match of value.matchAll(/data-inventory-([a-z-]+)/g))this.controls[match[1]] ||= new Element();}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 querySelector(selector){return this.controls[selector.match(/data-inventory-([a-z-]+)/)?.[1]]||null;}
 querySelectorAll(selector){const result=[];for(const child of this.children){if(selector==='details[data-course-url]'&&child.tagName==='details'&&child.dataset.courseUrl)result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
 addEventListener(){}
}
const origin='https://canvas.csuchico.edu',course={id:'1',url:origin+'/courses/1',title:'Reading course',items:[{title:'Reading quiz',url:origin+'/courses/1/quizzes/3',type:'quiz'},{title:'Week 1 discussion',url:origin+'/courses/1/assignments/4',type:'discussion'}],error:''};
let data={received:true,origin,catalog:{phase:'ready',finishedAt:1,courses:[course]},policies:{},selected:[],defaults:{homework:true,quiz:false}};const messages=[];
const ctx={URL,document:{createElement:tag=>new Element(tag),createTextNode:text=>{const node=new Element('text');node.textContent=text;return node;}},chrome:{runtime:{sendMessage:async message=>{messages.push(message);if(message.type==='canvasCatalogPolicy'){data={...data,policies:{[course.url]:{enabled:message.enabled,types:message.assignmentTypes}},selected:message.enabled?[course.url]:[]};}if(message.type==='canvasCatalogIssueClear'){const bank={...data.issueBank};delete bank[message.url];data={...data,issueBank:bank};}if(message.type==='canvasCatalogScan')data={...data,catalog:{...data.catalog,phase:'scanning',processed:0,total:1}};if(message.type==='canvasCatalogStop')data={...data,catalog:{...data.catalog,phase:'cancelled'}};return data;}}}};
vm.createContext(ctx);for(const file of ['shared/canvas-mcgraw-course.js','shared/course-ui.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const root=new Element(),widget=ctx.StudyCourseUI.inventory(root,()=>({tab:9}));
const inputs=node=>node.children.flatMap(child=>[...(child.tagName==='input'?[child]:[]),...inputs(child)]);
(async()=>{
 await widget.refresh(true);assert.equal(messages[0].type,'canvasCatalogGet');assert.equal(messages[0].refreshIfStale,true);assert.equal(messages[0].tab,9);
 let details=root.controls.courses.children[0];assert.match(details.children[0].textContent,/disabled/);details.open=true;
 const boxes=inputs(details);assert.equal(boxes.length,3,'one course switch plus supported quiz/homework switches; discussions have no run switch');boxes[0].checked=true;boxes[1].checked=true;boxes[2].checked=false;await boxes[0].onchange();
 assert.equal(messages.at(-1).type,'canvasCatalogPolicy');assert.equal(messages.at(-1).assignmentTypes.quiz,true);assert.equal(messages.at(-1).assignmentTypes.homework,false);assert.equal(messages.at(-1).origin,origin);
 details=root.controls.courses.children[0];assert.match(details.children[0].textContent,/enabled/);assert.equal(details.open,true,'course disclosure remains open after saving');
 await root.controls.scan.onclick();assert.equal(messages.at(-1).type,'canvasCatalogScan');assert.equal(root.controls.scan.disabled,true);assert.equal(root.controls.stop.hidden,false);
 await root.controls.stop.onclick();assert.equal(messages.at(-1).type,'canvasCatalogStop');
 const readingUrl='https://example.org/reading',notebookUrl='https://notebook.google.com/notebook/failed';
 data={...data,catalog:null,issueBank:{[course.items[0].url]:{title:course.items[0].title,url:course.items[0].url,readingUrl,notebookUrl,reason:'Import failed',savedAt:1}}};
 await widget.refresh();assert.equal(root.controls.issues.hidden,false,'saved issues remain accessible without an inventory scan');
 assert.deepEqual(root.controls['issue-list'].children[0].children.filter(node=>node.tagName==='a').map(node=>node.href),[course.items[0].url,readingUrl,notebookUrl]);
 const clear=root.controls['issue-list'].children[0].children.find(node=>node.tagName==='button');
 assert.equal(clear.textContent,'Clear issue & allow retry');
 await clear.onclick();
 assert.equal(messages.at(-1).type,'canvasCatalogIssueClear');
 assert.equal(messages.at(-1).url,course.items[0].url);
 assert.equal(messages.at(-1).origin,origin);
 assert.equal(root.controls.issues.hidden,true,'clearing the last issue updates the displayed saved list');
 assert(messages.every(message=>message.type.startsWith('canvasCatalog')),'inventory controls never start a queue or question');
 console.log('PASS Canvas inventory controls, per-course quiz-only switch, excluded discussions, disclosure retention, background start/stop and explicit separation from answering');
})().catch(error=>{console.error(error);process.exitCode=1;});
