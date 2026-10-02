/* Plain data validation shared by the Connect adapter and local verification. */
(() => {
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const amount=v=>typeof v==='string'&&/^(?:|\d{1,12}(?:\.\d{1,4})?)$/.test(v);
  const sameAmount=(a,b)=>a===''&&b===''||a!==''&&b!==''&&Number(String(a).replace(/,/g,''))===Number(b);
  function journal(answer,capacity,options){
    if(!answer||typeof answer!=='object'||Array.isArray(answer)||Object.keys(answer).join()!=='journal'||!Array.isArray(answer.journal)||!answer.journal.length||answer.journal.length>capacity)throw Error('Expected a journal array within the worksheet row limit.');
    let debit=0,credit=0;
    const rows=answer.journal.map(row=>{
      if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join()!=='account,credit,debit'||!options.includes(row.account)||!amount(row.debit)||!amount(row.credit))throw Error('An account or amount does not match the worksheet.');
      if(row.debit!==''&&row.credit!=='')throw Error('Each row must contain either a debit or a credit.');
      debit+=Number(row.debit);credit+=Number(row.credit);
      return {...row};
    });
    if(rows.some(r=>r.account==='No Journal Entry Required')){
      if(rows.length!==1||rows[0].debit!==''||rows[0].credit!=='')throw Error('No Journal Entry Required must have no amounts.');
    }else if(!debit||Math.abs(debit-credit)>0.005||rows.some(r=>r.debit===''&&r.credit===''))throw Error('Debits and credits must balance and every account row needs an amount.');
    return rows;
  }
  function compatible(existing,rows){
    return existing.every((r,i)=>Object.entries(r).every(([k,v])=>!text(v)||(k==='account'?text(v)===text(rows[i]?.[k]):sameAmount(text(v),rows[i]?.[k]??''))));
  }
  globalThis.McGrawSchema={text,amount,sameAmount,journal,compatible};
})();
