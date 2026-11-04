const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function element(tag){return {tagName:tag.toUpperCase(),style:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};}
const scope={URL,document:{createElement:element}};vm.createContext(scope);vm.runInContext(fs.readFileSync('shared/course-ui.js','utf8'),scope);
let link=scope.StudyCourseUI.titleLink({title:'Chapter 8 Problems',url:'https://canvas.example.edu/courses/1/assignments/2'});assert.equal(link.tagName,'A');assert.equal(link.href,'https://canvas.example.edu/courses/1/assignments/2');assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
for(const url of ['javascript:alert(1)','data:text/html,test','https://user:password@example.edu/'])assert.equal(scope.StudyCourseUI.titleLink({title:'Unsafe',url}).tagName,'SPAN');
let opened=0,prevented=0;link=scope.StudyCourseUI.titleLink({title:'Native reopen'},()=>opened++);link.listeners.click({preventDefault(){prevented++;}});assert.equal(opened,1);assert.equal(prevented,1);
console.log('PASS shared course report title links: safe assignment URL, new tab isolation and native Pearson/MindTap reopen callbacks');
