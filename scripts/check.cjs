const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name.startsWith('.')?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(root).filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
for(const file of walk(path.join(root,'tests')).filter(f=>f.endsWith('.cjs')))execFileSync(process.execPath,[file],{cwd:root,stdio:'inherit'});
const version=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).version;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const [name,fragment] of [
 ['README.md',`# Study Assistant — AI Homework Autofill (${version})`],
 ['README.md',`/releases/download/v${version}/study-assistant-${version}.zip`],
 ['README.md',`Study-Assistant-${version}`],
 ['README.md',`**${version}:**`],
 ['CHANGELOG.md',`## ${version}`],
 ['RELEASE-NOTES.md',`Study Assistant ${version}`]
])if(!read(name).includes(fragment))throw Error(`${name} is missing current release text: ${fragment}`);
execFileSync('python3',[path.join(root,'tests','update-unpacked.py')],{cwd:root,stdio:'inherit'});
console.log('PASS syntax and repository regression tests');
