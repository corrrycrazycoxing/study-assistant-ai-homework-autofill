(() => {
  const onboardingVersion=4;
  const onboardingMessage='Complete first-use setup in the Study Assistant side panel before answering.';
  const platforms=['mcgraw','pearson','canvas','mindtap'];
  const pacingNames={normal:'Instant Auto',slow:'Timed Auto',human:'Human pace',review:'Guided Answers'};
  const names={mcgraw:'McGraw-Hill',pearson:'Pearson MyLab',canvas:'Canvas',mindtap:'MindTap Aplia'};
  const defaults=Object.fromEntries(platforms.map(p=>[p,{autoFill:false,pauseBeforeSubmit:false,showExplanation:true,preferNotebook:p==='canvas',notebookUrl:'',gradeBeforeAdvance:false,checkMapWork:true,doubleCreditMode:false,randomConfidence:false,replaceExisting:false,pacingMode:'normal',humanSpeed:'typical',humanMinSeconds:15,humanMaxSeconds:3600,useSuggestedTime:true,reviewSeconds:30,reviewMinSeconds:5,reviewMaxSeconds:120,advanceSeconds:3,smoothScroll:true,includePictures:false}]));
  const pacingKeys=['pacingMode','humanSpeed','humanMinSeconds','humanMaxSeconds','useSuggestedTime','reviewSeconds','reviewMinSeconds','reviewMaxSeconds','advanceSeconds'];
  const pacingDefaults=Object.fromEntries(pacingKeys.map(key=>[key,defaults.mcgraw[key]]));
  function detect(url,custom=[]){
    try{
      const u=new URL(url);if(u.protocol!=='https:')return null;
      if(['learning.mheducation.com','ezto.mheducation.com'].includes(u.hostname))return 'mcgraw';
      if(['tdx.acs.pearson.com','mylab.pearson.com','mylabmastering.pearson.com'].includes(u.hostname))return 'pearson';
      if(['ng.cengage.com','aplia.apps.ng.cengage.com'].includes(u.hostname))return 'mindtap';
      if(u.hostname==='instructure.com'||u.hostname.endsWith('.instructure.com')||u.hostname==='canvas.csuchico.edu'||custom.includes(u.origin))return 'canvas';
    }catch{}
    return null;
  }
  function allowed(platform,mode='auto'){return mode==='auto'||mode===platform;}
  function preferences(data,platform){const legacy=data.platformSettings?.[platform]||{},legacyPacing=Object.fromEntries(pacingKeys.filter(key=>Object.hasOwn(legacy,key)).map(key=>[key,legacy[key]]));return {...defaults[platform],...legacy,...(data.pacingSettings?{...pacingDefaults,...data.pacingSettings}:legacyPacing),aiModel:data.aiModel||'gemini',watchAutomation:data.watchAutomation===true};}
  function tableColumn(table,row,cell,clean=value=>String(value||'').replace(/\s+/g,' ').trim()){
    if(!table||!row||!cell)return '';
    const headers=[...(table.tHead?.rows||[])];if(!headers.length)return '';
    const rows=[],occupied=[];
    headers.forEach((header,rowIndex)=>{
      const columns=[];let column=0;
      for(const item of [...header.cells]){
        while(occupied[column]>rowIndex)column++;
        const span=Math.max(1,item.colSpan||1),rowspan=Math.max(1,item.rowSpan||1),label=clean(item.textContent);
        for(let offset=0;offset<span;offset++){
          columns[column+offset]=label;
          if(rowspan>1)occupied[column+offset]=rowIndex+rowspan;
        }
        column+=span;
      }
      rows.push(columns);
    });
    const index=[...row.children].indexOf(cell);
    return rows.map(columns=>columns[index]).filter(Boolean).join(' · ');
  }

  function assignLabels(fields,root,{questionLabel=''}={}){
    const clean=s=>String(s||'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();
    const words=node=>{if(!node?.cloneNode)return '';const copy=node.cloneNode(true);copy.querySelectorAll('input,select,textarea,button,.eqEditor,.eqDocument,.xlFillin,.q4-select-container,.sr-only,.offScreen,[aria-hidden="true"]').forEach(e=>e.remove());return clean(copy.textContent);};
    const printed=node=>{
      if(!node)return '';
      const marker=text=>{const m=text.match(/^(?:Part\s+)?((?:\d+\s*)?[a-z]|\d+)[.) :]\s*/i);return m?m[1].replace(/\s+/g,''):text.match(/^Part\s+\d+\b/i)?.[0]||'';};
      const heading=node.querySelector('legend,h2:not(.sr-only),h3:not(.sr-only),h4:not(.sr-only),h5:not(.sr-only),h6:not(.sr-only),.q4-task-title,.part-label');
      const content=node.cloneNode(true);content.querySelectorAll('legend,h2,h3,h4,h5,h6,.q4-task-title,.part-label').forEach(e=>e.remove());
      // Prefer the printed a/b marker over a generic accessibility heading.
      return marker(words(content))||marker(words(heading))||marker(words(node))||marker(clean(node.querySelector('h5.offScreen,h5.sr-only')?.textContent));
    };
    if(!questionLabel)questionLabel=clean(root?.querySelector('.question_name,.q4-problem-title,h2,h3')?.textContent).match(/^Question\s+\d+\b/i)?.[0]||'';
    const groups=new Map();
    for(const f of fields){
      const el=f.el||f.elements?.[0];let boundary=el?.closest('.step,.q4-task,.question_part,.subquestion,[data-question-part],fieldset');
      if(boundary&&!root?.contains(boundary))boundary=null;
      if(!boundary){for(let node=el?.parentElement;node&&node!==root;node=node.parentElement){if(printed(node)){boundary=node;break;}}}
      const path=[];for(let node=boundary;node&&root?.contains(node);node=node.parentElement){if(node===boundary||node.matches('.step,.q4-task,.question_part,.subquestion,[data-question-part],fieldset')){const label=printed(node);if(label&&path[0]!==label)path.unshift(label);}if(node===root)break;}
      if(path.length===1&&/^Part \d+$/i.test(path[0])&&boundary?.matches('.step')){for(let prior=boundary.previousElementSibling;prior;prior=prior.previousElementSibling){const label=printed(prior);if(/^(?:\d+)?[a-z]$/i.test(label)){path.unshift(label);break;}}}
      const part=path.join(' → '),kind=f.kind||f.type;
      const name=['select','dropdown'].includes(kind)?'Dropdown':['equation','number'].includes(kind)||f.numeric?'Number':['radio','single_choice'].includes(kind)?'Choose one':['checkbox','multiple_select'].includes(kind)?'Select all':'Text box';
      const group=boundary||root;if(!groups.has(group))groups.set(group,[]);groups.get(group).push({f,part,name,el});
    }
    for(const entries of groups.values())for(const {f,part,name,el} of entries){
      if(f.displayLabel&&!part)continue;
      const peers=entries.filter(e=>e.name===name),position=peers.findIndex(e=>e.f===f)+1;
      const prefix=[questionLabel,part].filter(Boolean).join(' → ');
      if(prefix){f.displayLabel=prefix+' · '+name+(peers.length>1?' '+position:'');f.label=f.displayLabel;}
      if(part)f.groupLabel=prefix;
      // Table headings and choice-linked numbers identify the destination more precisely.
      const cell=el?.closest('td,th'),row=cell?.closest('tr'),table=cell?.closest('table');
      if(row){const rowName=words([...row.children].find(c=>c!==cell&&!c.querySelector('input,select,textarea,.eqEditor,.responseCell'))),column=tableColumn(table,row,cell,words);const context=[rowName,column].filter(Boolean).join(' · ');if(context){f.displayLabel=[prefix,context].filter(Boolean).join(' · ');f.label=f.displayLabel;}}
    }
    return fields;
  }

  function answerLabel(field,index){
    const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
    const el=field.el||field.elements?.[0];
    const words=node=>{if(!node?.cloneNode)return '';const copy=node.cloneNode(true);copy.querySelectorAll('input,select,textarea,.eqEditor,.eqDocument,.sr-only,.offScreen,.q4-select-container').forEach(e=>e.remove());return clean(copy.textContent);};
    let context='';
    if(el?.closest){
      const cell=el.closest('td,th'),row=cell?.closest('tr'),table=row?.closest('table');
      if(row){const rowName=words([...row.children].find(c=>c!==cell&&!c.querySelector('input,select,textarea,.eqEditor,.responseCell'))),column=tableColumn(table,row,cell,clean);context=[rowName,column].filter(Boolean).join(' · ');}
      const option=el.closest('.mcAnswerContent');if(!context&&option&&field.kind==='equation')context='Option '+words(option)+' · number';
      if(!context)context=words(el.closest('label'));
    }
    if(field.displayLabel)return clean(field.displayLabel).slice(0,180);
    let value=context||clean(field.label);
    if(/^(?:Part [a-z] · |Question \d+(?: → | · )|(?:\d+[a-z]|[a-z]) · )/i.test(value))return value.slice(0,180);
    value=value.replace(/^(?:(?:Part|Field) \d+\s*(?:·\s*)?)+/i,'');
    if(/^(?:embedded|native|internal|editable)\s+(?:answer|number|field|control)(?:\s*\d+)?$/i.test(value)||/^(?:f\d+|(?:question|answer|input|field|q4|ctl\d+)[_\-][\w\-]+)$/i.test(value)||/^(?:Answer|Field)\s*\d+$/i.test(value))value='';
    if(/^Select an answer,? dropdown menu \d+$/i.test(value))value='Dropdown';
    if(!value)value=['radio','single_choice'].includes(field.kind||field.type)?'Choose one':['checkbox','multiple_select'].includes(field.kind||field.type)?'Select all that apply':['select','dropdown'].includes(field.kind||field.type)?'Dropdown':'';
    return 'Field '+(index+1)+(value?' · '+value.slice(0,140):'');
  }
  function answerGrid(data){
    const entries=Object.entries(data.answer||{});if(!entries.length||entries.length>100)return null;
    const groups=new Map();
    for(const [key,value] of entries){const c=data.fieldContext?.[key];if(!c||typeof c.group!=='string'||!['Above','Below'].includes(c.column)||!['string','number'].includes(typeof value))return null;if(!groups.has(c.group))groups.set(c.group,{});const row=groups.get(c.group);if(Object.hasOwn(row,c.column))return null;row[c.column]=String(value);}
    if([...groups.values()].some(row=>!Object.hasOwn(row,'Above')||!Object.hasOwn(row,'Below')))return null;
    return {columns:['Question / part','Above','Below'],rows:[...groups].map(([group,row])=>[group,row.Above,row.Below])};
  }
  function plainExplanation(value){return String(value||'').replace(/\\(?:text|mathrm|mathbf)\{([^{}]*)\}/g,'$1').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,'($1)/($2)').replace(/\\%/g,'%').replace(/\\(?:times|cdot)\b/g,' × ').replace(/\\(?:approx)\b/g,'≈').replace(/\\(?:geq|ge)\b/g,'≥').replace(/\\(?:leq|le)\b/g,'≤').replace(/\$\$([\s\S]*?)\$\$/g,'$1').replace(/\$([^$\n]+)\$/g,(match,body)=>/[=^\\%]/.test(body)||/^[\d\s.+*/()−-]+$/.test(body)?body:match).replace(/\\[()[\]]/g,'').replace(/\*\*([^*]+)\*\*/g,'$1').trim();}
  function clearPreview(preview){preview.textContent='';if(preview.nextElementSibling?.dataset.readablePreview)preview.nextElementSibling.replaceChildren();}
  function showPreview(preview,data){
    preview.textContent=JSON.stringify(data);preview.hidden=true;
    let display=preview.nextElementSibling;if(!display?.dataset.readablePreview){display=document.createElement('div');display.dataset.readablePreview='true';display.style.cssText='max-height:300px;overflow:auto;font:12px/1.5 system-ui';preview.after(display);}display.replaceChildren();
    const appendExplanation=()=>{if(data.explanation){const h=document.createElement('h3'),p=document.createElement('p');h.textContent=data.guided?'Guided walkthrough':'Explanation';p.textContent=plainExplanation(data.explanation);display.append(h,p);}};
    if(data.guided)appendExplanation();
    if(data.graphFallback){const callout=document.createElement('div');callout.style.cssText='border:1px solid #b78937;background:#30291d;color:#f2dfb8;border-radius:8px;padding:10px;margin:8px 0';const title=document.createElement('strong'),message=document.createElement('p');title.textContent='Graph not fully plotted';message.textContent=String(data.graphFallback.message||'Review the points below and manually plot any that are missing. The assignment was not graded or submitted.');message.style.cssText='margin:5px 0 0';callout.append(title,message);display.append(callout);}
    const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;table-layout:fixed';const caption=document.createElement('caption');caption.textContent=data.guided?'Values to enter yourself':data.answer?.journal?'Journal entry':'Answers to enter';caption.style.cssText='text-align:left;font-weight:650;padding:9px 0';table.append(caption);
    function row(values,heading=false){const tr=document.createElement('tr');for(const [i,value]of values.entries()){const cell=document.createElement(heading||i===0?'th':'td');cell.textContent=value;cell.style.cssText='padding:7px 5px;border-bottom:1px solid #414959;text-align:left;vertical-align:top;overflow-wrap:anywhere;font-weight:'+(heading?'650':'400');if(!heading&&i===0)cell.scope='row';tr.append(cell);}table.append(tr);}
    if(Array.isArray(data.answer?.journal)){row(['Account','Debit','Credit'],true);for(const item of data.answer.journal)row([item.account,item.debit||'—',item.credit||'—']);}
    else for(const [i,[key,value]] of Object.entries(data.answer||{}).entries()){
      const graph=Array.isArray(value)&&value.length>0&&value.every(item=>item&&typeof item.label==='string'&&Array.isArray(item.points));
      if(graph){
        const tr=document.createElement('tr'),heading=document.createElement('th'),cell=document.createElement('td');heading.textContent=answerLabel({displayLabel:data.fieldLabels?.[key]},i);heading.scope='row';heading.style.cssText='padding:7px 5px;border-bottom:1px solid #414959;text-align:left;vertical-align:top;font-weight:650';cell.style.cssText='padding:7px 5px;border-bottom:1px solid #414959;vertical-align:top;overflow-wrap:anywhere';
        for(const series of value){const color=/^#[0-9a-f]{6}$/i.test(series.color||'')?series.color:'#aeb9d4',block=document.createElement('div'),name=document.createElement('strong'),axis=document.createElement('div'),points=document.createElement('div');block.style.cssText=`border-left:3px solid ${color};padding-left:8px;margin:4px 0 10px`;name.textContent=series.label;name.style.cssText=`display:block;color:${color};font-weight:700`;axis.textContent=series.yAxisLabel?`x = year · y = ${series.yAxisLabel}`:'Coordinates are (x, y)';axis.style.cssText='font-size:11px;color:#bdc7dc;margin:2px 0 5px';points.style.cssText='display:flex;flex-wrap:wrap;gap:4px';
          for(const point of series.points||[]){const chip=document.createElement('span'),y=Number(point.y);chip.textContent=`(${point.x}, ${Number.isFinite(y)?`${y}${series.unitSuffix||''}`:point.y})`;chip.style.cssText=`display:inline-block;border-radius:5px;padding:2px 6px;background:#222a3b;border:1px solid ${color};color:#f0f3fb;font-weight:650;font-variant-numeric:tabular-nums`;points.append(chip);}block.append(name,axis,points);cell.append(block);
        }tr.append(heading,cell);table.append(tr);
      }else{const formatted=Array.isArray(value)?value.join('; '):String(value);row([answerLabel({displayLabel:data.fieldLabels?.[key]},i),formatted]);}
    }
    display.append(table);if(!data.guided)appendExplanation();if(data.sourceAnswer){const details=document.createElement('details'),summary=document.createElement('summary'),p=document.createElement('p');summary.textContent='Reading sources';p.textContent=data.sourceAnswer;details.append(summary,p);display.append(details);}
  }
  globalThis.StudyConfig={onboardingVersion,onboardingMessage,platforms,names,pacingNames,defaults,pacingKeys,pacingDefaults,detect,allowed,preferences,tableColumn,assignLabels,answerLabel,answerGrid,plainExplanation,showPreview,clearPreview};
})();
