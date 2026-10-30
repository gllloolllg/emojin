/** Firestore scheduler. No anonymous Web-app mutation endpoints. See docs/MATCH_V4.md. */
const FIREBASE_PROJECT_ID = 'emojin-49855';
function firestore_() {
  // Preserve the deployed project's setting; a test project can override it explicitly.
  const project=PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID')||FIREBASE_PROJECT_ID;
  const base='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(project)+'/databases/(default)/documents';
  function request(path,method,body) {
    const response=UrlFetchApp.fetch(base+path,{method:method||'get',contentType:'application/json',
      headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
      ...(body?{payload:JSON.stringify(body)}:{}),muteHttpExceptions:true});
    const status=response.getResponseCode(),text=response.getContentText();
    if(status===404 && (!method||method==='get'))return null;
    const data=text?JSON.parse(text):{};
    if(status>=400)throw Object.assign(Error(data.error?.message||'Firestore '+status),{status,code:data.error?.status});
    return data;
  }
  function encode(value) {
    if(value===null)return {nullValue:null};
    if(typeof value==='boolean')return {booleanValue:value};
    if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};
    if(typeof value==='string')return {stringValue:value};
    if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};
    return {mapValue:{fields:Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,encode(v)]))}};
  }
  function decode(value) {
    if('nullValue' in value)return null;
    if('booleanValue' in value)return value.booleanValue;
    if('integerValue' in value)return Number(value.integerValue);
    if('doubleValue' in value)return value.doubleValue;
    if('stringValue' in value)return value.stringValue;
    if('arrayValue' in value)return (value.arrayValue.values||[]).map(decode);
    if('mapValue' in value)return fields(value.mapValue.fields||{});
    if('timestampValue' in value)return value.timestampValue;
    throw Error('Unsupported Firestore field type');
  }
  const fields=values=>Object.fromEntries(Object.entries(values).map(([k,v])=>[k,decode(v)]));
  function get(path,transaction) {
    // batchGet carries the transaction bytes in JSON, supported by both Firestore and its emulator.
    const name=base.replace('https://firestore.googleapis.com/v1/','')+'/'+path;
    const doc=transaction
      ? (request(':batchGet','post',{documents:[name],transaction})||[]).find(row=>row.found)?.found
      : request('/'+path);
    return doc?fields(doc.fields||{}):null;
  }
  function query(collection,transaction,active) {
    const structuredQuery={from:[{collectionId:collection}]};
    if(active)structuredQuery.where={fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'active'}}};
    return (request(':runQuery','post',{structuredQuery,...(transaction?{transaction}:{})})||[])
      .filter(row=>row.document).map(row=>({path:row.document.name.split('/documents/')[1],data:fields(row.document.fields||{})}));
  }
  function write(path,data) {
    return {update:{name:base.replace('https://firestore.googleapis.com/v1/','')+'/'+path,fields:encode(data).mapValue.fields}};
  }
  function transaction(callback) {
    for(let attempt=0;attempt<5;attempt++) {
      const token=request(':beginTransaction','post',{}).transaction;
      try {
        const result=callback({get:path=>get(path,token),query:(collection,active)=>query(collection,token,active),write});
        if((result.writes||[]).length>450)throw Error('Transaction exceeds safe write limit');
        request(':commit','post',{transaction:token,writes:result.writes||[]});
        return result.value;
      } catch(error) {
        try{request(':rollback','post',{transaction:token});}catch(ignored){}
        if(!([409,429,500,502,503,504].includes(error.status)||['ABORTED','FAILED_PRECONDITION','ALREADY_EXISTS','UNAVAILABLE','DEADLINE_EXCEEDED'].includes(error.code)) || attempt===4)throw error;
        Utilities.sleep(100*(attempt+1));
      }
    }
  }
  return {get,query,write,transaction};
}

function setupGame() {
  // Run manually after the migration and staging checks, never on file upload.
  const store=firestore_(),gate=store.get('config/battle');
  if(gate?.rulesVersion!==EmojinEngine.RULES_VERSION || gate.defeatLimit!==EmojinEngine.DEFEAT_LIMIT || gate.maintenance!==false)throw Error('Migration is not enabled');
  scheduledStep_(store,Math.floor(Date.now()/3600000),{initializeOnly:true});
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='hourlyBattle').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('hourlyBattle').timeBased().everyMinutes(1).create();
}

function scheduledStep_(store,currentHour,options={}) {
  const at=Date.now();
  return store.transaction(tx=>{
    const gate=tx.get('config/battle');
    if(gate?.rulesVersion!==EmojinEngine.RULES_VERSION || gate.defeatLimit!==EmojinEngine.DEFEAT_LIMIT || gate.maintenance!==false)return {writes:[],value:{done:true,paused:true}};
    const storedMeta=tx.get('meta/game');
    const meta=storedMeta||{battleSeq:0,legendSeq:0,hour:options.initializeOnly?currentHour:currentHour-1,runningHour:0,scheduledCount:0};
    const hour=Number(meta.runningHour||0)>Number(meta.hour||0)?Number(meta.runningHour):currentHour;
    if(!options.initializeOnly && Number(meta.hour||0)>=hour)return {writes:[],value:{done:true}};
    const all=tx.query('emojins',true).map(row=>row.data);
    if(all.some(e=>e.rulesVersion!==EmojinEngine.RULES_VERSION))throw Error('Unmigrated active emojin');
    const ownerRows=[...new Set(all.filter(e=>!e.isNpc&&e.ownerUid!=='npc').map(e=>e.ownerUid))]
      .map(uid=>({path:'owners/'+uid,data:tx.get('owners/'+uid)})).filter(row=>row.data);
    const owners={},presenceWrites=[];
    for(const row of ownerRows) {
      const old=row.data,current=EmojinEngine.ownerPresence(old,at);
      owners[current.uid]=current;
      if(JSON.stringify(old)!==JSON.stringify(current))presenceWrites.push(tx.write(row.path,current));
    }
    // Keep markers for owners without active residents, as in the deployed scheduler.
    const suspended=new Set(meta.suspendedOwnerUids||[]),dormant=new Set(meta.dormantOwnerUids||[]);
    for(const uid of new Set(all.filter(e=>!e.isNpc&&e.ownerUid!=='npc').map(e=>e.ownerUid))) {
      if(!owners[uid])continue;
      owners[uid].suspended?suspended.add(uid):suspended.delete(uid);
      owners[uid].dormant?dormant.add(uid):dormant.delete(uid);
    }
    const nextMeta={...meta,suspendedOwnerUids:[...suspended],dormantOwnerUids:[...dormant]};
    const ordinal=Number(meta.runningHour)===hour?Number(meta.scheduledCount||0):0;
    // Restore the existing pre-match maintenance: even an empty/paused world gets NPCs.
    const maintenanceId='b-maint-'+hour+'-'+ordinal+'-'+Number(meta.revision||0);
    const maintenance=EmojinEngine.planBattle(all,owners,nextMeta,{battleId:maintenanceId,battleAt:at,before:[],after:[],legendIds:[]},
      EmojinEngine.seeded((hour^Number(meta.revision||0)^0x4e5043)>>>0)).npcs;
    if(options.initializeOnly || !storedMeta || presenceWrites.length || maintenance.length ||
       JSON.stringify(meta.suspendedOwnerUids||[])!==JSON.stringify(nextMeta.suspendedOwnerUids)||
       JSON.stringify(meta.dormantOwnerUids||[])!==JSON.stringify(nextMeta.dormantOwnerUids)) {
      return {writes:[...presenceWrites,...maintenance.map(e=>tx.write('emojins/'+e.id,e)),
        tx.write('meta/game',{...nextMeta,revision:Number(meta.revision||0)+1})],value:{done:!!options.initializeOnly,maintained:true}};
    }
    const pool=EmojinEngine.eligible(all,owners);
    if(pool.length<2 || (ordinal>=1 && pool.length<=30))return {writes:[tx.write('meta/game',{...nextMeta,hour,runningHour:0,scheduledCount:0,revision:Number(meta.revision||0)+1})],value:{done:true}};
    const seed=((hour*2654435761)^(ordinal*2246822519))>>>0;
    const pair=EmojinEngine.selectBattlePair(pool,'forced',null,pool,EmojinEngine.seeded(seed^0x50414952));
    if(pair.length<2)return {writes:[tx.write('meta/game',{...nextMeta,hour,runningHour:0,scheduledCount:0,revision:Number(meta.revision||0)+1})],value:{done:true,noOpponents:true}};
    const battleId='b-hour-'+hour+'-'+ordinal;
    // Pair selection has a separate stream. The recorded seed means exactly the same match on the frontend.
    const log=EmojinEngine.battle(pair[0],pair[1],EmojinEngine.seeded(seed),at,battleId);
    log.seed=seed;log.source='scheduled';
    const plan=EmojinEngine.planBattle(all,owners,nextMeta,log,EmojinEngine.seeded(seed^0x4e5043));
    const updated=new Map(plan.emojins.map(e=>[e.id,e]));
    const post=all.map(e=>updated.get(e.id)||e).concat(plan.npcs);
    const done=EmojinEngine.participatingCount(post,plan.meta)<=30;
    const writes=[...presenceWrites.filter(w=>!Object.keys(plan.owners).some(uid=>w.update.name.endsWith('/owners/'+uid)))];
    plan.emojins.forEach(e=>writes.push(tx.write('emojins/'+e.id,e)));
    Object.entries(plan.owners).forEach(([uid,owner])=>writes.push(tx.write('owners/'+uid,owner)));
    writes.push(tx.write('battles/'+battleId,EmojinEngine.battleDocument(plan.log)));
    plan.legends.forEach(l=>writes.push(tx.write('legends/'+l.seq,{seq:l.seq,json:JSON.stringify(l)})));
    writes.push(tx.write('meta/game',{...plan.meta,revision:Number(meta.revision||0)+1,
      hour:done?hour:meta.hour,runningHour:done?0:hour,scheduledCount:done?0:ordinal+1}));
    return {writes,value:{done,battleId}};
  });
}

/** Minute trigger with an hourly marker; all effects commit once in Firestore. */
function hourlyBattle() {
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try {
    const store=firestore_(),deadline=Date.now()+210000;
    do {if(scheduledStep_(store,Math.floor(Date.now()/3600000)).done)return;} while(Date.now()<deadline);
    // If trimming population needs more time, the next minute resumes the same hour/ordinal.
  } finally {lock.releaseLock();}
}
