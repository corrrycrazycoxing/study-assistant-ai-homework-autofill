// Use one label in both the isolated reader and Pearson's MAIN-world adapter.
// Equation widgets contain accessible text plus a duplicate visual rendering.
globalThis.StudyPearsonLabels=Object.freeze({
  text(element){
    if(!element)return '';
    const clean=s=>String(s||'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();
    if(element.matches?.('.eqLabel[aria-label]'))return clean(element.getAttribute('aria-label'));
    const copy=element.cloneNode(true);
    for(const math of copy.querySelectorAll('.eqLabel[aria-label]'))math.replaceWith(document.createTextNode(math.getAttribute('aria-label')));
    copy.querySelectorAll('.eqDocument[aria-hidden="true"],.sr-only,.offScreen,.xlFillinArrow').forEach(node=>node.remove());
    return clean(copy.textContent).replace(/^▼\s*/,'');
  }
});
