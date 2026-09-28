'use strict';
const assert = require('node:assert/strict');
const E = require('../gas/Engine.gs');
let n = 0;
function test(name, fn) { fn(); n++; console.log('PASS', name); }
function make(id, face, changes={}) {
  return {id,emoji:'X',name:id,ownerName:'Tester',currentHp:8,maxHp:10,
    slots:Array(6).fill(face),poisoned:false,cursedSlots:[],stars:0,status:'active',createdAt:1,endedAt:null,...changes};
}
function seq(values) { let i=0; return () => values[i++] ?? 0.01; }
function fight(a,b,r=()=>0.01) { return E.battle(a,b,r,123456); }
for (const [face,power] of [['attack1',1],['attack2',2],['strong',3],['ram',4]]) {
  test('counter intercepts '+face,()=>{
    const a=make('A','counter'),b=make('B',face),log=fight(a,b);
    assert.equal(log.after[0].currentHp,8);
    assert.equal(log.after[1].currentHp,8-power-(face==='ram'?2:0));
    const impact=log.events.find(x=>x.type==='impact');
    assert.equal(impact.attacks[0].damage,0);
    assert.equal(impact.attacks[0].reflected,power);
    assert.equal(log.rulesVersion,3);
    assert.deepEqual(log.before,[a,b]);
    assert.equal(a.currentHp,8);
  });
  test('counter intercepts '+face+' with sides reversed',()=>{
    const log=fight(make('A',face),make('B','counter'));
    assert.equal(log.after[1].currentHp,8);
    assert.equal(log.after[0].currentHp,8-power-(face==='ram'?2:0));
  });
}
test('counter does not block drain',()=>{
  const log=fight(make('A','counter'),make('B','drain',{currentHp:6}));
  assert.deepEqual(log.after.map(e=>e.currentHp),[6,8]);
  assert(!log.events.some(e=>e.type==='counter'));
});
test('counter does not block poison tick or poison application',()=>{
  const log=fight(make('A','counter',{poisoned:true}),make('B','poison'));
  assert.equal(log.after[0].currentHp,7);
  assert(log.after[0].poisoned);
});
test('counter vs counter does nothing',()=>{
  const log=fight(make('A','counter'),make('B','counter'));
  assert.deepEqual(log.after.map(e=>e.currentHp),[8,8]);
  assert(!log.events.some(e=>e.type==='counter'));
});
test('cursed counter is blocked, then cleared logically',()=>{
  const log=fight(make('A','counter',{cursedSlots:[0]}),make('B','strong'));
  assert.deepEqual(log.after.map(e=>e.currentHp),[5,8]);
  assert.deepEqual(log.after[0].cursedSlots,[]);
  assert(log.events.some(e=>e.type==='curseBlock'));
});
test('counter + guard reflects full incoming attack',()=>{
  const a=make('A','blank',{slots:['counter','guard','attack1','heal','blank','twin']});
  const log=fight(a,make('B','strong'),seq([.99,.01,.01,.2]));
  assert.deepEqual(log.after.map(e=>e.currentHp),[8,5]);
});
test('two counter faces intercept once, reflect twice',()=>{
  const a=make('A','blank',{slots:['counter','guard','attack1','heal','blank','twin']});
  const log=fight(a,make('B','strong'),seq([.99,.01,.01,.01]));
  assert.deepEqual(log.after.map(e=>e.currentHp),[8,2]);
});
test('ram self damage survives a counter action on same side',()=>{
  const a=make('A','blank',{slots:['counter','ram','attack1','heal','blank','twin']});
  const log=fight(a,make('B','strong'),seq([.99,.01,.01,.2]));
  assert.deepEqual(log.after.map(e=>e.currentHp),[6,1]);
});
test('guard still blocks only 1 of strong',()=>{
  assert.deepEqual(fight(make('A','guard'),make('B','strong')).after.map(e=>e.currentHp),[6,8]);
});
test('poison and curses removed by potion; one curse only',()=>{
  const log=fight(make('A','heal',{currentHp:6,poisoned:true,cursedSlots:[2,3,5]}),make('B','blank'));
  assert.equal(log.after[0].currentHp,6);
  assert(!log.after[0].poisoned);
  assert.equal(log.after[0].cursedSlots.length,2);
});
test('same cursed twin extra slot: first blocked, second usable',()=>{
  const a=make('A','blank',{slots:['attack2','guard','attack1','heal','blank','twin'],cursedSlots:[0]});
  const log=fight(a,make('B','blank'),seq([.99,.01,.01,.01]));
  assert.equal(log.after[1].currentHp,6);
  assert.equal(log.events.filter(e=>e.type==='curseBlock').length,1);
});
test('curse can be reapplied after a blocked roll',()=>{
  const a=make('A','attack1',{cursedSlots:[0]});
  const log=fight(a,make('B','curse'));
  assert.equal(log.after[1].currentHp,8);
  assert.equal(log.after[0].cursedSlots.length,3);
  assert(log.after[0].cursedSlots.includes(0));
});
test('finish processes both deaths',()=>{
  const log=fight(make('A','strong',{currentHp:3}),make('B','strong',{currentHp:3}));
  assert.deepEqual(log.after.map(e=>e.status),['dead','dead']);
  assert.deepEqual(log.after.map(e=>e.stars),[0,0]);
});
test('50 surviving battles only',()=>{
  const log=fight(make('A','counter',{stars:49}),make('B','strong',{stars:49,currentHp:3}));
  assert.equal(log.after[0].status,'legend');
  assert.equal(log.after[0].stars,50);
  assert.equal(log.after[1].status,'dead');
  assert.equal(log.after[1].stars,49);
});
test('HP zero during poison can heal before final judgement',()=>{
  const log=fight(make('A','heal',{currentHp:1,poisoned:true}),make('B','blank'));
  assert.equal(log.after[0].currentHp,1);
  assert.equal(log.after[0].status,'active');
});
test('10,000 seeded battles keep state invariants',()=>{
  const r=E.seeded(954021);
  for(let i=0;i<10000;i++){
    const residents=['A','B'].map(name=>{
      const d=E.createDraft(r,1),e=E.fromDraft(d,name,'Tester',d.offers[0],1);
      e.currentHp=1+E.index(r,e.maxHp);e.poisoned=r()<.3;e.stars=E.index(r,50);
      e.cursedSlots=[0,1,2,3,4,5].filter(()=>r()<.25);return e;
    });
    const before=JSON.stringify(residents),log=fight(...residents,r);
    assert.equal(JSON.stringify(residents),before);
    for(const e of log.after){
      assert(e.currentHp>=0&&e.currentHp<=e.maxHp);
      assert.equal(new Set(e.cursedSlots).size,e.cursedSlots.length);
      assert.equal(e.status==='dead',e.currentHp===0);
      if(e.status==='legend')assert.equal(e.stars,50);
    }
  }
});
test('moji accrues only on complete real minutes and retains remainder',()=>{
  const start={balance:0,updatedAt:100000};
  assert.deepEqual(E.accrueMoji(start,159999),start);
  const one=E.accrueMoji(start,160001);
  assert.deepEqual(one,{balance:1,updatedAt:160000});
  assert.deepEqual(E.accrueMoji({...one,balance:0},219999),{balance:0,updatedAt:160000});
  assert.deepEqual(E.accrueMoji({...one,balance:0},220000),{balance:1,updatedAt:220000});
});
test('moji caps at 3000 and does not bank surplus time',()=>{
  const full=E.accrueMoji({balance:2999,updatedAt:0},1000000);
  assert.deepEqual(full,{balance:3000,updatedAt:1000000});
  const spent=E.accrueMoji({...full,balance:1600},1000001);
  assert.equal(spent.balance,1600);
  assert.equal(E.accrueMoji(spent,1060000).balance,1601);
});
test('clock rollback cannot grant moji',()=>{
  assert.deepEqual(E.accrueMoji({balance:12,updatedAt:1000000},500000),{balance:12,updatedAt:500000});
});
test('poison resolves before the dice and persists on four of six sectors',()=>{
  for(let value=1;value<=6;value++){
    const log=fight(make('A','blank',{poisoned:true}),make('B','blank'),seq([(value-.5)/6]));
    assert.deepEqual(log.events.slice(0,3).map(e=>e.type),['poisonTick','poisonCheck','roll']);
    assert.equal(log.events[0].state[0].currentHp,7);
    assert.equal(log.events[1].checks[0].value,value);
    assert.equal(log.events[1].checks[0].continued,value<=4);
  }
});
test('forced battle can select two non-player emojins and returns a normal log',()=>{
  const others=[make('A','attack1',{ownerName:'A'}),make('B','blank',{ownerName:'B'})];
  const mine=make('C','heal',{ownerName:'Me'}),world=[...others,mine];
  const before=JSON.stringify(world),result=E.forced(world,()=>0.01,123456);
  assert.equal(result.battles.length,1);
  assert.deepEqual(result.battles[0].ownerNames,['A','B']);
  assert.equal(result.battles[0].battleAt,123456);
  assert(result.battles[0].events.some(e=>e.type==='finish'));
  assert.deepEqual(result.emojins[2],mine);
  assert.equal(JSON.stringify(world),before);
});
console.log(`${n} tests passed.`);
