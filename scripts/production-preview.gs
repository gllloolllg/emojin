/** Read-only production inventory. Safe to add to the existing GAS before replacing its engine. */
function previewProductionV4() {
  const projectId = 'emojin-49855';
  const base = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
  function decode(v) {
    if ('mapValue' in v) return fields(v.mapValue.fields || {});
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('stringValue' in v) return v.stringValue;
    if ('timestampValue' in v) return v.timestampValue;
    return null;
  }
  function fields(raw) {
    return Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,decode(v)]));
  }
  function query(collection, active) {
    const structuredQuery = {from:[{collectionId:collection}]};
    if (active) structuredQuery.where = {fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'active'}}};
    const response = UrlFetchApp.fetch(base + ':runQuery', {
      method:'post', contentType:'application/json',
      headers:{Authorization:'Bearer ' + ScriptApp.getOAuthToken()},
      payload:JSON.stringify({structuredQuery}), muteHttpExceptions:true
    });
    const raw = JSON.parse(response.getContentText());
    if (response.getResponseCode() >= 400) throw Error('Preview failed: ' + response.getContentText());
    return raw.filter(row=>row.document).map(row=>({
      path:row.document.name.split('/documents/')[1],data:fields(row.document.fields || {})
    }));
  }
  const active = query('emojins', true), wallets = query('wallets', false);
  const emojins = [], draftWallets = [], invalid = [];
  for (const row of active) {
    const e = row.data, version = Number(e.rulesVersion || 3);
    if (!e.id || e.id !== row.path.split('/')[1] || version > 4 ||
        (e.rulesVersion != null && !Number.isInteger(e.rulesVersion)) ||
        !Number.isInteger(e.maxHp) || e.maxHp < 5 || e.maxHp > (version===4?8:10) ||
        !Number.isInteger(e.stars) || e.stars < 0 || e.stars >= 50 ||
        !Number.isInteger(e.defeats || 0) || (e.defeats || 0) < 0 || (e.defeats || 0) >= 3 ||
        (version===4 && (!Number.isInteger(e.defeats) || e.currentHp!==e.maxHp || e.poisoned!==false || !Array.isArray(e.cursedSlots) || e.cursedSlots.length))) {
      invalid.push({path:row.path,reason:'Unexpected active record; inspect before migration'});continue;
    }
    if (version !== 4) emojins.push({id:e.id,fromMaxHp:e.maxHp,toMaxHp:Math.min(e.maxHp,8),stars:e.stars,defeats:e.defeats || 0});
  }
  for (const row of wallets) {
    const d = row.data.draft;if (!d) continue;
    if (!d.id || (d.rulesVersion != null && !Number.isInteger(d.rulesVersion)) || Number(d.rulesVersion || 3)>4 || !Number.isInteger(d.maxHp) || d.maxHp<5 || d.maxHp>10) {
      invalid.push({path:row.path,reason:'Unexpected draft; inspect before migration'});continue;
    }
    if (d.rulesVersion!==4 || d.maxHp>8) draftWallets.push({path:row.path,draftId:d.id,fromMaxHp:d.maxHp,toMaxHp:Math.min(d.maxHp,8)});
  }
  const report = {projectId,readOnly:true,
    capturedAtJst:Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy-MM-dd HH:mm:ss'),
    activeCount:active.length,emojinCount:emojins.length,
    hpReducedCount:emojins.filter(e=>e.fromMaxHp!==e.toMaxHp).length,
    draftCount:draftWallets.length,invalidCount:invalid.length};
  console.log(JSON.stringify({type:'summary',...report}));
  for (const [type,items] of [['emojins',emojins],['draftWallets',draftWallets],['invalid',invalid]])
    for (let i=0;i<items.length;i+=10) console.log(JSON.stringify({type,batch:i/10+1,items:items.slice(i,i+10)}));
  return {...report,emojins,draftWallets,invalid};
}
