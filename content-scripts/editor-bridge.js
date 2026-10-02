// This small MAIN-world adapter calls Pearson's own editor; it has no extension APIs.
(() => {
  'use strict';
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  const normalize = s => String(s).replace(/[\s\u200B-\u200D\uFEFF]/g, '').replace(/\u2212/g, '-');
  document.addEventListener('mylab-assistant-editor-request', event => {
    let request;
    try { request = JSON.parse(event.detail); } catch { return; }
    if (!request || typeof request.token !== 'string' || request.token.length > 80) return;
    let result;
    try {
      if (!['check','clear','character','verify'].includes(request.action) || !Array.isArray(request.fields) || request.fields.length > 100) throw Error('Invalid editor request.');
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
    } catch (error) {
      result = { ok: false, error: error.message };
    }
    document.dispatchEvent(new CustomEvent('mylab-assistant-editor-result', { detail: JSON.stringify({ token: request.token, ...result }) }));
  });
})();
