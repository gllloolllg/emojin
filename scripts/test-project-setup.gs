/** Test project only. No automatic execution, production data import, or trigger registration. */
function testStore_() {
  const project=PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID')||FIREBASE_PROJECT_ID;
  if(FIREBASE_PROJECT_ID!=='emojin-test'||project!=='emojin-test')throw Error('Test setup only connects to emojin-test.');
  return firestore_();
}
function checkTestConnection() {
  const store=testStore_(),gate=store.get('config/battle'),meta=store.get('meta/game');
  const report={projectId:'emojin-test',rulesVersion:gate?.rulesVersion||null,
    maintenance:gate?.maintenance??null,activeCount:store.query('emojins',null,true).length,initialized:!!meta};
  console.log(JSON.stringify(report));return report;
}
function initializeTestWorld() {
  const store=testStore_(),hour=Math.floor(Date.now()/3600000);
  store.transaction(tx=>{
    const gate=tx.get('config/battle'),meta=tx.get('meta/game');
    if(gate||meta) {
      if(gate?.rulesVersion===4 && gate.maintenance===false && meta?.battleRulesVersion===4)
        return {writes:[],value:{alreadyInitialized:true}};
      throw Error('Test database already has configuration; inspect it before initialization.');
    }
    for(const name of ['emojins','owners','wallets','battles','legends'])
      if(tx.query(name).length)throw Error('Test initialization requires an empty database: '+name);
    return {writes:[tx.write('config/battle',{rulesVersion:4,defeatLimit:EmojinEngine.DEFEAT_LIMIT,maintenance:false}),
      tx.write('meta/game',{battleRulesVersion:4,battleSeq:0,legendSeq:0,hour:hour-1,runningHour:0,
        scheduledCount:0,revision:0,suspendedOwnerUids:[],dormantOwnerUids:[]})],value:{initialized:true}};
  });
  scheduledStep_(store,hour,{initializeOnly:true});
  return checkTestConnection();
}

function checkTestBattle() {
  const store = testStore_();
  const meta = store.get('meta/game') || {};
  const logs = store.query('battles')
    .map(row => JSON.parse(row.data.json))
    .sort((a, b) => Number(b.seq) - Number(a.seq));
  const last = logs[0] || null;
  const records = last
    ? last.after.map(e => store.get('emojins/' + e.id))
    : [];
  const report = {
    projectId: 'emojin-test',
    currentHour: Math.floor(Date.now() / 3600000),
    completedHour: Number(meta.hour || 0),
    battleCount: logs.length,
    battleSeq: Number(meta.battleSeq || 0),
    lastBattle: last ? {
      battleId: last.battleId,
      rulesVersion: last.rulesVersion,
      turns: last.turns.length,
      result: last.result,
      records: records.map(e => e ? {
        id: e.id,
        stars: e.stars,
        defeats: e.defeats,
        status: e.status,
        currentHp: e.currentHp,
        maxHp: e.maxHp
      } : null),
      resetConfirmed: records.every(e => e &&
        e.currentHp === e.maxHp && e.poisoned === false &&
        Array.isArray(e.cursedSlots) && e.cursedSlots.length === 0)
    } : null
  };
  console.log(JSON.stringify(report));
  return report;
}
