'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const configScope={};
vm.runInNewContext(fs.readFileSync('shared/config.js','utf8'),configScope);
const current=configScope.StudyConfig.onboardingVersion;
assert.equal(current,4,'the walkthrough version is advanced so existing installs see the updated setup');
let saved={studyOnboarding:{version:current-1,acknowledged:true,completed:true}};
const listeners={};
const scope={StudyConfig:configScope.StudyConfig,chrome:{runtime:{getURL:path=>'chrome-extension://test/'+path,onInstalled:{addListener:fn=>{listeners.installed=fn;}}},storage:{local:{get:async()=>saved}} ,sidePanel:{setPanelBehavior:async()=>{} }}};
vm.runInNewContext(fs.readFileSync('background/panel.js','utf8')+'\nglobalThis.testSetupComplete=setupComplete;globalThis.testCompleteSetup=completeSetup;',scope);
(async()=>{
 assert.equal(await scope.testSetupComplete(),false,'setup completed under the previous version must be requested again');
 let failure;try{await scope.testCompleteSetup({version:current-1,acknowledged:true});}catch(error){failure=error;}
 assert.match(failure?.message||'',/out of sync.*chrome:\/\/extensions/i,'an old background worker should explain how to recover');
 failure=undefined;try{await scope.testCompleteSetup({version:current,acknowledged:false});}catch(error){failure=error;}
 assert.match(failure?.message||'',/first setup step.*read this notice/i,'missing acknowledgement should point to the checkbox');
 saved={studyOnboarding:{version:current,acknowledged:true,completed:true}};
 assert.equal(await scope.testSetupComplete(),true,'current acknowledged setup remains complete');
 const onboarding=fs.readFileSync('sidepanel/onboarding.js','utf8');
 assert.match(onboarding,/FIRST-USE SETUP · /,'the updated first-use dialog is available');
 console.log('PASS first-use setup is re-requested when its notice version changes');
})().catch(error=>{console.error(error);process.exitCode=1;});
