// Conservative adapter for MindTap Aplia's Cartesian point graphs.
(() => {
  'use strict';
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const number=value=>{const n=Number(String(value).replace(/,/g,''));return Number.isFinite(n)?n:null;};
  // Read only rendered chart geometry, never player answer keys or scripts.
  // Limit the no-picture path to labelled straight lines on linear axes.
  function readReference(svg,{allowQualitative=false,includeGeometry=false,curveLabels=null}={}){
    try{
      if(curveLabels&&(!allowQualitative||!includeGeometry||curveLabels.length!==2||new Set(curveLabels.map(s=>s.color)).size!==2))return null;
      if(svg?.namespaceURI!=='http://www.w3.org/2000/svg'||!StudyMedia.drawn(svg))return null;
      const win=svg.ownerDocument.defaultView,base=svg.getScreenCTM();if(!base)return null;
      const point=(node,x,y)=>{
        const matrix=node.getScreenCTM();if(!matrix)return null;
        const p=svg.createSVGPoint();p.x=x;p.y=y;
        const result=p.matrixTransform(base.inverse().multiply(matrix));
        return Number.isFinite(result.x)&&Number.isFinite(result.y)?{x:result.x,y:result.y}:null;
      };
      const numeric=text=>/^[+-]?(?:\d[\d,]*(?:\.\d*)?|\.\d+)%?$/.test(text)?number(text.replace(/%$/,'')):null;
      const texts=[...svg.querySelectorAll('text')].filter(StudyMedia.drawn).map(node=>{
        const text=clean(node.textContent),x=node.getAttribute('x'),y=node.getAttribute('y');
        if(!text||x===null||y===null||!Number.isFinite(Number(x))||!Number.isFinite(Number(y)))return null;
        const pos=point(node,Number(x),Number(y));if(!pos)return null;
        const box=node.getBBox(),center=point(node,box.x+box.width/2,box.y+box.height/2);
        return {text,...pos,center: center||pos,value:numeric(text)};
      }).filter(Boolean);
      const grouped=(axis,other)=>{
        const groups=[];
        for(const item of texts.filter(item=>item.value!==null)){
          let group=groups.find(group=>Math.abs(group[0][other]-item[other])<0.75);
          if(!group){group=[];groups.push(group);}group.push(item);
        }
        return groups.map(group=>[...new Map(group.map(item=>[item[axis]+':'+item.value,item])).values()].sort((a,b)=>a[axis]-b[axis])).filter(group=>{
          if(group.length<3||new Set(group.map(item=>item.value)).size!==group.length)return false;
          const first=group[0],last=group.at(-1),slope=(last.value-first.value)/(last[axis]-first[axis]);
          return Number.isFinite(slope)&&slope!==0&&group.every(item=>Math.abs((item.value-first.value)/slope+first[axis]-item[axis])<0.25);
        });
      };
      const pairs=[];
      for(const x of grouped('x','y'))for(const y of grouped('y','x')){
        if(x.at(-1).value<=x[0].value||y.at(-1).value>=y[0].value)continue;
        if(y[0].x>=x[0].x||x[0].x-y[0].x>80||x[0].y<=y.at(-1).y||x[0].y-y.at(-1).y>60)continue;
        pairs.push({x,y});
      }
      if(pairs.length>1||!pairs.length&&!allowQualitative)return null;
      const {x,y}=pairs[0]||{},map=(ticks,axis,p)=>ticks[0].value+(p-ticks[0][axis])*(ticks.at(-1).value-ticks[0].value)/(ticks.at(-1)[axis]-ticks[0][axis]);
      const round=value=>Number(value.toFixed(6));
      const step=x?Math.max(...x.slice(1).map((item,index)=>item.x-x[index].x)):0;
      const bounds=x?{left:x[0].x,right:x.at(-1).x+step,top:y[0].y,bottom:y.at(-1).y}:{left:0,right:Number(svg.getAttribute('width')),top:0,bottom:Number(svg.getAttribute('height'))};
      if(!Number.isFinite(bounds.right)||!Number.isFinite(bounds.bottom)||bounds.right<=bounds.left||bounds.bottom<=bounds.top)return null;
      const chromatic=color=>{
        const hex=color.match(/^#([\da-f]{3}|[\da-f]{6})$/i),rgb=color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        const values=hex?(hex[1].length===3?[...hex[1]].map(v=>parseInt(v+v,16)):[0,2,4].map(i=>parseInt(hex[1].slice(i,i+2),16))):rgb?rgb.slice(1).map(Number):null;
        return values&&Math.max(...values)-Math.min(...values)>18;
      };
      const candidates=[];
      for(const node of svg.querySelectorAll('path,line,polyline')){
        if(!StudyMedia.drawn(node))continue;
        const style=win.getComputedStyle(node),color=(style.stroke||node.getAttribute('stroke')||'').toLowerCase();
        if(!chromatic(color)||Number(style.strokeOpacity)===0||Number(style.strokeWidth)===0)continue;
        if(curveLabels&&!curveLabels.some(s=>s.color===color))continue;
        let ends;
        if(node.tagName.toLowerCase()==='line'){
          if(['x1','y1','x2','y2'].some(name=>node.getAttribute(name)===null))return null;
          ends=['1','2'].map(n=>({x:Number(node.getAttribute('x'+n)),y:Number(node.getAttribute('y'+n))}));
        }
        else{
          const raw=node.tagName.toLowerCase()==='path'?node.getAttribute('d'):node.getAttribute('points');
          const n='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
          const path=node.tagName.toLowerCase()==='path';
          if(path&&!/^\s*M/.test(raw||''))return null;
          const pair=new RegExp('(?:'+(path?'[ML]\\s*':'')+')('+n+')[,\\s]+('+n+')','g'),points=[];
          let last=0,match;
          while((match=pair.exec(raw||''))){if(!/^[,\s]*$/.test((raw||'').slice(last,match.index)))return null;points.push({x:Number(match[1]),y:Number(match[2])});last=pair.lastIndex;}
          if((raw||'').slice(last).trim()||points.length<2)return null;
          const ordered=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),a=ordered[0],b=ordered.at(-1),length=Math.hypot(b.x-a.x,b.y-a.y);
          if(!length||points.some(p=>Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))/length>0.01))return null;
          ends=[a,b];
        }
        ends=ends.map(p=>point(node,p.x,p.y));
        // A shifted curve's full path can extend beyond the SVG while its
        // visible section is clipped to the plot. Geometry-enabled curve
        // controls need that intercept to verify movement. Ordinary numeric
        // reference extraction keeps the strict in-bounds requirement.
        const overflow=allowQualitative&&includeGeometry;
        const marginX=overflow?bounds.right-bounds.left:0,marginY=overflow?bounds.bottom-bounds.top:0;
        if(ends.some(p=>!p||p.x<bounds.left-marginX-0.01||p.x>bounds.right+marginX+0.01||p.y<bounds.top-marginY-0.01||p.y>bounds.bottom+marginY+0.01))return null;
        if(Math.hypot(ends[1].x-ends[0].x,ends[1].y-ends[0].y)<25)return null;
        const key=ends.map(p=>[round(p.x),round(p.y)].join(',')).sort().join(';')+':'+color;
        if(!candidates.some(item=>item.key===key))candidates.push({key,color,ends,node});
      }
      if(!candidates.length||candidates.length>8)return null;
      const labels=texts.filter(t=>t.value===null&&t.center.x>bounds.left&&t.center.x<bounds.right&&t.center.y>bounds.top&&t.center.y<bounds.bottom&&(x||/^(?:supply|demand)(?:\s*\d+)?$/i.test(t.text))),used=new Set();
      const distance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
      const series=[],guides=[];
      for(const candidate of candidates){
        const known=curveLabels?.find(s=>s.color===candidate.color);
        const near=labels.map(label=>({label,distance:distance(label.center,...candidate.ends)})).filter(item=>item.distance<40).sort((a,b)=>a.distance-b.distance);
        if(x&&(Math.abs(candidate.ends[0].x-candidate.ends[1].x)<0.25||Math.abs(candidate.ends[0].y-candidate.ends[1].y)<0.25)&&near.every(item=>candidates.some(other=>other!==candidate&&Math.abs(other.ends[0].x-other.ends[1].x)>=0.25&&Math.abs(other.ends[0].y-other.ends[1].y)>=0.25&&distance(item.label.center,...other.ends)<40))){
          // Calculator crosshairs are rendered chart data too. Keep their
          // calibrated coordinates, without inventing a curve name for them.
          guides.push({color:candidate.color,points:candidate.ends.map(p=>({x:round(map(x,'x',p.x)),y:round(map(y,'y',p.y))}))});continue;
        }
        if(!known&&(!near.length||near[1]&&near[1].distance-near[0].distance<5))return null;
        const label=known?.label||near[0].label.text;if(used.has(label))return null;
        used.add(label);
        if(x)series.push({label,color:candidate.color,points:candidate.ends.map(p=>({x:round(map(x,'x',p.x)),y:round(map(y,'y',p.y))})).sort((a,b)=>a.x-b.x)});
        else{
          const [a,b]=[...candidate.ends].sort((a,b)=>a.x-b.x);
          if(Math.abs(b.x-a.x)<1)return null;
          series.push({label,color:candidate.color,direction:Math.abs(b.y-a.y)<1?'horizontal':b.y<a.y?'upward':'downward'});
        }
      }
      if(!series.length||(curveLabels?series.length!==curveLabels.length:labels.some(label=>!used.has(label.text))))return null;
      if(!x){
        if(!series.some(s=>/^supply$/i.test(s.label))||!series.some(s=>/^demand$/i.test(s.label)))return null;
        return {source:'Rendered SVG labels and straight-line directions',mode:'qualitative',axisLabels:texts.filter(t=>t.value===null&&!used.has(t.text)).map(t=>t.text),series,note:'No numeric axis values are available. Use only qualitative relationships; do not infer numerical coordinates.',...(includeGeometry?{geometry:candidates}: {})};
      }
      const intersections=[];
      for(let i=0;i<series.length;i++)for(let j=i+1;j<series.length;j++){
        const [a,b]=series[i].points,[c,d]=series[j].points,den=(a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x);
        if(Math.abs(den)<1e-10)continue;
        const u=((a.x-c.x)*(c.y-d.y)-(a.y-c.y)*(c.x-d.x))/den,v=-((a.x-b.x)*(a.y-c.y)-(a.y-b.y)*(a.x-c.x))/den;
        if(u>=0&&u<=1&&v>=0&&v<=1)intersections.push({series:[series[i].label,series[j].label],x:round(a.x+u*(b.x-a.x)),y:round(a.y+u*(b.y-a.y))});
      }
      return {source:'Rendered SVG labels and straight-line coordinates',xAxis:{ticks:x.map(t=>t.value)},yAxis:{ticks:y.map(t=>t.value)},axisLabels:texts.filter(t=>t.value===null&&!used.has(t.text)).map(t=>t.text),series,intersections,...(guides.length?{guides}:{}),...(includeGeometry?{geometry:candidates}: {})};
    }catch{return null;}
  }
  function inspectCurves(svg,prompt=''){
    if(!/you will not be graded on (?:any )?changes you make to the graph/i.test(prompt))return null;
    const scenarios=[...prompt.matchAll(/\bScenario\s+(\d+)\s*:/gi)].map(match=>Number(match[1]));
    if(!scenarios.length||scenarios.length>10||scenarios.some((number,index)=>number!==index+1))return null;
    const data=readReference(svg,{allowQualitative:true,includeGeometry:true});if(!data)return null;
    const {geometry,...referenceData}=data;
    if(!geometry||geometry.length!==data.series.length)return null;
    const series=data.series.map((item,index)=>({label:item.label,color:item.color,node:geometry[index].node,ends:geometry[index].ends}));
    if(series.some(s=>Math.abs(s.ends[1].x-s.ends[0].x)<1||Math.abs(s.ends[1].y-s.ends[0].y)<1))return null;
    return {mode:'curve-shifts',svg,series,scenarios,prompt,referenceData,populated:false};
  }
  function shiftAnswerTarget(root,graphics,prompt=''){
    // Bind the answer graph to its own rendered instruction. An earlier
    // calculator's ungraded disclosure cannot exempt this separate task.
    const instruction=/\badjust the graph to show\b/i;
    if(!instruction.test(prompt))return null;
    const elements=[...root.querySelectorAll('p,div,.q4-prompt')].filter(StudyMedia.drawn);
    const labels=elements.filter(node=>instruction.test(clean(node.textContent))&&![...node.children].some(child=>instruction.test(clean(child.textContent))));
    if(labels.length!==1)return null;
    const svg=graphics.find(node=>Boolean(labels[0].compareDocumentPosition(node)&4));
    if(svg?.tagName?.toLowerCase()!=='svg'||svg.closest('.q4-idmtable-exhibit'))return null;
    return inspectShiftAnswer(svg,prompt);
  }
  const curveAnswerIdentities=new WeakMap();
  function inspectShiftAnswer(svg,prompt=''){
    if(!/\badjust the graph to show\b/i.test(prompt))return null;
    const identity=curveAnswerIdentities.get(svg);
    const data=readReference(svg,{allowQualitative:true,includeGeometry:true,curveLabels:identity?.curves});
    if(!data||data.series.length!==2||data.geometry?.length!==2||!['Supply','Demand'].every(label=>data.series.some(s=>s.label===label)))return null;
    const {geometry,...referenceData}=data;
    const series=data.series.map((item,index)=>({label:item.label,color:item.color,node:geometry[index].node,ends:geometry[index].ends})).sort((a,b)=>a.label.localeCompare(b.label));
    if(series.some(s=>Math.abs(s.ends[1].x-s.ends[0].x)<1||Math.abs(s.ends[1].y-s.ends[0].y)<1))return null;
    // Aplia can move curve labels independently and show coloured hover
    // helpers. Bind the two labelled curves once, then verify their actual
    // straight-line geometry by their unique original stroke colours.
    const qualitative={source:referenceData.source,mode:'qualitative',axisLabels:referenceData.axisLabels,series:series.map(s=>({label:s.label,color:s.color,direction:s.ends[1].y<s.ends[0].y?'upward':'downward'})),note:'Qualitative shift answer: no numeric shift distance is specified.'};
    if(!identity)curveAnswerIdentities.set(svg,{curves:series.map(({label,color})=>({label,color})),referenceData:qualitative});
    return {mode:'curve-answer',svg,series,scenarios:[1],prompt,referenceData:identity?.referenceData||qualitative,populated:Boolean(identity?.placed&&curvesMatch({series},identity.placed))};
  }
  const inspectCurveChart=chart=>chart?.mode==='curve-answer'?inspectShiftAnswer(chart.svg,chart.prompt):inspectCurves(chart.svg,chart.prompt);
  function validateCurvePlan(value,chart){
    if(!Array.isArray(value)||value.length!==chart.scenarios.length)throw Error('AI must return one curve shift for each scenario.');
    return chart.scenarios.map((scenario,index)=>{
      const step=value[index];
      if(!step||step.scenario!==scenario||!chart.series.some(s=>s.label===step.label)||!['left','right'].includes(step.direction)||Object.keys(step).some(key=>!['scenario','label','direction'].includes(key)))throw Error('Curve shifts must match each numbered scenario, visible curve label and left/right direction.');
      return {scenario,label:step.label,direction:step.direction};
    });
  }
  const equation=series=>{
    const [a,b]=series.ends,slope=(b.y-a.y)/(b.x-a.x);
    return {slope,at:x=>a.y+slope*(x-a.x)};
  };
  function curvesMatch(chart,baseline,tolerance=1.5){
    if(!chart||chart.series.length!==baseline.series.length)return false;
    return baseline.series.every(original=>{
      const current=chart.series.find(s=>s.label===original.label&&s.color===original.color);if(!current)return false;
      const a=equation(original),b=equation(current),x=(original.ends[0].x+original.ends[1].x)/2;
      return Math.abs(a.slope-b.slope)<0.002&&Math.abs(a.at(x)-b.at(x))<=tolerance;
    });
  }
  async function moveCurve(chart,label,dx,guard,{qualitative=false}={}){
    const baseline=inspectCurveChart(chart);
    try{return await moveCurveOnce(chart,label,dx,guard,{qualitative});}
    catch(error){
      // Some Aplia widgets constrain the handle horizontally, others
      // vertically. Retry the alternate physical gesture only after a
      // verified no-op; never compound a changed or unreadable placement.
      if(!error.curveUnchanged||!guard()||!curvesMatch(inspectCurveChart(chart),baseline))throw error;
      return moveCurveOnce(chart,label,dx,guard,{qualitative,horizontal:true});
    }
  }
  async function moveCurveOnce(chart,label,dx,guard,{qualitative=false,horizontal=false}={}){
    if(!guard())throw Error('Stopped.');
    chart.svg.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
    const doc=chart.svg.ownerDocument,win=doc.defaultView;
    await new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));
    if(!guard())throw Error('Stopped.');
    const before=inspectCurveChart(chart),series=before?.series.find(s=>s.label===label);
    if(!series)throw Error('The curve controls changed. Auto stopped.');
    const [a,b]=[...series.ends].sort((a,b)=>a.x-b.x);
    const screen=(x,y)=>{const p=chart.svg.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(chart.svg.getScreenCTM());};
    let from,to,x;const visibilityDeadline=Date.now()+2000;
    const inView=p=>p.x>=0&&p.y>=0&&p.x<win.innerWidth&&p.y<win.innerHeight;
    do{
      if(!guard())throw Error('Stopped.');
      // Move vertically by the change in intercept equivalent to a left/right
      // shift. Aplia's sloped-curve handles can constrain movement to y; a
      // horizontal-only mouse sequence then leaves the curve unchanged.
      // Aplia's text labels are independently draggable. Try several points
      // along the coloured line and require a shape hit, away from the other
      // curve. A fixed position near its label can move only that label.
      from=null;to=null;
      for(const fraction of [0.25,0.65,0.35,0.85,0.15,0.75]){
        const candidateX=a.x+(b.x-a.x)*fraction,candidateY=equation(series).at(candidateX);
        const start=screen(candidateX,candidateY),end=horizontal?screen(candidateX+dx,candidateY):screen(candidateX,candidateY-equation(series).slope*dx);
        if(!inView(start)||!inView(end))continue;
        const hit=doc.elementFromPoint(start.x,start.y);
        if(!chart.svg.contains(hit)||!/^(?:path|line|polyline)$/i.test(hit?.tagName||''))continue;
        if(before.series.some(other=>other.label!==label&&Math.abs(equation(other).at(candidateX)-candidateY)<15))continue;
        x=candidateX;from=start;to=end;break;
      }
      if(from&&to)break;
      await new Promise(resolve=>win.requestAnimationFrame(resolve));
    }while(Date.now()<visibilityDeadline);
    if(!from||!to)throw Error('The curve is outside the assignment viewport or its drag target is covered. Scroll it into view and retry.');
    const overlay=doc.getElementById('mindtap-assistant-panel'),prior=overlay?.style.visibility;
    const overlayRect=overlay?.getBoundingClientRect?.();
    const covered=overlayRect&&[from,to].some(p=>p.x>=overlayRect.left&&p.x<=overlayRect.right&&p.y>=overlayRect.top&&p.y<=overlayRect.bottom);
    if(overlay&&covered)overlay.style.visibility='hidden';
    const emit=(type,x,y,buttons)=>{
      const target=doc.elementFromPoint(x,y)||doc,options={bubbles:true,cancelable:true,composed:true,view:win,detail:1,button:0,buttons,clientX:x,clientY:y,screenX:(win.screenX||0)+x,screenY:(win.screenY||0)+y};
      // Browser input sends pointer events followed by compatibility mouse
      // events. Aplia builds use both styles of drag handlers. Supply the
      // legacy primary-button/page coordinates expected by older handlers.
      if(typeof win.PointerEvent==='function')target.dispatchEvent(new win.PointerEvent(type.replace('mouse','pointer'),{...options,pointerId:1,pointerType:'mouse',isPrimary:true}));
      const event=new win.MouseEvent(type,options);
      Object.defineProperties(event,{which:{value:1},pageX:{value:x+(win.scrollX||0)},pageY:{value:y+(win.scrollY||0)}});
      return target.dispatchEvent(event);
    };
    let down=false;
    try{
      emit('mouseover',from.x,from.y,0);emit('mousemove',from.x,from.y,0);
      await new Promise(resolve=>win.requestAnimationFrame(resolve));
      if(!guard())throw Error('Stopped.');
      emit('mousedown',from.x,from.y,1);down=true;
      for(let i=1;i<=24;i++){
        if(!guard())throw Error('Stopped.');
        emit('mousemove',from.x+(to.x-from.x)*i/24,from.y+(to.y-from.y)*i/24,1);
        await new Promise(resolve=>win.requestAnimationFrame(resolve));
      }
      emit('mouseup',to.x,to.y,0);down=false;emit('mouseout',to.x,to.y,0);
      const deadline=Date.now()+1500;let lastChange=null,readable=false;
      do{
        if(!guard())throw Error('Stopped.');
        const after=inspectCurveChart(chart),moved=after?.series.find(s=>s.label===label);
        if(moved){
          readable=true;
          const old=equation(series),now=equation(moved),actual=(old.at(x)-now.at(x))/old.slope;
          lastChange=actual;
          const others={series:before.series.filter(s=>s.label!==label)},remaining=after.series.filter(s=>s.label!==label);
          const correctShift=qualitative?actual*dx>0&&Math.abs(actual)>=5&&Math.abs(actual)<=Math.abs(b.x-a.x):Math.abs(actual-dx)<=Math.max(3,Math.abs(dx)*0.4);
          if(Math.abs(old.slope-now.slope)<0.002&&correctShift&&curvesMatch({series:remaining},others))return after;
        }
        await new Promise(resolve=>win.requestAnimationFrame(resolve));
      }while(Date.now()<deadline);
      const detail=!readable?'The rendered curve could not be read after dragging.':Math.abs(lastChange||0)<1?'The curve stayed at its original position.':'The curve moved '+(lastChange>0?'right':'left')+', but its placement could not be confirmed.';
      const error=Error('MindTap did not retain the '+label+' curve shift. '+detail+' Auto stopped.');
      error.curveUnchanged=readable&&Math.abs(lastChange||0)<1&&curvesMatch(inspectCurveChart(chart),before);
      throw error;
    }finally{
      if(down)emit('mouseup',from.x,from.y,0);
      if(overlay&&covered)overlay.style.visibility=prior;
    }
  }
  async function applyCurvePlan(chart,value,guard,status=()=>{}){
    const plan=validateCurvePlan(value,chart);
    const restore=async()=>{
      let current=inspectCurves(chart.svg,chart.prompt);if(!current)throw Error('The curve graph changed. Auto stopped.');
      for(const original of chart.series){
        const live=current.series.find(s=>s.label===original.label);if(!live)throw Error('The curve labels changed. Auto stopped.');
        const baseline=equation(original),now=equation(live),x=(original.ends[0].x+original.ends[1].x)/2,delta=(now.at(x)-baseline.at(x))/now.slope;
        if(Math.abs(now.at(x)-baseline.at(x))>1.5)current=await moveCurve(current,original.label,delta,guard);
      }
      if(!curvesMatch(current,chart))throw Error('MindTap did not reset the curves between scenarios. Auto stopped.');
    };
    try{
      for(const step of plan){
        if(!guard())throw Error('Stopped.');
        await restore();
        status('Scenario '+step.scenario+' · moving '+step.label+' '+step.direction+'…');
        const original=chart.series.find(s=>s.label===step.label),width=Math.abs(original.ends[1].x-original.ends[0].x),dx=width*0.25*(step.direction==='right'?1:-1);
        await moveCurve(chart,step.label,dx,guard,{qualitative:true});
      }
      status('Resetting the graph after the scenarios…');await restore();
      return {completed:plan.length,restored:true};
    }catch(error){if(guard())await restore().catch(()=>{});throw error;}
  }
  async function applyCurveAnswer(chart,value,guard,status=()=>{}){
    const [step]=validateCurvePlan(value,chart);
    if(!guard())throw Error('Stopped.');
    if(!curvesMatch(inspectCurveChart(chart),chart))throw Error('The answer graph changed while waiting for AI. Ask again.');
    status('Moving '+step.label+' '+step.direction+' on the answer graph…');
    const original=chart.series.find(s=>s.label===step.label),width=Math.abs(original.ends[1].x-original.ends[0].x);
    const placed=await moveCurve(chart,step.label,width*0.25*(step.direction==='right'?1:-1),guard,{qualitative:true});
    // This is a graded answer, not an ungraded scenario demonstration.
    // Leave the new geometry in place and require it to survive a redraw.
    await new Promise(resolve=>setTimeout(resolve,500));
    if(!guard())throw Error('Stopped.');
    if(!curvesMatch(inspectCurveChart(chart),placed))throw Error('MindTap reverted the answer curve. Auto stopped before grading.');
    curveAnswerIdentities.get(chart.svg).placed={series:placed.series.map(({label,color,ends})=>({label,color,ends}))};
    return {completed:1,placed};
  }
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
    if(chart?.mode==='curve-shifts'||chart?.mode==='curve-answer')return validateCurvePlan(value,chart);
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
  globalThis.StudyMindTapGraph={inspect,readReference,inspectCurves,shiftAnswerTarget,inspectShiftAnswer,inspectCurveChart,validateCurvePlan,curvesMatch,moveCurve,applyCurvePlan,applyCurveAnswer,validate,coordinate,valueAtPosition,yearAtPosition,makeVisible,hasPoint,drag};
})();
