const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('shared/pacing.js','utf8');
const start=source.indexOf('  function pearsonDockPosition('),end=source.indexOf('  function create(',start);
const place=vm.runInNewContext(source.slice(start,end)+'\npearsonDockPosition');
const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height});
const obstacles=[rect(5,23.5,35,35),rect(327.65,23.5,35,35),rect(527,23.5,35,35),rect(890.92,25,32,32),rect(963.92,23.5,77,35)];
function verify(width,bar,blocks){const result=place(width,bar,blocks),left=width-result.right-bar.width;assert(left>=12);for(const b of blocks)assert(!(left<b.right&&left+bar.width>b.left&&result.top<b.bottom&&result.top+bar.height>b.top),'pace controls leave native Pearson controls clickable');return {left,...result};}
const wide=verify(1061,{width:245,height:32},obstacles);assert.equal(wide.top,0);assert(wide.right>100,'the live player layout shifts controls left of Settings and Save');
verify(600,{width:245,height:32},[rect(5,5,40,50),rect(80,5,250,50),rect(460,5,128,50)]);
console.log('PASS Pearson pace dock avoids live Save, Settings and navigation geometry at wide and narrow widths');
