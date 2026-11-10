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
test('deleted daily GAS files are optional to the existing minute scheduler',()=>{
 assert.equal(fs.existsSync('gas/DailyBattleScheduler.gs'),false);
 assert.equal(fs.existsSync('gas/DailyBattleEngine.gs'),false);
 const code=fs.readFileSync('gas/Code.gs','utf8');
 const guarded=code.split('\n').find(line=>line.includes("typeof dailyBattleTick_==='function'"));
 assert.ok(guarded);
 const c={store:{},console:{error:()=>{throw Error('Missing optional scheduler should not throw');}}};
 vm.createContext(c);assert.doesNotThrow(()=>vm.runInContext(guarded,c));
});
