// Run with: node --test tests/battle-modes.test.cjs
// Exercise the shipped engine and transaction body without production Firebase.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=readFileSync(join(__dirname,'..','app.js'),'utf8');
const gateSource=source.slice(source.indexOf('  async function requireMatchRules('),source.indexOf('  // One live subscription'));
const context={crypto:webcrypto};
vm.createContext(context);
vm.runInContext(source.slice(0,source.indexOf('/* Firebase configuration is public.')),context);
const E=context.EmojinEngine;
const clone=value=>JSON.parse(JSON.stringify(value));
const resident=(id,ownerUid,stars=0)=>({
  id,ownerUid,stars,ownerName:ownerUid,isNpc:ownerUid==='npc',emoji:'🐸',name:id,
  currentHp:8,maxHp:8,defeats:0,rulesVersion:4,recordVersion:0,slots:Array(6).fill('attack1'),poisoned:false,cursedSlots:[],
  status:'active',createdAt:Date.now(),endedAt:null
});

test('challenge chooses both tied town champions, never itself',()=>{
  const pool=[resident('a','one',9),resident('b','two',9),resident('c','me',3)];
  const anchors=new Set(),opponents=new Set();
  for(let n=0;n<100;n++){
    const pair=E.selectBattlePair(pool,'challenge','me',pool,E.seeded(n));
    assert.equal(pair.length,2);assert.equal(pair[0].stars,9);
    assert.notEqual(pair[0].id,pair[1].id);anchors.add(pair[0].id);opponents.add(pair[1].id);
  }
  assert.equal(anchors.size,2);assert.equal(opponents.size,3);
});
test('mine draws from all owned candidates and allows another owned opponent',()=>{
  const pool=[resident('a','me'),resident('b','me'),resident('c','other')];
  const anchors=new Set();let sameOwnerOpponent=false;
  for(let n=0;n<100;n++){
    const pair=E.selectBattlePair(pool,'mine','me',pool,E.seeded(n));
    assert.equal(pair[0].ownerUid,'me');assert.notEqual(pair[0].id,pair[1].id);
    anchors.add(pair[0].id);sameOwnerOpponent ||= pair[1].ownerUid==='me';
  }
  assert.equal(anchors.size,2);assert.ok(sameOwnerOpponent);
});
test('zero-star ties, absent owners, lone residents and suspended champions',()=>{
  const a=resident('a','me'),b=resident('b','other'),champion=resident('c','suspended',10);
  assert.equal(E.battleAnchors([a,b],'challenge','me').length,2);
  assert.equal(E.selectBattlePair([b],'mine','me').length,0);
  assert.equal(E.selectBattlePair([a],'mine','me').length,0);
  // The displayed champion remains the champion; do not substitute a lower rank.
  assert.equal(E.selectBattlePair([a,b],'challenge','me',[a,b,champion]).length,0);
  assert.equal(E.selectBattlePair([a,b],'mine','me',[a,b,champion]).length,2);
  assert.throws(()=>E.battleMode('__proto__'),/不正/);
});
test('forced and hourly modes both use match rules v4',()=>{
  const pool=[resident('a','me'),resident('b','other')];
  assert.equal(E.selectBattlePair(pool,'forced','me',pool,E.seeded(1)).length,2);
  assert.equal(E.forced(pool,E.seeded(1)).battles.length,1);
  assert.equal(E.hourly(pool,E.seeded(1)).battles.length,1);
  assert.equal(E.battle(pool[0],pool[1],E.seeded(1)).rulesVersion,4);
});

function database({balance=1000,hatch=3,retry=false,meta={},pool}={}){
  pool ||= [resident('champ','other',10),resident('mine','me',4),resident('npc','npc',1)];
  let documents=new Map();
  const put=(path,value)=>documents.set(path,clone(value));
  put('wallets/me',{uid:'me',wallet:{balance,updatedAt:Date.now()},hatch,revision:1,recentOperations:[]});
  put('config/battle',{rulesVersion:4,maintenance:false});
  put('meta/game',{battleSeq:0,legendSeq:0,...meta});
  for(const e of pool){
    put('emojins/'+e.id,e);
    if(!e.isNpc)put('owners/'+e.ownerUid,{uid:e.ownerUid,unreadBattleIds:[],lastAccessAt:Date.now()});
  }
  const snap=path=>({exists:()=>documents.has(path),data:()=>documents.has(path)?clone(documents.get(path)):undefined});
  const sandbox={local:{},window:{dispatchEvent:()=>{}},Event:class{},persist:()=>{},E,uid:'me',db:{},auth:{currentUser:{uid:'me'}},
    ref:(collection,id)=>collection+'/'+id,metaRef:'meta/game',walletRef:()=> 'wallets/me',
    receiptRef:id=>'wallets/me/operations/'+id,
    data:s=>s.exists()?s.data():null,defaultMeta:()=>({}),ensureWallet:async()=>{},applyAccount:()=>{},
    activeDocs:async()=>({docs:[...documents.keys()].filter(path=>path.startsWith('emojins/')&&documents.get(path).status==='active').map(snap)}),
    F:{runTransaction:async(_db,callback)=>{
      const execute=async commit=>{
        const changes=[];let writing=false;
        const tx={get:async path=>{assert.equal(writing,false,'Firestore reads must precede writes');return snap(path);},
          set:(path,value)=>{writing=true;changes.push([path,clone(value)]);},
          update:(path,value)=>{writing=true;changes.push([path,{...clone(documents.get(path)),...clone(value)}]);}};
        const result=await callback(tx);
        if(commit)for(const [path,value]of changes)put(path,value);
        return result;
      };
      if(retry){retry=false;await execute(false);}
      return execute(true);
    }}
  };
  vm.createContext(sandbox);
  const nextAccount=source.slice(source.indexOf('  function nextAccount('),source.indexOf('  function ensureWallet('));
  const writeOperation=source.slice(source.indexOf('  writeOperation=async op=>{'),source.indexOf('  // Pending operations keep their IDs'));
  vm.runInContext(gateSource+'\n'+nextAccount+'\n'+writeOperation,sandbox);
  return {
    read:path=>clone(documents.get(path)),put,local:sandbox.local,
    operation(mode='forced',ids=mode==='mine'?['mine','champ']:['champ','mine']){
      const pair=ids.map(id=>documents.get('emojins/'+id));
      return {id:'battle-test',action:'battle',data:{uid:'me',hatchReward:true,walletVersion:2,battleRequest:{
        battleId:'test',rulesVersion:4,mode,ids,seed:1,at:Date.now(),
        expected:pair.map(E.recordVersion)}}};
    },
    run:op=>sandbox.writeOperation(op)
  };
}
for(const mode of ['forced','challenge','mine']){
  test(`${mode}: atomic charge, hatch increment, retry and duplicate receipt`,async()=>{
    const db=database({retry:true}),op=db.operation(mode);
    await db.run(op);
    const wallet=db.read('wallets/me');
    assert.equal(wallet.wallet.balance,mode==='forced'?900:800);
    assert.equal(wallet.hatch,mode==='forced'?4:5);
    assert.equal(db.read('meta/game').battleSeq,1);
    assert.ok(db.read('battles/test'));
    await db.run(op);
    assert.deepEqual(db.read('wallets/me'),wallet);
    assert.equal(db.read('meta/game').battleSeq,1);
  });
}
test('new battle can spend the last 200 and hatch is capped at ten',async()=>{
  const db=database({balance:200,hatch:9});await db.run(db.operation('mine'));
  assert.equal(db.read('wallets/me').wallet.balance,0);assert.equal(db.read('wallets/me').hatch,10);
});
test('insufficient funds do not change wallet, hatch or world',async()=>{
  const db=database({balance:199}),before=db.read('wallets/me');
  await assert.rejects(db.run(db.operation('challenge')),/200モジ/);
  assert.deepEqual(db.read('wallets/me'),before);assert.equal(db.read('meta/game').battleSeq,0);
});
test('stale pair, changed champion, wrong owner and self-battle never charge',async()=>{
  for(const scenario of ['stale','champion','owner','self']){
    const db=database(),op=db.operation(scenario==='owner'?'mine':'challenge');
    if(scenario==='stale')db.put('emojins/champ',{...db.read('emojins/champ'),currentHp:9});
    if(scenario==='champion')db.put('emojins/npc',{...db.read('emojins/npc'),stars:20});
    if(scenario==='owner')op.data.battleRequest.ids=['champ','mine'];
    if(scenario==='self')op.data.battleRequest.ids=['champ','champ'];
    // Match versions for the ownership/self cases, so their own validation must fail.
    if(['owner','self'].includes(scenario))op.data.battleRequest.expected=op.data.battleRequest.ids.map(id=>{
      const e=db.read('emojins/'+id);return E.recordVersion(e);
    });
    const before=db.read('wallets/me');
    await assert.rejects(db.run(op));assert.deepEqual(db.read('wallets/me'),before);
    assert.equal(db.read('meta/game').battleSeq,0);
  }
});
test('suspended/dormant participants are rejected at save time',async()=>{
  for(const key of ['suspendedOwnerUids','dormantOwnerUids']){
    const db=database({meta:{[key]:['other']}}),before=db.read('wallets/me');
    await assert.rejects(db.run(db.operation('challenge')));
    assert.deepEqual(db.read('wallets/me'),before);
    // Also cover a valid owned anchor whose opponent has become unavailable.
    const opponentDb=database({meta:{[key]:['other']}}),opponentBefore=opponentDb.read('wallets/me');
    await assert.rejects(opponentDb.run(opponentDb.operation('mine')));
    assert.deepEqual(opponentDb.read('wallets/me'),opponentBefore);
  }
});
test('owner document reaching seven unread battles rejects an outdated metadata snapshot',async()=>{
  const db=database(),before=db.read('wallets/me');
  db.put('owners/other',{uid:'other',unreadBattleIds:Array(7).fill('old')});
  await assert.rejects(db.run(db.operation('challenge')),/休止中/);
  assert.deepEqual(db.read('wallets/me'),before);
});
test('unknown mode and new mode without wallet version are rejected without charge',async()=>{
  for(const scenario of ['unknown','unpaid']){
    const db=database(),op=db.operation('challenge'),before=db.read('wallets/me');
    if(scenario==='unknown')op.data.battleRequest.mode='other';else delete op.data.walletVersion;
    await assert.rejects(db.run(op));assert.deepEqual(db.read('wallets/me'),before);
  }
});
test('queued original battle without a mode still costs 100 and grants one hatch',async()=>{
  const db=database(),op=db.operation();delete op.data.battleRequest.mode;
  await db.run(op);assert.equal(db.read('wallets/me').wallet.balance,900);assert.equal(db.read('wallets/me').hatch,4);
});
test('old uncommitted v3 request is archived and cancelled without cost, hatch or log',async()=>{
  const db=database({retry:true}),op=db.operation();delete op.data.battleRequest.rulesVersion;
  const before=db.read('wallets/me');
  const result=await db.run(op);assert.equal(result.cancelled,true);
  assert.deepEqual(db.read('wallets/me'),before);assert.equal(db.read('meta/game').battleSeq,0);
  assert.equal(db.local.cancelledOperations.length,1);
});
test('maintenance rejects a match before changing any financial or world data',async()=>{
  const db=database(),before=db.read('wallets/me');db.put('config/battle',{rulesVersion:4,maintenance:true});
  await assert.rejects(db.run(db.operation()),error=>error.code==='rules-transition');
  assert.deepEqual(db.read('wallets/me'),before);assert.equal(db.read('meta/game').battleSeq,0);
});
