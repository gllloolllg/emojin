const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const shared=source.slice(0,source.indexOf('/* MOJI SPIN:'));
const context={crypto:webcrypto};vm.createContext(context);vm.runInContext(shared,context);
const E=context.EmojinEngine,old=require('./fixtures/rules-v3-engine.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
const resident=(id,face='blank',extra={})=>({id,name:id,emoji:'🐸',ownerName:id,ownerUid:id,isNpc:false,
 maxHp:8,currentHp:8,slots:Array(6).fill(face),status:'active',stars:0,defeats:0,rulesVersion:4,recordVersion:0,
 poisoned:false,cursedSlots:[],createdAt:0,endedAt:null,...extra});
const match=(a,b,rng=()=>0)=>E.battle(a,b,rng,100000,'b-fixed');

for(const [label,old] of [['browser',require('./fixtures/rules-v3-engine.cjs')],['deployed GAS',require('./fixtures/deployed-gas-v3-engine.cjs')]])
test('1000 seeded turn comparisons preserve '+label+' v3 phase events and arithmetic',()=>{
 const faces=Object.keys(E.FACES);
 for(let seed=0;seed<1000;seed++){
  const rng=E.seeded(seed);
  const pair=['a','b'].map(id=>resident(id,'blank',{currentHp:1+Math.floor(rng()*8),stars:4,poisoned:rng()<.5,
   cursedSlots:[0,1,2,3,4,5].filter(()=>rng()<.3),slots:Array.from({length:6},()=>faces[Math.floor(rng()*faces.length)])}));
  const previous=old.battle(...pair,old.seeded(seed),100000);
  const next=E.resolveTurn(...pair,E.seeded(seed));
  assert.deepEqual(plain(next.events),plain(previous.events.filter(e=>e.type!=='finish')),'seed '+seed);
  assert.deepEqual(plain(next.after.map(e=>[e.currentHp,e.poisoned,e.cursedSlots])),plain(previous.after.map(e=>[e.currentHp,e.poisoned,e.cursedSlots])));
 }
});
test('10 turns compare absolute HP, not HP ratios, and assign +2 only once',()=>{
 const log=match(resident('a'),resident('b','blank',{maxHp:5,currentHp:1,poisoned:true,cursedSlots:[0]}));
 assert.equal(log.turns.length,10);assert.equal(log.result.kind,'hp');assert.equal(log.result.winner,0);
 assert.deepEqual(plain(log.result.remainingHp),[8,5]);assert.equal(log.after[0].stars,2);assert.equal(log.after[1].defeats,1);
 assert.equal(log.events.filter(e=>e.type==='finish').length,1);
 assert.ok(log.turns.every(t=>t.after.every(e=>e.stars===0&&e.defeats===0)));
});
test('equal HP after ten turns awards both +1',()=>{
 const log=match(resident('a'),resident('b'));
 assert.equal(log.result.kind,'draw');assert.equal(log.turns.length,10);
 assert.deepEqual(plain(log.after.map(e=>[e.stars,e.defeats])),[[1,0],[1,0]]);
});
test('KO on the tenth turn has precedence and gives winner +3',()=>{
 const a=resident('a','blank',{maxHp:5,currentHp:5}),b=resident('b','blank');b.slots[1]='attack1';
 const sequence=Array.from({length:10},(_,i)=>[0,i<5?0:.2]).flat();let i=0;
 const log=match(a,b,()=>sequence[i++]);
 assert.equal(log.turns.length,10);assert.equal(log.result.kind,'knockout');assert.equal(log.after[1].stars,3);
 assert.equal(log.after[0].defeats,1);assert.equal(log.after[0].status,'active');
});
test('simultaneous zero gives both a skull, without stars',()=>{
 const log=match(resident('a','ram',{maxHp:5,currentHp:5}),resident('b','ram',{maxHp:5,currentHp:5}));
 assert.equal(log.result.kind,'double-knockout');assert.equal(log.turns.length,1);
 assert.deepEqual(plain(log.after.map(e=>[e.stars,e.defeats,e.status])),[[0,1,'active'],[0,1,'active']]);
});
test('poison/curse carry across turns but every persisted resident resets between matches',()=>{
 const poison=match(resident('a','poison'),resident('b'));
 assert.ok(poison.events.some(e=>e.type==='poisonTick'&&e.turn===2));
 const curse=match(resident('a','curse'),resident('b'));
 assert.ok(curse.events.some(e=>e.type==='curseBlock'&&e.turn===2));
 for(const log of [poison,curse])for(const e of log.after){
  assert.equal(e.currentHp,e.maxHp);assert.equal(e.poisoned,false);assert.equal(e.cursedSlots.length,0);
 }
 assert.equal(poison.finalState[1].currentHp,0);
});
test('fifth or later skull retires only on a new loss; counters never decrease',()=>{
 assert.equal(E.DEFEAT_LIMIT,5);
 for(let prior=0;prior<10;prior++){
  const log=match(resident('a','strong',{defeats:1}),resident('b','blank',{defeats:prior}));
  assert.equal(log.after[1].defeats,prior+1);assert.equal(log.after[1].status,prior>=4?'dead':'active');
  assert.equal(log.defeatLimit,5);
  assert.equal(log.after[0].defeats,1);assert.equal(log.after[0].stars,3);
 }
});
test('legend threshold is crossed with +3 and capped at existing 50',()=>{
 const log=match(resident('a','strong',{stars:49}),resident('b'));
 assert.equal(log.after[0].status,'legend');assert.equal(log.after[0].stars,50);assert.equal(log.awards[0].stars,3);
 assert.deepEqual(plain(log.legendIds),['a']);
});
test('new drafts/NPCs use 5..8 with unchanged equal selection; old draft is clamped',()=>{
 const found=new Set();for(let n=0;n<200;n++)found.add(E.createDraft(E.seeded(n)).maxHp);
 assert.deepEqual([...found].sort(),[5,6,7,8]);
 const draft=E.createDraft(()=>0);draft.maxHp=10;
 const e=E.fromDraft(draft,'A','Owner',draft.offers[0]);assert.equal(e.maxHp,8);assert.equal(e.defeats,0);
 const log=match(resident('a','strong'),resident('b'));
 const owners=Object.fromEntries(log.before.map(e=>[e.ownerUid,{uid:e.ownerUid,unreadBattleIds:[]} ]));
 const plan=E.planBattle(log.before,owners,{},log,E.seeded(123));
 assert.ok(plan.npcs.length>0);assert.ok(plan.npcs.every(e=>e.maxHp>=5&&e.maxHp<=8&&e.defeats===0));
 assert.equal(plan.owners.a.unreadBattleIds.length,1);assert.equal(plan.meta.battleSeq,1);
});
test('migration is idempotent; does not rewrite archived residents or reset new scores',()=>{
 for(const maxHp of [5,6,7,8,9,10]){
  const input=resident('a','blank',{maxHp,currentHp:1,poisoned:true,cursedSlots:[1]});delete input.rulesVersion;delete input.defeats;
  const result=E.migrateActive(input);assert.equal(result.maxHp,Math.min(maxHp,8));assert.equal(result.stars,input.stars);
  assert.equal(result.defeats,0);assert.equal(result.currentHp,result.maxHp);assert.deepEqual(plain(E.migrateActive(result)),plain(result));
 }
 const current=resident('a','blank',{defeats:2,stars:40});assert.deepEqual(plain(E.migrateActive(current)),plain(current));
 for(const status of ['dead','legend']){
  const archived=resident('old','blank',{maxHp:10,currentHp:0,status,stars:50});delete archived.rulesVersion;
  assert.deepEqual(plain(E.migrateActive(archived)),plain(archived));
 }
});
test('existing v4 counters are preserved; old three-skull graves stay historical',()=>{
 for(const defeats of [0,2,3,8,9]){
  const input=resident('existing','blank',{defeats});assert.deepEqual(plain(E.migrateActive(input)),plain(input));
 }
 const archived=resident('old','blank',{status:'dead',defeats:3,currentHp:8});
 assert.deepEqual(plain(E.migrateActive(archived)),plain(archived));
});
test('replay captions use the logged defeat limit, including old three-skull history',()=>{
 const start=source.indexOf('function setMatchEndingCaption('),end=source.indexOf('async function showMatchResult(',start);
 const box={currentBattle:{},setCaption:text=>{box.caption=text;}};vm.createContext(box);vm.runInContext(source.slice(start,end),box);
 const event={deadIds:['old'],state:[{id:'old',name:'Old'}],legendIds:[]};
 box.setMatchEndingCaption(event);assert.match(box.caption,/💀 3個/);
 box.currentBattle={defeatLimit:10};box.setMatchEndingCaption(event);assert.match(box.caption,/💀 10個/);
 box.currentBattle={defeatLimit:5};box.setMatchEndingCaption(event);assert.match(box.caption,/💀 5個以上/);
});
test('browser and generated GAS engine give identical complete seeded matches and plans',()=>{
 const gas=fs.readFileSync(path.join(__dirname,'../gas/Engine.gs'),'utf8');assert.equal(gas,shared);
 const c={};vm.createContext(c);vm.runInContext(gas,c);const G=c.EmojinEngine;
 for(let seed=0;seed<100;seed++){
  const a=resident('a','twin',{slots:['poison','curse','twin','ram','fullheal','counter']}),b=resident('b','drain');
  const l=E.battle(a,b,E.seeded(seed),1000,'b-seed-'+seed),r=G.battle(a,b,G.seeded(seed),1000,'b-seed-'+seed);
  assert.deepEqual(plain(l),plain(r));
  const owners={a:{uid:'a',unreadBattleIds:[]},b:{uid:'b',unreadBattleIds:[]}};
  assert.deepEqual(plain(E.planBattle([a,b],owners,{},l,E.seeded(seed))),plain(G.planBattle([a,b],owners,{},r,G.seeded(seed))));
 }
});

test('grandfathered five through nine skulls survive wins, draws and legend promotion without a new skull',()=>{
 for(let defeats=5;defeats<=9;defeats++){
  for(const stars of [0,49]){
   const log=match(resident('a','strong',{defeats,stars}),resident('b'));
   assert.equal(log.after[0].defeats,defeats);assert.equal(log.after[0].status,stars===49?'legend':'active');
   assert.equal(log.after[0].endedAt,stars===49?100000:null);assert.equal(log.deadIds.length,0);
  }
  const draw=match(resident('a','blank',{defeats}),resident('b','blank',{defeats}));
  assert.ok(draw.after.every(e=>e.status==='active'&&e.defeats===defeats));
  assert.equal(draw.deadIds.length,0);
 }
});
test('simultaneous KO retires both at five or later, including NPCs and grandfathered records',()=>{
 const log=match(resident('a','ram',{defeats:4,isNpc:true,maxHp:5,currentHp:5}),resident('b','ram',{defeats:9,maxHp:5,currentHp:5}));
 assert.deepEqual(plain(log.after.map(e=>[e.defeats,e.status])),[[5,'dead'],[10,'dead']]);
 assert.deepEqual(plain(log.deadIds),['a','b']);
});
test('score badges preserve actual five-through-ten counts, including historical graves',()=>{
 const start=source.indexOf('function recordBadge('),end=source.indexOf('const HEART_PATH',start);
 const box={E,star:()=>'<star>'};vm.createContext(box);vm.runInContext(source.slice(start,end),box);
 for(const defeats of [0,4,5,6,7,8,9,10]){
  const html=box.recordBadge({defeats,stars:1,status:defeats===10?'dead':'active'});
  assert.ok(html.includes('×'+defeats+'</span>'));assert.ok(html.includes('敗北 '+defeats+' 回'));
 }
});
