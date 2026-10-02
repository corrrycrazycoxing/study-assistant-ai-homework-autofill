/* Runs in the worksheet MAIN world. Uses the player's own edit/save callbacks.
   Only visible response cells can be addressed; no scoring/config data is read. */
(() => {
  // MAIN world is required here because the worksheet's jQuery editor and
  // saved-cell model are page-owned. Keep the installation marker on a
  // non-enumerable symbol instead of exposing an extension-named property.
  const marker=Symbol.for('accounting-editor-bridge');
  if(Object.prototype.hasOwnProperty.call(document,marker))return;
  Object.defineProperty(document,marker,{value:true,configurable:false});
  const normalize=v=>String(v??'').replace(/,/g,'').replace(/\s+/g,' ').trim();
  const numericText=v=>normalize(v).replace(/[$£€¥\s]/g,'').replace(/−/g,'-').replace(/^\((.*)\)$/,'-$1');
  let edit=null;
  function cell(message){
    if(!document.body?.classList.contains('test-mode'))throw Error('The worksheet is not in editable mode.');
    if(!/^[0-9]+_table[0-9]+_cell_c[0-9]+_r[0-9]+$/.test(message.cell))throw Error('Invalid cell.');
    const td=document.getElementById(message.cell);
    if(!td?.matches('td.responseCell')||td.classList.contains('td-readOnly')||!td.closest('#jQuerySheet')||!td.getClientRects().length)throw Error('The response cell is unavailable.');
    const transaction=document.querySelector('.control_buttons input.active')?.getAttribute('ref');
    if(message.mode==='worksheet'){
      if(transaction||document.querySelector('.control_buttons input[ref]')||!td.classList.contains('isN')||td.classList.contains('dropDownList')||td.hasAttribute('formula'))throw Error('This is not an editable numeric worksheet cell.');
    }else if(transaction!==message.transaction)throw Error('The worksheet transaction changed.');
    const jq=window.jQuery;
    const instances=(jq?.sheet?.instance||[]).filter(s=>s&&typeof s.cellEdit==='function'&&s.obj?.sheet?.()?.[0]?.contains(td));
    if(instances.length!==1)throw Error('The worksheet editor is not ready.');
    return {td,jq,js:instances[0]};
  }
  document.addEventListener('study-accounting-request',event=>{
    let m;
    try{m=JSON.parse(event.detail);}catch{return;}
    if(typeof m?.id!=='string'||m.id.length>100)return;
    let response={id:m.id};
    try{
      if(!['activate','number','beginNumber','typeNumber','commitNumber','verify'].includes(m.action))throw Error('Unsupported worksheet action.');
      const {td,jq,js}=cell(m);
      if(['activate','number','beginNumber'].includes(m.action)){
        js.cellEdit(jq(td));
        if(js.cellLast?.td?.[0]!==td)throw Error('The editor did not activate the requested cell.');
      }
      if(['number','beginNumber','typeNumber','commitNumber'].includes(m.action)){
        const number=m.mode==='worksheet'?/^(?:|-?\d{1,12}(?:\.\d{1,4})?)$/:/^(?:|\d{1,12}(?:\.\d{1,4})?)$/;
        if(td.classList.contains('dropDownList')||!td.classList.contains('isN')||typeof m.value!=='string'||!(m.action==='typeNumber'?/^-?\d*(?:\.\d*)?$/.test(m.value):number.test(m.value)))throw Error('Invalid numeric entry.');
        const formula=js.obj.formula(),inPlace=js.obj.inPlaceEdit();
        if(m.action==='beginNumber'){edit={cell:m.cell,transaction:m.transaction,mode:m.mode,target:m.value,prefix:''};formula.val('');if(inPlace?.length)inPlace.val('');}
        else if(m.action==='typeNumber'){
          if(!edit||edit.cell!==m.cell||edit.transaction!==m.transaction||edit.mode!==m.mode||js.cellLast?.td?.[0]!==td||m.value.length!==edit.prefix.length+1||!edit.target.startsWith(m.value))throw Error('The active worksheet entry changed.');
          edit.prefix=m.value;const char=m.value.at(-1);
          formula.val(m.value);if(inPlace?.length)inPlace.val(m.value);
          for(const input of [formula[0],inPlace?.[0]].filter(Boolean))input.dispatchEvent(new Event('input',{bubbles:true}));
        }else{
          if(m.action==='commitNumber'&&(!edit||edit.cell!==m.cell||edit.prefix!==m.value||edit.target!==m.value||js.cellLast?.td?.[0]!==td))throw Error('The typed worksheet entry is incomplete.');
          if(m.action==='number'){formula.val(m.value);if(inPlace?.length)inPlace.val(m.value);}
          js.cellLast.isEdit=true;js.evt.cellEditDone(true,formula);edit=null;
        }
      }
      if(!['activate','beginNumber','typeNumber'].includes(m.action)){
        const loc=js.getTdLocation(jq(td));
        const native=js.tableCellProviders[js.i].getCell(js.i,loc[0]+1,loc[1]+1);
        const clean=m.mode==='worksheet'?numericText:normalize;
        const equals=v=>td.classList.contains('isN')&&clean(v)!==''&&m.value!==''?Number(clean(v))===Number(m.value):clean(v)===clean(m.value);
        if(!equals(td.textContent)||!equals(native.value))throw Error('The worksheet did not retain the entry in its data model.');
      }
      response.ok=true;
    }catch(error){response.error=error.message;}
    document.dispatchEvent(new CustomEvent('study-accounting-response',{detail:JSON.stringify(response)}));
  });
})();
