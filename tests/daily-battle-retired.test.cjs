const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8'),plain=x=>JSON.parse(JSON.stringify(x));
function database(saved=false){
 const account={uid:'me',wallet:{balance:4321,updatedAt:123},hatch:19,draft:{id:'reserved'},revision:4,recentOperations:[]};
 const receipt={kind:'dailyBattle',day:'2026-11-09',amount:300};let writes=0;
 const c={uid:'me',auth:{currentUser:{uid:'me'}},db:{},local:{},persist:()=>{},
  walletRef:()=> 'wallet',receiptRef:id=>'receipt/'+id,ensureWallet:async()=>{},applyAccount:()=>{},
  window:{dispatchEvent:()=>{}},Event:class{},F:{runTransaction:async(_,fn)=>fn({
   get:async key=>({exists:()=>key==='wallet'||saved,data:()=>plain(key==='wallet'?account:receipt)}),
   set:()=>{writes++;throw Error('Retired operation must never write');}
  })}};
 vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf('  writeOperation=async op=>{'),source.indexOf('  // Pending operations keep their IDs')),c);
 return {run:action=>c.writeOperation({action,id:'daily-old',data:{uid:'me'}}),writes:()=>writes,account,receipt,local:c.local};
}
test('retired offline claims and naming cancel without wallet changes or new receipts',async()=>{
 for(const action of ['dailyBattleClaim','dailyBattleRename']){
  const db=database(),before=plain(db.account),result=await db.run(action);
  assert.equal(result.cancelled,true);assert.match(result.cancelReason,/終了/);
  assert.deepEqual(plain(result.account),before);assert.equal(db.writes(),0);
  assert.equal(db.local.cancelledOperations.length,1);
 }
});
test('committed old transactions acknowledge the existing receipt without repeating its payment',async()=>{
 for(const action of ['dailyBattleClaim','dailyBattleRename']){
  const db=database(true),before=plain(db.account),a=await db.run(action),b=await db.run(action);
  assert.deepEqual(plain(a.record),db.receipt);assert.deepEqual(plain(b.record),db.receipt);
  assert.deepEqual(plain(a.account),before);assert.equal(db.writes(),0);
 }
});
test('retired GAS scheduler and status do not access Firestore or the daily engine',()=>{
 const c={console:{log:()=>{}}};vm.createContext(c);
 vm.runInContext(fs.readFileSync('gas/DailyBattleScheduler.gs','utf8'),c);
 const store=new Proxy({}, {get(){throw Error('Retired scheduler must not access Firestore');}});
 for(const at of [0,Date.now(),Date.now()+86400000])assert.deepEqual(plain(c.dailyBattleTick_(store,at)),{retired:true,writes:0});
 assert.deepEqual(plain(c.checkDailyBattle()),{retired:true,status:'retired'});
});
