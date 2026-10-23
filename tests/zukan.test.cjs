const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const shared={};vm.createContext(shared);vm.runInContext(source.slice(0,source.indexOf('/* MOJI SPIN:')),shared);
const method=source.slice(source.indexOf('    async getGeneratedEmojis(){'),source.indexOf('    async createOwner('));
function runtime(records=[]){
 let reads=0,now=100000,fail=false,hold=null;
 const c={uid:'me',auth:{currentUser:{uid:'me'}},E:shared.EmojinEngine,db:{},zukanCache:null,zukanAt:0,
  Date:{now:()=>now},retry:fn=>fn(),F:{collection:(_db,name)=>({collection:name}),where:(...args)=>args,
   query:(collection,filter)=>({collection,filter}),getDocsFromServer:async query=>{
    reads++;assert.equal(query.collection.collection,'emojins');assert.deepEqual([...query.filter],['ownerUid','==',c.uid]);
    if(fail)throw Error('offline');if(hold)await hold;
    return {docs:records.map(e=>({data:()=>e}))};
   }}};
 vm.createContext(c);vm.runInContext('globalThis.api={'+method+'};',c);
 return {c,reads:()=>reads,advance:()=>{now+=30001;},fail:value=>{fail=value;},hold:value=>{hold=value;}};
}
const record=(emoji,extra={})=>({ownerUid:'me',isNpc:false,emoji,status:'active',...extra});
const plain=value=>JSON.parse(JSON.stringify(value));
test('catalog includes own active, old graves beyond 200 and legends; excludes other owners, NPCs and unknown faces',async()=>{
 const records=[...Array.from({length:250},()=>record('🐸',{status:'dead'})),record('🤡',{status:'legend'}),
  record('🦐'),record('🐙',{ownerUid:'other'}),record('🦖',{isNpc:true}),record('not-an-emoji')];
 const before=JSON.stringify(records),r=runtime(records),found=plain(await r.c.api.getGeneratedEmojis());
 assert.deepEqual(found,['🐸','🤡','🦐']);assert.equal(r.reads(),1);assert.equal(JSON.stringify(records),before);
});
test('empty collection returns no discoveries, without treating drafts as generated',async()=>{
 const r=runtime();r.c.local={draft:{emoji:'🐸',chosen:'strong'}};
 assert.deepEqual(plain(await r.c.api.getGeneratedEmojis()),[]);
});
test('cache returns independent arrays, expires in 30s and is isolated by owner ID',async()=>{
 const r=runtime([record('🐸')]);const first=await r.c.api.getGeneratedEmojis();first.push('🤡');
 assert.deepEqual(plain(await r.c.api.getGeneratedEmojis()),['🐸']);assert.equal(r.reads(),1);
 r.advance();await r.c.api.getGeneratedEmojis();assert.equal(r.reads(),2);
 r.c.uid='other';r.c.auth.currentUser.uid='other';
 assert.deepEqual(plain(await r.c.api.getGeneratedEmojis()),[]);assert.equal(r.reads(),3);
});
test('failed history fetch does not cache an empty collection; reopening can retry',async()=>{
 const r=runtime([record('🐸')]);r.fail(true);await assert.rejects(r.c.api.getGeneratedEmojis(),/offline/);
 assert.equal(r.c.zukanCache,null);r.fail(false);assert.deepEqual(plain(await r.c.api.getGeneratedEmojis()),['🐸']);
});
test('logout rejects even a warm cache, and an owner change during a read never returns prior-owner data',async()=>{
 const r=runtime([record('🐸')]);await r.c.api.getGeneratedEmojis();r.c.auth.currentUser=null;
 await assert.rejects(r.c.api.getGeneratedEmojis(),/ログイン/);assert.equal(r.reads(),1);
 r.c.auth.currentUser={uid:'me'};r.advance();let release;r.hold(new Promise(resolve=>{release=resolve;}));
 const reading=r.c.api.getGeneratedEmojis();r.c.uid='other';release();await assert.rejects(reading,/変更/);
 assert.equal(r.c.zukanCache.uid,'me');
});
test('a confirmed generation clears the catalog cache immediately, without changing creation settlement',async()=>{
 const records=[record('🐸')],r=runtime(records);
 await r.c.api.getGeneratedEmojis();assert.equal(r.reads(),1);
 const draft=r.c.E.createDraft(()=>0,1);draft.name='New';draft.chosen=draft.offers[0];
 const saved={...r.c.E.fromDraft(draft,draft.name,'Owner',draft.chosen,1),ownerUid:'me',isNpc:false};
 Object.assign(r.c,{local:{draft,player:{name:'Owner'}},persist:()=>{},archiveAt:1,
  enqueue:async()=>{records.push(saved);},ref:()=>({})});
 r.c.F.getDocFromServer=async()=>({exists:()=>true,data:()=>saved});
 const finish=source.slice(source.indexOf('    async finishDraft('),source.indexOf('    saveBattle(request)'));
 vm.runInContext('Object.assign(api,{'+finish+'});',r.c);
 await r.c.api.finishDraft({draftId:draft.id});
 assert.equal(r.c.local.draft,null);assert.equal(r.c.zukanCache,null);
 assert.ok((await r.c.api.getGeneratedEmojis()).includes(saved.emoji));assert.equal(r.reads(),2);
});
