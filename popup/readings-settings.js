(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let catalog=null,jobId=null,timer=null;
  const status=text=>{$('reading-list-status').textContent=text;};
  const cleanup=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Notebook cleanup';cleanup.append(legend);
  for(const [key,text] of [['atLimit','Automatically delete one unused automation-created notebook at the limit and continue'],['afterUse','Open notebook cleanup confirmation after Canvas confirms quiz submission'],['afterSubmit','Automatically delete this quiz’s tracked notebook after confirmed submission']]){
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';label.append(input,document.createTextNode(text));cleanup.append(label,document.createElement('br'));
    chrome.storage.local.get('notebookCleanupPreferences').then(data=>{input.checked=data.notebookCleanupPreferences?.[key]===true;});
    input.onchange=async()=>{const data=await chrome.storage.local.get('notebookCleanupPreferences');await chrome.storage.local.set({notebookCleanupPreferences:{...data.notebookCleanupPreferences,[key]:input.checked}});};
  }
  const note=document.createElement('small');note.textContent='At the limit, automatically deletes at most one tracked notebook that is not open, then resumes preparation. After-submit automatic deletion is a separate opt-in and only removes the tracked notebook used by that quiz. After confirmed submission, recorded idle notebook tabs close even when deletion is off. Drafts, generating answers and notebooks shared by an active quiz stay open. Unrecorded open copies block automatic deletion. Confirmation-only cleanup remains available. Personal and unverified older notebooks are excluded.';cleanup.append(note);$('reading-list-status').after(cleanup);
  async function send(message){const result=await chrome.runtime.sendMessage(message);if(!result?.received)throw Error(result?.error||'The extension did not respond.');return result;}
  function render(){
    $('reading-list-url').value=catalog?.docUrl||'';$('reading-list-enabled').checked=catalog?.enabled===true;
    $('reading-choice').replaceChildren(new Option('Choose a reading to prepare now',''));
    for(const item of catalog?.entries||[])$('reading-choice').append(new Option(item.title,item.key));
    $('prepare-reading').disabled=true;$('reading-list-stop').hidden=!jobId;
    status(catalog?.entries?.length?catalog.entries.length+' linked readings loaded. Plain text titles need source links in the document.':'Load the document containing your linked readings.');
  }
  $('load-reading-list').onclick=async()=>{
    try{
      const url=StudyReadings.documentUrl($('reading-list-url').value.trim());
      // Chrome requires this optional permission request in the button gesture.
      if(!await chrome.permissions.request({origins:['https://docs.google.com/*']}))throw Error('Google Docs access was not allowed. The reading list was not changed.');
      $('load-reading-list').disabled=true;status('Reading the linked source list…');
      const result=await send({type:'readingsFetchCatalog',url});
      const doc=new DOMParser().parseFromString(result.html,'text/html'),entries=StudyReadings.catalog(doc);
      const enabled=$('reading-list-enabled').checked;
      await send({type:'readingsSaveCatalog',url,entries,enabled});
      catalog={docUrl:url,entries,enabled};render();
    }catch(error){status(error.message);}
    finally{$('load-reading-list').disabled=false;}
  };
  $('reading-list-enabled').onchange=async()=>{
    if(!catalog){status('Load your reading list before enabling automatic preparation.');$('reading-list-enabled').checked=false;return;}
    try{await send({type:'readingsSaveCatalog',url:catalog.docUrl,entries:catalog.entries,enabled:$('reading-list-enabled').checked});catalog.enabled=$('reading-list-enabled').checked;status(catalog.enabled?'Canvas uses a ready notebook first, then tries automatic preparation if needed.':'Automatic preparation is off. Your notebooks and reading list are kept.');}catch(error){status(error.message);}
  };
  $('reading-choice').onchange=()=>{$('prepare-reading').disabled=!$('reading-choice').value||Boolean(jobId);};
  async function poll(){
    if(!jobId)return;
    try{
      const result=await send({type:'readingsStatus',id:jobId});status(result.error||result.status);
      if(['ready','failed','cancelled'].includes(result.phase)){
        jobId=null;$('reading-list-stop').hidden=true;$('prepare-reading').disabled=!$('reading-choice').value;
        if(result.phase==='ready'){$('prepared-reading-link').href=result.url;$('prepared-reading-link').hidden=false;}
        return;
      }
      timer=setTimeout(poll,1000);
    }catch(error){status(error.message);jobId=null;$('reading-list-stop').hidden=true;$('prepare-reading').disabled=false;}
  }
  $('prepare-reading').onclick=async()=>{
    try{
      $('prepare-reading').disabled=true;$('prepared-reading-link').hidden=true;
      const result=await send({type:'readingsPrepareSelected',key:$('reading-choice').value,notebookUrl:$('reading-target-url').value.trim()||undefined});jobId=result.id;$('reading-list-stop').hidden=false;poll();
    }catch(error){status(error.message);$('prepare-reading').disabled=false;}
  };
  $('reading-list-stop').onclick=async()=>{if(jobId)await send({type:'readingsCancel',id:jobId}).catch(error=>status(error.message));clearTimeout(timer);jobId=null;$('reading-list-stop').hidden=true;$('prepare-reading').disabled=!$('reading-choice').value;status('Reading preparation stopped. The notebook is kept for review.');};
  chrome.storage.local.get('canvasReadings').then(async data=>{catalog=data.canvasReadings||null;render();const current=await send({type:'readingsCurrent'});if(current.id){jobId=current.id;$('prepare-reading').disabled=true;$('reading-list-stop').hidden=false;poll();}}).catch(error=>status(error.message));
})();
