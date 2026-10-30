// Run only inside the Firestore Emulator; never against production.
const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const dep=process.env.RULE_TEST_DEPENDENCIES?createRequire(path.join(process.env.RULE_TEST_DEPENDENCIES,'package.json')):require;
const {initializeTestEnvironment,assertSucceeds,assertFails}=dep('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,query,where,Timestamp,writeBatch,runTransaction}=dep('firebase/firestore');
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Run with firebase emulators:exec --project demo-emojin-v4');
const root=path.join(__dirname,'..'),ctx={};vm.createContext(ctx);
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');vm.runInContext(source.slice(0,source.indexOf('/* MOJI SPIN:')),ctx);
const E=ctx.EmojinEngine,plain=v=>JSON.parse(JSON.stringify(v));
vm.runInContext(source.slice(source.indexOf('/* Daily Moji Draw:'),source.indexOf('/* Firebase configuration is public.')),ctx);
const resident=(id,uid)=>({id,ownerUid:uid,ownerName:uid,isNpc:false,name:id,emoji:'🐸',maxHp:8,currentHp:8,
 slots:Array(6).fill('attack1'),poisoned:false,cursedSlots:[],stars:0,defeats:0,rulesVersion:4,recordVersion:0,status:'active',createdAt:1,endedAt:null});
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-emojin-v4',firestore:{rules:fs.readFileSync(path.join(root,'firestore.rules'),'utf8')}});});
after(async()=>{if(env)await env.cleanup();});
beforeEach(async()=>{
 await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();await Promise.all([
   setDoc(doc(db,'config/battle'),{rulesVersion:4,defeatLimit:5,maintenance:false}),
   setDoc(doc(db,'meta/game'),{battleSeq:0,legendSeq:0}),
   setDoc(doc(db,'owners/u1'),{uid:'u1',name:'Owner',unreadBattleIds:[]}),
   setDoc(doc(db,'wallets/u1'),{uid:'u1',wallet:{balance:1000,updatedAt:1},draft:{id:'e-new'},hatch:0,revision:1}),
   setDoc(doc(db,'emojins/a'),resident('a','u1')),setDoc(doc(db,'emojins/b'),resident('b','u2')),
   setDoc(doc(db,'emojins/history'),{...resident('history','u1'),status:'dead',rulesVersion:3,maxHp:10,currentHp:0})]);
 });
});
test('published announcements are readable by players, drafts are private and all client writes are denied',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();await setDoc(doc(db,'announcements/live'),{body:'公開本文',publishedAt:Timestamp.fromMillis(1000),published:true});
  await setDoc(doc(db,'announcements/draft'),{body:'下書き',publishedAt:Timestamp.fromMillis(2000),published:false});
 });
 const db=env.authenticatedContext('u1').firestore(),anon=env.unauthenticatedContext().firestore();
 await assertSucceeds(getDoc(doc(db,'announcements/live')));await assertFails(getDoc(doc(db,'announcements/draft')));
 await assertFails(getDoc(doc(anon,'announcements/live')));
 const snap=await assertSucceeds(getDocs(query(collection(db,'announcements'),where('published','==',true))));assert.equal(snap.size,1);
 await assertFails(getDocs(collection(db,'announcements')));
 await assertFails(setDoc(doc(db,'announcements/new'),{body:'不正追加',publishedAt:Timestamp.now(),published:true}));
 await assertFails(setDoc(doc(db,'announcements/live'),{body:'不正編集',publishedAt:Timestamp.now(),published:true}));
});
function dailyClient(db){
 const c={E,uid:'u1',db,auth:{currentUser:{uid:'u1'}},local:{},ensureWallet:async()=>{},applyAccount:()=>{},persist:()=>{},
  F:{runTransaction:(db,callback)=>runTransaction(db,tx=>callback({get:ref=>tx.get(ref),set:(ref,value)=>tx.set(ref,plain(value))}))},
  ref:(name,id)=>doc(db,name,id),walletRef:()=>doc(db,'wallets/u1'),receiptRef:id=>doc(db,'wallets/u1/operations/'+id),
  window:{DailyMojiDraw:ctx.DailyMojiDraw,dispatchEvent:()=>{}},Event:class{}};
 vm.createContext(c);
 for(const [start,end] of [['  async function requireMatchRules(','  // One live subscription'],['  function nextAccount(','  function ensureWallet('],['  writeOperation=async op=>{','  // Pending operations keep their IDs']])vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),c);
 return (choice,day='2026-10-27')=>c.writeOperation({id:'daily-'+day,action:'dailyDraw',data:{uid:'u1',choice,
  round:{version:1,day,rewards:[{kind:'moji',amount:100,rare:false},{kind:'hatch',amount:1,rare:false},{kind:'moji',amount:500,rare:true}]}}});
}
test('daily draw uses existing private wallet rules; competing real transactions award only one chosen prize',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  const ref=doc(c.firestore(),'wallets/u1'),old=(await getDoc(ref)).data();
  await setDoc(ref,{...old,wallet:{balance:1000,updatedAt:Date.now()}});
 });
 const db=env.authenticatedContext('u1').firestore(),other=env.authenticatedContext('u1').firestore();
 const [a,b]=await Promise.all([dailyClient(db)(0),dailyClient(other)(2)]);
 assert.deepEqual(plain(a.record),plain(b.record));
 assert.equal((await getDoc(doc(db,'wallets/u1'))).data().wallet.balance,1000+a.record.moji);
 assert.equal((await getDoc(doc(db,'wallets/u1/operations/daily-2026-10-27'))).data().kind,'dailyDraw');
 const again=await dailyClient(db)(1);assert.deepEqual(plain(again.record),plain(a.record));
});
test('daily draw leaves a full hatch gauge unchanged and never clips moji above 3000',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'wallets/u1'),{uid:'u1',wallet:{balance:4000,updatedAt:Date.now()},hatch:10,revision:1}));
 const db=env.authenticatedContext('u1').firestore(),claim=dailyClient(db);
 const first=await claim(1);assert.equal(first.record.hatch,0);assert.equal(first.record.moji,0);
 const second=await claim(2,'2026-10-28');assert.equal(second.record.moji,500);
 const wallet=(await getDoc(doc(db,'wallets/u1'))).data();assert.equal(wallet.wallet.balance,4500);assert.equal(wallet.hatch,10);
});
function batchMatch(db,{legacy=false,badHp=false,id='b-test',prior=0,aPrior=0,tie=false,mutate=null,limit=5}={}){
 const a={...resident('a','u1'),slots:Array(6).fill(tie?'blank':'strong'),defeats:aPrior},b={...resident('b','u2'),slots:Array(6).fill('blank'),defeats:prior},log=E.battle(a,b,E.seeded(1),10000,id);
 log.defeatLimit=limit;
 if(mutate)mutate(log);
 const owners={u1:{uid:'u1',name:'Owner',unreadBattleIds:[]},u2:{uid:'u2',name:'Other',unreadBattleIds:[]}};
 const plan=E.planBattle([a,b],owners,{battleSeq:0,legendSeq:0},log,E.seeded(3));
 if(badHp)plan.emojins[0].currentHp=1;
 const batch=writeBatch(db);
 plan.emojins.forEach(e=>batch.set(doc(db,'emojins/'+e.id),plain(e)));
 batch.set(doc(db,'battles/'+id),legacy?{seq:1,json:JSON.stringify(plan.log)}:plain(E.battleDocument(plan.log)));
 batch.set(doc(db,'wallets/u1'),{uid:'u1',wallet:{balance:900,updatedAt:10000},hatch:1,revision:2});
 return batch;
}
test('valid complete match with reset HP, skulls, NPC refill and own wallet is allowed',async()=>{
 const db=env.authenticatedContext('u1').firestore();await assertSucceeds(batchMatch(db).commit());
 assert.equal((await getDoc(doc(db,'battles/b-test'))).data().rulesVersion,4);
});
test('old client batch cannot update records or spend moji',async()=>{
 const db=env.authenticatedContext('u1').firestore();await assertFails(batchMatch(db,{legacy:true}).commit());
 assert.equal((await getDoc(doc(db,'wallets/u1'))).data().wallet.balance,1000);
});
test('old three-defeat client is rejected even though its rulesVersion is still four',async()=>{
 const db=env.authenticatedContext('u1').firestore();await assertFails(batchMatch(db,{limit:3}).commit());
 assert.equal((await getDoc(doc(db,'wallets/u1'))).data().wallet.balance,1000);
});
for(const prior of [2,3,4,5,6,7,8,9])test(`loss ${prior+1}: new rules accept the matching active/dead result`,async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'emojins/b'),{...resident('b','u2'),defeats:prior}));
 const db=env.authenticatedContext('u1').firestore();await assertSucceeds(batchMatch(db,{prior}).commit());
 const loser=(await getDoc(doc(db,'emojins/b'))).data();
 assert.equal(loser.defeats,prior+1);assert.equal(loser.status,prior>=4?'dead':'active');
});
test('non-reset HP and orphan NPC writes are denied',async()=>{
 const db=env.authenticatedContext('u1').firestore();await assertFails(batchMatch(db,{badHp:true}).commit());
 await assertFails(setDoc(doc(db,'emojins/npc'),{...resident('npc','npc'),isNpc:true,lastBattleId:'missing'}));
});
test('new owner creation is private and requires the reserved draft',async()=>{
 const db=env.authenticatedContext('u1').firestore();await assertSucceeds(setDoc(doc(db,'emojins/e-new'),resident('e-new','u1')));
 await assertFails(setDoc(doc(db,'emojins/not-reserved'),resident('not-reserved','u1')));
 await assertFails(setDoc(doc(db,'emojins/other'),resident('other','u2')));
});
test('authentication, wallet privacy and owner identity restrictions remain',async()=>{
 const anon=env.unauthenticatedContext().firestore(),other=env.authenticatedContext('u2').firestore(),own=env.authenticatedContext('u1').firestore();
 await assertFails(getDoc(doc(anon,'emojins/a')));await assertFails(getDoc(doc(other,'wallets/u1')));
 await assertFails(setDoc(doc(own,'owners/u1'),{uid:'u1',name:'Changed',unreadBattleIds:[]}));
});
test('gates and backups are admin-only; archived history remains readable and immutable',async()=>{
 const db=env.authenticatedContext('u1').firestore();await assertFails(setDoc(doc(db,'config/battle'),{rulesVersion:4,defeatLimit:5,maintenance:false}));
 await assertFails(getDoc(doc(db,'migrationBackups/anything')));
 await assertSucceeds(getDoc(doc(db,'emojins/history')));
 await assertFails(setDoc(doc(db,'emojins/history'),resident('history','u1')));
});
test('maintenance prevents new financial/game mutations, while reads and acknowledgements work',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'config/battle'),{rulesVersion:4,defeatLimit:5,maintenance:true}));
 const db=env.authenticatedContext('u1').firestore();await assertFails(batchMatch(db).commit());
 await assertSucceeds(getDoc(doc(db,'wallets/u1')));
 await assertSucceeds(setDoc(doc(db,'owners/u1'),{uid:'u1',name:'Owner',unreadBattleIds:['b-test']}));
});
test('saved match cannot be committed a second time',async()=>{
 const db=env.authenticatedContext('u1').firestore();await assertSucceeds(batchMatch(db).commit());await assertFails(batchMatch(db).commit());
});
test('competing clients with the same old inputs cannot both commit',async()=>{
 const one=env.authenticatedContext('u1').firestore(),two=env.authenticatedContext('u1').firestore();
 const results=await Promise.allSettled([batchMatch(one,{id:'b-one'}).commit(),batchMatch(two,{id:'b-two'}).commit()]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await getDoc(doc(one,'emojins/a'))).data().recordVersion,1);
 assert.equal((await getDoc(doc(one,'wallets/u1'))).data().wallet.balance,900);
});

// Execute the unchanged synchronous GAS REST adapter against the local emulator.
// Admin auth here represents GAS IAM; client-rule permissions are tested separately above.
function gasRuntime() {
 const {spawnSync}=require('node:child_process');
 const host=process.env.FIRESTORE_EMULATOR_HOST;
 assert.match(host,/^(127\.0\.0\.1|localhost):\d+$/);
 const productionPrefix='https://firestore.googleapis.com/v1/projects/demo-emojin-v4/databases/(default)/documents';
 const c={console,PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'demo-emojin-v4'})},
  ScriptApp:{getOAuthToken:()=> 'owner'},Utilities:{sleep:()=>{}},UrlFetchApp:{fetch:(url,options)=>{
   assert.ok(url.startsWith(productionPrefix),'Only the demo project is allowed');
   const local='http://'+host+'/v1/projects/demo-emojin-v4/databases/(default)/documents'+url.slice(productionPrefix.length);
   const args=['--silent','--show-error','--noproxy','127.0.0.1,localhost','--max-time','10',
    '--request',(options.method||'get').toUpperCase(),'--header','Authorization: Bearer owner',
    '--header','Content-Type: application/json','--write-out','\n%{http_code}'];
   if(options.payload)args.push('--data-binary',options.payload);
   args.push(local);
   const result=spawnSync('curl',args,{encoding:'utf8',maxBuffer:20*1024*1024});
   assert.equal(result.status,0,result.stderr+' '+local);
   const split=result.stdout.lastIndexOf('\n'),body=result.stdout.slice(0,split),status=Number(result.stdout.slice(split+1));
   return {getResponseCode:()=>status,getContentText:()=>body};
  }}};
 vm.createContext(c);
 for(const file of ['Engine.gs','Code.gs','Migration.gs'])vm.runInContext(fs.readFileSync(path.join(root,'gas',file),'utf8'),c);
 return c;
}
test('GAS REST scheduler commits a complete match with real Firestore transactions and resumes idempotently',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();await setDoc(doc(db,'meta/game'),{battleSeq:0,legendSeq:0,hour:99});
  await setDoc(doc(db,'owners/u2'),{uid:'u2',name:'Other',unreadBattleIds:[]});
 });
 const gas=gasRuntime(),store=gas.firestore_();let result;
 for(let i=0;i<10;i++){result=gas.scheduledStep_(store,100);if(result.done)break;}
 assert.equal(result.done,true);assert.equal(store.get('meta/game').battleSeq,1);
 const saved=store.query('battles');assert.equal(saved.length,1);
 const log=JSON.parse(saved[0].data.json);assert.equal(log.rulesVersion,4);assert.ok(log.turns.length<=10);
 assert.equal(store.query('emojins',null,true).length,10);
 for(const e of log.after){const value=store.get('emojins/'+e.id);assert.equal(value.currentHp,value.maxHp);assert.equal(value.recordVersion,1);}
 for(const uid of log.ownerUids)assert.deepEqual(plain(store.get('owners/'+uid).unreadBattleIds),[log.battleId]);
 gas.scheduledStep_(store,100);assert.equal(store.query('battles').length,1);
});
test('GAS REST migration previews, backs up, migrates drafts and preserves post-migration skulls on rerun',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();await setDoc(doc(db,'config/battle'),{rulesVersion:4,defeatLimit:5,maintenance:true});
  await setDoc(doc(db,'emojins/a'),{...resident('a','u1'),rulesVersion:3,maxHp:9,currentHp:1,stars:12,poisoned:true,cursedSlots:[0]});
  await setDoc(doc(db,'wallets/u1'),{uid:'u1',wallet:{balance:1000,updatedAt:1},hatch:7,revision:1,draft:{id:'draft',maxHp:10,paid:true,cost:1200}});
 });
 const gas=gasRuntime(),store=gas.firestore_();assert.equal(gas.previewV4Migration().emojinCount,1);
 assert.equal(store.get('emojins/a').maxHp,9);assert.equal(store.query('migrationBackups').length,0);
 const result=gas.migrateToV4();assert.equal(result.changed,1);assert.equal(result.drafts,1);
 assert.equal(store.get('emojins/a').maxHp,8);assert.equal(store.get('emojins/a').stars,12);
 assert.equal(store.get('emojins/a').currentHp,8);assert.equal(store.get('emojins/a').poisoned,false);
 assert.equal(store.get('wallets/u1').draft.maxHp,8);assert.equal(store.get('wallets/u1').wallet.balance,1000);
 assert.equal(store.get('wallets/u1').hatch,7);assert.equal(store.query('migrationBackups').length,2);
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'emojins/a'),plain({...store.get('emojins/a'),defeats:2})));
 assert.equal(gas.migrateToV4().changed,0);assert.equal(store.get('emojins/a').defeats,2);
 assert.equal(store.get('emojins/history').maxHp,10);
 gas.finishV4Migration();assert.equal(store.get('config/battle').maintenance,false);
});

test('old ten-defeat client cannot commit after the five-defeat cutover',async()=>{
 const db=env.authenticatedContext('u1').firestore();await assertFails(batchMatch(db,{limit:10}).commit());
 assert.equal((await getDoc(doc(db,'wallets/u1'))).data().wallet.balance,1000);
});
for(const aPrior of [5,6,7,8,9])test(`grandfathered ${aPrior} skull winner remains active with unchanged counter`,async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'emojins/a'),{...resident('a','u1'),defeats:aPrior}));
 const db=env.authenticatedContext('u1').firestore();await assertSucceeds(batchMatch(db,{aPrior}).commit());
 const winner=(await getDoc(doc(db,'emojins/a'))).data();assert.equal(winner.status,'active');assert.equal(winner.defeats,aPrior);
});
test('grandfathered nine-skull draw stays active without rewriting or truncating skulls',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  for(const [id,uid] of [['a','u1'],['b','u2']])await setDoc(doc(c.firestore(),'emojins/'+id),{...resident(id,uid),defeats:9});
 });
 const db=env.authenticatedContext('u1').firestore();await assertSucceeds(batchMatch(db,{aPrior:9,prior:9,tie:true}).commit());
 for(const id of ['a','b']){const e=(await getDoc(doc(db,'emojins/'+id))).data();assert.equal(e.status,'active');assert.equal(e.defeats,9);}
});
test('cannot retire a grandfathered winner without a new skull',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'emojins/a'),{...resident('a','u1'),defeats:9}));
 const db=env.authenticatedContext('u1').firestore();await assertFails(batchMatch(db,{aPrior:9,mutate:log=>{
  log.after[0].status='dead';log.after[0].endedAt=10000;
 }}).commit());
});
test('cannot keep a fifth-skull loser active or truncate inherited skulls',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'emojins/b'),{...resident('b','u2'),defeats:4}));
 const db=env.authenticatedContext('u1').firestore();await assertFails(batchMatch(db,{prior:4,mutate:log=>{
  log.after[1].status='active';log.after[1].endedAt=null;
 }}).commit());
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'emojins/a'),{...resident('a','u1'),defeats:9}));
 await assertFails(batchMatch(db,{aPrior:9,prior:4,mutate:log=>{log.after[0].defeats=5;}}).commit());
});

test('old clients cannot save same-owner battles or bypass the check with an after-state NPC flag',async()=>{
 for(const fakeNpc of [false,true]){
  const a=resident('a','u1'),b=resident('b','u1');
  await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'emojins/b'),b);});
  // Build an old-client payload directly; the new planner already rejects this pair.
  const log=E.battle(a,b,E.seeded(1),10000,'b-friendly');
  if(fakeNpc)log.after[0].isNpc=true;
  const db=env.authenticatedContext('u1').firestore(),batch=writeBatch(db);
  log.after.forEach(e=>batch.set(doc(db,'emojins/'+e.id),plain(e)));
  batch.set(doc(db,'battles/b-friendly'),plain(E.battleDocument(log)));
  batch.set(doc(db,'wallets/u1'),{uid:'u1',wallet:{balance:900,updatedAt:10000},hatch:1,revision:2});
  await assertFails(batch.commit());
  assert.equal((await getDoc(doc(db,'wallets/u1'))).data().wallet.balance,1000);
  assert.equal((await getDoc(doc(db,'emojins/a'))).data().recordVersion,0);
  assert.equal((await getDoc(doc(db,'battles/b-friendly'))).exists(),false);
 }
});
test('NPC versus NPC battles remain writable under the owner restriction',async()=>{
 const a={...resident('a','npc'),isNpc:true},b={...resident('b','npc'),isNpc:true};
 await env.withSecurityRulesDisabled(async c=>{await Promise.all([setDoc(doc(c.firestore(),'emojins/a'),a),setDoc(doc(c.firestore(),'emojins/b'),b)]);});
 const log=E.battle(a,b,E.seeded(1),10000,'b-npcs'),db=env.authenticatedContext('u1').firestore(),batch=writeBatch(db);
 log.after.forEach(e=>batch.set(doc(db,'emojins/'+e.id),plain(e)));
 batch.set(doc(db,'battles/b-npcs'),plain(E.battleDocument(log)));await assertSucceeds(batch.commit());
});
