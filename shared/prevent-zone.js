/* Visible Prevent Zone/Moodle controls; no completion API or hidden state. */
(() => {
  const origin='https://csuchico.prevent.zone',clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  const visible=e=>e?.isConnected&&e.getClientRects().length&&!e.closest('[hidden],[aria-hidden="true"]');
  function url(value){try{const u=new URL(value,origin);return u.origin===origin&&!u.username&&!u.password&&!u.port&&/^\/courses\/(?:course\/(?:view|section)|mod\/(?:feedback\/(?:view|complete)|quiz\/(?:view|attempt|review|summary)|page\/view|scorm\/view))\.php$/.test(u.pathname)?u:null;}catch{return null;}}
  const titleKey=text=>clean(text).toLowerCase().replace(/\s*[-–—]\s*/g,'-');
  function context(doc){
    const links=[...doc.querySelectorAll('a[href]')].filter(a=>{const u=url(a.href);return u?.pathname==='/courses/course/view.php'&&/^\d+$/.test(u.searchParams.get('id')||'');});
    const link=links.find(a=>clean(a.textContent));if(!link)return null;
    const course=url(link.href);return {courseUrl:course.origin+course.pathname+'?id='+course.searchParams.get('id'),courseTitle:clean(link.textContent)};
  }
  function activities(doc){
    const items=[];
    for(const row of doc.querySelectorAll('#course-index li[data-for="cm"]')){
      const link=row.querySelector('a[data-for="cm_name"]'),target=url(link?.href),title=clean(link?.textContent),id=row.getAttribute('data-id');
      if(!link||!target||!title||!/^\d+$/.test(id||'')||/copyright|certificate|download.*pdf/i.test(title))continue;
      const completed=['1','2'].includes(row.querySelector('[data-for="cm_completion"]')?.getAttribute('data-value'));
      const locked=target.pathname==='/courses/course/section.php'||[...row.querySelectorAll('.courseindex-locked')].some(visible);
      items.push({id,title,url:target.href,completed,locked,pledge:/\bpledge\b/i.test(title)});
    }
    return items;
  }
  function next(items){return items.find(item=>!item.completed&&!item.pledge&&!item.locked)||null;}
  function survey(doc){
    const form=doc.querySelector('#region-main form');if(!form)return null;
    const title=clean(doc.querySelector('[data-activityname]')?.getAttribute('data-activityname')||doc.querySelector('#region-main h2,#page-header h1')?.textContent);
    if(/\bpledge\b/i.test(title))throw Error('The pledge is excluded from Auto.');
    const fields=[];
    for(const group of form.querySelectorAll('fieldset')){
      const radios=[...group.querySelectorAll('input[type="radio"]')].filter(e=>visible(e)&&!e.disabled);
      if(!radios.length)continue;
      const text=clean(group.querySelector('legend')?.textContent).replace(/\s*\(Required field\)\s*/gi,'');
      const options=radios.map(e=>clean(e.labels?.[0]?.textContent||e.closest('label')?.textContent));
      if(!text||options.some(x=>!x)||new Set(options).size!==options.length||new Set(radios.map(e=>e.name)).size!==1)throw Error('This survey has ambiguous answer controls.');
      fields.push({key:'f'+fields.length,kind:'radio',text,options,controls:radios});
    }
    const unsupported=[...form.querySelectorAll('input,select,textarea')].filter(e=>visible(e)&&!e.disabled&&!['hidden','radio','submit','button','reset'].includes(e.type));
    if(unsupported.length)throw Error('This survey includes controls that need manual review.');
    if(!fields.length)return null;
    const signature=JSON.stringify([title,fields.map(f=>[f.text,f.options])]);
    return {title,form,fields,signature,text:fields.map(f=>f.text).join('\n')};
  }
  function quiz(doc){
    const form=doc.querySelector('#responseform');if(!form)return null;
    const title=clean(doc.querySelector('#region-main h1,#region-main h2,[data-activityname]')?.textContent||doc.title);
    if(/\bpledge\b/i.test(title))throw Error('The pledge is excluded from Auto.');
    const fields=[];
    for(const group of form.querySelectorAll('.que')){
      const radios=[...group.querySelectorAll('input[type="radio"]')].filter(e=>visible(e)&&!e.disabled);
      if(!radios.length)continue;
      const text=clean(group.querySelector('.qtext')?.textContent),options=radios.map(e=>clean(e.labels?.[0]?.textContent||e.closest('label')?.textContent));
      if(!text||options.some(x=>!x)||new Set(options).size!==options.length||new Set(radios.map(e=>e.name)).size!==1)throw Error('This quiz has ambiguous answer controls.');
      fields.push({key:'f'+fields.length,kind:'radio',text,options,controls:radios});
    }
    const unsupported=[...form.querySelectorAll('.que input,.que select,.que textarea')].filter(e=>visible(e)&&!e.disabled&&!['hidden','radio','submit','button','reset'].includes(e.type));
    if(unsupported.length)throw Error('This quiz includes controls that need manual review.');
    if(!fields.length)return null;
    const signature=JSON.stringify([title,fields.map(f=>[f.text,f.options])]);
    return {title,form,fields,signature,text:fields.map(f=>f.text).join('\n')};
  }
  function plan(snap,answer){
    if(!answer||Array.isArray(answer)||Object.keys(answer).length!==snap.fields.length)throw Error('The AI returned missing or extra fields.');
    return snap.fields.map(f=>{const value=answer[f.key];if(typeof value!=='string'||!f.options.includes(value))throw Error('The AI choice does not match the displayed options.');return {field:f,value,el:f.controls[f.options.indexOf(value)]};});
  }
  globalThis.StudyPreventZone={origin,clean,visible,url,titleKey,context,activities,next,survey,quiz,plan};
})();
