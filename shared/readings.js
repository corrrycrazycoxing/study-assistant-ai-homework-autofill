(() => {
  'use strict';
  const clean=value=>String(value??'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();
  function documentUrl(value){
    const url=new URL(value);
    if(url.protocol!=='https:'||url.hostname!=='docs.google.com'||url.username||url.password||url.port)throw Error('Use a Google Docs document link.');
    const id=url.pathname.match(/^\/document\/d\/([\w-]+)(?:\/|$)/)?.[1];
    if(!id)throw Error('Use a Google Docs document link.');
    return 'https://docs.google.com/document/d/'+id+'/edit';
  }
  function source(value){
    try{
      let url=new URL(value);
      if(url.hostname==='www.google.com'&&url.pathname==='/url')url=new URL(url.searchParams.get('q')||url.searchParams.get('url'));
      if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
      if(!url.hostname.includes('.')||/^[\d.]+$/.test(url.hostname)||url.hostname.includes(':')||/\.(?:local|internal|localhost)$/i.test(url.hostname))return null;
      const drive=url.hostname==='drive.google.com'&&url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/);
      const doc=url.hostname==='docs.google.com'&&url.pathname.match(/^\/document\/d\/([\w-]+)(?:\/|$)/);
      if(drive||doc){
        const id=(drive||doc)[1],kind=drive?'drive':'doc';
        return {key:kind+':'+id,kind,id,url:kind==='drive'?'https://drive.google.com/file/d/'+id+'/view':'https://docs.google.com/document/d/'+id+'/edit'};
      }
      // Keep the assigned website URL; do not replace it with a web search.
      for(const key of [...url.searchParams.keys()])if(/^utm_|^(?:si|usp)$/i.test(key))url.searchParams.delete(key);
      url.hash='';return {key:url.href,kind:'web',url:url.href};
    }catch{return null;}
  }
  function title(value){
    return clean(value).replace(/^(?:quiz\b\s*(?:\d+)?\s*[:.\-–—]?|optional\s*:)\s*/i,'').replace(/\s+(?:\/\/\s*)?Part\s*:?\s*(?:[IVX]+|\d+)\b.*$/i,'').replace(/\s*\(\s*Pages?\s*:?.*$/i,'').replace(/\s+by\s+.+$/i,'').replace(/^["“”'‘’]+|["“”'‘’.,]+$/g,'').trim();
  }
  const normalize=value=>title(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function catalog(doc){
    const blocks=[...doc.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6')].filter(node=>node.tagName!=='LI'||!node.querySelector('p'));
    const scheduled=blocks.some(node=>/^Reading Schedule\s*:?$/i.test(clean(node.textContent)));
    let inSchedule=!scheduled,category='read';const found=new Map();
    for(const block of blocks){
      const text=clean(block.textContent);
      if(/^Reading Schedule\s*:?$/i.test(text)){inSchedule=true;continue;}
      if(!inSchedule)continue;
      const section=text.match(/^(READ|WATCH|LISTEN)\s*:/i);
      if(section){category=section[1].toLowerCase();if(!block.querySelectorAll('a[href]').length)continue;}
      if(category!=='read')continue;
      const groups=new Map();
      for(const anchor of block.querySelectorAll('a[href]')){
        const ref=source(anchor.getAttribute('href'));if(!ref)continue;
        if(!groups.has(ref.key))groups.set(ref.key,{...ref,parts:[]});
        groups.get(ref.key).parts.push(clean(anchor.textContent));
      }
      for(const entry of groups.values()){
        const label=clean(entry.parts.join(' ')),name=title(label);
        if(name.length<4||/^(?:by\b|part\b|section\b|pages?\b|video\b|lecture\b|podcast\b|https?:)/i.test(name)||!normalize(name))continue;
        const item={key:entry.key,kind:entry.kind,id:entry.id,url:entry.url,title:name,label};
        if(!found.has(item.key))found.set(item.key,item);
      }
    }
    return [...found.values()].slice(0,500);
  }
  function match(value,entries){
    const wanted=normalize(value);if(wanted.length<4)throw Error('The Canvas quiz title is missing or too short to match.');
    const exact=entries.filter(entry=>normalize(entry.title)===wanted);
    if(exact.length===1)return exact[0];
    if(exact.length>1)throw Error('More than one reading has this title. Choose its source in readings settings.');
    // Permit a unique abbreviated quiz title only when it is a substantial
    // prefix. Never choose a source using an author name or a loose topic.
    const prefix=entries.filter(entry=>{const candidate=normalize(entry.title),short=Math.min(candidate.length,wanted.length);return short>=14&&short/Math.max(candidate.length,wanted.length)>=0.55&&(candidate.startsWith(wanted)||wanted.startsWith(candidate));});
    if(prefix.length===1)return prefix[0];
    throw Error(prefix.length?'More than one reading matches this quiz. Choose its source in readings settings.':'No reading matches this Canvas quiz title. Check the reading list or choose a source.');
  }
  function matchQuiz(quizTitle,description,entries){
    const text=clean(description).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ');
    const matches=entries.filter(entry=>{const phrase=title(entry.title).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();return phrase.replace(/ /g,'').length>=14&&(' '+text+' ').includes(' '+phrase+' ');});
    if(matches.length>1)throw Error('More than one reading is named in the quiz instructions. Choose its source in readings settings.');
    if(matches.length===1)return matches[0];
    return match(quizTitle,entries);
  }
  globalThis.StudyReadings={clean,documentUrl,source,title,normalize,catalog,match,matchQuiz};
})();
