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
  const catalogVersion=2;
  function readingRows(block){
    // Docs exports often put several readings and section labels in one
    // paragraph separated by BRs, and split one link across formatted spans.
    if(!block.childNodes)return [{text:block.textContent,links:[...block.querySelectorAll('a[href]')].map(a=>({ref:source(a.getAttribute('href')),text:a.textContent}))}];
    const rows=[];let row={text:'',links:[]};
    const flush=()=>{if(clean(row.text)||row.links.length)rows.push(row);row={text:'',links:[]};};
    function walk(node,ref=null){
      if(node.nodeType===3){
        const start=row.text.length;row.text+=node.textContent;
        if(ref){
          const last=row.links.at(-1);
          if(last?.ref.key===ref.key&&!row.text.slice(last.end,start).trim()){last.text+=row.text.slice(last.end,start)+node.textContent;last.end=row.text.length;}
          else row.links.push({ref,text:node.textContent,end:row.text.length});
        }
        return;
      }
      if(node.tagName==='BR'){if(ref)walk({nodeType:3,textContent:' '},ref);else flush();return;}
      if(node.tagName==='A')ref=source(node.getAttribute('href'));
      for(const child of node.childNodes||[])walk(child,ref);
    }
    walk(block);flush();return rows;
  }
  function catalog(doc){
    const blocks=[...doc.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6')].filter(node=>node.tagName!=='LI'||!node.querySelector('p'));
    const rows=blocks.flatMap(readingRows),scheduled=rows.some(row=>/^Reading Schedule\s*:?$/i.test(clean(row.text)));
    let inSchedule=!scheduled,category='read';const found=new Map();
    for(const row of rows){
      const text=clean(row.text);
      if(/^Reading Schedule\s*:?$/i.test(text)){inSchedule=true;continue;}
      if(!inSchedule)continue;
      // A media label belongs to its dated/week section, not every later week.
      if(/^(?:WEEK\s+\d+\b|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b[,:]?\s+(?:[A-Z][a-z]+\s+)?\d)/i.test(text))category='read';
      const section=text.match(/^(READ|WATCH|LISTEN)\s*:/i);
      if(section)category=section[1].toLowerCase();
      if(category!=='read')continue;
      const groups=new Map();
      for(const link of row.links){
        const ref=link.ref;if(!ref)continue;
        if(!groups.has(ref.key))groups.set(ref.key,{...ref,parts:[]});
        groups.get(ref.key).parts.push(clean(link.text));
      }
      for(const entry of groups.values()){
        const label=clean(entry.parts.join(' ')),name=title(label);
        if(name.length<4||/^(?:by\b|part\b|section\b|pages?\b|video\b|lecture\b|podcast\b|https?:)/i.test(name)||!normalize(name))continue;
        if(/^(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|open\.spotify\.com|podcasts\.apple\.com)$/i.test(new URL(entry.url).hostname))continue;
        const item={key:entry.key,kind:entry.kind,id:entry.id,url:entry.url,title:name,label};
        if(!found.has(item.key))found.set(item.key,item);
      }
    }
    return [...found.values()].slice(0,500);
  }
  async function refreshCatalog(chrome,{force=false,current=()=>true}={}){
    const {canvasReadings:saved}=await chrome.storage.local.get('canvasReadings');
    if(!current())throw Error('Stopped.');
    if(!saved?.docUrl)return saved;
    if(!force&&saved.entries?.length&&saved.parserVersion===catalogVersion&&Date.now()-saved.updatedAt<900000)return saved;
    const fetched=await chrome.runtime.sendMessage({type:'readingsFetchCatalog',refreshSaved:true});
    if(!current())throw Error('Stopped.');
    if(!fetched?.received)throw Error(fetched?.error||'Could not refresh the saved reading list.');
    const entries=catalog(new DOMParser().parseFromString(fetched.html,'text/html'));
    if(!current())throw Error('Stopped.');
    const result=await chrome.runtime.sendMessage({type:'readingsSaveCatalog',refreshSaved:true,url:fetched.url,entries});
    if(!current())throw Error('Stopped.');
    if(!result?.received)throw Error(result?.error||'Could not save the reading list.');
    return {...saved,entries,parserVersion:catalogVersion,updatedAt:Date.now()};
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
  globalThis.StudyReadings={clean,documentUrl,source,title,normalize,catalogVersion,catalog,refreshCatalog,match,matchQuiz};
})();
