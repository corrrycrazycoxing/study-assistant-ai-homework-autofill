const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content-scripts/pearson.js','utf8');
const code=source.slice(source.indexOf('  const sourceLabel='),source.indexOf('  function describedBoxplot('));
async function scenario({label='Walking Speed',changed=false,noClose=false}={}){
 let dialog=null,opened=0,closed=0;
 const values=[['','Departing','Arriving'],['n','275','1144'],['Mean','5.47','4.44'],['Standard deviation','1.179','1.017']];
 const table={visible:true,querySelectorAll:()=>values.map(row=>({querySelectorAll:()=>row.map(text=>({text,querySelector:()=>null}))}))};
 const done={textContent:'Done',click(){closed++;dialog.visible=false;}};
 const button={textContent:' ',getAttribute:name=>name==='aria-label'?label:name==='aria-haspopup'?'dialog':null,querySelectorAll:()=>[],querySelector:()=>null,matches:selector=>selector==='.xlPopupIcon',click(){opened++;dialog={visible:true,innerText:label+' summary values for two independent samples',text:label+' summary values for two independent samples',querySelectorAll:selector=>selector==='table,[role="table"]'?[table]:noClose?[]:[done]};}};
 const root={textContent:'Click the icon to view the findings.',contains:el=>el===button,querySelectorAll:()=>[button]};
 const context={clean:value=>String(value||'').trim(),usable:node=>node?.visible!==false,StudyPearsonLabels:{text:node=>node.text},snapshot:()=>({signature:changed?'new':'current'}),document:{querySelectorAll:selector=>selector.includes('.contentPanel')?[root]:dialog?[dialog]:[]},setTimeout:fn=>{fn();}};
 vm.createContext(context);vm.runInContext(code,context);
 let result,error;try{result=await context.captureLinkedSources({signature:'current'});}catch(e){error=e;}
 return {result,error,opened,closed};
}
(async()=>{
 for(const label of ['Walking Speed','Sample Data']){const read=await scenario({label});assert.equal(read.opened,1);assert.equal(read.closed,1);assert(read.result.includes(label));assert(read.result.includes('n | 275 | 1144'));assert(read.result.includes('Mean | 5.47 | 4.44'));assert(read.result.includes('Standard deviation | 1.179 | 1.017'));}
 const changed=await scenario({changed:true});assert.match(changed.error.message,/question changed/);assert.equal(changed.opened,0,'stale questions never open linked material');
 const stuck=await scenario({noClose:true});assert.match(stuck.error.message,/Could not close/);assert.equal(stuck.result,undefined,'an unclosed source cannot silently proceed to AI');
 console.log('PASS Pearson named source popup opening, structured table capture, close, stale-question and blocked-close guards');
})().catch(error=>{console.error(error);process.exitCode=1;});
