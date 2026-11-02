const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app.js'),'utf8'),c={};vm.createContext(c);
vm.runInContext(source.slice(0,source.indexOf('/* Firebase configuration is public.')),c);
const D=c.DailyBattle,E=c.EmojinEngine,plain=v=>JSON.parse(JSON.stringify(v));
test('JST day rollover remains yesterday until 00:30, and deadline is 18:30 JST',()=>{
 for(const [at,day] of [['2026-11-02T00:00:00+09:00','2026-11-01'],['2026-11-02T00:29:59+09:00','2026-11-01'],['2026-11-02T00:30:00+09:00','2026-11-02']])assert.equal(D.currentDay(Date.parse(at)),day);
 assert.equal(D.times('2026-11-02').closeAt,Date.parse('2026-11-02T18:30:00+09:00'));
 for(const day of ['bad','2026-02-30','2026-13-01'])assert.throws(()=>D.times(day));
});
test('isolated NPC-style contestants have fixed HP, five weighted basics plus attack1, public three slots and no seed',()=>{
 for(let seed=0;seed<200;seed++){
  const secret=D.create('2026-11-02',E.seeded(seed)),pub=D.publicBattle(secret);
  secret.fighters.forEach(e=>{assert.equal(e.maxHp,8);assert.equal(e.currentHp,8);assert.equal(e.slots.length,6);assert.equal(e.slots[5],'attack1');assert.ok(e.slots.every(f=>!E.FACES[f].special));assert.equal(e.stars,0);});
  assert.equal(pub.seed,undefined);assert.equal(pub.log,undefined);assert.ok(pub.fighters.every(e=>e.slots.length===3));
  const a=D.settle(secret),b=D.settle(secret);assert.deepEqual(plain(a),plain(b));assert.equal(a.outcome,D.outcome(a.log.result));
 }
});
test('all five outcomes use requested fixed prizes including simultaneous KO draw',()=>{
 assert.deepEqual(plain(D.PRIZES),[300,100,300,100,300]);
 for(const [kind,winner,choice] of [['knockout',0,0],['hp',0,1],['draw',null,2],['double-knockout',null,2],['hp',1,3],['knockout',1,4]])assert.equal(D.outcome({kind,winner}),choice);
});
function scheduler(){
 const records=new Map([['config/battle',{maintenance:false}]]),writes=[];
 const box={DailyBattle:D,Date,Math,console};vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(root,'gas/DailyBattleScheduler.gs'),'utf8'),box);
 const store={transaction(fn){const result=fn({get:key=>records.has(key)?plain(records.get(key)):null,write:(key,value)=>({key,value:plain(value)})});for(const w of result.writes){records.set(w.key,w.value);writes.push(w.key);}return result.value;}};
 return {records,writes,tick:at=>box.dailyBattleTick_(store,Date.parse(at))};
}
test('minute scheduler creates at 00:30, settles at 18:30 once, never touches regular world, catches delayed previous day',()=>{
 const s=scheduler();s.tick('2026-11-02T00:30:00+09:00');const before=plain(s.records.get('dailyBattles/2026-11-02'));
 assert.equal(before.status,'open');s.tick('2026-11-02T18:29:59+09:00');assert.deepEqual(s.records.get('dailyBattles/2026-11-02'),before);
 s.tick('2026-11-02T18:30:00+09:00');const result=plain(s.records.get('dailyBattles/2026-11-02')),count=s.writes.length;
 assert.equal(result.status,'finished');s.tick('2026-11-02T18:31:00+09:00');assert.equal(s.writes.length,count);
 s.tick('2026-11-03T00:29:59+09:00');assert.equal(s.records.has('dailyBattles/2026-11-03'),false);
 s.tick('2026-11-03T00:30:00+09:00');assert.equal(s.records.get('dailyBattles/2026-11-03').status,'open');
 assert.ok(s.writes.every(p=>/^(dailyBattleSecrets|dailyBattles)\//.test(p)||p==='meta/dailyBattle'));
 const delayed=scheduler();delayed.tick('2026-11-02T00:30:00+09:00');delayed.tick('2026-11-05T00:30:00+09:00');assert.equal(delayed.records.get('dailyBattles/2026-11-02').status,'finished');
});
test('GAS/browser pure daily engine stays identical',()=>{
 const start=source.indexOf('/* Daily Battle: public schedule'),end=source.indexOf('/* End Daily Battle engine. */',start);
 assert.equal(fs.readFileSync(path.join(root,'gas/DailyBattleEngine.gs'),'utf8'),source.slice(start,end+'/* End Daily Battle engine. */'.length)+'\n');
});
