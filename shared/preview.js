/* Presentation only: display received answers as text, never execute AI content. */
(() => {
  const text=value=>typeof value==='string'?value:typeof value==='number'||typeof value==='boolean'?String(value):'';
  function plain(value){return text(value).replace(/^\s*#{1,6}\s+/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').trim();}
  function label(key,index){return /^f\d+$/.test(key)?'Part '+(Number(key.slice(1))+1):key==='legacy'?'Answer':plain(key.replace(/_/g,' '))||'Answer '+(index+1);}
  function describe(value,depth=0){
    if(value==null)return '';
    if(Array.isArray(value))return value.slice(0,100).map(v=>describe(v,depth+1)).filter(Boolean).join('; ');
    if(typeof value==='object')return depth>3?'See detailed response':Object.entries(value).slice(0,100).map(([k,v],i)=>label(k,i)+': '+describe(v,depth+1)).join('\n');
    return plain(value);
  }
  function amount(value){const s=text(value);if(!/^\d+(?:\.\d+)?$/.test(s))return s;const parts=s.split('.');parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return parts.join('.');}
  const isGraphSeries=value=>Array.isArray(value)&&value.length>0&&value.every(item=>item&&typeof item.label==='string'&&Array.isArray(item.points));
  function graphPoints(value){return value.slice(0,20).map(series=>({label:plain(series.label),color:/^#[0-9a-f]{6}$/i.test(series.color||'')?series.color:'#8a96b2',yAxisLabel:plain(series.yAxisLabel),unitSuffix:series.unitSuffix==='%'?'%':'',points:series.points.slice(0,100).filter(point=>point&&Number.isFinite(Number(point.x))&&Number.isFinite(Number(point.y))).map(point=>({x:Number(point.x),y:Number(point.y)}))}));}
  function decode(raw){try{return JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,''));}catch{return null;}}
  function sourceText(value){
    if(typeof value!=='string')return describe(value);
    const data=decode(value);return data&&typeof data==='object'?[describe(data.answer??data),plain(data.explanation)].filter(Boolean).join('\n\n'):plain(value);
  }
  function parse(raw){
    raw=String(raw||'').trim();if(!raw)return {kind:'empty',text:'Ask AI to show an answer here.'};
    const data=decode(raw);
    if(!data||typeof data!=='object'){
      if(/^(?:```|[\[{])/.test(raw))return {kind:'empty',text:'This response needs review. Turn on Nerd mode to inspect it.'};
      const parts=raw.split(/\n\nNotebookLM source answer:\s*\n/);
      return {kind:'text',text:plain(parts[0]),sources:parts[1]?sourceText(parts.slice(1).join('\n\n')):''};
    }
    const answer=Object.hasOwn(data,'answer')?data.answer:data;
    const explanation=globalThis.StudyConfig?.plainExplanation?StudyConfig.plainExplanation(data.explanation):plain(data.explanation),sources=data.sourceAnswer?sourceText(data.sourceAnswer):'';
    const grid=globalThis.StudyConfig?.answerGrid?.(data);if(grid)return {kind:'table',...grid,explanation,sources};
    if(answer&&typeof answer==='object'&&Array.isArray(answer.journal)){
      const rows=answer.journal.slice(0,100).filter(row=>row&&typeof row==='object').map(row=>({account:plain(row.account),debit:amount(row.debit),credit:amount(row.credit)}));
      return {kind:'journal',rows,explanation,sources};
    }
    if(answer&&typeof answer==='object'&&!Array.isArray(answer)){
      const items=Object.entries(answer).filter(([k])=>!['requestId','explanation','sourceAnswer','suggestedReviewSeconds','manualReviewRequired','graphFallback'].includes(k)).slice(0,100).map(([k,v],i)=>({label:globalThis.StudyConfig?.answerLabel?StudyConfig.answerLabel({displayLabel:typeof data.fieldLabels?.[k]==='string'?plain(data.fieldLabels[k]):'',label:/^f\d+$/.test(k)?'':plain(k)},i):label(k,i),...(isGraphSeries(v)?{graphSeries:graphPoints(v),values:[]}:{values:(Array.isArray(v)?v:[v]).map(value=>describe(value)).filter(Boolean)})}));
      const graphFallback=data.graphFallback&&typeof data.graphFallback==='object'?{message:plain(data.graphFallback.message)}:null;
      return {kind:'answers',items,explanation,sources,graphFallback};
    }
    return {kind:'answers',items:[{label:'Answer',values:(Array.isArray(answer)?answer:[answer]).map(value=>describe(value)).filter(Boolean)}],explanation,sources};
  }
  globalThis.StudyPreview={parse};
})();
