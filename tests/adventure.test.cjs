const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'adventure-store.js'),'utf8'),ctx);
test('adventure score validation matches v3 weights and rejects invalid or mismatched events',()=>{
 const base={id:'adventure-test',version:3,score:82000,floor:10,level:5,clear:true,events:{bossHeart:820}};assert.equal(ctx.AdventureStore.validateResult(base).score,82000);
 for(const data of [{score:82001},{events:{bossHeart:-1}},{events:{hacked:1}},{version:2},{clear:true,floor:1},{level:1.5}])assert.throws(()=>ctx.AdventureStore.validateResult({...base,...data}));
});
test('adventure engine is synchronized with the latest main resolver except for the explicit fullheal ceiling',()=>{
 const main=fs.readFileSync(path.join(root,'app.js'),'utf8').split('/* MOJI SPIN:')[0];const own=fs.readFileSync(path.join(root,'adventure/engine.js'),'utf8');
 assert.equal(own,main.replace('s.currentHp = full ? s.maxHp : Math.min(s.maxHp, s.currentHp + n);','s.currentHp = full ? Math.max(s.currentHp,Math.min(s.maxHp,s.baseMaxHp ?? s.maxHp)) : Math.min(s.maxHp, s.currentHp + n);'));
 const a={};vm.createContext(a);vm.runInContext(own,a);const player={id:'a',maxHp:10,baseMaxHp:6,currentHp:3,slots:Array(6).fill('fullheal'),poisoned:false,cursedSlots:[]};const foe={...player,id:'b',slots:Array(6).fill('blank')};assert.equal(a.EmojinEngine.resolveTurn(player,foe,()=>0).after[0].currentHp,6);player.currentHp=8;assert.equal(a.EmojinEngine.resolveTurn(player,foe,()=>0).after[0].currentHp,8);
});
test('PWA stages parent and iframe assets together under a new namespace',()=>{
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');for(const file of ['adventure-store.js','adventure/index.html','adventure/engine.js','adventure/game.js','adventure/style.css'])assert(sw.includes("'"+file+"'"));assert(sw.includes('emojin-shell-v3-'));assert(sw.includes("file==='adventure/index.html'"));
});
test('global leaderboard ranks individual runs and preserves legacy single scores',async()=>{
 const docs=[{uid:'a',name:'A',score:1000,entries:[{runId:'a1',score:1000,finishedAt:20},{runId:'a2',score:900,finishedAt:30}]},{uid:'b',name:'B',runId:'b1',score:950,finishedAt:1}];
 const F={collection:()=>'',orderBy:()=>'',limit:()=>'',query:()=>'',getDocsFromServer:async()=>({docs:docs.map(value=>({data:()=>value}))})};
 const store=ctx.AdventureStore.createStore({F});const ranking=await store.rankings();assert.deepEqual(JSON.parse(JSON.stringify(ranking.map(r=>[r.name,r.score]))),[['A',1000],['B',950],['A',900]]);
 docs[1].score=1000;const tied=await store.rankings();assert.equal(tied[0].uid,'a');assert.equal(tied[1].uid,'b');
 docs[0].entries=Array.from({length:10},(_,i)=>({runId:'a'+i,score:2000-i,finishedAt:i}));assert.equal((await store.rankings()).length,10);
});
