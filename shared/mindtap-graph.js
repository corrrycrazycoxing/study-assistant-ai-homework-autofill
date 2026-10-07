// Conservative adapter for MindTap Aplia's Cartesian point graphs.
(() => {
  'use strict';
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const number=value=>{const n=Number(String(value).replace(/,/g,''));return Number.isFinite(n)?n:null;};
  function inspect(svg,prompt=''){
    // Do not depend on the chart library's optional <desc> text: some Aplia
    // builds expose the same interactive SVG without that metadata (or use
    // the unaccented spelling). Axis/legend structure below is the signal.
    if(!svg||svg.namespaceURI!=='http://www.w3.org/2000/svg')return null;
    const texts=[...svg.querySelectorAll('text')].map(node=>({text:clean(node.textContent),x:number(node.getAttribute('x')),y:number(node.getAttribute('y'))})).filter(item=>item.text&&item.x!==null&&item.y!==null);
    const xTicks=texts.filter(item=>/^\d{4}$/.test(item.text)&&item.y>0).map(item=>({value:Number(item.text),pos:item.x})).sort((a,b)=>a.value-b.value);
    const yTicks=texts.filter(item=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(item.text)&&item.x>0&&item.x<80&&Math.abs(Number(item.text))<1000).map(item=>({value:Number(item.text),pos:item.y})).sort((a,b)=>a.pos-b.pos);
    if(xTicks.length<2||yTicks.length<2||new Set(xTicks.map(t=>t.value)).size!==xTicks.length||new Set(yTicks.map(t=>t.pos)).size!==yTicks.length)return null;
    const range=String(prompt).match(/(?:years?\s+)?(\d{4})\s*(?:to|through|[-–])\s*(\d{4})/i);
    if(!range)return null;
    const first=Number(range[1]),last=Number(range[2]),step=first<=last?1:-1,years=[];
    if(Math.abs(last-first)>40)return null;
    for(let year=first;step>0?year<=last:year>=last;year+=step)years.push(year);
    if(years.length<2||years.some(year=>!xTicks.some(tick=>tick.value===year)))return null;
    const plot={left:Math.min(...xTicks.map(t=>t.pos)),right:Math.max(...xTicks.map(t=>t.pos)),top:Math.min(...yTicks.map(t=>t.pos)),bottom:Math.max(...yTicks.map(t=>t.pos))};
    const yAxisLabel=texts.filter(item=>item.x<plot.left&&!/^YEAR$/i.test(item.text)&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(item.text)).sort((a,b)=>Math.abs(plot.left-a.x)-Math.abs(plot.left-b.x))[0]?.text||'';
    const unitSuffix=/\bpercent(?:age)?\b|%/i.test(yAxisLabel)?'%':'';
    const shapes=[...svg.querySelectorAll('rect,path,circle')].map(node=>{
      const fill=(node.getAttribute('fill')||'').toLowerCase(),opacity=Number(node.getAttribute('opacity')||node.getAttribute('fill-opacity')||1);
      let x=null,y=null;
      if(node.tagName.toLowerCase()==='rect'){x=number(node.getAttribute('x'));y=number(node.getAttribute('y'));if(x!==null)x+=Number(node.getAttribute('width')||0)/2;if(y!==null)y+=Number(node.getAttribute('height')||0)/2;}
      else if(node.tagName.toLowerCase()==='path'){const match=node.getAttribute('d')?.match(/[Mm]\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*|\s+)(-?\d+(?:\.\d+)?)/);if(match){x=Number(match[1]);y=Number(match[2]);}}
      return {node,fill,opacity,x,y};
    });
    const legend=texts.filter(item=>item.x>plot.right+15&&!/^YEAR$/i.test(item.text));
    const series=legend.map(label=>{
      const marker=shapes.filter(shape=>shape.x!==null&&shape.y!==null&&shape.x>plot.right&&shape.fill&&shape.fill!=='none'&&shape.opacity>0.01).sort((a,b)=>Math.abs(a.x-label.x)+Math.abs(a.y-(label.y-36))-(Math.abs(b.x-label.x)+Math.abs(b.y-(label.y-36))))[0];
      return marker?{label:label.text,color:marker.fill,marker:marker.node}:null;
    }).filter(Boolean);
    if(series.length<2)return null;
    // Aplia/Raphael can gray a legend handle after its series has been used.
    // Detect populated work from chromatic marks inside the plot: the player
    // also draws a white/gray plot background there, which is not an answer.
    const chromatic=fill=>{
      if(!fill||fill==='none'||fill==='transparent')return false;
      const hex=fill.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
      if(hex){const rgb=hex[1].length===3?[...hex[1]].map(value=>parseInt(value+value,16)):[0,2,4].map(index=>parseInt(hex[1].slice(index,index+2),16));return Math.max(...rgb)-Math.min(...rgb)>18;}
      const rgb=fill.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if(rgb){const values=rgb.slice(1).map(Number);return Math.max(...values)-Math.min(...values)>18;}
      return !/^(?:black|white|gray|grey|silver|darkgray|darkgrey|lightgray|lightgrey)$/i.test(fill);
    };
    const populated=shapes.some(shape=>shape.x>plot.left&&shape.x<plot.right&&shape.y>plot.top&&shape.y<plot.bottom&&chromatic(shape.fill)&&shape.opacity>0.01);
    return {svg,xTicks,yTicks,years,plot,series,populated,yAxisLabel,unitSuffix};
  }
  function validate(value,chart,{allowPopulated=false}={}){
    if(!chart||chart.populated&&!allowPopulated)throw Error('This graph is unsupported or already contains plotted work. Review it manually.');
    if(!Array.isArray(value)||value.length!==chart.series.length)throw Error('AI must return one complete point series for each graph legend entry.');
    const labels=chart.series.map(s=>s.label),used=new Set();
    return chart.series.map(series=>{
      const entry=value.find(item=>item&&item.label===series.label);
      if(!entry||used.has(entry.label)||!Array.isArray(entry.points)||entry.points.length!==chart.years.length)throw Error('Graph series do not match the visible legend or required years.');
      used.add(entry.label);
      const points=chart.years.map((year,index)=>{
        const point=entry.points[index],x=number(point?.x),y=number(point?.y);
        if(x!==year||y===null||y<Math.min(...chart.yTicks.map(t=>t.value))||y>Math.max(...chart.yTicks.map(t=>t.value)))throw Error('Graph points must use each requested year and stay within the plotted y-axis.');
        return {x,y};
      });
      return {label:series.label,color:series.color,yAxisLabel:chart.yAxisLabel||'',unitSuffix:chart.unitSuffix||'',points};
    });
  }
  function coordinate(chart,point){
    const interpolate=(ticks,value,pos)=>{
      const ordered=[...ticks].sort((a,b)=>a.value-b.value),lo=ordered.filter(t=>t.value<=value).at(-1),hi=ordered.find(t=>t.value>=value);
      if(!lo||!hi)throw Error('Graph point is outside its axis.');
      if(lo.value===hi.value)return lo[pos];
      return lo[pos]+(value-lo.value)*(hi[pos]-lo[pos])/(hi.value-lo.value);
    };
    const p=chart.svg.createSVGPoint();p.x=interpolate(chart.xTicks,point.x,'pos');p.y=interpolate(chart.yTicks,point.y,'pos');
    const screen=p.matrixTransform(chart.svg.getScreenCTM());return {x:screen.x,y:screen.y};
  }
  function valueAtPosition(ticks,position){
    const ordered=[...ticks].sort((a,b)=>a.pos-b.pos);
    if(!ordered.length||position<ordered[0].pos||position>ordered.at(-1).pos)return null;
    const lo=ordered.filter(tick=>tick.pos<=position).at(-1),hi=ordered.find(tick=>tick.pos>=position);
    if(!lo||!hi)return null;
    if(lo.pos===hi.pos)return lo.value;
    return lo.value+(position-lo.pos)*(hi.value-lo.value)/(hi.pos-lo.pos);
  }
  function yearAtPosition(ticks,position,tolerance=0.02){
    const value=valueAtPosition(ticks,position);
    if(value===null)return null;
    const year=Math.round(value);
    return Math.abs(value-year)<=tolerance?year:null;
  }
  async function makeVisible(chart,series,guard){
    if(!guard())throw Error('Stopped.');
    // Aplia embeds the graph in a scrolling iframe. Its draggable legend
    // symbols can sit above that iframe's viewport even while the plot is
    // visible. Raphaël ignores drags whose starting point is outside the
    // viewport, so center the SVG before measuring either endpoint.
    chart.svg.scrollIntoView({block:'center',inline:'center'});
    await new Promise(resolve=>chart.svg.ownerDocument.defaultView.requestAnimationFrame(()=>chart.svg.ownerDocument.defaultView.requestAnimationFrame(resolve)));
    if(!guard())throw Error('Stopped.');
    const r=series.marker.getBoundingClientRect(),win=chart.svg.ownerDocument.defaultView;
    const visible=r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<win.innerWidth&&r.top<win.innerHeight;
    if(!visible)throw Error('MindTap’s graph point marker is outside the assignment viewport. Scroll the graph into view and retry.');
  }
  function hasPoint(chart,series,point,tolerance=8){
    const expected=coordinate(chart,point),svg=chart.svg,win=svg.ownerDocument.defaultView;
    return [...svg.querySelectorAll('rect,path,circle')].some(node=>{
      const fill=(node.getAttribute('fill')||'').toLowerCase();
      const opacity=Number(win.getComputedStyle(node).opacity||node.getAttribute('opacity')||1);
      if(fill!==series.color||opacity<=0.01)return false;
      const rect=node.getBoundingClientRect();
      if(!rect.width||!rect.height)return false;
      const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
      return x>=0&&y>=0&&x<=win.innerWidth&&y<=win.innerHeight&&Math.abs(x-expected.x)<=tolerance&&Math.abs(y-expected.y)<=tolerance;
    });
  }
  async function drag(chart,series,point,guard){
    await makeVisible(chart,series,guard);
    const r=series.marker.getBoundingClientRect();if(!r.width&&!r.height)throw Error('Graph series marker is not interactive.');
    const from={x:r.left+r.width/2,y:r.top+r.height/2},to=coordinate(chart,point),doc=chart.svg.ownerDocument,win=doc.defaultView;
    // Dispatch through the element a real pointer would hit, so SVG delegated
    // handlers see the same event path as an actual drag. Sending every move
    // directly to document skips handlers attached to the SVG/graph surface.
    const emit=(type,x,y,buttons)=>{
      const target=doc.elementFromPoint(x,y)||doc;
      target.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,view:win,detail:1,button:0,buttons,clientX:x,clientY:y}));
    };
    if(!guard())throw Error('Stopped.');
    // The floating in-page assistant can cover the legend handle. Since the
    // page hit-tests SVG targets during a drag, hide only that overlay until
    // the graph has processed the pointer sequence; the side panel remains.
    const overlay=doc.getElementById('mindtap-assistant-panel'),priorVisibility=overlay?.style.visibility;
    if(overlay)overlay.style.visibility='hidden';
    try{
      emit('mousedown',from.x,from.y,1);
      const steps=Math.min(60,Math.max(16,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/12)));
      for(let i=1;i<=steps;i++){
        if(!guard())throw Error('Stopped.');
        const x=from.x+(to.x-from.x)*i/steps,y=from.y+(to.y-from.y)*i/steps;
        emit('mousemove',x,y,1);
        await new Promise(resolve=>win.requestAnimationFrame(resolve));
      }
      emit('mouseup',to.x,to.y,0);
      const deadline=Date.now()+1200;
      while(!hasPoint(chart,series,point)&&Date.now()<deadline){if(!guard())throw Error('Stopped.');await new Promise(resolve=>win.requestAnimationFrame(resolve));}
      if(!guard())throw Error('Stopped.');
      if(!hasPoint(chart,series,point))throw Error(`MindTap did not retain the ${series.label} point for ${point.x}. Auto stopped.`);
    }finally{if(overlay)overlay.style.visibility=priorVisibility;}
  }
  globalThis.StudyMindTapGraph={inspect,validate,coordinate,valueAtPosition,yearAtPosition,makeVisible,hasPoint,drag};
})();
