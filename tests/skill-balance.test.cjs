const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx={};vm.createContext(ctx);vm.runInContext(source.split('/* MOJI SPIN:')[0],ctx);
const main=ctx.EmojinEngine,gas={};vm.createContext(gas);vm.runInContext(fs.readFileSync(path.join(root,'gas/Engine.gs'),'utf8'),gas);
const adventure=require('../adventure/engine.js'),engines=[['main',main],['GAS',gas.EmojinEngine],['adventure',adventure]],plain=x=>JSON.parse(JSON.stringify(x));
const fighter=(face,hp=8)=>({id:face,maxHp:8,baseMaxHp:8,currentHp:hp,slots:Array(6).fill(face),poisoned:false,cursedSlots:[]});
function seq(...values){let i=0;return()=>{assert(i<values.length);return values[i++];};}
for(const [label,E] of engines){
 test(label+': drain steals exactly one, heals one, bypasses guard and counter',()=>{
  assert.equal(E.FACES.drain.value,1);
  for(const other of ['blank','guard','counter']){
   const r=E.resolveTurn(fighter('drain',5),fighter(other),()=>0);assert.equal(r.after[0].currentHp,6);assert.equal(r.after[1].currentHp,7);assert.equal(r.events.find(e=>e.type==='impact').drains[0].amount,1);assert(!r.events.some(e=>e.type==='counter'));
  }
  const full=E.resolveTurn(fighter('drain'),fighter('blank'),()=>0);assert.equal(full.after[0].currentHp,8);assert.equal(full.after[1].currentHp,7);
  const both=E.resolveTurn(fighter('drain',6),fighter('drain',6),()=>0);assert.deepEqual(plain(both.after.map(s=>s.currentHp)),[6,6]);
 });
 test(label+': normal ram remains 4 damage with 2 recoil, but active counter reflects without recoil',()=>{
  const normal=E.resolveTurn(fighter('ram'),fighter('blank'),()=>0);assert.deepEqual(plain(normal.after.map(s=>s.currentHp)),[6,4]);
  const guard=E.resolveTurn(fighter('ram'),fighter('guard'),()=>0);assert.deepEqual(plain(guard.after.map(s=>s.currentHp)),[6,5]);
  const counter=E.resolveTurn(fighter('ram'),fighter('counter'),()=>0);assert.deepEqual(plain(counter.after.map(s=>s.currentHp)),[4,8]);assert.deepEqual(plain(counter.events.find(e=>e.type==='impact').selfDamage),[0,0]);
  const cursed=fighter('counter');cursed.cursedSlots=[0];const blocked=E.resolveTurn(fighter('ram'),cursed,()=>0);assert.deepEqual(plain(blocked.after.map(s=>s.currentHp)),[6,4]);
  const reversed=E.resolveTurn(fighter('counter'),fighter('ram'),()=>0);assert.deepEqual(plain(reversed.after.map(s=>s.currentHp)),[8,4]);
 });
 test(label+': Twin keeps multiple-counter and unrelated-attack arithmetic',()=>{
  const b=fighter('blank');b.slots=['twin','counter','attack1','blank','blank','blank'];
  const mixed=E.resolveTurn(fighter('ram'),b,seq(0,0,.2,.4));assert.equal(mixed.after[0].currentHp,3);assert.equal(mixed.after[1].currentHp,8);
  b.slots[2]='counter';const double=E.resolveTurn(fighter('ram'),b,seq(0,0,.2,.4));assert.equal(double.after[0].currentHp,0);assert.equal(double.events.find(e=>e.type==='counter').counters[0].damage,8);
 });
 test(label+': descriptions explicitly explain drain immunity and counter recoil exemption',()=>{
  assert.match(E.FACES.drain.text,/最大1/);assert.match(E.FACES.drain.text,/防御やカウンターの影響をうけない/);assert.match(E.FACES.ram.text,/カウンターされたときは反動を受けず/);
 });
}
test('adventure drain cannot refill gold HP, preserves filled gold, and caps after simultaneous damage',()=>{
 for(const [hp,expected] of [[4,5],[5,6],[6,6],[8,8]]){
  const p={...fighter('drain',hp),maxHp:11,baseMaxHp:6},r=adventure.resolveTurn(p,fighter('blank'),()=>0);assert.equal(r.after[0].currentHp,expected);assert.equal(r.after[1].currentHp,7);
 }
 const p={...fighter('drain',8),maxHp:11,baseMaxHp:6},r=adventure.resolveTurn(p,fighter('attack2'),()=>0);assert.equal(r.after[0].currentHp,6);assert.equal(r.after[1].currentHp,7);
 const heal=adventure.resolveTurn({...p,currentHp:6,slots:Array(6).fill('heal')},fighter('blank'),()=>0);assert.equal(heal.after[0].currentHp,7);
});
test('main, GAS and minigame share the same normal-HP turn outcomes and RNG',()=>{
 for(let seed=0;seed<1000;seed++){
  const rng=main.seeded(seed),faces=Object.keys(main.FACES),pair=['a','b'].map(id=>({...fighter('blank',1+Math.floor(rng()*8)),id,poisoned:rng()<.4,cursedSlots:[0,1,2,3,4,5].filter(()=>rng()<.3),slots:Array.from({length:6},()=>faces[Math.floor(rng()*faces.length)])}));
  const expected=plain(main.resolveTurn(...pair,main.seeded(seed)));
  for(const E of [gas.EmojinEngine,adventure])assert.deepEqual(plain(E.resolveTurn(...pair,E.seeded(seed))),expected);
 }
});
test('generation short descriptions match the new values',()=>{
 const c={};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('const shortFaceText='),source.indexOf('function showSpecial()'))+';globalThis.text=shortFaceText;',c);
 assert.match(c.text.drain,/1ダメージと1回復/);assert.match(c.text.drain,/防御・カウンターの影響なし/);assert.match(c.text.ram,/反射されたら反動なし/);
});
