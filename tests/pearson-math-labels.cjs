const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Pearson's observed option has eqAccessibleLabel “p.” and a separate hidden
// eqDocument rendering “p.”. Both live under INE01-3, not a native select.
class Option{
  constructor(accessible,visual,prefix=''){this.accessible=accessible;this.visual=visual;this.prefix=prefix;}
  matches(){return false;}
  cloneNode(){
    const value={accessible:this.accessible,visual:this.visual,prefix:this.prefix,mathReplaced:false,removed:false};
    return {
      querySelectorAll(selector){
        if(selector==='.eqLabel[aria-label]')return value.accessible===null?[]:[{getAttribute:()=>value.accessible,replaceWith:node=>{value.mathReplaced=true;value.accessible=node.textContent;}}];
        return [{remove:()=>{value.removed=true;}}];
      },
      get textContent(){return (value.removed?'':value.prefix)+(value.accessible||'')+(value.mathReplaced||value.removed?'':value.visual);}
    };
  }
}
const scope={document:{createTextNode:text=>({textContent:text})}};
vm.runInNewContext(fs.readFileSync('shared/pearson-labels.js','utf8'),scope);
const text=scope.StudyPearsonLabels.text;
assert.equal(text(new Option('p.','p.')),'p.');
assert.equal(text(new Option('sigma squared .','σ2.')),'sigma squared .');
assert.equal(text(new Option('p.','p.','▼')),'p.','selected display and option use the same single math label');
assert.equal(text({matches:()=>true,getAttribute:()=> ' mu . '}),'mu .');
assert.equal(text(null),'');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
for(const name of ['content-scripts/editor-bridge.js','content-scripts/pearson.js']){
  const script=manifest.content_scripts.find(s=>s.js?.includes(name));assert(script.js.indexOf('shared/pearson-labels.js')<script.js.indexOf(name),'both worlds load the same label reader first');
}
console.log('PASS Pearson accessible math options are read once and shared with dropdown verification');
