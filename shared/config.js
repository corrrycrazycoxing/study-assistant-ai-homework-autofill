(() => {
  const onboardingVersion=1;
  const onboardingMessage='Complete first-use setup in the Study Assistant side panel before answering.';
  const platforms=['mcgraw','pearson','canvas','mindtap'];
  const pacingNames={normal:'Instant Auto',slow:'Timed Auto',human:'Human pace',review:'Review each step'};
  const names={mcgraw:'McGraw-Hill',pearson:'Pearson MyLab',canvas:'Canvas',mindtap:'MindTap Aplia'};
  const defaults=Object.fromEntries(platforms.map(p=>[p,{autoFill:false,pauseBeforeSubmit:true,showExplanation:true,preferNotebook:p==='canvas',notebookUrl:'',gradeBeforeAdvance:false,checkMapWork:true,doubleCreditMode:false,randomConfidence:false,replaceExisting:false,pacingMode:'normal',humanSpeed:'typical',humanMinSeconds:15,humanMaxSeconds:3600,useSuggestedTime:true,reviewSeconds:30,reviewMinSeconds:5,reviewMaxSeconds:120,advanceSeconds:3,smoothScroll:true,includePictures:false}]));
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
  function preferences(data,platform){return {...defaults[platform],...(data.platformSettings?.[platform]||{}),aiModel:data.aiModel||'gemini',watchAutomation:data.watchAutomation===true};}

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
      if(row){const rowName=words([...row.children].find(c=>c!==cell&&!c.querySelector('input,select,textarea,.eqEditor,.responseCell'))),column=words(table?.querySelector('thead tr')?.children[[...row.children].indexOf(cell)]);const context=[rowName,column].filter(Boolean).join(' · ');if(context){f.displayLabel=[prefix,context].filter(Boolean).join(' · ');f.label=f.displayLabel;}}
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
      if(row){const rowName=words([...row.children].find(c=>c!==cell&&!c.querySelector('input,select,textarea,.eqEditor,.responseCell'))),column=field.controls?'':words(table?.querySelector('thead tr')?.children[[...row.children].indexOf(cell)]);context=[rowName,column].filter(Boolean).join(' · ');}
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
    const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;table-layout:fixed';const caption=document.createElement('caption');caption.textContent=data.answer?.journal?'Journal entry':'Answers to enter';caption.style.cssText='text-align:left;font-weight:650;padding:9px 0';table.append(caption);
    function row(values,heading=false){const tr=document.createElement('tr');for(const [i,value]of values.entries()){const cell=document.createElement(heading||i===0?'th':'td');cell.textContent=value;cell.style.cssText='padding:7px 5px;border-bottom:1px solid #414959;text-align:left;vertical-align:top;overflow-wrap:anywhere;font-weight:'+(heading?'650':'400');if(!heading&&i===0)cell.scope='row';tr.append(cell);}table.append(tr);}
    if(Array.isArray(data.answer?.journal)){row(['Account','Debit','Credit'],true);for(const item of data.answer.journal)row([item.account,item.debit||'—',item.credit||'—']);}
    else for(const [i,[key,value]] of Object.entries(data.answer||{}).entries())row([answerLabel({displayLabel:data.fieldLabels?.[key]},i),Array.isArray(value)?value.join('; '):String(value)]);
    display.append(table);if(data.explanation){const p=document.createElement('p');p.textContent=plainExplanation(data.explanation);display.append(p);}if(data.sourceAnswer){const details=document.createElement('details'),summary=document.createElement('summary'),p=document.createElement('p');summary.textContent='Reading sources';p.textContent=data.sourceAnswer;details.append(summary,p);display.append(details);}
  }
  globalThis.StudyConfig={onboardingVersion,onboardingMessage,platforms,names,pacingNames,defaults,detect,allowed,preferences,assignLabels,answerLabel,answerGrid,plainExplanation,showPreview,clearPreview};
})();
