// Historical slot rules for saved v1 round compatibility tests.
/* MOJI SPIN: probabilities and payouts are intentionally fixed, not RTP-adjusted. */
(function(root){
'use strict';
const CONFIG=Object.freeze({
  lineBet:1,
  symbols:Object.freeze([
    {id:'wild',emoji:'🤡',weight:3,payout:400,name:'ワイルド'},
    {id:'smile',emoji:'😄',weight:4,payout:160,name:'スマイル'},
    {id:'gift',emoji:'🎁',weight:6,payout:80,name:'プレゼント'},
    {id:'bell',emoji:'🔔',weight:9,payout:50,name:'ベル'},
    {id:'melon',emoji:'🍉',weight:12,payout:30,name:'スイカ'},
    {id:'berry',emoji:'🫐',weight:14,payout:20,name:'ブルーベリー'},
    {id:'orange',emoji:'🍊',weight:16,payout:14,name:'オレンジ'},
    {id:'cherry',emoji:'🍒',weight:18,payout:10,name:'チェリー'},
    {id:'blank',emoji:'',weight:18,payout:0,name:'ブランク'}
  ].map(Object.freeze)),
  lines:Object.freeze([[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].map(Object.freeze)),
  freeCounts:Object.freeze([{count:4,weight:40},{count:5,weight:30},{count:7,weight:20},{count:10,weight:8},{count:20,weight:2}].map(Object.freeze))
});
const byId=Object.freeze(Object.fromEntries(CONFIG.symbols.map(s=>[s.id,s])));
const BET=CONFIG.lineBet*CONFIG.lines.length;
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
function weighted(items,rng){let value=rng()*100;for(const item of items){value-=item.weight;if(value<0)return item;}return items[items.length-1];}
function evaluate(cells){
  if(cells.length!==9||cells.some(id=>!byId[id]))throw Error('Invalid slot symbols');
  const wins=[];
  CONFIG.lines.forEach((indices,line)=>{
    const symbols=indices.map(i=>cells[i]);
    if(symbols.includes('blank'))return;
    const match=CONFIG.symbols.filter(s=>s.payout>0&&symbols.every(id=>id==='wild'||id===s.id)).sort((a,b)=>b.payout-a.payout)[0];
    if(match)wins.push({line,indices:[...indices],symbol:match.id,payout:match.payout*CONFIG.lineBet});
  });
  return {cells:[...cells],wins,payout:wins.reduce((sum,w)=>sum+w.payout,0)};
}
function roll(free=false,rng=random){
  return {...evaluate(Array.from({length:9},(_,i)=>free&&i===4?'wild':weighted(CONFIG.symbols,rng).id)),free};
}
function createRound(rng=random){
  const first=roll(false,rng);
  const freeCount=first.cells[4]==='wild'?weighted(CONFIG.freeCounts,rng).count:0;
  const spins=[first];for(let i=0;i<freeCount;i++)spins.push(roll(true,rng));
  return {id:'slot-'+crypto.randomUUID(),version:1,bet:BET,freeCount,spins,total:spins.reduce((sum,s)=>sum+s.payout,0),createdAt:Date.now()};
}
function validateRound(round){
  if(!round||round.version!==1||round.bet!==BET||!/^slot-[\w-]+$/.test(round.id)||!Array.isArray(round.spins))throw Error('スロットの抽選データが不正です。');
  if(round.spins.length!==round.freeCount+1||!([0,...CONFIG.freeCounts.map(x=>x.count)].includes(round.freeCount)))throw Error('フリースピン回数が不正です。');
  let total=0;
  round.spins.forEach((spin,i)=>{
    const result=evaluate(spin.cells);
    if(result.payout!==spin.payout||JSON.stringify(result.wins)!==JSON.stringify(spin.wins)||spin.free!==(i>0)||(i>0&&spin.cells[4]!=='wild'))throw Error('スロットの配当データが不正です。');
    total+=result.payout;
  });
  if((round.spins[0].cells[4]==='wild')!==(round.freeCount>0)||total!==round.total)throw Error('スロットの合計が不正です。');
  return round;
}
root.MojiSpinEngine=Object.freeze({CONFIG,BET,byId,weighted,evaluate,roll,createRound,validateRound});
})(globalThis);
