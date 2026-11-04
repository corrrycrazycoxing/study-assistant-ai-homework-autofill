// Resolve actual source-ready notebooks before considering automatic imports.
// Never reload, clear drafts, change sources or choose among ambiguous books here.
async function currentNotebookSender(sender){
  if(!sender.tab||sender.frameId!==0)return sender;
  try{
    const original=new URL(sender.url),tab=await chrome.tabs.get(sender.tab.id),current=new URL(tab.url);
    if(original.protocol==='https:'&&['notebook.google.com','notebooklm.google.com'].includes(original.hostname)&&current.origin===original.origin&&!tab.pendingUrl)return {...sender,url:current.href};
  }catch{}
  return sender;
}
async function openReadingNotebook(settings){
  const canonical=value=>{try{const u=new URL(value);return u.protocol==='https:'&&['notebook.google.com','notebooklm.google.com'].includes(u.hostname)&&/^\/notebook\/[\w-]+\/?$/.test(u.pathname)&&!u.pathname.endsWith('/creating')?u.origin+u.pathname.replace(/\/$/,''):null;}catch{return null;}};
  const tabs=(await chrome.tabs.query({url:notebookHosts})).filter(tab=>canonical(tab.url));
  const preferred=canonical(settings.notebookUrl),exact=preferred?tabs.filter(tab=>canonical(tab.url)===preferred):[];
  const candidates=exact.length?exact:tabs,states=[];
  for(const tab of candidates)states.push({tab,state:await probeAiTab(tab,'notebook')});
  const ready=states.filter(item=>item.state.ready),unique=ready.filter((item,index)=>ready.findIndex(other=>canonical(other.tab.url)===canonical(item.tab.url))===index);
  if(unique.length===1)return {...unique[0],tabs};
  if(unique.length>1)throw Error('Multiple source-ready notebooks are open. Choose the notebook in Settings → AI & readings.');
  return {tab:null,tabs,states,preferredMissing:Boolean(preferred&&!exact.length)};
}
