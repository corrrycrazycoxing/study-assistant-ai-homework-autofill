(() => {
  const marker=Symbol.for('capture-frame');
  if(Object.prototype.hasOwnProperty.call(document,marker))return;
  Object.defineProperty(document,marker,{value:true,configurable:false});
  const pending=new Map(),children=new Map();
  const valid=r=>r&&['x','y','width','height','viewportWidth','viewportHeight'].every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0&&r.viewportWidth>0&&r.viewportHeight>0;
  function finish(token,result){
    const local=pending.get(token);
    if(local){clearTimeout(local.timer);pending.delete(token);local.resolve(result);return;}
    const child=children.get(token);if(child){children.delete(token);clearTimeout(child.timer);child.source.postMessage({kind:'study-capture-result',token,result},child.origin==='null'?'*':child.origin);}
  }
  function up(token,rect){if(window===window.top)finish(token,{received:true,rect:{...rect,viewportWidth:innerWidth,viewportHeight:innerHeight}});else window.parent.postMessage({kind:'study-capture-rect',token,rect},'*');}
  window.addEventListener('message',event=>{
    const m=event.data;if(!m||typeof m.token!=='string'||m.token.length>80)return;
    if(m.kind==='study-capture-result'&&event.source===window.parent){finish(m.token,m.result);return;}
    if(m.kind!=='study-capture-rect'||!valid(m.rect)||children.has(m.token)||pending.has(m.token))return;
    const frame=[...document.querySelectorAll('iframe,frame')].find(e=>e.contentWindow===event.source);if(!frame)return;
    if(m.rect.x<0||m.rect.y<0||m.rect.x+m.rect.width>frame.clientWidth||m.rect.y+m.rect.height>frame.clientHeight)return;
    const b=frame.getBoundingClientRect(),sx=(b.width/frame.offsetWidth)||1,sy=(b.height/frame.offsetHeight)||1;
    const x=b.x+(frame.clientLeft+m.rect.x)*sx,y=b.y+(frame.clientTop+m.rect.y)*sy,width=m.rect.width*sx,height=m.rect.height*sy;
    children.set(m.token,{source:event.source,origin:event.origin,timer:setTimeout(()=>finish(m.token,{received:false,error:'Screenshot frame lookup timed out.'}),1800)});
    if(x<0||y<0||x+width>innerWidth||y+height>innerHeight){finish(m.token,{received:false,error:'The picture is clipped by its assignment window. Scroll or resize it, then retry.'});return;}
    up(m.token,{x,y,width,height,viewportWidth:innerWidth,viewportHeight:innerHeight});
  });
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message.type!=='studyLocateCapture')return;
    if(typeof message.token!=='string'||!valid(message.rect)||Math.abs(message.rect.viewportWidth-innerWidth)>1||Math.abs(message.rect.viewportHeight-innerHeight)>1){reply({received:false});return;}
    const token=message.token;
    pending.set(token,{resolve:reply,timer:setTimeout(()=>finish(token,{received:false,error:'Screenshot frame lookup timed out.'}),2200)});
    up(token,message.rect);return true;
  });
})();
