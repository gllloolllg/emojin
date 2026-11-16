const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{randomUUID}=require('node:crypto');
const root=path.join(__dirname,'..'),plain=v=>JSON.parse(JSON.stringify(v));
function context(){
 const app={innerHTML:'',querySelectorAll:()=>[]},style={setProperty(){}};
 const c={crypto:{randomUUID},document:{querySelector:()=>app,documentElement:{dataset:{},style},body:{style:{}}},setInterval(){},window:{addEventListener(){},parent:{}}};vm.createContext(c);
 for(const file of ['adventure-store.js','adventure/engine.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 c.window.parent.AdventureStore=c.AdventureStore;
 vm.runInContext(fs.readFileSync(path.join(root,'adventure/game.js'),'utf8').replace(/title\(\);\s*$/,''),c);
 vm.runInContext("createRun({runId:'adventure-loop-test',player:{id:'p',name:'p',emoji:'🐱',maxHp:6,baseMaxHp:6,currentHp:6,slots:['attack1','attack2','blank','heal','guard','drain'],poisoned:false,cursedSlots:[]},legend:{name:'legend',emoji:'🧛',slots:['twin','attack1','attack2','heal','guard','counter']}})",c);return c;
}
test('all laps repeat stage types with progressively larger HP and starting special n',()=>{
 const c=context();for(const cycle of [1,2,3,4,10])for(let stage=1;stage<=10;stage++){
  const floor=(cycle-1)*10+stage;const r=plain(vm.runInContext(`(()=>{run.floor=${floor};const m=generateFloor(${floor},12),lv=mobLevel(),foe=enemy(lv-1);return {lap:lap(),stage:localFloor(),lv,hp:foe.maxHp,boss:m.boss,goal:m.goal,connected:reachable(m.cells,m.edges,12).has(m.goal),adjacent:adjacent(12).includes(m.goal),limits:[battleTurnLimit(foe),battleTurnLimit({boss:true})]}})()`,c));
  assert.equal(r.lap,cycle);assert.equal(r.stage,stage);assert(r.connected&&!r.adjacent);
  const ranges=[[1,2],[1,3],[2,4]][r.lv-1];assert(r.hp>=ranges[0]+cycle-1&&r.hp<=ranges[1]+cycle-1);assert.equal(r.limits[0],10);
  if(stage===5){assert.equal(r.boss.maxHp,8+2*(cycle-1));assert.equal(r.limits[1],20);}
  else if(stage===10){assert.equal(r.boss.maxHp,40);assert.equal(r.boss.bossN,cycle);assert(!r.boss.bossCharged);assert.equal(r.boss.slots.filter(x=>x==='devil').length,1);assert.equal(r.limits[1],30);}
  else assert.equal(r.boss,null);
 }
});
test('XP grows by one per lap for every enemy, including the final boss',()=>{
 const c=context();for(const cycle of [1,2,3,4])for(const stage of [1,4,5,8,10]){
  vm.runInContext(`run.floor=${(cycle-1)*10+stage}`,c);
  assert.equal(vm.runInContext('experienceReward({boss:false})',c),(stage<=3?1:stage<=7?2:3)+cycle-1);
  assert.equal(vm.runInContext('experienceReward({boss:true})',c),(stage===5?3:0)+cycle-1);
 }
});
test('every scoring category gets the current lap multiplier and remains v3-valid',()=>{
 const c=context();const events=Object.keys(c.AdventureStore.WEIGHTS);
 for(const cycle of [1,2,3,7]){
  const r=plain(vm.runInContext(`(()=>{run.floor=${(cycle-1)*10+1};run.score=0;run.scoreEvents={};${events.map(k=>`addScore('${k}',2);`).join('')}return finishScore(false)})()`,c));
  assert.equal(r.score,Object.values(c.AdventureStore.WEIGHTS).reduce((a,b)=>a+b,0)*2*cycle);
  for(const k of events)assert.equal(r.events[k],2*cycle);assert.doesNotThrow(()=>c.AdventureStore.validateResult(r));vm.runInContext('run.result=null',c);
 }
 vm.runInContext("run.floor=11;run.score=0;run.scoreEvents={};addScore('floor',11)",c);assert.equal(vm.runInContext('run.score',c),11000);
 vm.runInContext("run.floor=21;run.score=0;run.scoreEvents={};addScore('floor',21)",c);assert.equal(vm.runInContext('run.score',c),31500);
 vm.runInContext('run.floor=20;run.score=0;run.scoreEvents={};scoreBossHearts(36,2)',c);assert.equal(vm.runInContext('run.score',c),2200);
});
test('skill treasure uses the original conditional weights and excludes blank/special',()=>{
 const c=context(),expected={attack1:30,attack2:22,heal:10,guard:10,counter:10},counts={};
 for(let i=0;i<82;i++){const face=vm.runInContext(`skillReward(()=>${(i+.5)/82})`,c);counts[face]=(counts[face]||0)+1;}assert.deepEqual(counts,expected);
});
test('deep floors validate without changing score version or permitting malformed results',()=>{
 const c=context(),base={id:'adventure-deep',version:3,score:11000,floor:11,level:7,clear:false,events:{floor:22}};
 for(const floor of [11,20,21,1001])assert.doesNotThrow(()=>c.AdventureStore.validateResult({...base,floor}));
 for(const floor of [0,-1,1.5,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>c.AdventureStore.validateResult({...base,floor}));
 assert.doesNotThrow(()=>c.AdventureStore.validateResult({...base,floor:10,clear:true}));assert.throws(()=>c.AdventureStore.validateResult({...base,clear:true}));
});
test('later legends are selected from the complete read-only pool and copied',async()=>{
 const c=context(),docs=Array.from({length:230},(_,i)=>({name:'L'+i,emoji:'🐢',maxHp:8,slots:['drain','attack1','attack2','heal','counter','guard']}));
 const F={query:()=>'',collection:()=>'',where:()=>'',getDocsFromServer:async()=>({docs:docs.map(d=>({data:()=>d}))})};
 vm.runInContext('Math.random=()=>.99999',c);const service=c.AdventureStore.createStore({F});const legend=await service.prepareLegend();assert.equal(legend.name,'L229');assert.equal(legend.maxHp,40);legend.slots[0]='blank';assert.equal(docs[229].slots[0],'drain');docs.length=0;assert.equal(await service.prepareLegend(),null);
});
