// This small MAIN-world adapter calls Pearson's own editor; it has no extension APIs.
(() => {
  'use strict';
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  const normalize = s => String(s).replace(/[\s\u200B-\u200D\uFEFF]/g, '').replace(/\u2212/g, '-');
  const label = s => String(s||'').replace(/\s+/g,' ').trim();
  async function chooseDropdown(field){
    if(typeof field.id!=='string'||!/^FL[A-Za-z0-9]+$/.test(field.id)||typeof field.value!=='string'||!field.value.trim()||field.value.length>200)throw Error('Invalid Pearson dropdown choice.');
    const hit=document.getElementById(field.id);
    if(!hit?.matches('.xlFillinItem[aria-haspopup]')||!hit.closest('.contentPanel .contentHolder')||!hit.getClientRects().length||hit.closest('[aria-disabled="true"],.disabled')||hit.classList.contains('answered'))throw Error('Pearson dropdown is unavailable or read-only.');
    const widget=window.dijit?.byNode(hit.parentElement);
    if(widget?.declaredClass!=='xl.player.controls.Fillin'||typeof widget.loadDropDown!=='function'||typeof widget.openDropDown!=='function')throw Error('Pearson dropdown widget is unavailable.');
    if(!widget.isLoaded?.())await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Pearson dropdown choices did not load.')),4500);
      try{widget.loadDropDown(()=>{clearTimeout(timer);resolve();});}catch(error){clearTimeout(timer);reject(error);}
    });
    widget.openDropDown();
    const menu=document.getElementById(hit.getAttribute('aria-owns')||field.id+'_menu');
    const choices=[...(menu?.querySelectorAll('[role="option"]')||[])].filter(el=>label(el.querySelector('.dijitMenuItemLabel')?.textContent||el.textContent)===field.value);
    if(choices.length!==1)throw Error('Pearson did not show a unique matching dropdown choice.');
    choices[0].click();
    if(label(hit.textContent).replace(/^▼\s*/,'')!==field.value)throw Error('Pearson did not retain the dropdown choice.');
  }
  document.addEventListener('mylab-assistant-editor-request', async event => {
    let request;
    try { request = JSON.parse(event.detail); } catch { return; }
    if (!request || typeof request.token !== 'string' || request.token.length > 80) return;
    let result;
    try {
      if (!['check','clear','character','verify','dropdown'].includes(request.action) || !Array.isArray(request.fields) || request.fields.length > 100) throw Error('Invalid editor request.');
      if(request.action==='dropdown'){
        if(request.fields.length!==1)throw Error('Select one Pearson dropdown at a time.');
        await chooseDropdown(request.fields[0]);
        result={ok:true};
      }else{
        const ids = new Set();
        const fields = request.fields.map(f => {
          if (typeof f.id !== 'string' || !f.id || ids.has(f.id) || typeof f.value !== 'string' || f.value.length > 100 || !(request.action==='character'?/^[0-9.eE+-]$/.test(f.value):numeric.test(f.value))) throw Error('Only plain numeric equation answers can be typed.');
          ids.add(f.id);
          const element = document.getElementById(f.id);
          const input = element?.querySelector('input');
          if (!element?.matches('.eqEditor') || !element.closest('.contentPanel .contentHolder') || !input || input.disabled || input.readOnly || element.closest('[aria-disabled="true"],.disabled') || !element.getClientRects().length) throw Error('An equation field is unavailable or read-only.');
          const editor = window.EqEditor?.getEqEditor(f.id);
          if (!editor || typeof editor.inputCharacter !== 'function' || typeof editor.clear !== 'function' || typeof editor.getEqText !== 'function' || typeof editor.getDisabled !== 'function' || editor.getDisabled() || editor.getReadOnly?.()) throw Error('Pearson equation editor is unavailable or read-only.');
          return { ...f, element, input, editor };
        });
        if (request.action !== 'check') {
          for (const f of fields) {
            if(request.action==='clear'){f.editor.focus?.();f.editor.clear();f.editor.setCaretHome?.();}
            if(request.action==='character'){f.editor.inputCharacter(f.value);f.editor.setChanged?.(true);}
            if(request.action==='verify'){
              if(normalize(f.editor.getEqText())!==normalize(f.value))throw Error('Pearson did not retain the typed number. Enter it manually.');
              f.editor.setChanged?.(true);f.input.dispatchEvent(new Event('change',{bubbles:true}));f.input.blur();
            }
          }
        }
        result = { ok: true };
      }
    } catch (error) {
      result = { ok: false, error: error.message };
    }
    document.dispatchEvent(new CustomEvent('mylab-assistant-editor-result', { detail: JSON.stringify({ token: request.token, ...result }) }));
  });
})();
