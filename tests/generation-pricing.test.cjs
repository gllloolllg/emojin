const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=readFileSync(join(__dirname,'..','app.js'),'utf8');
const gateSource=source.slice(source.indexOf('  async function requireMatchRules('),source.indexOf('  // One live subscription'));
const engine={crypto:webcrypto};vm.createContext(engine);
vm.runInContext(source.slice(0,source.indexOf('/* Firebase configuration is public.')),engine);
const E=engine.EmojinEngine,clone=value=>JSON.parse(JSON.stringify(value));
const emojins=count=>Array.from({length:count},(_,i)=>({id:'mine-'+i,ownerUid:'me',status:'active',isNpc:false}));

function database({count=0,balance=2000,hatch=0,draft=null,retryCount=null,owner=true,account=true,legacy=3500}={}){
 const documents=new Map();let population=emojins(count),retryPending=retryCount!==null;
 if(owner)documents.set('owners/me',{uid:'me',name:'Owner',createdAt:Date.now(),unreadBattleIds:[]});
 if(account)documents.set('wallets/me',{uid:'me',wallet:{balance,updatedAt:Date.now()},hatch,draft,revision:1,recentOperations:[]});
 documents.set('config/battle',{rulesVersion:4,maintenance:false});
 documents.set('meta/game',{battleSeq:0,legendSeq:0,revision:1});
 const snap=path=>({exists:()=>documents.has(path),data:()=>documents.has(path)?clone(documents.get(path)):undefined});
 const sandbox={E,crypto:webcrypto,uid:'me',local:{uid:'me',wallet:{balance:legacy,updatedAt:Date.now()},hatch:0,pending:[]},
  db:{},walletRef:()=> 'wallets/me',metaRef:'meta/game',ref:(collection,id)=>collection+'/'+id,
  data:s=>s.exists()?s.data():null,defaultMeta:()=>({}),retry:fn=>fn(),flush:async()=>{},persist:()=>{},
  applyAccount:value=>{sandbox.applied=clone(value);},displayedWallet:()=>sandbox.applied.wallet,
  lastTouch:0,accessSnapshot:null,
  activeDocs:async()=>({docs:population.map(e=>({data:()=>clone(e)}))}),
  F:{onSnapshot:()=>()=>{},runTransaction:async(_db,fn)=>{
   async function execute(commit){
    const changes=[];let writing=false;
    const value=await fn({get:async path=>{assert.equal(writing,false);return snap(path);},set:(path,value)=>{writing=true;changes.push([path,clone(value)]);}});
    if(commit)for(const [path,value]of changes)documents.set(path,value);
    return value;
   }
   if(retryPending){retryPending=false;await execute(false);population=emojins(retryCount);}
   return execute(true);
  }}
 };
 vm.createContext(sandbox);
 const nextAccount=source.slice(source.indexOf('  function nextAccount('),source.indexOf('  function ensureWallet('));
 const ensureWallet=source.slice(source.indexOf('  function ensureWallet('),source.indexOf('  writeOperation=async op=>{'));
 const start=source.indexOf('    async startDraft(){'),end=source.indexOf('    chooseSpecial(',start);
 const installStart=source.indexOf('  async function installOwner('),installEnd=source.indexOf('  return {\n',installStart);
 vm.runInContext('let walletReady=null,walletUid="",walletStop=null;\n'+gateSource+nextAccount+ensureWallet+source.slice(installStart,installEnd)+'\nglobalThis.cloud={'+source.slice(start,end)+'};',sandbox);
 return {sandbox,read:path=>documents.has(path)?clone(documents.get(path)):undefined,
  start:()=>sandbox.cloud.startDraft(),install:()=>sandbox.installOwner('Owner',{user:{uid:'me'}},true),ensure:()=>sandbox.ensureWallet()};
}

test('all generation prices, including five-plus and non-owned/dead/legend/NPC exclusions',()=>{
 for(let n=0;n<8;n++){
  const all=[...emojins(n),{ownerUid:'other',status:'active'},{ownerUid:'me',status:'dead'},
   {ownerUid:'me',status:'legend'},{ownerUid:'me',isNpc:true,status:'active'}];
  assert.equal(E.generationCost(all,'me'),[100,200,400,800,1000,1200][Math.min(n,5)]);
 }
});
for(let count=0;count<7;count++){
 test(`${count} living owned emojins: exact transaction price, reservation and no duplicate debit`,async()=>{
  const cost=[100,200,400,800,1000,1200][Math.min(count,5)],db=database({count,balance:cost});
  const first=await db.start();assert.equal(db.read('wallets/me').wallet.balance,0);
  assert.equal(first.draft.cost,cost);assert.equal(first.draft.payment,'moji');
  const second=await db.start();assert.equal(second.draft.id,first.draft.id);
  assert.equal(db.read('wallets/me').wallet.balance,0);
 });
}
test('one moji short fails without reserving a draft or charging',async()=>{
 for(let count=0;count<6;count++){
  const cost=[100,200,400,800,1000,1200][count],db=database({count,balance:cost-1});
  await assert.rejects(db.start(),new RegExp(cost+'モジ'));assert.equal(db.read('wallets/me').wallet.balance,cost-1);
  assert.equal(db.read('wallets/me').draft,null);
 }
});
test('full hatch gauge takes precedence over moji pricing',async()=>{
 const db=database({count:6,balance:0,hatch:10});const result=await db.start();
 assert.equal(result.draft.cost,0);assert.equal(result.draft.payment,'hatch');
 assert.equal(db.read('wallets/me').wallet.balance,0);assert.equal(db.read('wallets/me').hatch,10);
});
test('transaction retry recalculates population and price',async()=>{
 const db=database({count:0,balance:1000,retryCount:3});await db.start();
 assert.equal(db.read('wallets/me').draft.cost,800);assert.equal(db.read('wallets/me').wallet.balance,200);
});
test('existing paid draft is resumed at its original price without another debit',async()=>{
 const draft={id:'old-draft',paid:true,payment:'moji'},db=database({count:0,balance:37,draft});
 const result=await db.start();assert.equal(result.draft.id,'old-draft');assert.equal(db.read('wallets/me').wallet.balance,37);
});
test('new owner receives 2000 even with a stale 3500 pre-login wallet',async()=>{
 const db=database({owner:false,account:false,legacy:3500});await db.install();
 assert.equal(db.read('wallets/me').wallet.balance,2000);assert.equal(db.sandbox.applied.wallet.balance,2000);
});
test('existing owner wallet and legacy wallet migration retain their balance',async()=>{
 const existing=database({balance:4321});await existing.install();assert.equal(existing.read('wallets/me').wallet.balance,4321);
 const legacy=database({account:false,legacy:3500});await legacy.ensure();assert.equal(legacy.read('wallets/me').wallet.balance,3500);
});
test('fresh browser local wallet starts at 2000',()=>{
 const sandbox={crypto:webcrypto,localStorage:{getItem:()=>null}};sandbox.window=sandbox;vm.createContext(sandbox);
 vm.runInContext(source.slice(0,source.indexOf('async function createCloud()')),sandbox);
 assert.equal(vm.runInContext('local.wallet.balance',sandbox),2000);
});
test('same-id migrated draft refreshes HP while retaining local name/choice/stage',async()=>{
 const db=database({draft:{id:'reserved',maxHp:8,rulesVersion:4,offers:['poison','curse']}});
 db.sandbox.local.draft={id:'reserved',maxHp:10,name:'My name',chosen:'poison',stage:'reels'};
 await db.ensure();assert.equal(db.sandbox.local.draft.maxHp,8);
 assert.equal(db.sandbox.local.draft.name,'My name');assert.equal(db.sandbox.local.draft.chosen,'poison');
 assert.equal(db.sandbox.local.draft.stage,'reels');
});
