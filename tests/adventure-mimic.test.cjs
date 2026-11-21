const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{randomUUID}=require('node:crypto');
const root=path.join(__dirname,'..'),plain=x=>JSON.parse(JSON.stringify(x));
function context(){
 const app={querySelectorAll:()=>[]},c={crypto:{randomUUID},document:{querySelector:()=>app},setInterval(){},window:{parent:{},addEventListener(){}}};vm.createContext(c);
 for(const file of ['adventure-store.js','adventure/engine.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);c.window.parent.AdventureStore=c.AdventureStore;
 vm.runInContext(fs.readFileSync(path.join(root,'adventure/game.js'),'utf8').replace(/title\(\);\s*$/,''),c);
 vm.runInContext("run={floor:1,result:null,score:0,scoreEvents:{}}",c);return c;
}
test('opening has a four-percent mimic branch and preserves conditional normal rewards',()=>{
 const c=context();assert.equal(vm.runInContext('CONFIG.mimic',c),.04);
 for(const n of [0,.02,.039999])assert.equal(vm.runInContext(`chestReward(()=>${n})`,c),'mimic');
 for(const [n,result] of [[0,'fullheal'],[.19999,'fullheal'],[.2,3],[.49999,3],[.5,4],[.79999,4],[.8,5],[.99999,5]]){
  const r=plain(vm.runInContext(`(()=>{let calls=0;const reward=chestReward(()=>++calls===1?.04:${n});return {calls,reward}})()`,c));assert.deepEqual(r,{calls:2,reward:result});
 }
 assert.equal(vm.runInContext("(()=>{let calls=0;chestReward(()=>{calls++;return 0;});return calls})()",c),1);
});
test('mimics reuse Lv3 HP and all six slot probabilities at every depth and lap',()=>{
 const c=context();for(const floor of [1,4,8,11,15,20,21,31])for(const value of [.01,.35,.55,.85,.99]){
  const r=plain(vm.runInContext(`(()=>{run.floor=${floor};Math.random=()=>${value};const normal=enemy(2),foe=mimic();return {normal,foe,xp:experienceReward(foe),turns:battleTurnLimit(foe)}})()`,c));
  assert.equal(r.foe.maxHp,r.normal.maxHp);assert.equal(r.foe.baseMaxHp,r.normal.baseMaxHp);assert.deepEqual(r.foe.slots,r.normal.slots);assert.equal(r.foe.currentHp,r.foe.maxHp);
  assert.equal(r.foe.mobLevel,3);assert(r.foe.mimic);assert.equal(r.turns,10);assert.equal(r.xp,3+Math.floor((floor-1)/10));assert.equal(r.foe.cursedSlots.length,0);assert(!r.foe.poisoned);
 }
});
test('the name pool contains six approved names and all can be selected',()=>{
 const c=context(),names=['ハコジロウ','ミタコトアルヤツ','ザンネンバコ','ナカミハオレ','ホボタカラバコ','タカラジャナイ'];assert.deepEqual(plain(vm.runInContext('MIMIC_NAMES',c)),names);
 for(let i=0;i<names.length;i++)assert.equal(vm.runInContext(`Math.random=()=>${(i+.5)/6};mimic().name`,c),names[i]);
 assert.match(vm.runInContext('mimicArt()',c),/aria-label="ミミック"/);
});
test('map generation keeps ordinary chest markers and never rolls a mimic before opening',()=>{
 const c=context();vm.runInContext("run.legend={name:'legend',emoji:'😈',slots:['drain','attack1','attack2','guard','heal','blank']}",c);
 for(let i=0;i<30;i++){
  const m=plain(vm.runInContext(`generateFloor(${i+1},12)`,c));for(const item of Object.values(m.items)){assert(!item.mimic);if(item.enemy)assert(!item.enemy.mimic);if(item.kind==='chest')assert.deepEqual(item,{kind:'chest'});}
 }
});
