const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function el(tag,...children){
 const node={nodeType:1,tagName:tag.toUpperCase(),childNodes:children.map(c=>typeof c==='string'?{nodeType:3,textContent:c}:c),attrs:{},getAttribute(name){return this.attrs[name]||null;}};
 Object.defineProperty(node,'textContent',{get:()=>node.childNodes.map(c=>c.textContent).join('')});
 node.querySelectorAll=selector=>{const tags=selector==='a[href]'?['A']:selector.split(',').map(s=>s.toUpperCase());const found=[];function visit(n){for(const c of n.childNodes||[]){if(tags.includes(c.tagName))found.push(c);visit(c);}}visit(node);return found;};
 node.querySelector=selector=>node.querySelectorAll(selector)[0]||null;return node;
}
const a=(href,...text)=>{const n=el('a',...text);n.attrs.href=href;return n;},p=(...c)=>el('p',...c),br=()=>el('br');
const art='Art in Public: How Murals Bring Communities Together',justice='The Art of Public Debate',imagining='Imagining Otherwise: Connecting the Arts and Local History to Envision and Act for Change';
const ai=['How local communities respond to data centers','Environmental Burden of United States Data Centers in the Artificial Intelligence Era','The data heat island effect: quantifying the impact of AI data centers in a warming world','Communities Are Raising Noise Pollution Concerns About Data Centers | Article | EESI','Environmental Racism and AI Data Centers'];
const root=el('main',p('Office hours',a('https://example.org/meeting','Meeting link')),p('Reading Schedule:'),p('READ:'),p(a('https://example.org/early','Earlier reading')),p('WATCH:'),p(a('https://example.org/film','An assigned film')),
 p('WEEK 12: ART AND ACTIVISM PART 1'),p('Tuesday, November 10:'),p(a('https://example.org/art',el('span','Art in Public:'),' How Murals Bring Communities Together')),p(a('https://example.org/justice',justice)),p('Thursday, November 12:'),p(a('https://example.org/imagining',el('span','Imagin')),a('https://example.org/imagining','ing Otherwise: Connecting the Arts and Local History to Envision and Act for Change')),
 p('LISTEN:'),p(a('https://example.org/audio','A conversation about activism')),p('WEEK 13: ART AND ACTIVISM PART 2'),p('Tuesday, November 17:'),p('READ:'),p('A Reading Without a Source Link'),
 p('WATCH:',br(),a('https://example.org/second-film','Another assigned film'),br(),'READ:',br(),a('https://example.org/after-film','A linked article after the film')),
 p('Thursday, November 5:'),p(...ai.flatMap((title,i)=>[a('https://example.org/ai-'+i,title),br()])),p(a('https://example.org/wrapped',el('span','A long assigned'),br(),'reading title')),p(a('https://youtu.be/lecture','An online course recording')));
const ctx={URL,Date};vm.createContext(ctx);vm.runInContext(fs.readFileSync('shared/readings.js','utf8'),ctx);const R=ctx.StudyReadings,entries=R.catalog(root);
for(const title of [art,justice,imagining,...ai])assert.equal(R.match(title,entries).title,title,'screenshot-style week/date/formatting survives import');
assert.equal(R.match(imagining,entries).url,'https://example.org/imagining','contiguous formatted anchor fragments retain the exact title');
assert.equal(R.match('A linked article after the film',entries).url,'https://example.org/after-film');
assert.equal(R.match('A long assigned reading title',entries).url,'https://example.org/wrapped','a line break inside one hyperlink does not truncate its title');
assert(!entries.some(e=>/\/(?:film|second-film|audio|meeting)$|youtu/.test(e.url)),'WATCH/LISTEN and off-schedule links remain excluded');
assert(!entries.some(e=>e.title==='A Reading Without a Source Link'),'unlinked titles never receive guessed source URLs');
(async()=>{
 const docUrl='https://docs.google.com/document/d/saved/edit',messages=[];
 let saved={docUrl,entries:[{title:'Older reading',url:'https://example.org/old',key:'https://example.org/old'}],enabled:true},current=true;
 ctx.DOMParser=class{parseFromString(){return root;}};
 const chrome={storage:{local:{get:async()=>({canvasReadings:saved})}},runtime:{sendMessage:async m=>{messages.push(m);if(m.type==='readingsFetchCatalog')return {received:true,url:docUrl,html:'exported syllabus'};saved={...saved,entries:m.entries,parserVersion:R.catalogVersion,updatedAt:Date.now()};return {received:true};}}};
 await R.refreshCatalog(chrome);assert.deepEqual(messages.map(m=>m.type),['readingsFetchCatalog','readingsSaveCatalog'],'a nonempty old parser cache is reimported');assert.equal(R.match(art,saved.entries).url,'https://example.org/art');
 messages.length=0;await R.refreshCatalog(chrome);assert.equal(messages.length,0,'subsequent quizzes reuse the fresh parsed list');
 saved.updatedAt=Date.now()-900001;await R.refreshCatalog(chrome);assert.equal(messages.length,2,'a stale list is refreshed');
 messages.length=0;chrome.runtime.sendMessage=async m=>{messages.push(m);current=false;return {received:true,url:docUrl,html:'exported syllabus'};};
 await assert.rejects(R.refreshCatalog(chrome,{force:true,current:()=>current}),/Stopped/);assert.equal(messages.length,1,'Stop prevents a late export from overwriting the catalog');
 console.log('PASS syllabus week/date reset, same-paragraph READ/WATCH and BR lists, fragmented links, media exclusions, no guessed URL, nonempty cache migration, freshness and Stop');
})().catch(error=>{console.error(error);process.exitCode=1;});
