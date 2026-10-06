(() => {
  // Legacy adapters see the same storage API but only their platform's settings.
  // Callback-style original McGraw code and Promise-style new adapters both work.
  const real=chrome;
  const initialized=new Set();
  function adapterChrome(platform){
    const translate=data=>StudyConfig.preferences(data,platform);
    const sync={...real.storage.sync,get(keys,callback){
      const task=real.storage.sync.get(['aiModel','platformSettings','pacingSettings']).then(data=>{
        const values=translate(data);
        if(keys==null)return values;
        const list=typeof keys==='string'?[keys]:Array.isArray(keys)?keys:Object.keys(keys);
        return Object.fromEntries(list.map(k=>[k,values[k]??(typeof keys==='object'&&!Array.isArray(keys)?keys[k]:undefined)]));
      });
      if(callback){task.then(callback);return;}return task;
    }};
    const listeners=new Map();
    const onChanged={addListener(fn){
      const wrapped=(changes,area)=>{
        if(area!=='sync')return;
        const before=translate({aiModel:changes.aiModel?.oldValue,platformSettings:changes.platformSettings?.oldValue,pacingSettings:changes.pacingSettings?.oldValue});
        const after=translate({aiModel:changes.aiModel?.newValue,platformSettings:changes.platformSettings?.newValue,pacingSettings:changes.pacingSettings?.newValue});
        const mapped={};
        if(changes.aiModel)mapped.aiModel=changes.aiModel;
        if(changes.platformSettings||changes.pacingSettings)for(const key of Object.keys(StudyConfig.defaults[platform]))if(JSON.stringify(before[key])!==JSON.stringify(after[key]))mapped[key]={oldValue:before[key],newValue:after[key]};
        if(Object.keys(mapped).length)fn(mapped,area);
      };listeners.set(fn,wrapped);real.storage.onChanged.addListener(wrapped);
    },removeListener(fn){const wrapped=listeners.get(fn);if(wrapped)real.storage.onChanged.removeListener(wrapped);listeners.delete(fn);}};
    return {...real,storage:{...real.storage,sync,onChanged}};
  }
  StudyConfig.boot=async function(platform,start){
    if(initialized.has(platform))return;
    initialized.add(platform);
    const {platformMode='auto'}=await real.storage.sync.get('platformMode');
    if(!StudyConfig.allowed(platform,platformMode))return;
    start(adapterChrome(platform));
  };
})();
