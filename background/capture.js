'use strict';
let pictureCaptureInFlight=false;
async function capturePicture(message,sender){
  if(pictureCaptureInFlight)throw Error('Another picture is being captured. Retry.');
  pictureCaptureInFlight=true;
  try{return await capturePicturePart(message,sender);}finally{pictureCaptureInFlight=false;}
}
async function capturePicturePart(message,sender){
  const platform=await sourcePlatform(sender);
  if(!platform||!StudyConfig.preferences(await config(),platform).includePictures)throw Error('Enable Include Pictures in this platform’s settings first.');
  if(typeof message.id!=='string'||!message.id||message.id.length>80)throw Error('Invalid screenshot request.');
  const part=message.part||{index:0,total:1};
  if(!Number.isInteger(part.index)||!Number.isInteger(part.total)||part.total<1||part.total>8||part.index<0||part.index>=part.total||part.index===0&&part.previousToken!==undefined)throw Error('Invalid picture sequence.');
  const {pictureCapture:previous}=await chrome.storage.session.get('pictureCapture');
  const sameSequence=c=>c&&c.token===part.previousToken&&c.id===message.id&&c.tab===sender.tab.id&&c.frame===sender.frameId&&c.url===sender.url&&c.documentId===sender.documentId&&c.total===part.total&&c.partCount===part.index&&Date.now()-c.time<30000;
  if(part.index>0&&!sameSequence(previous))throw Error('The picture sequence expired or belongs to a different question. Retry.');
  const r=message.rect;
  if(!r||!['x','y','width','height','viewportWidth','viewportHeight'].every(k=>Number.isFinite(r[k]))||r.x<0||r.y<0||r.width<1||r.height<1||r.x+r.width>r.viewportWidth||r.y+r.height>r.viewportHeight)throw Error('The picture must be fully visible before capture.');
  const assertActive=async()=>{
    const tab=await chrome.tabs.get(sender.tab.id),active=(await chrome.tabs.query({active:true,lastFocusedWindow:true}))[0];
    if(active?.id!==tab.id||!tab.active||tab.url!==sender.tab.url)throw Error('Keep the assignment tab visible while capturing its picture.');
    return tab;
  };
  const tab=await assertActive();
  const {pending}=await chrome.storage.session.get('pending');
  if(pending&&Date.now()-pending.time<expiry)throw Error('Another question is waiting for AI. Stop it first.');
  const run=await activeRun();if(run&&(run.tab!==sender.tab.id||run.platform!==platform))throw Error('Another assignment owns the active run.');
  const token=crypto.randomUUID();
  const located=await chrome.tabs.sendMessage(tab.id,{type:'studyLocateCapture',token,rect:r},{frameId:sender.frameId});
  if(!located?.received)throw Error(located?.error||'Could not locate the picture inside the assignment frame.');
  const rect=located.rect;
  if(!rect||!['x','y','width','height','viewportWidth','viewportHeight'].every(k=>Number.isFinite(rect[k]))||rect.x<0||rect.y<0||rect.width<1||rect.height<1||rect.viewportWidth<1||rect.viewportHeight<1||rect.x+rect.width>rect.viewportWidth||rect.y+rect.height>rect.viewportHeight)throw Error('The screenshot crop is invalid.');
  await assertActive();
  let data;
  try{data=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});}catch(error){
    const reason=String(error?.message||error||'Unknown browser capture error.').slice(0,500);
    const permission=/activeTab|<all_urls>|permission|not been invoked/i.test(reason);
    throw Error(permission?'Picture capture permission was denied: '+reason+' Click the extension icon in this assignment tab, close the panel, then retry.':'Browser picture capture failed: '+reason+' No answers were entered.');
  }
  await assertActive();
  if(typeof data!=='string'||!data.startsWith('data:image/png;base64,')||data.length>30000000)throw Error('Screenshot capture returned an invalid image.');
  const bitmap=await createImageBitmap(await (await fetch(data)).blob());
  try{
    const sx=bitmap.width/rect.viewportWidth,sy=bitmap.height/rect.viewportHeight;
    if(Math.abs(sx-sy)>0.1)throw Error('The assignment viewport changed during capture. Retry.');
    const x=Math.round(rect.x*sx),y=Math.round(rect.y*sy),width=Math.round(rect.width*sx),height=Math.round(rect.height*sy);
    if(width<1||height<1||x+width>bitmap.width||y+height>bitmap.height)throw Error('The picture crop fell outside the screenshot.');
    let earlier;
    try{
      if(part.index>0)earlier=await createImageBitmap(await (await fetch(previous.image.dataUrl)).blob());
      const gap=earlier?24:0,combinedWidth=Math.max(width,earlier?.width||0),combinedHeight=height+(earlier?.height||0)+gap;
      if(combinedWidth>8192||combinedHeight>16384||combinedWidth*combinedHeight>16000000)throw Error('The combined pictures are too large. Review this question manually.');
      const canvas=new OffscreenCanvas(combinedWidth,combinedHeight),context=canvas.getContext('2d');
      context.fillStyle='#fff';context.fillRect(0,0,combinedWidth,combinedHeight);
      if(earlier)context.drawImage(earlier,0,0);
      context.drawImage(bitmap,x,y,width,height,0,(earlier?.height||0)+gap,width,height);
      const bytes=new Uint8Array(await (await canvas.convertToBlob({type:'image/png'})).arrayBuffer());
      if(bytes.length>2000000)throw Error('The picture is too large. Zoom out and retry.');
      let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
      const image={dataUrl:'data:image/png;base64,'+btoa(binary),name:'study-question-'+message.id+'.png'};
      await assertActive();
      if(part.index>0&&!sameSequence((await chrome.storage.session.get('pictureCapture')).pictureCapture))throw Error('The picture sequence changed during capture. Retry.');
      await chrome.storage.session.set({pictureCapture:{token,id:message.id,tab:tab.id,frame:sender.frameId,url:sender.url,documentId:sender.documentId,time:Date.now(),partCount:part.index+1,total:part.total,image}});
      return {received:true,token};
    }finally{earlier?.close();}
  }finally{bitmap.close();}
}
