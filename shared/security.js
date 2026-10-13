/* Shared trust boundary for question snapshots and declarative AI answers. */
(() => {
  'use strict';
  const clean=value=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();
  // Use the opaque request token to correlate NotebookLM's rendered prompt and
  // reply. The UI normalizes punctuation and whitespace, so whole-prompt text
  // equality is too brittle and can leave a completed request appearing active.
  function notebookRequestSeen(text,requestId){return typeof text==='string'&&typeof requestId==='string'&&requestId.length>0&&text.includes(requestId);}
  const redact=value=>clean(value).replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]').replace(/(?<!\w)\+?\d{1,3}[ .-]?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?!\w)/g,'[phone]').replace(/\b(?:\d[ -]?){13,19}\b/g,'[number]');
  function canonical(value){
    if(Array.isArray(value))return value.map(canonical);
    if(value&&typeof value==='object')return Object.keys(value).sort().reduce((o,key)=>{o[key]=canonical(value[key]);return o;},{});
    return typeof value==='string'?redact(value):value;
  }
  function hash(value){let h=2166136261;const text=JSON.stringify(canonical(value));for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
  function parse(text){
    if(typeof text!=='string'||text.length>256000)throw Error('AI response is too large. Review manually.');
    let i=0;
    const ws=()=>{while(/\s/.test(text[i]||''))i++;};
    const string=()=>{const start=i;if(text[i++]!=='"')throw Error('AI response JSON is malformed.');let escaped=false;while(i<text.length){const c=text[i++];if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c==='"')return JSON.parse(text.slice(start,i));}throw Error('AI response JSON is malformed.');};
    const value=()=>{ws();const c=text[i];if(c==='"'){string();return;}if(c==='{'){i++;ws();const keys=new Set();if(text[i]==='}'){i++;return;}while(i<text.length){ws();const key=string();if(keys.has(key))throw Error('AI response contained a duplicate field. Review manually.');keys.add(key);ws();if(text[i++]!==':')throw Error('AI response JSON is malformed.');value();ws();if(text[i]==='}'){i++;return;}if(text[i++]!==',')throw Error('AI response JSON is malformed.');}throw Error('AI response JSON is malformed.');}if(c==='['){i++;ws();if(text[i]===']'){i++;return;}while(i<text.length){value();ws();if(text[i]===']'){i++;return;}if(text[i++]!==',')throw Error('AI response JSON is malformed.');}throw Error('AI response JSON is malformed.');}const match=text.slice(i).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);if(!match)throw Error('AI response JSON is malformed.');i+=match[0].length;};
    value();ws();if(i!==text.length)throw Error('AI response JSON is malformed.');return JSON.parse(text);
  }
  function snapshot({text='',fields=[],signature='',revision='',frame='top'}={}){
    const inventory=fields.map((field,index)=>({key:String(field.key||'f'+index),type:String(field.kind||field.type||'text'),options:Array.isArray(field.options)?field.options.map(redact):[],label:redact(field.label||'')}));
    const normalized={tab:location.pathname,frame,origin:location.origin,questionHash:hash(redact(text)),fieldInventory:inventory,revisionToken:hash(revision||[redact(text),inventory])};
    return Object.freeze({...normalized,snapshotHash:hash(normalized)});
  }
  function promptData(snapshot){return {snapshotHash:snapshot.snapshotHash,questionHash:snapshot.questionHash,revisionToken:snapshot.revisionToken,fields:snapshot.fieldInventory};}
  function hasSourceCitation(text,markerPresent=false){return Boolean(markerPresent)||/\[\s*\d+(?:\s*[,;–-]\s*\d+)*\s*\]/.test(String(text||''));}
  function validateEnvelope(raw,{requestId,snapshot,fields}={}){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('AI response is not an object. Review manually.');
    const allowed=new Set(['requestId','snapshotHash','answer','explanation','studyTiming','suggestedReviewSeconds','manualReviewRequired']);
    if(Object.keys(raw).some(key=>!allowed.has(key)))throw Error('AI response contained an unsupported field. Review manually.');
    if(raw.requestId!==requestId||raw.snapshotHash!==snapshot.snapshotHash)throw Error('AI response is stale or belongs to a different question. Ask again.');
    if(!raw.answer||typeof raw.answer!=='object'||Array.isArray(raw.answer))throw Error('AI response has no answer object. Review manually.');
    const expected=fields.map(field=>field.key),actual=Object.keys(raw.answer);
    if(actual.length!==expected.length||actual.some(key=>!expected.includes(key)))throw Error('AI response fields do not match the current question. Review manually.');
    if(raw.explanation!==undefined&& (typeof raw.explanation!=='string'||raw.explanation.length>4000))throw Error('AI explanation is invalid. Review manually.');
    if(raw.manualReviewRequired!==undefined&&typeof raw.manualReviewRequired!=='boolean')throw Error('AI review flag is invalid.');
    if(raw.suggestedReviewSeconds!==undefined&&(!Number.isFinite(raw.suggestedReviewSeconds)||raw.suggestedReviewSeconds<=0))throw Error('AI timing estimate is invalid.');
    if(raw.studyTiming!==undefined){if(!raw.studyTiming||typeof raw.studyTiming!=='object'||Array.isArray(raw.studyTiming))throw Error('AI timing estimate is invalid.');const allowedTiming=new Set(['estimatedSeconds','questionType','fieldSeconds','reason','elapsedSeconds']);if(Object.keys(raw.studyTiming).some(key=>!allowedTiming.has(key)))throw Error('AI timing contained an unsupported field.');if(!Number.isFinite(raw.studyTiming.estimatedSeconds)||raw.studyTiming.estimatedSeconds<=0||raw.studyTiming.estimatedSeconds>7200)throw Error('AI timing estimate is out of range.');if(raw.studyTiming.fieldSeconds!==undefined&&(!raw.studyTiming.fieldSeconds||typeof raw.studyTiming.fieldSeconds!=='object'||Object.keys(raw.studyTiming.fieldSeconds).some(key=>!expected.includes(key)||!Number.isFinite(raw.studyTiming.fieldSeconds[key])||raw.studyTiming.fieldSeconds[key]<=0)))throw Error('AI field timing does not match the current question.');}
    return raw;
  }
  function expectedPromptFields(prompt){
    const markers=['\n\nFields:\n','\n\nEditable fields:\n','\n\nBlank fields to answer:\n'];
    const marker=markers.map(value=>({value,index:prompt.lastIndexOf(value)})).filter(item=>item.index>=0).sort((a,b)=>b.index-a.index)[0];
    if(!marker)return null;
    const start=marker.index+marker.value.length;let i=start;while(/\s/.test(prompt[i]||''))i++;
    if(prompt[i]!=='[')return null;
    const arrayStart=i;let depth=0,inString=false,escaped=false;
    for(;i<prompt.length;i++){
      const c=prompt[i];
      if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}
      if(c==='"'){inString=true;continue;}
      if(c==='[')depth++;
      else if(c===']'&&!--depth){
        try{const fields=parse(prompt.slice(arrayStart,i+1));if(!Array.isArray(fields)||fields.some(field=>!field||typeof field.field!=='string'||!field.field))return null;return fields;}catch{return null;}
      }
    }
    return null;
  }
  function notebookEnvelope(response,{requestId,snapshotHash,prompt,image=false}={}){
    if(typeof response!=='string'||response.length>20000||typeof prompt!=='string')return null;
    const fields=expectedPromptFields(prompt);if(!fields)return null;
    const expected=fields.map(field=>field.field);if(new Set(expected).size!==expected.length)return null;
    for(let start=0;start<response.length;start++){
      if(response[start]!=='{')continue;
      let depth=0,inString=false,escaped=false;
      for(let end=start;end<response.length;end++){
        const c=response[end];
        if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}
        if(c==='"'){inString=true;continue;}
        if(c==='{')depth++;
        else if(c==='}'&&!--depth){
          let data;try{data=parse(response.slice(start,end+1));}catch{break;}
          if(data?.requestId!==requestId||data?.snapshotHash!==snapshotHash)break;
          try{
            validateEnvelope(data,{requestId,snapshot:{snapshotHash},fields:expected.map(key=>({key}))});
            if(image&&data.manualReviewRequired!==false)return null;
            if(fields.some(field=>field.manualEntryRequired===true))return null;
            for(const field of fields){
              const value=data.answer[field.field],type=String(field.type||'').toLowerCase(),options=Array.isArray(field.options)?field.options:null;
              if(['radio','single','select','dropdown'].includes(type)&&(!options||typeof value!=='string'||!options.includes(value)))return null;
              if(['checkbox','multiple','multiple_select'].includes(type)&&(!options||!Array.isArray(value)||value.some(item=>typeof item!=='string'||!options.includes(item))))return null;
              if(['number','numeric'].includes(type)&&!(typeof value==='number'&&Number.isFinite(value)||typeof value==='string'&&value.trim()!==''))return null;
              if(['text','textarea','blank','fill_in_the_blank'].includes(type)&&!(typeof value==='string'&&value.trim()!==''||typeof value==='number'&&Number.isFinite(value)))return null;
              if(!['radio','single','select','dropdown','checkbox','multiple','multiple_select','number','numeric','text','textarea','blank','fill_in_the_blank'].includes(type))return null;
            }
            return data;
          }catch{return null;}
        }
      }
    }
    return null;
  }
  globalThis.StudySecurity={clean,redact,hash,parse,snapshot,promptData,validateEnvelope,hasSourceCitation,notebookRequestSeen,notebookEnvelope};
})();
