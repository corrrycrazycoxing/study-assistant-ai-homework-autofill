// Synthetic Raphael-style drag surface for the shared MindTap graph adapter.
// This page is fully local and does not load the extension or contact Cengage.
(() => {
  'use strict';
  const $=id=>document.getElementById(id),svg=$('chart'),grid=$('grid'),axes=$('axes'),ticks=$('ticks'),placed=$('placed');
  const years=[2018,2019,2020,2021,2022,2023,2024],rates=[3,2,1,0,-1,-2,-3,-4,-5,-6];
  const xPositions=years.map((_,i)=>150+i*100),yPositions=rates.map((_,i)=>80+i*60);
  const targetSeries=[
    {label:'Nominal Interest Rate',color:'#ff9900',points:[{x:2019,y:2.1},{x:2020,y:2.1},{x:2021,y:0.4},{x:2022,y:0.1},{x:2023,y:2.4}]},
    {label:'Real Interest Rate',color:'#8bd865',points:[{x:2019,y:-0.3},{x:2020,y:0.3},{x:2021,y:-0.8},{x:2022,y:-4.6},{x:2023,y:-5.6}]}
  ];
  const NS='http://www.w3.org/2000/svg';
  function line(parent,x1,y1,x2,y2,className){const node=document.createElementNS(NS,'line');node.setAttribute('x1',x1);node.setAttribute('y1',y1);node.setAttribute('x2',x2);node.setAttribute('y2',y2);node.setAttribute('class',className);parent.append(node);return node;}
  function label(parent,text,x,y,className='axis-label'){const node=document.createElementNS(NS,'text');node.setAttribute('x',x);node.setAttribute('y',y);node.setAttribute('class',className);node.textContent=text;parent.append(node);return node;}
  // Match the visible Cartesian plot proportions from the live Aplia graph.
  for(let i=0;i<years.length;i++){line(grid,xPositions[i],80,xPositions[i],620,'gridline');line(ticks,xPositions[i],254,xPositions[i],266,'tick');label(ticks,String(years[i]),xPositions[i],650);}
  for(let i=0;i<rates.length;i++){line(grid,150,yPositions[i],750,yPositions[i],'gridline');line(ticks,144,yPositions[i],156,yPositions[i],'tick');label(ticks,String(rates[i]),48,yPositions[i]+5);}
  line(axes,150,80,150,620,'axis');line(axes,150,260,750,260,'axis');
  label(ticks,'YEAR',430,682,'axis-title');const yTitle=label(ticks,'INTEREST RATE (Percent)',-68,350,'axis-title');
  yTitle.setAttribute('transform','rotate(-90 -68 350)');

  let active=null,retained=[];
  function toLocal(event){const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;return point.matrixTransform(svg.getScreenCTM().inverse());}
  // Simulate a third-party chart library: it listens on the document, starts
  // dragging only from the series handle, and records one point on mouseup.
  document.addEventListener('mousedown',event=>{const handle=event.target.closest?.('[data-series]');if(!handle)return;active={handle,series:handle.dataset.series,color:handle.dataset.color};event.preventDefault();});
  document.addEventListener('mouseup',event=>{
    if(!active)return;
    const current=active;active=null;
    const p=toLocal(event),graph=window.StudyMindTapGraph.inspect(svg,'Use the points for years 2019 to 2023.');
    if(!graph)return;
    // The graph adapter targets fractional values between tick marks. Snap the
    // pointer back through the same axis scale instead of rounding it to the
    // nearest integer tick, which can reject valid decimal-rate placements.
    // Year ticks are integral; allow tiny CTM round-off at exact tick edges,
    // while rejecting drops between requested year columns.
    const x=window.StudyMindTapGraph.yearAtPosition(graph.xTicks,p.x),y=window.StudyMindTapGraph.valueAtPosition(graph.yTicks,p.y);
    if(x===null||y===null||x<2019||x>2023||y<Math.min(...rates)||y>Math.max(...rates))return;
    const value={label:current.series,x,y,color:current.color};retained.push(value);
    if(current.series==='Nominal Interest Rate'){
      const point=document.createElementNS(NS,'rect');point.setAttribute('x',p.x-7);point.setAttribute('y',p.y-7);point.setAttribute('width',14);point.setAttribute('height',14);point.setAttribute('fill',current.color);point.setAttribute('class','placed');placed.append(point);
    }else{
      const point=document.createElementNS(NS,'path');point.setAttribute('d',`M${p.x} ${p.y-9} L${p.x+9} ${p.y+7} L${p.x-9} ${p.y+7} Z`);point.setAttribute('fill',current.color);point.setAttribute('class','placed');placed.append(point);
    }
    // Mimic Aplia/Raphael redrawing the legend after each accepted point.
    // The original handle is detached, so the next placement must reacquire it.
    document.querySelectorAll('#legend [data-series]').forEach(marker=>{
      const replacement=marker.cloneNode(true);
      if(retained.filter(item=>item.label===current.series).length===5)replacement.setAttribute('fill','#888888');
      marker.replaceWith(replacement);
    });
    updateCounts();
  });

  function updateCounts(){$('counts').textContent=`${retained.length} / 10 points retained`;}
  function reset(){placed.replaceChildren();retained=[];$('results').replaceChildren();$('status').textContent='Ready. Nothing has been plotted.';$('run').disabled=false;updateCounts();}
  function pointExists(adapterGraph,series,point){return window.StudyMindTapGraph.hasPoint(adapterGraph,series,point);}
  async function run(){
    $('run').disabled=true;$('results').replaceChildren();$('status').textContent='Inspecting mock graph…';
    try{
      const graph=window.StudyMindTapGraph.inspect(svg,'Use the points for the years 2019 to 2023.');
      if(!graph)throw Error('The graph inspection did not recognize the axes and legend.');
      const values=window.StudyMindTapGraph.validate(targetSeries,graph);
      let count=0;
      for(const valueSeries of values){
        for(const point of valueSeries.points){
          const freshGraph=window.StudyMindTapGraph.inspect(svg,'Use the points for the years 2019 to 2023.');
          const liveSeries=freshGraph?.series.find(item=>item.label===valueSeries.label);
          if(!liveSeries)throw Error(`Could not reacquire the ${valueSeries.label} legend handle.`);
          $('status').textContent=`Dragging ${liveSeries.label}: ${point.x} → ${point.y}`;
          await window.StudyMindTapGraph.drag(freshGraph,liveSeries,point,()=>true);
          const verifyGraph=window.StudyMindTapGraph.inspect(svg,'Use the points for the years 2019 to 2023.');
          const verifySeries=verifyGraph?.series.find(item=>item.label===valueSeries.label);
          if(!verifySeries||!pointExists(verifyGraph,{...verifySeries,color:valueSeries.color},point))throw Error(`The mock did not retain ${liveSeries.label} at ${point.x}.`);
          count++;const row=document.createElement('li');row.textContent=`${liveSeries.label}: ${point.x}, ${point.y} ✓`;row.dataset.point=`${liveSeries.label}:${point.x}`;$('results').append(row);updateCounts();
        }
      }
      if(count!==10||retained.length!==10)throw Error(`Expected 10 retained points; observed ${retained.length}.`);
      $('status').textContent='PASS: both complete series plotted and all 10 points were retained.';
    }catch(error){$('status').textContent=`STOPPED: ${error?.message||error}\nCompleted ${retained.length} of 10 placements.`;}
    finally{$('run').disabled=false;}
  }
  $('run').addEventListener('click',run);$('reset').addEventListener('click',reset);
  updateCounts();
  window.MindTapGraphMock={run,reset,get retained(){return retained.slice();}};
})();
