(() => {
  'use strict';
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const excludedTitle=/\b(?:exam|quiz|test)\b/i;
  const categoryKeys=['apply','study','learn','other'];
  function roots(doc=document){
    const found=[],seen=new WeakSet(),pending=[doc];
    while(pending.length){const root=pending.pop();if(!root||seen.has(root))continue;seen.add(root);found.push(root);for(const element of root.querySelectorAll?.('*')||[])if(element.shadowRoot)pending.push(element.shadowRoot);}
    return found;
  }
  function queryAll(selector,doc=document){return roots(doc).flatMap(root=>[...root.querySelectorAll(selector)]);}
  function byId(id,doc=document){for(const root of roots(doc)){const element=root.getElementById?.(id);if(element)return element;}return null;}
  function hasActiveAssignment(doc=document){
    const active=element=>!!element&&element.getClientRects?.().length>0&&!element.closest?.('[hidden],[aria-hidden="true"]');
    const candidates=queryAll('[id*="NB_Main_IFrame"],iframe[src*="aplia.apps.ng.cengage.com"]',doc);
    const frame=byId('56_NB_Main_IFrame',doc)||candidates.find(element=>/NB_Main_IFrame|aplia\.apps\.ng\.cengage\.com/i.test(`${element.id||''} ${element.getAttribute?.('src')||''}`)&&active(element));
    const header=queryAll('[id*="ActivityFrameHeader"],[class*="ActivityFrameHeader"]',doc).find(element=>/ActivityFrameHeader/i.test(`${element.id||''} ${element.className||''}`)&&active(element));
    return active(frame)||active(header);
  }
  function hasOutline(doc=document){
    if(hasActiveAssignment(doc))return false;
    const buttons=queryAll('button[id^="activity-heading-"],[role="button"][id^="activity-heading-"]',doc);
    const expandAll=queryAll('button,[role="button"]',doc).some(button=>/Expand All(?: Folders)?/i.test(clean(button.innerText||button.textContent||button.getAttribute('aria-label'))));
    return buttons.some(button=>button.getClientRects().length>0&&!button.closest('[hidden],[aria-hidden="true"]'))||byId('outlineViewPane',doc)?.getAttribute('aria-selected')==='true'||expandAll;
  }
  function scan(doc=document){
    return queryAll('button[id^="activity-heading-"],[role="button"][id^="activity-heading-"]',doc).map(button=>{
      const id=button.id.slice('activity-heading-'.length),row=button.closest('.activity-activityType-2')||button.closest('li')||button.parentElement?.parentElement;
      const status=clean(byId('activity-status-'+id,doc)?.textContent||row?.querySelector('[id^="activity-status-"]')?.textContent);
      const gradeText=clean(byId('activity-gradable-'+id,doc)?.textContent||row?.querySelector('[id^="activity-gradable-"]')?.textContent||row?.textContent);
      const title=clean(button.innerText||button.textContent),sectionText=clean(row?.closest('.topic-level-3')?.innerText||''),section=/^(Apply It|Study It|Learn It)\b/i.exec(sectionText)?.[1]||'Other',category=section.toLowerCase().startsWith('apply')?'apply':section.toLowerCase().startsWith('study')?'study':section.toLowerCase().startsWith('learn')?'learn':'other';
      const visible=button.getClientRects().length>0&&!button.disabled&&!button.closest('[hidden],[aria-hidden="true"]');
      const gradeable=/COUNTS\s+TOWARDS\s+GRADE/i.test(gradeText),practice=/^PRACTICE$/i.test(gradeText);
      return {button,id,title,status,gradeable,practice,category,visible,assessment:!!row?.classList?.contains('activity-activityType-2'),excluded:excludedTitle.test(title)||/\b(?:reading|media)\b/i.test(`${sectionText} ${gradeText}`)};
    });
  }
  function eligible(item,selected=['apply'],options={}){
    if(!item||!Array.isArray(selected)||!selected.length||selected.some(key=>!categoryKeys.includes(key)))return false;
    const key=String(item.category||'').toLowerCase();
    const status=String(item.status||'').trim();
    const statusAllowed=/^not started$/i.test(status)||(options.includeInProgress===true&&/^in progress$/i.test(status));
    return /^\d{1,16}$/.test(String(item.id||''))&&typeof item.title==='string'&&item.title.trim().length>0&&item.title.length<=180&&statusAllowed&&item.visible!==false&&item.assessment!==false&&!item.excluded&&!excludedTitle.test(item.title)&&selected.includes(key)&&(key==='apply'?item.gradeable===true:item.gradeable===true||item.practice===true);
  }
  globalThis.StudyMindTapCourse={eligible,scan,hasOutline,hasActiveAssignment,categoryKeys,queryAll,byId};
})();
