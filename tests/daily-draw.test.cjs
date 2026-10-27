const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context={crypto:webcrypto};vm.createContext(context);
vm.runInContext(source.slice(0,source.indexOf('/* Firebase configuration is public.')),context);
const E=context.EmojinEngine,D=context.DailyMojiDraw,plain=value=>JSON.parse(JSON.stringify(value));
const round=(day='2026-10-27')=>({version:1,day,rewards:[{kind:'moji',amount:100,rare:false},{kind:'hatch',amount:1,rare:false},{kind:'moji',amount:500,rare:true}]});
test('daily dates use JST midnight, including the boundary and real calendar validation',()=>{
 assert.equal(D.dayKey(Date.parse('2026-10-26T14:59:59.999Z')),'2026-10-26');
 assert.equal(D.dayKey(Date.parse('2026-10-26T15:00:00Z')),'2026-10-27');
 for(const day of ['2026-02-30','2026-13-01','2026-1-1','bad'])assert.throws(()=>D.validateDay(day));
 assert.equal(D.validateDay('2028-02-29'),'2028-02-29');
});
test('normal draws independently use the exact 30% hatch boundary, inclusive money ranges and one rare',()=>{
 const values=[.299999,.3,0,.999999,.999999,.999999];let i=0;
 const result=D.createRound('2026-10-27',()=>values[i++]);
 assert.deepEqual(plain(result.rewards),[{kind:'hatch',amount:1,rare:false},{kind:'moji',amount:30,rare:false},{kind:'moji',amount:600,rare:true}]);
 assert.equal(D.CONFIG.normalHatchChance,.3);
 let foundHatchPair=false,foundMojiPair=false;const rarePositions=new Set(),normalAmounts=new Set(),rareAmounts=new Set();
 for(let seed=0;seed<6000;seed++){
  const r=D.createRound('2026-10-27',E.seeded(seed));D.validateRound(r);rarePositions.add(r.rewards.findIndex(x=>x.rare));
  const normal=r.rewards.filter(x=>!x.rare);foundHatchPair ||= normal.every(x=>x.kind==='hatch');foundMojiPair ||= normal.every(x=>x.kind==='moji');
  normal.filter(x=>x.kind==='moji').forEach(x=>normalAmounts.add(x.amount));rareAmounts.add(r.rewards.find(x=>x.rare).amount);
 }
 assert.ok(foundHatchPair&&foundMojiPair);assert.deepEqual([...rarePositions].sort(),[0,1,2]);
 assert.ok(normalAmounts.has(30)&&normalAmounts.has(150)&&rareAmounts.has(400)&&rareAmounts.has(600));
});
test('saved rounds reject invalid rewards and saved result validation preserves the authoritative choice',()=>{
 const r=round();const copy=D.validateRound(r);copy.rewards[0].amount=30;assert.equal(r.rewards[0].amount,100);
 for(const bad of [()=>{const r=round();r.rewards[1].amount=2;return r;},()=>{const r=round();r.rewards[0].amount=151;return r;},()=>{const r=round();r.rewards[2].rare=false;return r;}])assert.throws(()=>D.validateRound(bad()));
 const record={kind:'dailyDraw',round:r,choice:2,reward:r.rewards[2],moji:500,hatch:0};
 assert.equal(D.validateRecord(record,r.day).choice,2);assert.throws(()=>D.validateRecord({...record,moji:501},r.day));
});
test('local state recovers corruption and never replaces a finished or newer day from another tab',()=>{
 const values=new Map(),c={window:{DailyMojiDraw:D},FIREBASE_CONFIG:{projectId:'test'},cloud:{uid:'me'},console:{warn:()=>{}},
  localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('const DAILY=window.DailyMojiDraw;'),source.indexOf('function dailyRewardMarkup(')),c);
 c.saveDailyState({day:'2026-10-27',round:round(),choice:null,phase:'choose'});assert.equal(c.readDailyState('2026-10-27').phase,'choose');
 c.saveDailyState({day:'2026-10-27',phase:'done'});c.saveDailyState({day:'2026-10-27',round:round(),choice:0,phase:'all'});
 assert.equal(c.readDailyState('2026-10-27').phase,'done');
 c.saveDailyState({day:'2026-10-28',round:round('2026-10-28'),choice:null,phase:'choose'});c.saveDailyState({day:'2026-10-27',phase:'done'});
 assert.equal(c.readDailyState('2026-10-28').phase,'choose');
 values.set(c.dailyStorageKey(),'bad json');assert.equal(c.readDailyState('2026-10-28'),null);
 c.saveDailyState({day:'2026-10-28',phase:'done'});assert.equal(c.readDailyState('2026-10-28').phase,'done');
});
function database({balance=1000,hatch=0,retry=false}={}){
 const documents=new Map(),put=(key,value)=>documents.set(key,plain(value));
 put('wallets/me',{uid:'me',wallet:{balance,updatedAt:Date.now()},hatch,revision:1,recentOperations:[],slotRound:'existing-slot'});
 put('config/battle',{rulesVersion:4,defeatLimit:5,maintenance:false});let writes=0,serial=Promise.resolve();
 const snap=key=>({exists:()=>documents.has(key),data:()=>documents.has(key)?plain(documents.get(key)):null});
 const c={E,uid:'me',local:{},persist:()=>{},ensureWallet:async()=>{},applyAccount:()=>{},auth:{currentUser:{uid:'me'}},
  db:{},ref:(collection,id)=>collection+'/'+id,walletRef:()=> 'wallets/me',receiptRef:id=>'wallets/me/operations/'+id,
  window:{DailyMojiDraw:D,dispatchEvent:()=>{}},Event:class{},F:{runTransaction:(_db,callback)=>{
   const run=async commit=>{
    let writing=false;const changes=[];
    const tx={get:async key=>{assert.equal(writing,false);return snap(key);},set:(key,value)=>{writing=true;changes.push([key,plain(value)]);}};
    const result=await callback(tx);if(commit)for(const [key,value] of changes){put(key,value);writes++;}return result;
   };
   const result=serial.then(async()=>{if(retry){retry=false;await run(false);}return run(true);});serial=result.catch(()=>{});return result;
  }}};
 vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf('  async function requireMatchRules('),source.indexOf('  // One live subscription')),c);
 vm.runInContext(source.slice(source.indexOf('  function nextAccount('),source.indexOf('  function ensureWallet(')),c);
 vm.runInContext(source.slice(source.indexOf('  writeOperation=async op=>{'),source.indexOf('  // Pending operations keep their IDs')),c);
 return {c,put,read:key=>plain(documents.get(key)),writes:()=>writes,op:(choice=0,r=round())=>({id:'daily-'+r.day,action:'dailyDraw',data:{uid:'me',round:r,choice}}),run:op=>c.writeOperation(op)};
}
test('only the chosen reward is committed, money above 3000 is preserved, retries and duplicates pay once',async()=>{
 const db=database({balance:4000,hatch:4,retry:true}),op=db.op(2);
 const first=await db.run(op);assert.equal(first.record.moji,500);assert.equal(db.read('wallets/me').wallet.balance,4500);
 assert.equal(db.read('wallets/me').hatch,4);assert.equal(db.read('wallets/me').slotRound,'existing-slot');
 const before=db.read('wallets/me'),writes=db.writes();await db.run(db.op(1));
 assert.deepEqual(db.read('wallets/me'),before);assert.equal(db.writes(),writes);
});
test('a hatch award caps at ten and awards nothing else when the gauge is full',async()=>{
 for(const hatch of [0,9,10]){
  const db=database({balance:4000,hatch});const result=await db.run(db.op(1));
  assert.equal(db.read('wallets/me').hatch,Math.min(10,hatch+1));assert.equal(result.record.hatch,hatch===10?0:1);
  assert.equal(db.read('wallets/me').wallet.balance,4000);assert.equal(result.record.moji,0);
 }
});
test('competing choices for one date return the same saved result without redrawing or a second payment',async()=>{
 const db=database({balance:4000,retry:true});const [a,b]=await Promise.all([db.run(db.op(0)),db.run(db.op(2))]);
 assert.deepEqual(plain(a.record),plain(b.record));assert.equal(db.read('wallets/me').wallet.balance,4100);
 assert.equal(db.read('wallets/me').revision,2);
 await db.run(db.op(2,round('2026-10-28')));assert.equal(db.read('wallets/me').wallet.balance,4600);
});
test('invalid requests and maintenance cannot change financial data or create a receipt',async()=>{
 for(const scenario of ['choice','day','maintenance','amount']){
  const db=database(),op=db.op();
  if(scenario==='choice')op.data.choice=3;
  if(scenario==='day')op.id='daily-2026-10-28';
  if(scenario==='maintenance')db.put('config/battle',{rulesVersion:4,defeatLimit:5,maintenance:true});
  if(scenario==='amount')op.data.round.rewards[0].amount=10000;
  const before=db.read('wallets/me');await assert.rejects(db.run(op));assert.deepEqual(db.read('wallets/me'),before);assert.equal(db.writes(),0);
 }
});
