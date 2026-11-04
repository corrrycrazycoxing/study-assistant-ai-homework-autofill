(() => {
  'use strict';
  const eligible=s=>s.fields.length&&!s.hasDiagram&&!s.unsupported&&!s.incomplete;
  function combine(members){
    if(!members.length)return null;
    if(members.length===1)return members[0];
    const fields=members.flatMap((snap,index)=>snap.fields.map(field=>({...field,key:'q'+(index+1)+'_'+field.key,label:'Question '+(index+1)+' · '+(field.displayLabel||field.label||field.kind),displayLabel:'Question '+(index+1)+' · '+(field.displayLabel||field.label||field.kind)})));
    const text=members.map((snap,index)=>'Question '+(index+1)+' [fields '+fields.filter(f=>f.key.startsWith('q'+(index+1)+'_')).map(f=>f.key).join(', ')+']:\n'+snap.text).join('\n\n');
    const signature=JSON.stringify(members.map(s=>[s.key,s.signature]));
    return {root:members[0].root,members,classic:members.every(s=>s.classic),text,fields,signature,key:StudySecurity.hash(signature),hasDiagram:false,unsupported:false,incomplete:false,securitySnapshot:StudySecurity.snapshot({text,fields,signature,frame:window.top===window?'top':'frame'})};
  }
  function select(snapshots, fits){
    if(!snapshots.length)return null;
    if(!eligible(snapshots[0]))return snapshots[0];
    const members=[];let length=0,fieldCount=0;
    for(const snap of snapshots){
      if(!eligible(snap))break;
      const size=snap.text.length+JSON.stringify(snap.fields.map(f=>({options:f.options,label:f.label}))).length;
      // Leave room for the envelope and timing instructions in the 40k request.
      if(members.length&&(length+size>24000||fieldCount+snap.fields.length>80||fits&&!fits(combine([...members,snap]))))break;
      members.push(snap);length+=size;fieldCount+=snap.fields.length;
    }
    return combine(members);
  }
  function refresh(pending,read){return pending.members?combine(pending.members.map(s=>read(s.root))):read(pending.root);}
  const keys=snap=>(snap.members||[snap]).map(s=>s.key);
  const contains=(snap,target)=>(snap?.members||[snap]).some(s=>s?.root.contains(target));
  function normalizeExplanation(data,fields){
    const explanation=data.explanation;
    if(!explanation||typeof explanation!=='object'||Array.isArray(explanation))return;
    const entries=Object.entries(explanation),keys=new Set(fields.map(field=>field.key));
    if(!entries.length||!entries.every(([key,value])=>keys.has(key)&&typeof value==='string'))return;
    const combined=entries.map(([key,value])=>key+': '+value).join('\n');
    if(combined.length<=4000)data.explanation=combined;
  }
  globalThis.StudyCanvasBatch={combine,select,refresh,keys,contains,normalizeExplanation};
})();
