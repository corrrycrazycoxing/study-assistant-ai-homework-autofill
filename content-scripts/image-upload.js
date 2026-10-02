(() => {
  'use strict';
  const visible=e=>e&&e.getClientRects().length>0&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
  const selectors='file-preview,image-preview,file-upload-chip,.file-preview-container,.image-preview-container,[data-testid="file-thumbnail"],[data-testid^="attachment"],img[src^="blob:"]';
  function composer(editor){return editor.closest('input-area-v2,input-area,form')||editor.closest('.input-area-container,.text-input-field')||editor.parentElement;}
  function attachments(editor){return [...composer(editor).querySelectorAll(selectors)].filter(visible);}
  async function attach(image,editor,isCurrent){
    if(!image||typeof image.dataUrl!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(image.dataUrl)||image.dataUrl.length>2800000||!/^study-question-[a-zA-Z0-9_-]+\.png$/.test(image.name))throw Error('Invalid picture attachment.');
    if(location.hostname==='chat.deepseek.com')throw Error('Picture questions require an open Gemini or ChatGPT tab.');
    if(attachments(editor).length)throw Error('The chatbot has an unsent attachment. Send or remove it first.');
    const guard=()=>{if(!isCurrent())throw Error('Picture upload cancelled.');};
    const wait=async()=>{await new Promise(r=>setTimeout(r,150));guard();};
    const fileInput=()=>[...document.querySelectorAll('input[type="file"]')].find(e=>!e.disabled&&(!e.getAttribute('accept')||/image|\.png/i.test(e.getAttribute('accept'))));
    let target=fileInput();
    if(!target){
      const buttons=location.hostname==='gemini.google.com'?['button[aria-label="Upload & tools"]','button[aria-label="Add files"]']:['button[data-testid="composer-plus-btn"]','button[aria-label="Add files and more"]','button[aria-label="Add photos and files"]'];
      const button=buttons.flatMap(s=>[...document.querySelectorAll(s)]).find(visible);
      if(!button)throw Error('The chatbot upload control was not found. Attach the picture manually.');
      guard();button.click();
      const start=Date.now();while(!target&&Date.now()-start<2000){await wait();target=fileInput();}
    }
    if(!target)throw Error('The chatbot image file input is unavailable. No question was sent.');
    guard();
    const binary=atob(image.dataUrl.split(',')[1]),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    const transfer=new DataTransfer();transfer.items.add(new File([bytes],image.name,{type:'image/png'}));
    const baseline=new Set(attachments(editor));
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'files').set.call(target,transfer.files);
    target.dispatchEvent(new Event('change',{bubbles:true}));
    const start=Date.now();let stable=0;
    while(Date.now()-start<30000){
      await wait();
      const scope=composer(editor),previews=attachments(editor).filter(e=>!baseline.has(e));
      const filename=[...scope.querySelectorAll('[title],[aria-label]')].some(e=>visible(e)&&(e.getAttribute('title')===image.name||e.getAttribute('aria-label')?.includes(image.name)));
      const failed=[...scope.querySelectorAll('[role="alert"]')].some(e=>visible(e)&&/upload failed|could not upload|unable to upload|unsupported file/i.test(e.textContent));
      if(failed)throw Error('The chatbot rejected the picture. No question was sent.');
      const uploading=[...scope.querySelectorAll('progress,[role="progressbar"],[aria-label*="Uploading"],[aria-label*="uploading"]')].some(visible);
      if((previews.length||filename)&&!uploading){if(!stable)stable=Date.now();if(Date.now()-stable>=800)return;}
      else stable=0;
    }
    throw Error('Picture upload was not confirmed. Check the chatbot attachment, clear its draft, and retry. No question was sent.');
  }
  globalThis.StudyImageUpload={attach,hasDraft:editor=>attachments(editor).length>0};
})();
