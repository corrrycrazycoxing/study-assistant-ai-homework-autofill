const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('content-scripts/editor-bridge.js','utf8');

async function scenario({load=true,alreadyLoaded=false,choice='smaller',id='FL3'}={}){
  const listeners={};
  let visible='';
  const hit={
    id,parentElement:{},classList:{contains:()=>false},
    matches:s=>s==='.xlFillinItem[aria-haspopup]',
    closest:s=>s==='.contentPanel .contentHolder'?{}:null,
    getClientRects:()=>[{}],getAttribute:()=>null,
    get textContent(){return '▼ '+visible;}
  };
  const option={textContent:' smaller ',querySelector:()=>null,click:()=>{visible='smaller';}};
  const menu={querySelectorAll:()=>load||alreadyLoaded?[option]:[]};
  const widget={
    declaredClass:'xl.player.controls.Fillin',
    isLoaded:()=>alreadyLoaded,
    loadDropDown:callback=>{if(load)queueMicrotask(callback);},
    openDropDown:()=>{}
  };
  const document={
    addEventListener:(name,fn)=>{listeners[name]=fn;},
    dispatchEvent:event=>{listeners[event.type]?.(event);},
    getElementById:target=>target===id?hit:target===id+'_menu'?menu:null
  };
  const context={StudyPearsonLabels:{text:e=>String(e.textContent).replace(/^▼\s*/,'').trim()},document,window:{dijit:{byNode:()=>widget}},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},setTimeout,clearTimeout,queueMicrotask};
  vm.runInNewContext(source,context);
  const result=new Promise(resolve=>{listeners['mylab-assistant-editor-result']=event=>resolve(JSON.parse(event.detail));});
  document.dispatchEvent(new context.CustomEvent('mylab-assistant-editor-request',{detail:JSON.stringify({token:'test',action:'dropdown',fields:[{id,value:choice}]})}));
  return {response:await result,visible};
}

(async()=>{
  const success=await scenario();
  assert.equal(success.response.ok,true);
  assert.equal(success.visible,'smaller');
  const repeated=await scenario({alreadyLoaded:true,load:false});
  assert.equal(repeated.response.ok,true);
  assert.equal(repeated.visible,'smaller');
  const alternateId=await scenario({id:'INE01'});assert.equal(alternateId.response.ok,true,'the observed INE01 Fillin widget is supported');
  const invalid=await scenario({id:'bad.selector'});assert.equal(invalid.response.ok,false);assert.match(invalid.response.error,/Invalid/);
  const unknown=await scenario({choice:'missing'});
  assert.equal(unknown.response.ok,false);
  assert.match(unknown.response.error,/matching dropdown choice/);
  console.log('PASS Pearson dropdown bridge');
})().catch(error=>{console.error(error);process.exitCode=1;});
