// Field-level answer state for Aplia questions with partially completed work.
(() => {
  'use strict';
  const clean=value=>String(value??'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
  function hasAnswer({kind,value='',selectedValues=[],displayValue=''}={}){
    if(kind==='radio'||kind==='checkbox')return Array.isArray(selectedValues)&&selectedValues.length>0;
    if(kind==='graph')return value===true||value?.populated===true;
    if(kind==='dropdown'){
      const choice=clean(selectedValues[0]??displayValue);
      return Boolean(choice)&&!/^[-–—\s]*(?:select|choose)(?:\s|…|$)/i.test(choice);
    }
    if(kind==='number'){
      // Aplia numeric fields sometimes expose a bare percent suffix as their
      // input value even though the answer box is visually empty.
      const number=clean(value).replace(/%$/,'').replace(/,/g,'');
      return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(number);
    }
    return clean(value)!=='';
  }
  function requiresManualGraph({hasDiagram=false,text=''}={}){
    return Boolean(hasDiagram)&&/\b(?:plot|drag)\b/i.test(String(text));
  }
  globalThis.StudyMindTapFields={hasAnswer,requiresManualGraph};
})();
