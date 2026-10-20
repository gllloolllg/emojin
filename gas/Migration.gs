/** Admin-only, manual migration. Never invoked by setupGame/hourlyBattle or the frontend. */
function previewV4Migration() {
  const store=firestore_(),active=store.query('emojins',null,true),wallets=store.query('wallets');
  const targets=active.filter(row=>row.data.rulesVersion!==EmojinEngine.RULES_VERSION);
  if(active.some(row=>Number(row.data.rulesVersion||3)>4))throw Error('Future rules version; do not downgrade');
  for(const row of active) {
    const e=EmojinEngine.migrateActive(row.data);
    if(!Number.isInteger(e.maxHp)||e.maxHp<5||e.maxHp>8||e.currentHp!==e.maxHp||e.poisoned||e.cursedSlots.length
      ||!Number.isInteger(e.defeats)||e.defeats<0||e.defeats>=EmojinEngine.DEFEAT_LIMIT||!Number.isInteger(e.stars)||e.stars<0||e.stars>=50) {
      throw Error('Invalid active record; inspect '+row.path);
    }
  }
  const drafts=wallets.filter(row=>row.data.draft && JSON.stringify(row.data.draft)!==JSON.stringify(EmojinEngine.normalizeDraft(row.data.draft)));
  const report={activeCount:active.length,emojinCount:targets.length,draftCount:drafts.length,
    emojins:targets.map(row=>({id:row.data.id,fromMaxHp:row.data.maxHp,toMaxHp:EmojinEngine.migrateActive(row.data).maxHp})),
    draftWallets:drafts.map(row=>row.path)};
  console.log(JSON.stringify(report));return report;
}
function pauseForV4Migration() {
  return firestore_().transaction(tx=>({writes:[tx.write('config/battle',{rulesVersion:4,defeatLimit:EmojinEngine.DEFEAT_LIMIT,maintenance:true})],value:{paused:true}}));
}
function migrateToV4() {
  const store=firestore_();
  if(store.get('config/battle')?.maintenance!==true)throw Error('Pause before migrating');
  const candidates=store.query('emojins',null,true).filter(row=>row.data.rulesVersion!==4).slice(0,25);
  let changed=0;
  for(const row of candidates)if(store.transaction(tx=>{
    if(tx.get('config/battle')?.maintenance!==true)throw Error('Migration pause ended');
    const old=tx.get(row.path);
    if(!old||old.status!=='active'||old.rulesVersion===4)return {writes:[],value:null};
    if(Number(old.rulesVersion||3)>4)throw Error('Future rules version');
    const backup='migrationBackups/v4-emojin-'+old.id;
    if(tx.get(backup))throw Error('Backup exists but emojin is not migrated; inspect manually');
    return {writes:[tx.write(backup,{path:row.path,before:old}),tx.write(row.path,EmojinEngine.migrateActive(old))],value:true};
  }))changed++;
  let drafts=0;
  for(const row of store.query('wallets').filter(row=>row.data.draft && JSON.stringify(row.data.draft)!==JSON.stringify(EmojinEngine.normalizeDraft(row.data.draft))).slice(0,25)) {
    if(store.transaction(tx=>{
      if(tx.get('config/battle')?.maintenance!==true)throw Error('Migration pause ended');
      const old=tx.get(row.path);if(!old?.draft)return {writes:[],value:null};
      const next=EmojinEngine.normalizeDraft(old.draft);
      if(JSON.stringify(next)===JSON.stringify(old.draft))return {writes:[],value:null};
      const backup='migrationBackups/v4-draft-'+old.uid;
      if(tx.get(backup))throw Error('Draft backup exists; inspect manually');
      return {writes:[tx.write(backup,{path:row.path,beforeDraft:old.draft}),tx.write(row.path,{...old,draft:next,revision:Number(old.revision||0)+1})],value:true};
    }))drafts++;
  }
  return {changed,drafts,remaining:previewV4Migration()};
}
function finishV4Migration() {
  const store=firestore_(),report=previewV4Migration();
  if(report.emojinCount||report.draftCount)throw Error('Migration still has pending documents');
  return store.transaction(tx=>{
    const gate=tx.get('config/battle');if(gate?.maintenance!==true)throw Error('Not paused');
    const meta=tx.get('meta/game')||{};
    return {writes:[tx.write('config/battle',{rulesVersion:4,defeatLimit:EmojinEngine.DEFEAT_LIMIT,maintenance:false}),
      tx.write('meta/game',{...meta,battleRulesVersion:4,revision:Number(meta.revision||0)+1})],value:{enabled:true}};
  });
}
