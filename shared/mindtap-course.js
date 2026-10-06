(() => {
  'use strict';
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const excludedTitle=/\b(?:exam|quiz|test)\b/i;
  const categoryKeys=['apply','study','learn','other'];
  function hasOutline(doc=document){
    const buttons=[...doc.querySelectorAll('button[id^="activity-heading-"]')];
    const expandAll=[...doc.querySelectorAll('button')].some(button=>/Expand All Folders/i.test(clean(button.innerText||button.textContent||button.getAttribute('aria-label'))));
    return buttons.some(button=>button.getClientRects().length>0&&!button.closest('[hidden],[aria-hidden="true"]'))||doc.querySelector('#outlineViewPane')?.getAttribute('aria-selected')==='true'||expandAll;
  }
  function scan(doc=document){
    return [...doc.querySelectorAll('button[id^="activity-heading-"]')].map(button=>{
      const id=button.id.slice('activity-heading-'.length),row=button.closest('.activity-activityType-2')||button.closest('li')||button.parentElement?.parentElement;
      const status=clean(doc.getElementById('activity-status-'+id)?.textContent||row?.querySelector('[id^="activity-status-"]')?.textContent);
      const gradeText=clean(doc.getElementById('activity-gradable-'+id)?.textContent||row?.querySelector('[id^="activity-gradable-"]')?.textContent||row?.textContent);
      const title=clean(button.innerText||button.textContent),sectionText=clean(row?.closest('.topic-level-3')?.innerText||''),section=/^(Apply It|Study It|Learn It)\b/i.exec(sectionText)?.[1]||'Other',category=section.toLowerCase().startsWith('apply')?'apply':section.toLowerCase().startsWith('study')?'study':section.toLowerCase().startsWith('learn')?'learn':'other';
      const visible=button.getClientRects().length>0&&!button.disabled&&!button.closest('[hidden],[aria-hidden="true"]');
      const gradeable=/COUNTS\s+TOWARDS\s+GRADE/i.test(gradeText),practice=/^PRACTICE$/i.test(gradeText);
      return {button,id,title,status,gradeable,practice,category,visible,assessment:!!row?.classList?.contains('activity-activityType-2'),excluded:excludedTitle.test(title)||/\b(?:reading|media)\b/i.test(`${sectionText} ${gradeText}`)};
    });
  }
  function eligible(item,selected=['apply']){
    if(!item||!Array.isArray(selected)||!selected.length||selected.some(key=>!categoryKeys.includes(key)))return false;
    const key=String(item.category||'').toLowerCase();
    return /^\d{1,16}$/.test(String(item.id||''))&&typeof item.title==='string'&&item.title.trim().length>0&&item.title.length<=180&&item.status==='Not started'&&item.visible!==false&&item.assessment!==false&&!item.excluded&&!excludedTitle.test(item.title)&&selected.includes(key)&&(key==='apply'?item.gradeable===true:item.gradeable===true||item.practice===true);
  }
  globalThis.StudyMindTapCourse={eligible,scan,hasOutline,categoryKeys};
})();
