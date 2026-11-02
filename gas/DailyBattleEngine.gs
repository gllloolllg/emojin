/* Daily Battle: public schedule and result categories; secret draws stay in GAS. */
(function(root){
'use strict';
const PRIZES=Object.freeze([300,100,300,100,300]);
function dayKey(at=Date.now()){return new Date(at+9*3600000).toISOString().slice(0,10);}
function currentDay(at=Date.now()){return dayKey(at+5.5*3600000);}
function times(day){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||dayKey(Date.parse(day+'T12:00:00+09:00'))!==day)throw Error('Invalid daily battle date');
  const closeAt=Date.parse(day+'T18:30:00+09:00');
  return {openAt:closeAt-86400000,closeAt};
}
function create(day,rng=Math.random){
  const E=root.EmojinEngine,{openAt,closeAt}=times(day),kana=Array.from('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ');
  const fighters=Array.from({length:2},(_,side)=>{
    const emoji=E.EMOJIS[Math.min(E.EMOJIS.length-1,Math.floor(rng()*E.EMOJIS.length))];
    const basic=()=>{let n=rng()*100;for(const face of E.BASIC){n-=face.weight;if(n<0)return face.id;}return 'counter';};
    return {id:'daily-'+day+'-'+side,name:Array.from({length:3},()=>kana[Math.min(kana.length-1,Math.floor(rng()*kana.length))]).join('')+'ン',
      emoji,ownerUid:'npc',ownerName:'NPC',isNpc:true,maxHp:8,currentHp:8,
      slots:[...Array.from({length:5},basic),'attack1'],stars:0,defeats:0,status:'active',poisoned:false,cursedSlots:[],rulesVersion:4,recordVersion:0};
  });
  return {day,version:1,openAt,closeAt,fighters,seed:Math.floor(rng()*4294967296)>>>0};
}
function publicBattle(secret){return {day:secret.day,version:1,openAt:secret.openAt,closeAt:secret.closeAt,status:'open',
  fighters:secret.fighters.map(e=>({name:e.name,emoji:e.emoji,maxHp:8,slots:e.slots.slice(0,3)}))};}
function outcome(result){
  if(result.winner===null)return 2;
  if(![0,1].includes(result.winner)||!['knockout','hp'].includes(result.kind))throw Error('Invalid battle result');
  return result.winner===0?(result.kind==='knockout'?0:1):(result.kind==='knockout'?4:3);
}
function settle(secret){
  const E=root.EmojinEngine,log=E.battle(secret.fighters[0],secret.fighters[1],E.seeded(secret.seed),secret.closeAt,'daily-'+secret.day);
  return {...publicBattle(secret),status:'finished',outcome:outcome(log.result),log};
}
root.DailyBattle=Object.freeze({PRIZES,dayKey,currentDay,times,create,publicBattle,outcome,settle});
})(globalThis);
/* End Daily Battle engine. */
