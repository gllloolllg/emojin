const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const E=require('../adventure/engine.js'),B=E.Boss;
const player=(face='blank',hp=8)=>({id:'p',emoji:'🐙',name:'プレイヤー',maxHp:hp,baseMaxHp:hp,currentHp:hp,slots:Array(6).fill(face),poisoned:false,cursedSlots:[]});
const boss=(n=1)=>({...B.prepare({...player('blank'),slots:['strong','blank','blank','blank','blank','blank'],emoji:'🐢',name:'レジェンド'}),bossN:n});
function sequence(...values){let i=0;return()=>{assert(i<values.length,'unexpected random draw');return values[i++];};}
const draw=(p,b,card)=>B.resolveTurn(p,b,sequence(0,0,(card+.1)/4,0));
test('final boss copies only the legend special slot, preserves identity and five ordinary slots',()=>{
 const source={...player(),name:'とてもながい レジェンド名',emoji:'🐦‍🔥',slots:['attack2','guard','drain','counter','heal','blank']},before=E.clone(source),b=B.prepare(source);
 assert.deepEqual(source,before);assert.equal(b.name,source.name);assert.equal(b.emoji,source.emoji);assert.deepEqual(b.slots,['attack2','guard','devil','counter','heal','blank']);assert.equal(b.maxHp,40);assert.equal(b.bossN,1);assert.equal(b.bossCharged,false);
 assert.equal(E.FACES.drain.value,2);assert.equal(E.FACES.ram.value,4);assert.equal(E.FACES.devil,undefined);
});
test('boss actions use four equal probability ranges and increment n only on a valid devil draw',()=>{
 for(const [value,kind] of [[0,'attack'],[.249999,'attack'],[.25,'heal'],[.499999,'heal'],[.5,'curse'],[.749999,'curse'],[.75,'charge'],[.999999,'charge']]){
  const r=B.resolveTurn(player(),boss(),sequence(0,0,value,0));assert.equal(r.after[1].bossEffect.kind,kind);assert.equal(r.after[1].bossEffect.n,1);assert.equal(r.after[1].bossN,2);
 }
 const b=boss();b.cursedSlots=[0];const r=B.resolveTurn(player(),b,sequence(0,0));assert.equal(r.after[1].bossN,1);assert.equal(r.after[1].bossEffect,null);assert.equal(r.events.filter(e=>e.type==='bossDraw').length,0);assert.deepEqual(r.after[1].cursedSlots,[]);
});
test('boss attack n runs through ordinary guard, counter and simultaneous attack rules',()=>{
 const guarded=draw(player('guard'),boss(3),0);assert.equal(guarded.after[0].currentHp,6);assert.equal(guarded.events.find(e=>e.type==='impact').attacks[0].blocked,1);
 const reflected=draw(player('counter'),boss(5),0);assert.equal(reflected.after[0].currentHp,8);assert.equal(reflected.after[1].currentHp,35);assert.equal(reflected.events.find(e=>e.type==='counter').counters[0].damage,5);
 const ram=draw(player('ram'),boss(2),0);assert.equal(ram.after[0].currentHp,4);assert.equal(ram.after[1].currentHp,36);
 const drain=draw(player('drain'),boss(2),0);assert.equal(drain.after[0].currentHp,8);assert.equal(drain.after[1].currentHp,38);
});
test('boss healing happens in the normal healing phase, up to HP40, cleans poison and one curse',()=>{
 const b=boss(4);b.currentHp=39;b.poisoned=true;b.cursedSlots=[3,4];
 const r=B.resolveTurn(player('attack1'),b,sequence(.5,0,0,.3,0));assert.equal(r.after[1].currentHp,39);assert.equal(r.after[1].poisoned,false);assert.deepEqual(r.after[1].cursedSlots,[4]);
 const healIndex=r.events.findIndex(e=>e.type==='heal'),impactIndex=r.events.findIndex(e=>e.type==='impact');assert(healIndex<impactIndex);
});
test('boss curse n follows normal curse phase and cannot disable an action already drawn this turn',()=>{
 const r=B.resolveTurn(player('attack2'),boss(2),sequence(0,0,.6,0,0));assert.equal(r.after[1].currentHp,38);assert.deepEqual(r.after[0].cursedSlots,[0,1]);assert(r.events.findIndex(e=>e.type==='impact')<r.events.findIndex(e=>e.type==='curseApply'));
 const max=B.resolveTurn(player(),boss(9),sequence(0,0,.6,0,0,0,0,0,0));assert.equal(max.after[0].cursedSlots.length,6);
});
test('ultra occurrences alternate charge and immediate ten damage; n increases for both',()=>{
 const charge=draw(player(),boss(),3);assert.equal(charge.after[0].currentHp,8);assert.equal(charge.after[1].bossCharged,true);assert.equal(charge.after[1].bossEffect.kind,'charge');assert.equal(charge.after[1].bossN,2);
 const survivor=player('counter',13),release=draw(survivor,charge.after[1],3);assert.equal(release.after[0].currentHp,3);assert.equal(release.after[1].bossCharged,false);assert.equal(release.after[1].bossEffect.kind,'ultra');assert.equal(release.after[1].bossN,3);
 const again=draw(player(),release.after[1],3);assert.equal(again.after[1].bossCharged,true);assert.equal(again.after[1].bossN,4);
 const b=boss();b.bossCharged=true;const lethal=draw(player('fullheal'),b,3);assert.equal(lethal.after[0].currentHp,0);assert.equal(lethal.events.some(e=>e.type==='heal'),false);
});
test('ordinary rolls do not consume charge or n, and normal battles exactly preserve existing output',()=>{
 const main={};vm.createContext(main);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').split('/* MOJI SPIN:')[0],main);
 for(let i=0;i<1000;i++){
  const gen=E.seeded(i+100),a=player(E.SPECIAL[i%7]),b=player(E.SPECIAL[(i+3)%7]);a.id='a';b.id='b';a.slots=[...E.createDraft(gen).basicSlots,a.slots[0]];b.slots=[...E.createDraft(gen).basicSlots,b.slots[0]];
  const expected=main.EmojinEngine.resolveTurn(a,b,E.seeded(i)),actual=B.resolveTurn(a,b,E.seeded(i));assert.deepEqual(actual,JSON.parse(JSON.stringify(expected)));
 }
 const b=boss(7);b.bossCharged=true;const r=B.resolveTurn(player(),b,sequence(0,.3));assert.equal(r.after[1].bossN,7);assert.equal(r.after[1].bossCharged,true);assert.equal(r.after[1].bossEffect,null);
});
test('charge icons have no number, powered ultra has ten, selected charge remains charge on return',()=>{
 assert(!B.icon({kind:'charge',n:5}).includes('<text'));assert(B.icon({kind:'ultra',n:5}).includes('>10</text>'));assert(!B.icon({kind:'charge',n:5}).includes('😈'));assert(B.icon({kind:'attack',n:5}).includes('>5</span>'));
 const r=draw(player(),boss(),3);assert.equal(r.after[1].bossEffect.kind,'charge');assert(B.icon(r.after[1].bossEffect).includes('data-state="charge"'));assert(r.after[1].bossCharged);
});
test('deferred drain and ram balance changes are not applied, including golden HP recovery',()=>{
 const p=player('drain');p.baseMaxHp=6;p.maxHp=11;p.currentHp=6;
 const drained=B.resolveTurn(p,boss(),sequence(0,.2));assert.equal(drained.after[0].currentHp,8);assert.equal(drained.after[1].currentHp,38);
 const b=boss();b.slots[1]='counter';const reflected=B.resolveTurn(player('ram'),b,sequence(0,.2));assert.equal(reflected.after[0].currentHp,2);
});
