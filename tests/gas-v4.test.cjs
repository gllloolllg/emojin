const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),plain=v=>JSON.parse(JSON.stringify(v));
function runtime(initial,{retry=false}={}) {
 const records=new Map(Object.entries(plain(initial))),logs=[];
 const store={get:key=>records.has(key)?plain(records.get(key)):null,
  query:(collection,_token,active)=>[...records].filter(([key,value])=>key.startsWith(collection+'/')&&key.split('/').length===2&&(!active||value.status==='active')).map(([path,data])=>({path,data:plain(data)})),
  transaction:callback=>{
   const tx={get:key=>store.get(key),query:(name,active)=>store.query(name,null,active),write:(key,value)=>({update:{name:'projects/test/databases/(default)/documents/'+key,fields:plain(value)}})};
   if(retry){retry=false;callback(tx);}
   const result=callback(tx);
   for(const write of result.writes||[])records.set(write.update.name.split('/documents/')[1],plain(write.update.fields));
   return result.value;
  }};
 const c={console:{log:value=>logs.push(value)}};vm.createContext(c);
 for(const name of ['Engine.gs','Code.gs','Migration.gs'])vm.runInContext(fs.readFileSync(path.join(root,'gas',name),'utf8'),c);
 c.firestore_=()=>store;
 return {c,store,records};
}
const resident=(id,uid,extra={})=>({id,name:id,ownerUid:uid,ownerName:uid,isNpc:uid==='npc',emoji:'🐸',maxHp:8,currentHp:8,
 slots:Array(6).fill('attack1'),poisoned:false,cursedSlots:[],stars:0,defeats:0,rulesVersion:4,recordVersion:0,status:'active',createdAt:0,endedAt:null,...extra});
function initial() {
 return {'config/battle':{rulesVersion:4,defeatLimit:10,maintenance:false},'meta/game':{battleSeq:0,legendSeq:0,hour:99},
  'emojins/a':resident('a','u1'),'emojins/b':resident('b','u2'),
  'owners/u1':{uid:'u1',name:'A',createdAt:1,lastAccessAt:1,unreadBattleIds:[]},
  'owners/u2':{uid:'u2',name:'B',createdAt:1,lastAccessAt:1,unreadBattleIds:[]}};
}
function runHour(c,store,hour) {
 for(let i=0;i<100;i++){const result=c.scheduledStep_(store,hour);if(result.done)return result;}
 throw Error('Scheduler did not converge');
}
test('scheduled matches keep losses three and nine alive; only loss ten retires',()=>{
 for(const prior of [2,8,9]){
  const data=initial();data['emojins/a'].slots=Array(6).fill('strong');
  data['emojins/b'].slots=Array(6).fill('blank');data['emojins/b'].defeats=prior;
  for(let i=0;i<8;i++)data['emojins/npc-'+i]=resident('npc-'+i,'npc',{slots:Array(6).fill('strong')});
  const {c,store}=runtime(data),E=c.EmojinEngine,pool=store.query('emojins',null,true).map(row=>row.data);
  let hour=100;
  while(!E.sample(pool,2,E.seeded(((hour*2654435761)^0x50414952)>>>0)).some(e=>e.id==='b'))hour++;
  runHour(c,store,hour);
  const loser=store.get('emojins/b');assert.equal(loser.defeats,prior+1);
  assert.equal(loser.status,prior===9?'dead':'active');
 }
});
test('new GAS does not write while the ten-defeat rollout flag is missing',()=>{
 const data=initial();delete data['config/battle'].defeatLimit;
 const {c,store,records}=runtime(data),before=JSON.stringify([...records]);
 const result=c.scheduledStep_(store,100);assert.equal(result.paused,true);
 assert.equal(JSON.stringify([...records]),before);
});
test('scheduled whole match commits once on retry/hour marker; NPCs and unread count once',()=>{
 const {c,store}=runtime(initial(),{retry:true});const result=runHour(c,store,100);
 assert.equal(result.done,true);assert.equal(store.get('meta/game').battleSeq,1);
 const logs=store.query('battles');assert.equal(logs.length,1);
 const log=JSON.parse(logs[0].data.json);assert.equal(log.rulesVersion,4);assert.ok(log.turns.length<=10);
 for(const uid of ['u1','u2'])assert.equal(store.get('owners/'+uid).unreadBattleIds.length,log.ownerUids.includes(uid)?1:0);
 assert.equal(store.query('emojins',null,true).length,10);
 assert.ok(log.after.some(e=>e.defeats>0));
 c.scheduledStep_(store,100);assert.equal(store.query('battles').length,1);
 // The recorded pair and seed can be passed directly to a manual match without consuming selection draws.
 const pair=log.before;
 const direct=c.EmojinEngine.battle(...pair,c.EmojinEngine.seeded(log.seed),log.battleAt,log.battleId);
 for(const key of ['events','turns','result','awards','after'])assert.deepEqual(plain(direct[key]),log[key]);
});
test('suspension and five-day dormancy are maintained by the Firestore scheduler',()=>{
 const data=initial();data['owners/u1'].unreadBattleIds=Array(7).fill('old');data['owners/u1'].suspendedAt=1;
 const {c,store}=runtime(data);c.scheduledStep_(store,1000);
 assert.equal(store.get('owners/u1').dormant,true);assert.equal(store.query('battles').length,0);
 assert.ok(store.get('meta/game').dormantOwnerUids.includes('u1'));
 assert.equal(store.query('emojins',null,true).filter(row=>row.data.isNpc).length,9);
 assert.equal(store.get('owners/u1').unreadBattleIds.length,7);
});
test('empty worlds initialize/refill without generating a match or incrementing unread counts',()=>{
 const data={'config/battle':{rulesVersion:4,defeatLimit:10,maintenance:false}};
 const {c,store}=runtime(data);
 const result=c.scheduledStep_(store,100,{initializeOnly:true});
 assert.equal(result.done,true);assert.equal(store.query('emojins',null,true).length,10);
 assert.equal(store.get('meta/game').battleSeq,0);assert.equal(store.get('meta/game').hour,100);
 assert.equal(store.query('battles').length,0);
 c.scheduledStep_(store,100,{initializeOnly:true});assert.equal(store.query('emojins',null,true).length,10);
});
test('unfinished previous hours resume before the current hour without duplicating completed rounds',()=>{
 const data=initial();data['meta/game']={battleSeq:4,legendSeq:0,hour:98,runningHour:99,scheduledCount:1};
 const {c,store}=runtime(data);runHour(c,store,100);
 assert.equal(store.get('meta/game').hour,99);assert.equal(store.get('meta/game').battleSeq,4);
 assert.equal(store.query('battles').length,0);
 runHour(c,store,100);assert.equal(store.get('meta/game').hour,100);
 assert.equal(store.query('battles').length,1);assert.match(store.query('battles')[0].path,/b-hour-100-0$/);
});
test('maintenance stops scheduler without writing matches or markers',()=>{
 const data=initial();data['config/battle'].maintenance=true;const {c,store}=runtime(data);
 assert.equal(c.scheduledStep_(store,100).paused,true);assert.equal(store.get('meta/game').hour,99);
});
test('dry run reports only active residents and drafts; migration chunks backup before writing and are idempotent',()=>{
 const data=initial();data['config/battle'].maintenance=true;
 for(let n=0;n<30;n++){
  data['emojins/old'+n]=resident('old'+n,'u1',{maxHp:n%2?9:10,currentHp:1,rulesVersion:3,stars:12,poisoned:true,cursedSlots:[0]});
 }
 data['emojins/history']=resident('history','u1',{status:'dead',rulesVersion:3,maxHp:10,currentHp:0});
 data['wallets/u1']={uid:'u1',wallet:{balance:2000,updatedAt:0},hatch:7,revision:1,draft:{id:'draft',maxHp:10,paid:true,cost:1200}};
 const {c,store}=runtime(data,{retry:true}),before=plain([...store.query('emojins')]);
 assert.equal(c.previewV4Migration().emojinCount,30);assert.deepEqual(plain(store.query('emojins')),before);
 assert.equal(c.migrateToV4().changed,25);assert.equal(c.migrateToV4().changed,5);assert.equal(c.migrateToV4().changed,0);
 assert.equal(store.get('emojins/old0').maxHp,8);assert.equal(store.get('emojins/old0').stars,12);
 assert.equal(store.get('wallets/u1').draft.maxHp,8);assert.equal(store.get('wallets/u1').wallet.balance,2000);
 assert.equal(store.get('wallets/u1').hatch,7);assert.equal(store.get('wallets/u1').draft.cost,1200);
 assert.equal(store.get('emojins/history').maxHp,10);assert.equal(store.query('migrationBackups').length,31);
 c.finishV4Migration();assert.equal(store.get('config/battle').maintenance,false);
});
test('REST adapter preserves Firestore types and retries aborted transactions with fresh tokens',()=>{
 const c={console,PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'demo-emojin-v4'})},
  ScriptApp:{getOAuthToken:()=> 'test-only'},Utilities:{sleep:()=>{}},UrlFetchApp:{}};
 let begins=0,commits=0,lastWrite;
 c.UrlFetchApp.fetch=(url,options)=>{
  let status=200,body={};
  if(url.endsWith(':beginTransaction'))body={transaction:'tx-'+(++begins)};
  else if(url.endsWith(':commit')){
   lastWrite=JSON.parse(options.payload).writes[0].update;commits++;
   if(commits===1){status=409;body={error:{message:'ABORTED'}};}
  }else if(url.endsWith(':rollback'))body={};
  else if(url.endsWith(':batchGet'))body=[{found:{fields:{number:{integerValue:'123'},flag:{booleanValue:true},
   nothing:{nullValue:null},decimal:{doubleValue:1.5},array:{arrayValue:{values:[{stringValue:'a'}]}},nested:{mapValue:{fields:{x:{integerValue:'7'}}}}}}}];
  else throw Error('Unexpected request '+url);
  return {getResponseCode:()=>status,getContentText:()=>JSON.stringify(body)};
 };
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'gas/Code.gs'),'utf8'),c);
 const store=c.firestore_();store.transaction(tx=>{const data=tx.get('meta/game');return {writes:[tx.write('meta/game',data)],value:null};});
 assert.equal(begins,2);assert.equal(commits,2);
 assert.equal(lastWrite.fields.array.arrayValue.values[0].stringValue,'a');
 assert.equal(lastWrite.fields.nested.mapValue.fields.x.integerValue,'7');
 assert.equal(lastWrite.fields.number.integerValue,'123');assert.equal(lastWrite.fields.nothing.nullValue,null);
 assert.ok(!lastWrite.name.startsWith('https://'));
});
