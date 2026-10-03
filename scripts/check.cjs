const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name.startsWith('.')?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(root).filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
for(const file of walk(path.join(root,'tests')).filter(f=>f.endsWith('.cjs')))execFileSync(process.execPath,[file],{cwd:root,stdio:'inherit'});
execFileSync('python3',[path.join(root,'tests','update-unpacked.py')],{cwd:root,stdio:'inherit'});
console.log('PASS syntax and repository regression tests');
