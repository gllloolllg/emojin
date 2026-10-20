const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start=source.indexOf('async function animateSlotRoulette('),end=source.indexOf('async function slotFreeRoulette(',start);

for(let target=0;target<5;target++)test(`stationary roulette target ${target}: clockwise light slows down and stops at 3000 ms`,async()=>{
 let now=0;const frames=[],samples=[],stopped=new Set();
 const nodes=kind=>Array.from({length:5},(_,index)=>({lit:false,classList:{toggle(_cls,on){
  this.owner.lit=on;if(on&&kind==='sector')samples.push({index,time:now});
 }}})).map(el=>{el.classList.owner=el;return el;});
 const sectors=nodes('sector'),numbers=nodes('number');
 const wheel={querySelectorAll:selector=>selector==='[data-wheel-sector]'?sectors:numbers,
  classList:{add:value=>stopped.add(value)},style:new Proxy({},{set(){throw Error('The disc must stay stationary');}})};
 const ctx={performance:{now:()=>now},requestAnimationFrame:cb=>frames.push(cb)};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const done=ctx.animateSlotRoulette(wheel,target);
 assert.equal(sectors.filter(el=>el.lit).length,1);assert.equal(samples[0].index,0);
 while(frames.length){now+=10;frames.shift()(now);assert.ok(now<=3010);}
 await done;
 assert.equal(now,3000);assert.ok(stopped.has('is-stopped'));
 assert.equal(sectors.findIndex(el=>el.lit),target);assert.equal(numbers.findIndex(el=>el.lit),target);
 assert.equal(sectors.filter(el=>el.lit).length,1);assert.equal(numbers.filter(el=>el.lit).length,1);
 assert.equal(samples.length,31+target);
 assert.ok(samples.every((s,i)=>s.index===i%5));
 const intervals=samples.slice(1).map((s,i)=>s.time-samples[i].time);
 assert.ok(Math.min(...intervals.slice(-3))>Math.max(...intervals.slice(0,10)));
});
