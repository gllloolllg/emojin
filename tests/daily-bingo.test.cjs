const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync('app.js','utf8'),c={crypto:webcrypto};vm.createContext(c);
vm.runInContext(source.slice(0,source.indexOf('/* Firebase configuration is public.')),c);
const B=c.DailyBingo,E=c.EmojinEngine,plain=x=>JSON.parse(JSON.stringify(x));
function state(){return {version:1,card:B.createCard(E.seeded(7),'bingo-test'),marks:[],lastDay:null,pending:null,finished:false};}
test('cards contain sixteen distinct existing emojis and precisely the ten agreed rewards once each',()=>{
 const expected=['miss','moji-50','moji-100','moji-500','moji-1000','moji-2000','moji-3000','moji-5000','hatch-3','hatch-10'];
 for(let i=0;i<100;i++){
  const card=B.createCard(E.seeded(i));B.validateCard(card);
  assert.equal(new Set(card.cells).size,16);assert.ok(card.cells.every(e=>E.EMOJIS.includes(e)));
  assert.deepEqual([...card.prizes].sort(),[...expected].sort());
 }
 assert.equal(B.LINES.length,10);assert.ok(B.LINES.every(l=>l.length===4));
});
test('JST midnight boundary, one draw a day, no misses or repeated cells and resumption without redrawing',()=>{
 assert.equal(B.dayKey(Date.parse('2026-11-10T14:59:59Z')),'2026-11-10');
 assert.equal(B.dayKey(Date.parse('2026-11-10T15:00:00Z')),'2026-11-11');
 let s=state();s=B.draw(s,'2026-11-10',()=>0);assert.equal(s.pending.index,0);
 assert.throws(()=>B.draw(s,'2026-11-10'));assert.deepEqual(plain(B.validateState(s)),plain(s));
 s.pending.phase='mark';s=B.mark(s);assert.deepEqual(plain(s.marks),[0]);
 assert.throws(()=>B.draw(s,'2026-11-10'));assert.throws(()=>B.draw(s,'2026-11-09'));
 s=B.draw(s,'2026-11-11',()=>0);assert.equal(s.pending.index,1);
});
test('all horizontal, vertical and diagonal lines and multiple-line wins are counted exactly',()=>{
 for(let i=0;i<10;i++)assert.ok(B.completed(B.LINES[i]).includes(i));
 const card=state().card;card.prizes=['moji-5000','hatch-10','moji-50','moji-100','moji-3000','hatch-3','moji-500','moji-1000','moji-2000','miss'];
 const marks=[0,1,2,3,4,8,12];assert.deepEqual(plain(B.completed(marks)),[0,4]);
 assert.equal(B.rewards(card,marks).prizes.reduce((n,r)=>n+r.amount,0),8000);
});
test('a first completed line blocks subsequent draws and a new card retains the day lock',()=>{
 let s=state();s.marks=[0,1,2];s.lastDay='2026-11-09';s=B.draw(s,'2026-11-10',()=>0);s.pending.phase='mark';s=B.mark(s);
 assert.equal(s.pending.phase,'claim');assert.throws(()=>B.draw(s,'2026-11-11'));
 s.pending=null;s.finished=true;B.validateState(s);assert.throws(()=>B.draw(s,'2026-11-11'));
 const fresh=B.createState(s.lastDay);assert.equal(fresh.marks.length,0);assert.throws(()=>B.draw(fresh,'2026-11-10'));assert.ok(B.draw(fresh,'2026-11-11').pending);
});
test('corrupt cards, marks and pending states are rejected instead of granting a fresh draw',()=>{
 for(const edit of [s=>s.card.cells[1]=s.card.cells[0],s=>s.card.prizes[1]=s.card.prizes[0],s=>s.marks=[16],s=>s.marks=[0,0],s=>s.finished=true]){
  const s=state();edit(s);assert.throws(()=>B.validateState(s));
 }
 const s=B.draw(state(),'2026-11-10',()=>0);s.marks=[0];assert.throws(()=>B.validateState(s));
});
function database({balance=4321,hatch=17,retry=false}={}){
 const docs=new Map([['wallet',{uid:'me',wallet:{balance,updatedAt:Date.now()},hatch,draft:{id:'draft'},slotRound:'slot',revision:1,recentOperations:[]}],['gate',{rulesVersion:4,defeatLimit:5,maintenance:false}]]);
 const snap=key=>({exists:()=>docs.has(key),data:()=>plain(docs.get(key))});let writes=0,serial=Promise.resolve();
 const box={E,uid:'me',auth:{currentUser:{uid:'me'}},db:{},window:{DailyBingo:B},local:{},persist:()=>{},applyAccount:()=>{},ensureWallet:async()=>{},
  walletRef:()=> 'wallet',receiptRef:id=>'receipts/'+id,ref:()=> 'gate',F:{runTransaction:(_,fn)=>{
   const run=async commit=>{const pending=[];let writing=false;const result=await fn({get:async k=>{assert.equal(writing,false);return snap(k);},set:(k,v)=>{writing=true;pending.push([k,plain(v)]);}});if(commit)for(const [k,v]of pending){docs.set(k,v);writes++;}return result;};
   const task=serial.then(async()=>{if(retry){retry=false;await run(false);}return run(true);});serial=task.catch(()=>{});return task;
  }}};vm.createContext(box);
 for(const [a,b]of [['  async function requireMatchRules(','  // One live subscription'],['  function nextAccount(','  function ensureWallet('],['  writeOperation=async op=>{','  // Pending operations keep their IDs']])vm.runInContext(source.slice(source.indexOf(a),source.indexOf(b)),box);
 return {read:k=>plain(docs.get(k)),writes:()=>writes,claim:(card,marks)=>box.writeOperation({id:card.id,action:'dailyBingo',data:{uid:'me',card,marks,day:'2026-11-10'}})};
}
test('all simultaneous winning lines pay once across retries above 3000 without changing draft/slot state',async()=>{
 const db=database({retry:true}),card=state().card;card.prizes=['moji-5000','hatch-10','moji-50','moji-100','moji-3000','hatch-3','moji-500','moji-1000','moji-2000','miss'];
 const marks=[0,1,2,3,4,8,12],results=await Promise.all([db.claim(card,marks),db.claim(card,marks)]);
 assert.deepEqual(plain(results[0].record),plain(results[1].record));
 const wallet=db.read('wallet');assert.equal(wallet.wallet.balance,12321);assert.equal(wallet.hatch,17);assert.equal(wallet.revision,2);assert.equal(wallet.draft.id,'draft');assert.equal(wallet.slotRound,'slot');assert.equal(db.writes(),2);
});
test('hatch prizes cap at twenty, and a miss still gets one immutable receipt without money',async()=>{
 for(const [prize,hatch,expected]of [['hatch-10',17,3],['hatch-3',20,0],['miss',7,0]]){
  const db=database({hatch}),card=state().card;const pos=card.prizes.indexOf(prize);[card.prizes[0],card.prizes[pos]]=[card.prizes[pos],card.prizes[0]];
  const a=await db.claim(card,[0,1,2,3]);assert.equal(a.record.hatch,expected);assert.equal(db.read('wallet').hatch,hatch+expected);assert.equal(db.read('wallet').wallet.balance,4321);
 }
});
test('an incomplete line cannot change any financial data',async()=>{
 const db=database(),before=db.read('wallet');await assert.rejects(db.claim(state().card,[0,1,2]),/成立/);assert.deepEqual(db.read('wallet'),before);assert.equal(db.writes(),0);
});
