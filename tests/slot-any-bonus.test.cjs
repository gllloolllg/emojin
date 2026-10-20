const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const ctx={crypto:webcrypto};vm.createContext(ctx);
vm.runInContext(source.slice(0,source.indexOf('/* Firebase configuration is public.')),ctx);
const S=ctx.MojiSpinEngine,E=ctx.EmojinEngine,plain=x=>JSON.parse(JSON.stringify(x));
const old={crypto:webcrypto};vm.createContext(old);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'fixtures/slot-v1-engine.cjs'),'utf8'),old);
const ids=['wild','smile','gift','bell','melon','berry','orange','cherry','blank'];
const weights=[3,4,6,9,11,13,15,18,21],payouts=[256,128,64,32,16,8,4,2,0];
const bonus={cherry:[0,0,0,0,4,8,40,160,800,4000],orange:[0,0,0,0,4,8,60,240,1200,6000],
 berry:[0,0,0,0,4,16,80,320,1600,8000],melon:[0,0,0,0,8,24,120,480,2400,12000],
 bell:[0,0,0,4,8,32,160,640,3200,16000],gift:[0,0,0,4,12,60,240,960,4800,24000],
 smile:[0,0,0,4,16,80,320,1280,8000,32000]};
const empty=()=>Array(9).fill('blank');
const first40=['melon','melon','blank','blank','wild','melon','blank','blank','melon'];
const free100=['blank','melon','bell','wild','wild','cherry','wild','cherry','cherry'];
function makeRound(cells=[first40,free100,...Array.from({length:3},()=>{const c=empty();c[4]='wild';return c;})]){
 const spins=cells.map((c,i)=>({...S.evaluate(c),free:i>0}));
 return plain({id:'slot-test-round',version:2,bet:8,freeCount:cells.length-1,spins,total:spins.reduce((n,s)=>n+s.payout,0),createdAt:Date.now()});
}

test('exact requested symbols, weights, line payouts, frozen tables and unchanged free counts',()=>{
 assert.deepEqual(plain(S.CONFIG.symbols.map(s=>s.id)),ids);
 assert.deepEqual(plain(S.CONFIG.symbols.map(s=>s.weight)),weights);
 assert.deepEqual(plain(S.CONFIG.symbols.map(s=>s.payout)),payouts);
 assert.equal(weights.reduce((n,x)=>n+x,0),100);assert.equal(S.BET,8);
 assert.equal(S.byId.berry.emoji,'🍇');assert.equal(S.CONFIG.lines.length,8);
 assert.deepEqual(plain(S.CONFIG.freeCounts),[{count:4,weight:40},{count:5,weight:30},{count:7,weight:20},{count:10,weight:8},{count:20,weight:2}]);
 assert.ok(Object.isFrozen(S.CONFIG.anyBonus.cherry));
});
test('every probability interval boundary selects the specified symbol independently in all nine cells',()=>{
 let start=0;
 for(let i=0;i<ids.length;i++){
  for(const percent of [start,start+weights[i]/2,start+weights[i]-1e-8]){
   let calls=0;const spin=S.roll(false,()=>{calls++;return percent/100;});
   assert.deepEqual(plain(spin.cells),Array(9).fill(ids[i]));assert.equal(calls,9);
  }
  start+=weights[i];
 }
 let call=0,startAt=0;
 const samples=weights.map(w=>{const r=(startAt+w/2)/100;startAt+=w;return r;});
 assert.deepEqual(plain(S.roll(false,()=>samples[call++]).cells),ids);
 assert.equal(call,9);
});
test('all 8 lines and all symbol triples: exact matching, WILD substitution, highest single payout, blanks',()=>{
 const lineWin=triple=>{
  if(triple.includes('blank'))return 0;
  const natural=triple.filter(id=>id!=='wild');
  return !natural.length?256:natural.every(id=>id===natural[0])?payouts[ids.indexOf(natural[0])]:0;
 };
 for(let line=0;line<8;line++)for(const a of ids)for(const b of ids)for(const c of ids){
  const cells=empty(),triple=[a,b,c];S.CONFIG.lines[line].forEach((index,i)=>{cells[index]=triple[i];});
  const wins=S.evaluate(cells).wins;
  assert.equal(wins.find(w=>w.line===line)?.payout||0,lineWin(triple),`${line}:${triple}`);
  assert.equal(wins.length,lineWin(triple)?1:0);
 }
});
test('each bonus table at every count, with every possible mix of natural symbols and WILDs',()=>{
 for(const [id,table] of Object.entries(bonus))for(let n=0;n<=9;n++)for(let wild=0;wild<=n;wild++){
  const cells=[...Array(n-wild).fill(id),...Array(wild).fill('wild'),...Array(9-n).fill('blank')];
  const result=S.evaluateAnyBonus(cells),win=result.wins.find(w=>w.symbol===id);
  assert.equal(win?.payout||0,table[n],`${id}:${n}, wild=${wild}`);
  if(win){assert.equal(win.count,n);assert.equal(win.naturalCount,n-wild);assert.equal(win.wildCount,wild);}
  assert.ok(result.wins.every(w=>w.symbol!=='wild'));
 }
 assert.equal(S.evaluateAnyBonus([...Array(6).fill('cherry'),...Array(3).fill('blank')]).payout,40);
});
test('WILDs are shared even with zero natural symbols: example totals 140 under the supplied table',()=>{
 const result=S.evaluateAnyBonus(['wild','wild','wild','cherry','cherry','melon','melon','melon','blank']);
 assert.equal(result.payout,140);
 assert.deepEqual(plain(result.wins.map(w=>[w.symbol,w.count,w.payout])),[['cherry',5,8],['melon',6,120],['bell',3,4],['gift',3,4],['smile',3,4]]);
 assert.deepEqual(plain(result.winningCells),[0,1,2,3,4,5,6,7]);
});
test('ANY-only win highlights its symbols and shared WILDs once; blanks are never highlighted',()=>{
 const result=S.evaluate(['wild','cherry','blank','melon','blank','wild','blank','cherry','melon']);
 assert.equal(result.linePayout,0);assert.equal(result.anyPayout,12);assert.equal(result.payout,12);
 assert.deepEqual(plain(result.winningCells),[0,1,3,5,7,8]);
 assert.equal(new Set(result.winningCells).size,result.winningCells.length);
});
test('line+ANY wins add once and use exactly the union of all winning cells',()=>{
 const result=S.evaluate(first40);
 assert.equal(result.linePayout,16);assert.equal(result.anyPayout,24);assert.equal(result.payout,40);
 assert.deepEqual(plain(result.winningCells),[0,1,4,5,8]);
 const wilds=S.evaluate(Array(9).fill('wild'));
 assert.equal(wilds.linePayout,8*256);assert.equal(wilds.anyPayout,102000);
 assert.equal(wilds.payout,104048);assert.equal(wilds.wins.length,8);assert.equal(wilds.anyWins.length,7);
 assert.deepEqual(plain(wilds.winningCells),[0,1,2,3,4,5,6,7,8]);
});
test('free spin fixes center WILD, draws eight independent cells and counts center toward ANY',()=>{
 let calls=0;const spin=S.roll(true,()=>{calls++;return .70;}); // cherry
 assert.equal(calls,8);assert.equal(spin.cells[4],'wild');
 assert.equal(spin.anyWins.find(w=>w.symbol==='cherry').count,9);
 assert.equal(spin.anyPayout,4000);
});
test('draws complete v2 round once, with no free retrigger and exact sum over normal+free spins',()=>{
 for(let seed=1;seed<=1000;seed++){
  const rng=E.seeded(seed),round=S.createRound(rng);
  assert.equal(round.version,2);S.validateRound(round);
  assert.equal(round.total,round.spins.reduce((n,s)=>n+s.linePayout+s.anyPayout,0));
  assert.equal(round.spins.length,round.freeCount+1);
  assert.ok(round.spins.slice(1).every(s=>s.free&&s.cells[4]==='wild'));
 }
 // All WILDs do not award additional spins during the free sequence.
 let calls=0;const round=S.createRound(()=>{calls++;return 0;});
 assert.equal(round.freeCount,4);assert.equal(calls,9+1+4*8);
 assert.equal(round.total,5*104048);
});
test('TOTAL WIN includes 16+24 on trigger and 100 during frees, exactly 140',()=>{
 const round=makeRound();assert.equal(round.spins[0].linePayout,16);assert.equal(round.spins[0].anyPayout,24);
 assert.equal(round.spins[1].payout,100);assert.equal(round.total,140);S.validateRound(round);
});
test('new payout and winning-cell metadata are validated, not accepted on trust',()=>{
 const round=makeRound();
 for(const key of ['linePayout','anyPayout','anyWins','winningCells','wins','payout']){
  const broken=plain(round);broken.spins[0][key]=typeof broken.spins[0][key]==='number'?123:[];
  assert.throws(()=>S.validateRound(broken),undefined,key);
 }
 for(const change of [r=>r.total++,r=>r.freeCount=5,r=>r.version=99,r=>r.spins[1].cells[4]='blank']){
  const broken=plain(round);change(broken);assert.throws(()=>S.validateRound(broken));
 }
 for(const cells of [[],Array(9),Array(9).fill('unknown'),Array(9).fill('toString')])assert.throws(()=>S.evaluate(cells));
});
test('1000 historical v1 rounds retain old payouts and validate without ANY metadata',()=>{
 for(let seed=1;seed<=1000;seed++){
  const round=old.MojiSpinEngine.createRound(E.seeded(seed)),before=JSON.stringify(round);
  S.validateRound(round);assert.equal(JSON.stringify(round),before);
  for(const spin of round.spins)assert.deepEqual(plain(S.evaluate(spin.cells,1)),plain(old.MojiSpinEngine.evaluate(spin.cells)));
 }
 assert.equal(S.evaluate(Array(9).fill('wild'),1).payout,3200);
 assert.equal(S.evaluate(Array(9).fill('cherry'),1).payout,80);
});
test('saved v1/v2 maps can change key order on Firestore readback without changing their values',()=>{
 const reordered=value=>Array.isArray(value)?value.map(reordered):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,reordered(value[key])])):value;
 for(const input of [makeRound(),old.MojiSpinEngine.createRound(()=>.4)]){
  const saved=reordered(input),before=JSON.stringify(saved);S.validateRound(saved);
  assert.equal(JSON.stringify(saved),before);
 }
});

// Run the product wallet transaction against an optimistic, conflict-retrying memory store.
function walletStore(balance=4000){
 const documents=new Map([['wallets/me',{uid:'me',wallet:{balance,updatedAt:Date.now()},hatch:0,revision:1,recentOperations:[]}],
  ['config/battle',{rulesVersion:4,defeatLimit:10,maintenance:false}]]);
 let revision=0,retries=0;
 const snap=path=>({exists:()=>documents.has(path),data:()=>plain(documents.get(path))});
 const box={E,crypto:webcrypto,uid:'me',auth:{currentUser:{uid:'me'}},db:{},window:{MojiSpinEngine:S},local:{pending:[]},
  walletRef:()=> 'wallets/me',receiptRef:id=>'wallets/me/operations/'+id,metaRef:'meta/game',ref:(c,id)=>c+'/'+id,
  data:s=>s.exists()?s.data():null,defaultMeta:()=>({}),ensureWallet:async()=>{},retry:fn=>fn(),applyAccount:()=>{},persist:()=>{},
  F:{runTransaction:async(_db,fn)=>{
   for(let attempt=0;attempt<5;attempt++){
    const readRevision=revision,writes=[];let writing=false;
    const tx={get:async path=>{assert.equal(writing,false,'reads before writes');return snap(path);},
     set:(path,value)=>{writing=true;writes.push([path,plain(value)]);}};
    const result=await fn(tx);
    if(revision!==readRevision){retries++;continue;}
    for(const [path,value]of writes)documents.set(path,value);
    if(writes.length)revision++;
    return result;
   }throw Error('Contention');
  }}
 };
 vm.createContext(box);
 const gates=source.slice(source.indexOf('  async function requireMatchRules('),source.indexOf('  // One live subscription'));
 const next=source.slice(source.indexOf('  function nextAccount('),source.indexOf('  function ensureWallet('));
 const write=source.slice(source.indexOf('  writeOperation=async op=>{'),source.indexOf('  // Pending operations keep their IDs'));
 const finishStart=source.indexOf('    async finishSlot(id){'),finishEnd=source.indexOf('    async getState()',finishStart);
 vm.runInContext('let writeOperation;\n'+gates+next+write+'\nglobalThis.finishApi={'+source.slice(finishStart,finishEnd)+'};globalThis.write=writeOperation;',box);
 return {read:path=>plain(documents.get(path)),retries:()=>retries,
  spin:round=>box.write({action:'slotSpin',id:round.id,data:{uid:'me',round}}),finish:id=>box.finishApi.finishSlot(id)};
}
test('wallet retry and simultaneous same-ID saves settle BET+all payouts once, without 3000 cap',async()=>{
 const db=walletStore(),round=makeRound();
 const results=await Promise.all([db.spin(round),db.spin(round)]);
 assert.ok(db.retries()>0);assert.equal(db.read('wallets/me').wallet.balance,4000-8+140);
 assert.equal(db.read('wallets/me').revision,2);assert.equal(results[0].record.round.total,140);
 assert.equal(results[1].record.balanceAfter,4132);
 await db.spin(round);assert.equal(db.read('wallets/me').wallet.balance,4132);
 await db.finish(round.id);await db.finish(round.id);
 assert.equal(db.read('wallets/me').wallet.balance,4132);assert.equal(db.read('wallets/me').slotRound,null);
 assert.equal(db.read('wallets/me').revision,3);
});
test('two different concurrent SPINs return the one active saved round, charging only once',async()=>{
 const db=walletStore(),a=makeRound(),b=makeRound();b.id='slot-other-round';
 const results=await Promise.all([db.spin(a),db.spin(b)]);
 assert.equal(db.read('wallets/me').wallet.balance,4132);
 assert.ok(results.every(r=>r.record.round.id===db.read('wallets/me').slotRound));
});
test('offline pending legacy round is settled with the historical payout, not the new table',async()=>{
 const db=walletStore(),round=old.MojiSpinEngine.createRound(()=>.7);
 assert.equal(round.version,1);assert.equal(round.total,80);
 await db.spin(round);await db.spin(round);
 assert.equal(db.read('wallets/me').wallet.balance,4000-8+80);
});
