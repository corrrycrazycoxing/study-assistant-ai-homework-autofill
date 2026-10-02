'use strict';
async function capturePicture(message,sender){
  const platform=await sourcePlatform(sender);
  if(!platform||!StudyConfig.preferences(await config(),platform).includePictures)throw Error('Enable Include Pictures in this platform’s settings first.');
  if(typeof message.id!=='string'||!message.id||message.id.length>80)throw Error('Invalid screenshot request.');
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
  try{data=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});}catch{throw Error('Click the extension icon in this assignment tab once to allow picture capture, close settings, then retry.');}
  await assertActive();
  if(typeof data!=='string'||!data.startsWith('data:image/png;base64,')||data.length>30000000)throw Error('Screenshot capture returned an invalid image.');
  const bitmap=await createImageBitmap(await (await fetch(data)).blob());
  try{
    const sx=bitmap.width/rect.viewportWidth,sy=bitmap.height/rect.viewportHeight;
    if(Math.abs(sx-sy)>0.1)throw Error('The assignment viewport changed during capture. Retry.');
    const x=Math.round(rect.x*sx),y=Math.round(rect.y*sy),width=Math.round(rect.width*sx),height=Math.round(rect.height*sy);
    if(width<1||height<1||x+width>bitmap.width||y+height>bitmap.height)throw Error('The picture crop fell outside the screenshot.');
    const canvas=new OffscreenCanvas(width,height);canvas.getContext('2d').drawImage(bitmap,x,y,width,height,0,0,width,height);
    const bytes=new Uint8Array(await (await canvas.convertToBlob({type:'image/png'})).arrayBuffer());
    if(bytes.length>2000000)throw Error('The picture is too large. Zoom out and retry.');
    let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    const image={dataUrl:'data:image/png;base64,'+btoa(binary),name:'study-question-'+message.id+'.png'};
    await chrome.storage.session.set({pictureCapture:{token,id:message.id,tab:tab.id,frame:sender.frameId,url:sender.url,time:Date.now(),image}});
    return {received:true,token};
  }finally{bitmap.close();}
}
