/* MOJI SPIN: probabilities and payouts are intentionally fixed, not RTP-adjusted. */
(function(root){
'use strict';
const CONFIG=Object.freeze({
  version:3,
  maxBet:400,
  lineBet:1,
  symbols:Object.freeze([
    {id:'wild',emoji:'🤡',weight:2.5,payout:256,name:'ワイルド'},
    {id:'smile',emoji:'😄',weight:4,payout:128,name:'7'},
    {id:'gift',emoji:'🎁',weight:6,payout:64,name:'BAR'},
    {id:'bell',emoji:'🔔',weight:9,payout:32,name:'ベル'},
    {id:'melon',emoji:'🍉',weight:11,payout:16,name:'スイカ'},
    {id:'berry',emoji:'🍇',weight:13,payout:8,name:'グレープ'},
    {id:'orange',emoji:'🍊',weight:15,payout:4,name:'オレンジ'},
    {id:'cherry',emoji:'🍒',weight:18,payout:2,name:'チェリー'},
    {id:'blank',emoji:'',weight:21.5,payout:0,name:'ブランク'}
  ].map(Object.freeze)),
  anyBonus:Object.freeze(Object.fromEntries(Object.entries({
    cherry:{4:4,5:8,6:40,7:160,8:800,9:4000},
    orange:{4:4,5:8,6:60,7:240,8:1200,9:6000},
    berry:{4:4,5:16,6:80,7:320,8:1600,9:8000},
    melon:{4:8,5:24,6:120,7:480,8:2400,9:12000},
    bell:{3:4,4:8,5:32,6:160,7:640,8:3200,9:16000},
    gift:{3:4,4:12,5:60,6:240,7:960,8:4800,9:24000},
    smile:{3:4,4:16,5:80,6:320,7:1280,8:8000,9:32000}
  }).map(([id,payouts])=>[id,Object.freeze(payouts)]))),
  lines:Object.freeze([[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].map(Object.freeze)),
  freeCounts:Object.freeze([{count:4,weight:40},{count:5,weight:30},{count:7,weight:20},{count:10,weight:8},{count:20,weight:2}].map(Object.freeze))
});
const byId=Object.freeze(Object.fromEntries(CONFIG.symbols.map(s=>[s.id,s])));
// Historical payouts are used only for already-drawn v1 rounds, including offline operations.
const LEGACY_PAYOUTS=Object.freeze({wild:400,smile:160,gift:80,bell:50,melon:30,berry:20,orange:14,cherry:10,blank:0});
const legacySymbols=CONFIG.symbols.map(s=>({...s,payout:LEGACY_PAYOUTS[s.id]}));
const BET=CONFIG.lineBet*CONFIG.lines.length;
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
function weighted(items,rng){let value=rng()*100;for(const item of items){value-=item.weight;if(value<0)return item;}return items[items.length-1];}
function checkCells(cells){
  if(!Array.isArray(cells)||cells.length!==9||Array.from(cells).some(id=>!Object.hasOwn(byId,id)))throw Error('Invalid slot symbols');
}
function evaluateAnyBonus(cells){
  checkCells(cells);
  const wins=[],wildCount=cells.filter(id=>id==='wild').length;
  for(const [symbol,payouts] of Object.entries(CONFIG.anyBonus)){
    const indices=cells.flatMap((id,i)=>id===symbol||id==='wild'?[i]:[]);
    const count=indices.length,payout=payouts[count]||0;
    if(payout)wins.push({symbol,count,naturalCount:count-wildCount,wildCount,indices,payout});
  }
  return {wins,payout:wins.reduce((sum,w)=>sum+w.payout,0),winningCells:[...new Set(wins.flatMap(w=>w.indices))].sort((a,b)=>a-b)};
}
function validBet(bet){return Number.isInteger(bet)&&bet>=BET&&bet<=CONFIG.maxBet&&bet%BET===0;}
function evaluate(cells,version=CONFIG.version,bet=BET){
  checkCells(cells);
  if(![1,2,CONFIG.version].includes(version)||!validBet(bet)||(version<3&&bet!==BET))throw Error('Unsupported slot rules');
  const multiplier=bet/BET;
  const wins=[];
  CONFIG.lines.forEach((indices,line)=>{
    const symbols=indices.map(i=>cells[i]);
    if(symbols.includes('blank'))return;
    const match=(version===1?legacySymbols:CONFIG.symbols).filter(s=>s.payout>0&&symbols.every(id=>id==='wild'||id===s.id)).sort((a,b)=>b.payout-a.payout)[0];
    if(match)wins.push({line,indices:[...indices],symbol:match.id,payout:match.payout*CONFIG.lineBet*multiplier});
  });
  const linePayout=wins.reduce((sum,w)=>sum+w.payout,0);
  if(version===1)return {cells:[...cells],wins,payout:linePayout};
  const any=evaluateAnyBonus(cells);
  any.wins.forEach(win=>{win.payout*=multiplier;});any.payout*=multiplier;
  const winningCells=[...new Set([...wins.flatMap(w=>w.indices),...any.winningCells])].sort((a,b)=>a-b);
  return {cells:[...cells],wins,linePayout,anyWins:any.wins,anyPayout:any.payout,winningCells,payout:linePayout+any.payout};
}
function roll(free=false,rng=random,bet=BET){
  return {...evaluate(Array.from({length:9},(_,i)=>free&&i===4?'wild':weighted(CONFIG.symbols,rng).id),CONFIG.version,bet),free};
}
function createRound(rng=random,bet=BET){
  if(!validBet(bet))throw Error('BETは8〜400の8の倍数で指定してください。');
  const first=roll(false,rng,bet);
  const freeCount=first.cells[4]==='wild'?weighted(CONFIG.freeCounts,rng).count:0;
  const spins=[first];for(let i=0;i<freeCount;i++)spins.push(roll(true,rng,bet));
  return {id:'slot-'+crypto.randomUUID(),version:CONFIG.version,bet,freeCount,spins,total:spins.reduce((sum,s)=>sum+s.payout,0),createdAt:Date.now()};
}
function sameResult(expected,actual){
  if(Array.isArray(expected))return Array.isArray(actual)&&expected.length===actual.length&&expected.every((value,i)=>sameResult(value,actual[i]));
  if(expected&&typeof expected==='object'){
    const keys=Object.keys(expected);
    return !!actual&&typeof actual==='object'&&!Array.isArray(actual)&&keys.length===Object.keys(actual).length
      && keys.every(key=>Object.hasOwn(actual,key)&&sameResult(expected[key],actual[key]));
  }
  return expected===actual;
}
function validateRound(round){
  if(!round||![1,2,CONFIG.version].includes(round.version)||!validBet(round.bet)||(round.version<3&&round.bet!==BET)||!/^slot-[\w-]+$/.test(round.id)||!Array.isArray(round.spins))throw Error('スロットの抽選データが不正です。');
  if(round.spins.length!==round.freeCount+1||!([0,...CONFIG.freeCounts.map(x=>x.count)].includes(round.freeCount)))throw Error('フリースピン回数が不正です。');
  let total=0;
  round.spins.forEach((spin,i)=>{
    const result=evaluate(spin.cells,round.version,round.bet);
    if(result.payout!==spin.payout||!sameResult(result.wins,spin.wins)||spin.free!==(i>0)||(i>0&&spin.cells[4]!=='wild'))throw Error('スロットの配当データが不正です。');
    if(round.version>=2 && ['linePayout','anyPayout','anyWins','winningCells'].some(key=>!sameResult(result[key],spin[key])))throw Error('エニーボーナスの配当データが不正です。');
    total+=result.payout;
  });
  if((round.spins[0].cells[4]==='wild')!==(round.freeCount>0)||total!==round.total)throw Error('スロットの合計が不正です。');
  return round;
}
root.MojiSpinEngine=Object.freeze({CONFIG,BET,byId,weighted,evaluateAnyBonus,evaluate,roll,createRound,validateRound});
})(globalThis);
