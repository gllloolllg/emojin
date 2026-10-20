const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),plain=v=>JSON.parse(JSON.stringify(v));
function runtime(initial={},project='emojin-test',property=null) {
 const records=new Map(Object.entries(plain(initial)));let reads=0,triggers=0;
 const store={get:key=>{reads++;return records.has(key)?plain(records.get(key)):null;},
  query:(name,_transaction,active)=>{reads++;return [...records].filter(([key,value])=>key.startsWith(name+'/')&&key.split('/').length===2&&(!active||value.status==='active')).map(([path,data])=>({path,data:plain(data)}));},
  transaction:callback=>{
   const tx={get:store.get,query:(name,active)=>store.query(name,null,active),write:(key,data)=>({update:{name:'projects/demo/documents/'+key,fields:plain(data)}})};
   const result=callback(tx);for(const w of result.writes||[])records.set(w.update.name.split('/documents/')[1],plain(w.update.fields));return result.value;
  }};
 const c={console:{log:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:()=>property})},
  ScriptApp:{getProjectTriggers:()=>{triggers++;throw Error('No automatic triggers');}}};vm.createContext(c);
 for(const name of ['Engine.gs','Code.gs','Migration.gs']){
  const source=fs.readFileSync(path.join(root,'gas',name),'utf8').replace("const FIREBASE_PROJECT_ID = 'emojin-49855';","const FIREBASE_PROJECT_ID = '"+project+"';");
  vm.runInContext(source,c);
 }
 vm.runInContext(fs.readFileSync(path.join(root,'scripts/test-project-setup.gs'),'utf8'),c);
 c.firestore_=()=>store;
 return {c,records,store,reads:()=>reads,triggers:()=>triggers};
}
test('test setup rejects a production constant or property before accessing Firestore',()=>{
 for(const [project,property] of [['emojin-49855',null],['emojin-test','emojin-49855'],['emojin-test','other']]){
  const r=runtime({},project,property);
  assert.throws(()=>r.c.checkTestConnection(),/only connects/);assert.throws(()=>r.c.initializeTestWorld(),/only connects/);
  assert.equal(r.reads(),0);assert.equal(r.records.size,0);
 }
});
test('test connection check is read-only and succeeds on an empty database',()=>{
 const r=runtime(),report=r.c.checkTestConnection();assert.equal(report.projectId,'emojin-test');
 assert.equal(report.activeCount,0);assert.equal(report.rulesVersion,null);assert.equal(report.initialized,false);assert.equal(r.records.size,0);
});
test('test initialization creates v4 metadata and ten NPCs without matches, wallets or triggers',()=>{
 const r=runtime(),report=r.c.initializeTestWorld();assert.equal(report.activeCount,10);assert.equal(report.rulesVersion,4);
 assert.equal(r.store.get('meta/game').battleSeq,0);assert.equal(r.store.get('meta/game').hour,Math.floor(Date.now()/3600000)-1);
 const npcs=r.store.query('emojins');assert.ok(npcs.every(({data:e})=>e.isNpc&&e.maxHp>=5&&e.maxHp<=8&&e.defeats===0&&e.rulesVersion===4));
 for(const name of ['owners','wallets','battles','legends'])assert.equal(r.store.query(name).length,0);
 assert.equal(r.triggers(),0);
});
test('repeated test initialization preserves residents, scores, accounts and match records',()=>{
 const r=runtime();r.c.initializeTestWorld();
 const first=r.store.query('emojins')[0];r.records.set(first.path,{...first.data,stars:4,defeats:2,recordVersion:1});
 r.records.set('wallets/u',{uid:'u',wallet:{balance:12345,updatedAt:1},hatch:8});r.records.set('battles/previous',{seq:1,json:'{}'});
 const prior=plain([...r.records].filter(([key])=>key!=='meta/game'));
 r.c.initializeTestWorld();assert.deepEqual(plain([...r.records].filter(([key])=>key!=='meta/game')),prior);
 assert.equal(r.store.query('emojins').length,10);assert.equal(r.triggers(),0);
});
test('test initialization refuses existing unconfigured data or maintenance state without writing',()=>{
 for(const data of [{'emojins/old':{status:'active',maxHp:10}}, {'config/battle':{rulesVersion:4,defeatLimit:10,maintenance:true},'meta/game':{battleRulesVersion:4}}]){
  const r=runtime(data);assert.throws(()=>r.c.initializeTestWorld(),/empty database|already has configuration/);
  assert.deepEqual(Object.fromEntries(r.records),data);
 }
});
