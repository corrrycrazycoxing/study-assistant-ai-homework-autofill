const fs=require('node:fs'),path=require('node:path');
function adapter(source){return source.replace("location.pathname.startsWith('/ext/map/')","location.pathname.endsWith('/mcgraw-map-demo.html')").replace("u.pathname.includes('/ext/common/accountingtool/')","['/mcgraw-map-frame.html','/mcgraw-numeric-frame.html','/mcgraw-mixed-frame.html','/mcgraw-required-frame.html'].some(path=>u.pathname.endsWith(path))");}
module.exports=adapter;
if(require.main===module){const root=path.resolve(__dirname,'..');fs.writeFileSync(path.join(root,'docs/mcgraw-map-test-adapter.js'),adapter(fs.readFileSync(path.join(root,'content-scripts/mcgraw-map.js'),'utf8')));}
