'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
for(const entry of manifest.content_scripts.filter(e=>e.world!=='MAIN')){
 assert.equal(entry.js[0],'shared/build.js','every isolated-world context gets the same build identity');
 if(entry.js.includes('shared/monitor.js')){assert(entry.js.indexOf('shared/assignment-ui.js')<entry.js.indexOf('shared/monitor.js'));assert(entry.js.indexOf('shared/review.js')<entry.js.indexOf('shared/monitor.js'));}
}
for(const file of ['content-scripts/mheducation.js','content-scripts/ezto-mheducation.js']){
 const code=fs.readFileSync(file,'utf8');assert.match(code,/StudyMonitor\?\.register\(/);assert.doesNotMatch(code,/automcgraw|confirm\(/,'legacy commands must not depend on hidden buttons or native Start confirms');
}
const config=fs.readFileSync('shared/config.js','utf8');for(const key of ['autoFill','gradeBeforeAdvance','checkMapWork'])assert(!config.includes(key),'unused setting removed: '+key);
console.log('PASS shared UI/build loading order, direct legacy command registration and unused-setting retirement');
