/* Paid adventure adapter. Wallet mutations are invoked by createCloud's operation queue. */
(function(root){
'use strict';
const COST=100,VERSION=3,WEIGHTS={mobHp:400,bomb:100,heart:100,chest:300,fullheal:300,midboss:1000,floor:500,bossHeart:100,randomEncounter:300,mapEncounter:500,level:1000};
function validateResult(r){
 if(!r||r.version!==VERSION||typeof r.id!=='string'||!/^adventure-[a-zA-Z0-9-]{1,80}$/.test(r.id)||!Number.isSafeInteger(r.score)||r.score<0||!Number.isInteger(r.floor)||r.floor<1||r.floor>10||!Number.isInteger(r.level)||r.level<1||typeof r.clear!=='boolean'||(r.clear&&r.floor!==10))throw Error('スコアの内容を確認してください。');
 if(!r.events||Object.keys(r.events).some(k=>!Object.hasOwn(WEIGHTS,k)))throw Error('スコアの集計が不正です。');
 let total=0;for(const [key,weight] of Object.entries(WEIGHTS)){const n=r.events[key]??0;if(!Number.isSafeInteger(n)||n<0)throw Error('スコアの集計が不正です。');total+=n*weight;}if(total!==r.score||!Number.isSafeInteger(total))throw Error('スコアが一致しません。');return r;
}
function snapshot(e,hp=e.maxHp){return {id:e.id,name:e.name,emoji:e.emoji,maxHp:hp,baseMaxHp:hp,currentHp:hp,slots:e.slots.slice(),poisoned:false,cursedSlots:[],status:'active'};}
function createStore({E,F,db,ref,receiptRef,nextAccount,requireMatchRules,getUid}){
 const board=uid=>ref('adventureScoresV3',uid);
 async function prepareStart(){
  const uid=getUid();const [active,legends]=await Promise.all([
   F.getDocsFromServer(F.query(F.collection(db,'emojins'),F.where('ownerUid','==',uid),F.where('status','==','active'))),
   F.getDocsFromServer(F.query(F.collection(db,'emojins'),F.where('status','==','legend')))
  ]);
  const own=active.docs.map(d=>d.data()).filter(e=>!e.isNpc);if(!own.length)throw Error('いきている マイエモジンが いません。');
  const all=legends.docs.map(d=>d.data());const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  return {playerId:pick(own).id,legendId:all.length?pick(all).id:null};
 }
 async function write(tx,accountRef,account,op){
  const uid=getUid(),receipt=receiptRef(op.id),prior=await tx.get(receipt);if(prior.exists())return {ok:true,record:prior.data(),account};
  await requireMatchRules(tx);
  if(op.action==='adventureStart'){
   if(!/^adventure-[a-zA-Z0-9-]{1,80}$/.test(op.id))throw Error('プレイIDが不正です。');
   const resident=await tx.get(ref('emojins',op.data.playerId)),owner=await tx.get(ref('owners',uid));
   const legend=op.data.legendId?await tx.get(ref('emojins',op.data.legendId)):null;
   const p=resident.exists()?resident.data():null;
   if(!p||p.ownerUid!==uid||p.isNpc||p.status!=='active')throw Error('いきている マイエモジンが いません。');
   if(legend&&(!legend.exists()||legend.data().status!=='legend'))throw Error('レジェンドを もういちど えらんでください。');
   const now=Date.now(),wallet=E.accrueMoji(account.wallet,now);if(wallet.balance<COST)throw Error('100モジ ひつようです。');wallet.balance-=COST;
   const record={kind:'adventureStart',runId:op.id,uid,name:owner.data().name,version:VERSION,cost:COST,player:snapshot(p),legend:legend?snapshot(legend.data(),40):null,at:now};
   const next=nextAccount(account,{wallet},op.id);tx.set(accountRef,next);tx.set(receipt,record);return {ok:true,record,account:next};
  }
  if(op.action!=='adventureResult')throw Error('不明な操作です。');
  const result=validateResult(op.data.result),paid=await tx.get(receiptRef(result.id)),oldBoard=await tx.get(board(uid));
  if(!paid.exists()||paid.data().kind!=='adventureStart'||paid.data().uid!==uid)throw Error('プレイの支払いが見つかりません。');
  const player=await tx.get(ref('owners',uid));const name=player.data().name;
  const rows=Array.isArray(account.adventureScoresV3)?account.adventureScoresV3:[];
  const entry={runId:result.id,score:result.score,name,finishedAt:Date.now(),floor:result.floor,level:result.level,clear:result.clear};
  const best=!oldBoard.exists()||result.score>oldBoard.data().score;
  const top=[...rows.filter(r=>r.runId!==result.id),entry].sort((a,b)=>b.score-a.score||a.finishedAt-b.finishedAt).slice(0,10);
  const record={kind:'adventureResult',runId:result.id,uid,version:VERSION,score:result.score,events:result.events,best,at:Date.now()};
  const next=nextAccount(account,{adventureScoresV3:top},op.id);
  tx.set(receipt,record);tx.set(accountRef,next);
  tx.set(board(uid),{uid,name,version:VERSION,score:top[0].score,runId:top[0].runId,finishedAt:top[0].finishedAt,entries:top,latestRunId:result.id});
  return {ok:true,record,account:next};
 }
 async function rankings(){const snap=await F.getDocsFromServer(F.query(F.collection(db,'adventureScoresV3'),F.orderBy('score','desc'),F.limit(10)));const records=snap.docs.flatMap(d=>{const player=d.data();return (Array.isArray(player.entries)?player.entries:[player]).map(r=>({...r,uid:player.uid,name:player.name}));});return records.sort((a,b)=>b.score-a.score||(a.uid<b.uid?-1:a.uid>b.uid?1:0)||a.finishedAt-b.finishedAt||a.runId.localeCompare(b.runId)).slice(0,10);}
 return {prepareStart,write,rankings};
}
root.AdventureStore={COST,VERSION,WEIGHTS,validateResult,snapshot,createStore};
})(globalThis);
